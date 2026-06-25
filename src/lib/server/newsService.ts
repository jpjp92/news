import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

export interface NewsAnalysis {
  overallTrend: string;
  trendDrivers?: string[];
  categories: {
    name: string;
    count: number;
    averageSentiment?: number;
    dominantIssue?: string;
  }[];
  keyTopics: {
    keyword: string;
    sentiment: string;
    score: number;
    reason?: string;
  }[];
  summaries: {
    title: string;
    summary: string;
    category: string;
    url?: string;
    sentiment?: string;
    sentimentScore?: number;
  }[];
}

export interface NewsSettings {
  enabledCategories?: string[];
  articleLimit?: number;
  temperature?: number;
}

const CATEGORY_MAP: Record<string, string> = {
  정치: '100',
  경제: '101',
  사회: '102',
  '생활/문화': '103',
  세계: '104',
  'IT/과학': '105',
};

const DEFAULT_CATEGORIES = ['정치', '경제', '사회', '생활/문화', 'IT/과학', '세계'];

const apiKeyToUse =
  process.env.GEMINI_API_KEY || process.env.gemini_api_key || '';

if (!apiKeyToUse) {
  logger.warn('GEMINI_API_KEY is not set in environment variables.');
}

const ai = new GoogleGenerativeAI(apiKeyToUse);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabaseSchema = process.env.SUPABASE_SCHEMA || 'newsdash';
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { db: { schema: supabaseSchema } })
    : null;

if (!supabase) {
  logger.warn('[Supabase] SUPABASE_URL or SUPABASE_KEY missing - DB saving disabled.');
}

const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.5-flash-lite')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);

let currentModelIndex = 0;

function sanitizeText(text: string): string {
  return text.replace(/[\[\]"{}]/g, '').trim();
}

function extractAndFixJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1) return null;

  if (end === -1 || end < start) {
    const truncated = text.substring(start);
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;

    for (let i = 0; i < truncated.length; i++) {
      const char = truncated[i];
      if (char === '"' && truncated[i - 1] !== '\\') inString = !inString;
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    let fixed = truncated;
    if (inString) fixed += '"';

    while (openBrackets > 0) {
      if (fixed.trim().endsWith(',')) fixed = fixed.trim().slice(0, -1);
      fixed += ']';
      openBrackets--;
    }

    while (openBraces > 0) {
      if (fixed.trim().endsWith(',')) fixed = fixed.trim().slice(0, -1);
      fixed += '}';
      openBraces--;
    }

    try {
      const partiallyFixed = fixed.replace(
        /"(title|summary|overallTrend|keyword|sentiment)":\s*"(.*?)"/g,
        (match, key, value) => `"${key}": "${String(value).replace(/"/g, "'")}"`,
      );
      return JSON.parse(partiallyFixed);
    } catch {
      try {
        return JSON.parse(fixed);
      } catch {
        return null;
      }
    }
  }

  const jsonCandidate = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonCandidate);
  } catch {
    return null;
  }
}

function normalizeAnalysis(analysis: any): NewsAnalysis {
  const validSentiments = ['positive', 'neutral', 'negative'];
  const categories = Array.isArray(analysis.categories) ? analysis.categories : [];
  const keyTopics = Array.isArray(analysis.keyTopics) ? analysis.keyTopics : [];
  const summaries = Array.isArray(analysis.summaries) ? analysis.summaries : [];
  const trendDrivers = Array.isArray(analysis.trendDrivers) ? analysis.trendDrivers : [];

  return {
    overallTrend: typeof analysis.overallTrend === 'string' ? analysis.overallTrend : '',
    trendDrivers: trendDrivers
      .map((v: any) => String(v || '').trim())
      .filter(Boolean)
      .slice(0, 5),
    categories: categories.map((c: any) => ({
      name: String(c.name || 'Unknown').trim(),
      count: Number(c.count) || 0,
      averageSentiment: Number(c.averageSentiment) || 50,
      dominantIssue: String(c.dominantIssue || '').trim(),
    })),
    keyTopics: keyTopics
      .map((k: any) => ({
        keyword: String(k.keyword || '').trim(),
        sentiment: validSentiments.includes(k.sentiment) ? k.sentiment : 'neutral',
        score: Number(k.score) || 0,
        reason: String(k.reason || '').trim(),
      }))
      .filter((k: any) => k.keyword),
    summaries: summaries.map((s: any) => ({
      title: String(s.title || '').trim(),
      summary: String(s.summary || '').trim(),
      category: String(s.category || '기타').trim(),
      url: s.url ? String(s.url).trim() : undefined,
      sentiment: validSentiments.includes(s.sentiment) ? s.sentiment : 'neutral',
      sentimentScore: Number(s.sentimentScore) || 50,
    })),
  };
}

async function saveSessionToDb(
  analysis: NewsAnalysis,
  modelUsed: string,
  rawResponse: object,
  isError: boolean,
  errorMsg?: string,
) {
  if (!supabase) return;

  try {
    const { data: session, error: sessionErr } = await supabase
      .from('news_sessions')
      .insert({
        article_count: isError ? 0 : (analysis.summaries?.length ?? 0),
        overall_trend: isError ? null : (analysis.overallTrend ?? null),
        model_used: modelUsed,
        is_error: isError,
        error_msg: errorMsg ?? null,
        raw_data: rawResponse,
      })
      .select('id')
      .single();

    if (sessionErr || !session) {
      logger.error('[Supabase] Failed to insert news_session', sessionErr);
      return;
    }

    const sessionId = session.id;
    if (isError) return;

    const categoryRows = (analysis.categories ?? []).map(c => ({
      session_id: sessionId,
      category: c.name ?? 'Unknown',
      count: Number(c.count) || 0,
      avg_sentiment: Number(c.averageSentiment) || null,
    }));

    const keywordRows = (analysis.keyTopics ?? []).map(k => ({
      session_id: sessionId,
      keyword: k.keyword ?? '',
      score: Number(k.score) || 0,
      sentiment: ['positive', 'neutral', 'negative'].includes(k.sentiment)
        ? k.sentiment
        : null,
    }));

    const articleRows = (analysis.summaries ?? []).map(s => ({
      session_id: sessionId,
      title: s.title ?? '',
      summary: s.summary ?? null,
      category: s.category ?? null,
      url: s.url ?? null,
      sentiment: ['positive', 'neutral', 'negative'].includes(String(s.sentiment))
        ? s.sentiment
        : null,
      sentiment_score: Number(s.sentimentScore) || null,
    }));

    let filteredArticleRows = articleRows;
    if (articleRows.length) {
      const urlsToCheck = articleRows.map(r => r.url).filter(Boolean);
      if (urlsToCheck.length) {
        const { data: existing } = await supabase
          .from('article_summaries')
          .select('url')
          .in('url', urlsToCheck);

        const existingUrls = new Set((existing || []).map(e => e.url));
        filteredArticleRows = articleRows.filter(r => !r.url || !existingUrls.has(r.url));
      }
    }

    const inserts = [];
    if (categoryRows.length) inserts.push(supabase.from('category_stats').insert(categoryRows));
    if (keywordRows.length) inserts.push(supabase.from('keyword_stats').insert(keywordRows));
    if (filteredArticleRows.length) {
      inserts.push(supabase.from('article_summaries').insert(filteredArticleRows));
    }

    const results = await Promise.all(inserts);
    results.forEach(({ error }) => {
      if (error) logger.error('[Supabase] Insert error', error.message);
    });

    logger.info('[Supabase] Session saved', {
      sessionId,
      articles: articleRows.length,
      keywords: keywordRows.length,
      categories: categoryRows.length,
    });
  } catch (e: any) {
    logger.error('[Supabase] Unexpected error during save', e?.message || e);
  }
}

async function isDuplicateSession(currentUrls: string[]): Promise<boolean> {
  if (!supabase) return false;
  const validUrls = currentUrls.filter(Boolean);
  if (!validUrls.length) return false;

  try {
    const { data } = await supabase
      .from('news_sessions')
      .select('raw_data')
      .eq('is_error', false)
      .order('collected_at', { ascending: false })
      .limit(1)
      .single();

    if (!data?.raw_data?.rawHeadlines) return false;

    const prevUrls = new Set<string>((data.raw_data.rawHeadlines as any[]).map((h: any) => h.url).filter(Boolean));
    const overlap = validUrls.filter(u => prevUrls.has(u)).length;
    const ratio = overlap / validUrls.length;
    logger.info('[Supabase] Duplicate session check', {
      totalUrls: validUrls.length,
      overlap,
      ratio: Math.round(ratio * 100),
    });
    return ratio >= 0.85;
  } catch {
    return false;
  }
}

function getPeriodStart(period: string): string {
  const now = new Date();
  if (period === 'today') {
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + KST_OFFSET);
    kstNow.setUTCHours(0, 0, 0, 0);
    return new Date(kstNow.getTime() - KST_OFFSET).toISOString();
  }

  const days = period === '30d' ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function clampArticleLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 18;
  return Math.min(30, Math.max(6, Math.round(limit / 6) * 6));
}

function clampTemperature(temperature?: number): number {
  if (temperature == null || Number.isNaN(temperature)) return 0;
  return Math.max(0, Math.min(1, temperature));
}

function resolveSections(enabledCategories?: string[]) {
  const picked =
    enabledCategories && enabledCategories.length
      ? enabledCategories.filter(c => CATEGORY_MAP[c])
      : DEFAULT_CATEGORIES;

  return picked.map(name => ({ name, id: CATEGORY_MAP[name] }));
}

function isRetryableError(e: any): boolean {
  const msg = String(e?.message || '').toLowerCase();
  const status = e?.status ?? e?.httpErrorCode ?? e?.code;
  return (
    status === 429 ||
    status === 503 ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('overloaded')
  );
}

async function callGeminiWithRetry(
  prompt: string,
  temperature: number,
  startIndex: number,
): Promise<{ text: string; modelUsed: string; nextIndex: number }> {
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const idx = (startIndex + i) % GEMINI_MODELS.length;
    const modelName = GEMINI_MODELS[idx];
    const isGemini = modelName.toLowerCase().includes('gemini');

    try {
      const response = await ai
        .getGenerativeModel({
          model: modelName,
          generationConfig: {
            ...(isGemini ? { responseMimeType: 'application/json' } : {}),
            maxOutputTokens: 6000,
            temperature,
          },
        })
        .generateContent(prompt);

      return {
        text: response.response.text() || '',
        modelUsed: modelName,
        nextIndex: (idx + 1) % GEMINI_MODELS.length,
      };
    } catch (e: any) {
      const retryable = isRetryableError(e);
      logger.warn(`[Gemini] ${modelName} failed`, { message: e?.message, retryable, attempt: i + 1 });

      if (!retryable || i === GEMINI_MODELS.length - 1) {
        const err = new Error(`Gemini API error: ${e?.message || e}`);
        (err as any).httpStatus = retryable ? 503 : 500;
        throw err;
      }

      logger.info(`[Gemini] Retrying with next model (${GEMINI_MODELS[(idx + 1) % GEMINI_MODELS.length]})`);
    }
  }

  const err = new Error('All Gemini models failed');
  (err as any).httpStatus = 503;
  throw err;
}

export async function analyzeNews(settings: NewsSettings = {}) {
  const sections = resolveSections(settings.enabledCategories);
  const articleLimit = clampArticleLimit(settings.articleLimit);
  const temperature = clampTemperature(settings.temperature);

  logger.info('[News] Analysis started', {
    categories: sections.map(section => section.name),
    articleLimit,
    temperature,
  });

  const headlines: { title: string; url: string; expectedCategory?: string }[] = [];

  await Promise.all(
    sections.map(async section => {
      try {
        const response = await fetch(`https://news.naver.com/section/${section.id}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          logger.warn(`[Naver] Section ${section.name} returned HTTP ${response.status}`);
          return;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const maxPerCategory = Math.max(1, Math.floor(articleLimit / sections.length));
        let count = 0;

        $('.sa_text_strong, .cjs_t, .sh_text_headline').each((i, el) => {
          if (count >= maxPerCategory) return;

          const text = $(el).text().trim();
          const $a = $(el).closest('a');
          let url = $a.attr('href') || '';

          if (url && !url.startsWith('http')) {
            url = 'https://news.naver.com' + url;
          }

          if (text && !headlines.some(h => h.title === text)) {
            headlines.push({ title: text, url, expectedCategory: section.name });
            count++;
          }
        });
      } catch (e) {
        logger.warn(`Failed to fetch from Naver section ${section.name}`, e);
      }
    }),
  );

  headlines.sort(() => Math.random() - 0.5);
  const topHeadlines = headlines.slice(0, articleLimit);

  if (topHeadlines.length === 0) {
    logger.warn('[News] No headlines collected from Naver sections');
    return {
      success: true,
      data: {
        overallTrend: '현재 수집된 뉴스가 없습니다. 잠시 후 다시 시도해주세요.',
        trendDrivers: [],
        categories: [],
        keyTopics: [],
        summaries: [],
      },
      rawHeadlines: [],
      modelUsed: GEMINI_MODELS[currentModelIndex],
    };
  }

  const prompt = `<role>
당신은 한국 뉴스 감성 분류 전문가입니다. 주어진 뉴스 헤드라인을 분석해 JSON 형식으로 응답합니다.
모든 텍스트 필드는 반드시 한국어로 작성하세요.
</role>

<sentiment_criteria>
각 기사의 sentiment를 아래 기준으로 판단하세요. 애매할 경우 더 구체적인 기준을 우선 적용하세요.

<label value="positive">
다음 중 하나 이상 해당:
- 경제 지표 개선: 성장, 흑자, 회복, 반등, 상승, 호조, 최고치
- 기업/산업 호재: 수출 증가, 투자 유치, 신제품 출시 성공, 실적 개선
- 사회 긍정: 범죄 감소, 복지 확대, 취업률 상승, 안전 강화
- 해결·타결: 분쟁 해결, 협약 체결, 구조 성공
</label>

<label value="negative">
다음 중 하나 이상 해당:
- 경제 지표 악화: 하락, 적자, 침체, 부진, 최저치, 실업 증가
- 기업/산업 악재: 파산, 구조조정, 리콜, 수출 감소, 실적 악화
- 사회 부정: 사고, 사망, 범죄, 갈등 심화, 피해, 논란, 비리
- 위기·악화: 분쟁 격화, 제재, 규제 강화(부담 증가 맥락)
</label>

<label value="neutral">
다음에 해당:
- 단순 사실 보도: 일정 발표, 인사이동, 통계 발표(방향성 없음)
- 정책·계획 발표: 결과가 미확정인 검토·추진·예정 기사
- 양면적 내용: 긍정과 부정이 균형을 이루는 기사
- 분류 불가: positive/negative 기준 어느 쪽도 명확하지 않은 경우
</label>
</sentiment_criteria>

<score_criteria name="sentimentScore" range="1-100">
- 70~100: 명확한 positive
- 51~69: 약한 positive
- 50: neutral
- 31~49: 약한 negative
- 1~30: 명확한 negative
</score_criteria>

<headlines>
${topHeadlines
  .map((h, i) => `<item index="${i + 1}" category="${h.expectedCategory || 'Unknown'}">${sanitizeText(h.title)}</item>`)
  .join('\n')}
</headlines>

<output_rules>
- 유효한 JSON 객체 하나만 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.
- 문자열 값 안에 큰따옴표(")를 사용하지 마세요. 작은따옴표(')나 일반 텍스트를 사용하세요.
- 모든 속성명은 큰따옴표로 감싸세요.
- 후행 쉼표(trailing comma) 금지.
- summary: 80자 이내 한국어
- overallTrend: 2~3문장 한국어
</output_rules>

<output_schema>
{
  "overallTrend": "...",
  "trendDrivers": ["..."],
  "categories": [{ "name": "...", "count": 1, "averageSentiment": 50, "dominantIssue": "..." }],
  "keyTopics": [{ "keyword": "...", "sentiment": "positive|negative|neutral", "score": 1, "reason": "..." }],
  "summaries": [{ "title": "...", "summary": "...", "category": "...", "url": "...", "sentiment": "positive|negative|neutral", "sentimentScore": 50 }]
}
</output_schema>`;

  const [isDuplicate, { text: responseText, modelUsed: currentModel, nextIndex }] = await Promise.all([
    isDuplicateSession(topHeadlines.map(h => h.url)),
    callGeminiWithRetry(prompt, temperature, currentModelIndex),
  ]);
  currentModelIndex = nextIndex;

  let analysis = extractAndFixJson(responseText);

  if (!analysis) {
    const errMsg = `JSON parsing failed for model ${currentModel}`;
    logger.error('[News] JSON parsing failed', { model: currentModel, preview: responseText.slice(0, 500) });
    if (!isDuplicate) {
      await saveSessionToDb(
        {
          overallTrend: '',
          trendDrivers: [],
          categories: [],
          keyTopics: [],
          summaries: [],
        },
        currentModel,
        { rawResponse: responseText },
        true,
        errMsg,
      );
    }

    analysis = {
      overallTrend: `[${currentModel} 응답 처리 실패 - 잠시 후 다시 시도해주세요]`,
      trendDrivers: [],
      categories: [],
      keyTopics: [],
      summaries: [],
    };
  } else {
    analysis = normalizeAnalysis(analysis);

    if (!isDuplicate) {
      await saveSessionToDb(analysis, currentModel, { data: analysis, rawHeadlines: topHeadlines }, false);
    }
  }

  logger.info('[News] Analysis completed', {
    modelUsed: currentModel,
    isDuplicate,
    summaryCount: analysis.summaries?.length || 0,
  });

  return {
    success: true,
    data: analysis,
    rawHeadlines: topHeadlines,
    modelUsed: currentModel,
  };
}

export async function getSessions(period: string) {
  if (!supabase) return { success: false, error: 'DB not connected' };

  const { data, error } = await supabase
    .from('news_sessions')
    .select('id, collected_at, article_count, model_used, is_error, overall_trend')
    .eq('is_error', false)
    .gt('article_count', 0)
    .gte('collected_at', getPeriodStart(period || '7d'))
    .order('collected_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function getKeywords(period: string) {
  if (!supabase) return { success: false, error: 'DB not connected' };

  const { data: sessions, error: sErr } = await supabase
    .from('news_sessions')
    .select('id')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period || '7d'));

  if (sErr || !sessions?.length) return { success: true, data: [] };

  const { data: keywords, error: kErr } = await supabase
    .from('keyword_stats')
    .select('keyword, score, sentiment')
    .in('session_id', sessions.map(s => s.id));

  if (kErr) return { success: false, error: kErr.message };

  const map = new Map<string, { count: number; totalScore: number; pos: number; neg: number; neu: number }>();
  for (const k of keywords || []) {
    const e = map.get(k.keyword) || { count: 0, totalScore: 0, pos: 0, neg: 0, neu: 0 };
    e.count++;
    e.totalScore += k.score || 0;
    if (k.sentiment === 'positive') e.pos++;
    else if (k.sentiment === 'negative') e.neg++;
    else e.neu++;
    map.set(k.keyword, e);
  }

  const data = Array.from(map.entries())
    .map(([keyword, v]) => ({
      keyword,
      appearance_count: v.count,
      avg_score: Math.round((v.totalScore / v.count) * 10) / 10,
      pos_count: v.pos,
      neg_count: v.neg,
      neu_count: v.neu,
      dominant_sentiment:
        v.pos >= v.neg && v.pos >= v.neu
          ? 'positive'
          : v.neg >= v.pos && v.neg >= v.neu
            ? 'negative'
            : 'neutral',
    }))
    .sort((a, b) => b.appearance_count - a.appearance_count || b.avg_score - a.avg_score)
    .slice(0, 10);

  return { success: true, data };
}

export async function getSentiment(period: string) {
  if (!supabase) return { success: false, error: 'DB not connected' };

  const { data: sessions } = await supabase
    .from('news_sessions')
    .select('id, collected_at')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period || '7d'))
    .order('collected_at', { ascending: true });

  if (!sessions?.length) return { success: true, data: [] };

  const { data: keywords } = await supabase
    .from('keyword_stats')
    .select('session_id, sentiment')
    .in('session_id', sessions.map(s => s.id));

  const sessionDateMap = new Map<string, string[]>();
  for (const s of sessions) {
    const date = s.collected_at.substring(0, 10);
    if (!sessionDateMap.has(date)) sessionDateMap.set(date, []);
    sessionDateMap.get(date)!.push(s.id);
  }

  const kwBySession = new Map<string, { pos: number; neg: number; neu: number }>();
  for (const k of keywords || []) {
    const e = kwBySession.get(k.session_id) || { pos: 0, neg: 0, neu: 0 };
    if (k.sentiment === 'positive') e.pos++;
    else if (k.sentiment === 'negative') e.neg++;
    else e.neu++;
    kwBySession.set(k.session_id, e);
  }

  const data = Array.from(sessionDateMap.entries())
    .map(([date, sIds]) => {
      let pos = 0;
      let neg = 0;
      let neu = 0;

      for (const sid of sIds) {
        const kw = kwBySession.get(sid) || { pos: 0, neg: 0, neu: 0 };
        pos += kw.pos;
        neg += kw.neg;
        neu += kw.neu;
      }

      const total = pos + neg + neu || 1;
      return {
        date,
        positive_pct: Math.round((pos / total) * 100),
        negative_pct: Math.round((neg / total) * 100),
        neutral_pct: Math.round((neu / total) * 100),
        session_count: sIds.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { success: true, data };
}

export async function getArticles(period: string) {
  if (!supabase) return { success: false, error: 'DB not connected' };

  const { data: sessions, error: sErr } = await supabase
    .from('news_sessions')
    .select('id, collected_at')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period || 'today'))
    .order('collected_at', { ascending: false });

  if (sErr || !sessions?.length) {
    return { success: true, data: [], total: 0, session_count: 0 };
  }

  const { data: articles, error: aErr } = await supabase
    .from('article_summaries')
    .select('id, session_id, title, summary, category, url, sentiment, sentiment_score')
    .in('session_id', sessions.map(s => s.id));

  if (aErr) return { success: false, error: aErr.message };

  const sessionDateMap = new Map((sessions || []).map(s => [s.id, s.collected_at]));
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const deduped = (articles || [])
    .map((a, index) => ({
      ...a,
      collected_at: sessionDateMap.get(a.session_id) || null,
      order_index: index,
    }))
    .sort((a, b) => {
      const dateCompare = String(b.collected_at || '').localeCompare(String(a.collected_at || ''));
      return dateCompare !== 0 ? dateCompare : a.order_index - b.order_index;
    })
    .filter(a => {
      if (a.url) {
        if (seenUrls.has(a.url)) return false;
        seenUrls.add(a.url);
      } else {
        if (seenTitles.has(a.title)) return false;
        seenTitles.add(a.title);
      }
      return true;
    });

  return {
    success: true,
    data: deduped,
    total: deduped.length,
    session_count: sessions.length,
  };
}

async function getStatsByPeriod(period: string) {
  if (!supabase) return { session_count: 0, article_count: 0, positive_pct: null };

  const { data: sessions } = await supabase
    .from('news_sessions')
    .select('id, article_count')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period));

  if (!sessions?.length) return { session_count: 0, article_count: 0, positive_pct: null };

  const totalArticles = sessions.reduce((sum, s) => sum + (s.article_count || 0), 0);

  const { data: keywords } = await supabase
    .from('keyword_stats')
    .select('sentiment')
    .in('session_id', sessions.map(s => s.id));

  const total = keywords?.length || 0;
  const pos = keywords?.filter(k => k.sentiment === 'positive').length || 0;

  return {
    session_count: sessions.length,
    article_count: totalArticles,
    positive_pct: total > 0 ? Math.round((pos / total) * 100) : null,
  };
}

export async function getStats() {
  if (!supabase) return { success: false, error: 'DB not connected' };
  const [week, month] = await Promise.all([getStatsByPeriod('7d'), getStatsByPeriod('30d')]);
  return { success: true, data: { week, month } };
}

export async function getCategoryTotals(period: string) {
  if (!supabase) return { success: false, error: 'DB not connected' };

  let sessionQuery = supabase.from('news_sessions').select('id').eq('is_error', false);
  if (period !== 'all') sessionQuery = sessionQuery.gte('collected_at', getPeriodStart(period));

  const { data: sessions, error: sErr } = await sessionQuery;
  if (sErr || !sessions?.length) return { success: true, data: [] };

  const { data: cats, error: cErr } = await supabase
    .from('category_stats')
    .select('category, count, avg_sentiment')
    .in('session_id', sessions.map(s => s.id));

  if (cErr) return { success: false, error: cErr.message };

  const map = new Map<string, { total: number; sentimentSum: number; sentimentCount: number }>();
  for (const c of cats || []) {
    const e = map.get(c.category) || { total: 0, sentimentSum: 0, sentimentCount: 0 };
    e.total += c.count || 0;
    if (c.avg_sentiment != null) {
      e.sentimentSum += c.avg_sentiment;
      e.sentimentCount++;
    }
    map.set(c.category, e);
  }

  const data = Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      avg_sentiment: v.sentimentCount > 0 ? Math.round(v.sentimentSum / v.sentimentCount) : null,
    }))
    .sort((a, b) => b.total - a.total);

  return { success: true, data, session_count: sessions.length };
}

export async function getLatestSession() {
  if (!supabase) return { success: false, error: 'DB not connected' };

  const { data: session, error: sErr } = await supabase
    .from('news_sessions')
    .select('id, overall_trend, model_used, collected_at, raw_data')
    .eq('is_error', false)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single();

  if (sErr || !session) return { success: false, error: 'No session found' };

  const [{ data: cats }, { data: keywords }, { data: articles }] = await Promise.all([
    supabase
      .from('category_stats')
      .select('category, count, avg_sentiment')
      .eq('session_id', session.id),
    supabase
      .from('keyword_stats')
      .select('keyword, score, sentiment')
      .eq('session_id', session.id)
      .order('score', { ascending: false }),
    supabase
      .from('article_summaries')
      .select('title, summary, category, url, sentiment, sentiment_score')
      .eq('session_id', session.id),
  ]);

  const rawAnalysis = (session as any).raw_data?.data || {};

  return {
    success: true,
    modelUsed: session.model_used,
    collectedAt: session.collected_at,
    data: {
      overallTrend: session.overall_trend || '',
      trendDrivers: Array.isArray(rawAnalysis.trendDrivers) ? rawAnalysis.trendDrivers : [],
      categories: (cats || []).map(c => {
        const rawCategory = Array.isArray(rawAnalysis.categories)
          ? rawAnalysis.categories.find((item: any) => item.name === c.category)
          : null;
        return {
          name: c.category,
          count: c.count,
          averageSentiment: c.avg_sentiment,
          dominantIssue: rawCategory?.dominantIssue || '',
        };
      }),
      keyTopics: (keywords || []).map(k => {
        const rawTopic = Array.isArray(rawAnalysis.keyTopics)
          ? rawAnalysis.keyTopics.find((item: any) => item.keyword === k.keyword)
          : null;

        return {
          keyword: k.keyword,
          score: k.score,
          sentiment: k.sentiment || 'neutral',
          reason: rawTopic?.reason || '',
        };
      }),
      summaries: (articles || []).map(a => ({
        title: a.title,
        summary: a.summary,
        category: a.category,
        url: a.url,
        sentiment: a.sentiment,
        sentimentScore: a.sentiment_score,
      })),
    },
  };
}
