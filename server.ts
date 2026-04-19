import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Vercel pulled env vars
dotenv.config(); // fallback to .env
// Vite is only needed for development, lazy loaded later
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
export default app; // Export for Vercel serverless functions
const PORT = Number(process.env.PORT) || 3000;

// Initialize Gemini with API Key from environment variables
// Support both uppercase and lowercase for consistency in Vercel UI
const apiKeyToUse = process.env.GEMINI_API_KEY || process.env.gemini_api_key || '';
if (!apiKeyToUse) {
  console.warn('GEMINI_API_KEY is not set in environment variables. Check Vercel project settings.');
}
console.log(`Using API Key starting with: ${apiKeyToUse.substring(0, 10)}...`);
const ai = new GoogleGenerativeAI(apiKeyToUse);

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
if (!supabase) {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_KEY missing — DB saving disabled.');
}

const GEMINI_MODELS = ['gemma-3-12b-it', 'gemma-3-27b-it'];
let currentModelIndex = 0;

// Limit to top 30 headlines for analysis (5 per category * 6 categories = 30)

function sanitizeText(text: string): string {
  return text.replace(/[\[\]"{}]/g, '').trim();
}

function extractAndFixJson(text: string): any {
  // 1. Find the first '{' and last '}'
  let start = text.indexOf('{');
  let end = text.lastIndexOf('}');
  
  if (start === -1) return null;
  
  // If no closing brace, or it's before start, try to fix truncation
  if (end === -1 || end < start) {
    let truncated = text.substring(start);
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    
    for (let i = 0; i < truncated.length; i++) {
      const char = truncated[i];
      if (char === '"' && truncated[i-1] !== '\\') inString = !inString;
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }
    
    let fixed = truncated;
    if (inString) fixed += '"';
    
    // Attempt to close arrays first, then objects
    // This is a simple heuristic for truncated lists
    while (openBrackets > 0) { 
      // If the last character is a comma, remove it to make JSON valid
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
      // Last resort: some models put unescaped double quotes inside strings.
      // We try a common but risky fix: replacing "title": "Some "quoted" text" with safe version
      const partiallyFixed = fixed
        .replace(/"(title|summary|overallTrend|keyword|sentiment)":\s*"(.*?)"/g, (match, key, value) => {
          // If the value contains internal unescaped quotes, they will break the regex match group 2
          // This regex is limited but helps in some cases. 
          // A better way is to minimize quotes in the prompt.
          return `"${key}": "${value.replace(/"/g, "'")}"`;
        });
      return JSON.parse(partiallyFixed);
    } catch (e) {
      // Partial fix failed, try parsing the original fixed version
      try {
        return JSON.parse(fixed);
      } catch (innerE) {
        return null;
      }
    }
  }

  const jsonCandidate = text.substring(start, end + 1);
  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    return null;
  }
}

async function saveSessionToDb(
  analysis: any,
  modelUsed: string,
  rawResponse: object,
  isError: boolean,
  errorMsg?: string
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
      console.error('[Supabase] Failed to insert news_session:', sessionErr);
      return;
    }

    const sessionId = session.id;

    if (isError) return;

    const categoryRows = (analysis.categories ?? []).map((c: any) => ({
      session_id: sessionId,
      category: c.name ?? 'Unknown',
      count: Number(c.count) || 0,
      avg_sentiment: parseFloat(c.averageSentiment) || null,
    }));

    const keywordRows = (analysis.keyTopics ?? []).map((k: any) => ({
      session_id: sessionId,
      keyword: k.keyword ?? '',
      score: parseFloat(k.score) || 0,
      sentiment: ['positive', 'neutral', 'negative'].includes(k.sentiment) ? k.sentiment : null,
    }));

    const articleRows = (analysis.summaries ?? []).map((s: any) => ({
      session_id: sessionId,
      title: s.title ?? '',
      summary: s.summary ?? null,
      category: s.category ?? null,
      url: s.url ?? null,
      sentiment: ['positive', 'neutral', 'negative'].includes(s.sentiment) ? s.sentiment : null,
      sentiment_score: parseFloat(s.sentimentScore) || null,
    }));

    const inserts = [];
    if (categoryRows.length) inserts.push(supabase.from('category_stats').insert(categoryRows));
    if (keywordRows.length)  inserts.push(supabase.from('keyword_stats').insert(keywordRows));
    if (articleRows.length)  inserts.push(supabase.from('article_summaries').insert(articleRows));

    const results = await Promise.all(inserts);
    results.forEach(({ error }) => {
      if (error) console.error('[Supabase] Insert error:', error.message);
    });

    console.log(`[Supabase] Session ${sessionId} saved — ${articleRows.length} articles, ${keywordRows.length} keywords`);
  } catch (e: any) {
    console.error('[Supabase] Unexpected error during save:', e.message);
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

    const prevUrls = new Set<string>(
      (data.raw_data.rawHeadlines as any[]).map((h: any) => h.url).filter(Boolean)
    );
    const overlap = validUrls.filter(u => prevUrls.has(u)).length;
    const ratio = overlap / validUrls.length;
    console.log(`[Supabase] URL overlap with last session: ${Math.round(ratio * 100)}%`);
    return ratio >= 0.7;
  } catch {
    return false;
  }
}

function getPeriodStart(period: string): string {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const days = period === '30d' ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ── 히스토리 API ──────────────────────────────────────────────────────────────

app.get('/api/history/sessions', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const period = (req.query.period as string) || '7d';
  const { data, error } = await supabase
    .from('news_sessions')
    .select('id, collected_at, article_count, model_used, is_error, overall_trend')
    .gte('collected_at', getPeriodStart(period))
    .order('collected_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data || [] });
});

app.get('/api/history/keywords', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const period = (req.query.period as string) || '7d';

  const { data: sessions, error: sErr } = await supabase
    .from('news_sessions')
    .select('id')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period));

  if (sErr || !sessions?.length) return res.json({ success: true, data: [] });

  const { data: keywords, error: kErr } = await supabase
    .from('keyword_stats')
    .select('keyword, score, sentiment')
    .in('session_id', sessions.map(s => s.id));

  if (kErr) return res.status(500).json({ success: false, error: kErr.message });

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
      dominant_sentiment: v.pos >= v.neg && v.pos >= v.neu ? 'positive'
        : v.neg >= v.pos && v.neg >= v.neu ? 'negative' : 'neutral',
    }))
    .sort((a, b) => b.appearance_count - a.appearance_count || b.avg_score - a.avg_score)
    .slice(0, 20);

  res.json({ success: true, data });
});

app.get('/api/history/sentiment', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const period = (req.query.period as string) || '7d';

  const { data: sessions } = await supabase
    .from('news_sessions')
    .select('id, collected_at')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period))
    .order('collected_at', { ascending: true });

  if (!sessions?.length) return res.json({ success: true, data: [] });

  const { data: keywords } = await supabase
    .from('keyword_stats')
    .select('session_id, sentiment')
    .in('session_id', sessions.map(s => s.id));

  // 세션 → 날짜 매핑
  const sessionDateMap = new Map<string, string[]>();
  for (const s of sessions) {
    const date = s.collected_at.substring(0, 10);
    if (!sessionDateMap.has(date)) sessionDateMap.set(date, []);
    sessionDateMap.get(date)!.push(s.id);
  }

  // 세션별 감성 집계
  const kwBySession = new Map<string, { pos: number; neg: number; neu: number }>();
  for (const k of keywords || []) {
    const e = kwBySession.get(k.session_id) || { pos: 0, neg: 0, neu: 0 };
    if (k.sentiment === 'positive') e.pos++;
    else if (k.sentiment === 'negative') e.neg++;
    else e.neu++;
    kwBySession.set(k.session_id, e);
  }

  // 날짜별 집계
  const data = Array.from(sessionDateMap.entries())
    .map(([date, sIds]) => {
      let pos = 0, neg = 0, neu = 0;
      for (const sid of sIds) {
        const kw = kwBySession.get(sid) || { pos: 0, neg: 0, neu: 0 };
        pos += kw.pos; neg += kw.neg; neu += kw.neu;
      }
      const total = pos + neg + neu || 1;
      return {
        date,
        positive_pct: Math.round(pos / total * 100),
        negative_pct: Math.round(neg / total * 100),
        neutral_pct: Math.round(neu / total * 100),
        session_count: sIds.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json({ success: true, data });
});

app.get('/api/history/articles', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const period = (req.query.period as string) || 'today';

  const { data: sessions, error: sErr } = await supabase
    .from('news_sessions')
    .select('id, collected_at')
    .eq('is_error', false)
    .gte('collected_at', getPeriodStart(period))
    .order('collected_at', { ascending: false });

  if (sErr || !sessions?.length) return res.json({ success: true, data: [], total: 0, session_count: 0 });

  const { data: articles, error: aErr } = await supabase
    .from('article_summaries')
    .select('id, session_id, title, summary, category, url, sentiment, sentiment_score')
    .in('session_id', sessions.map(s => s.id));

  if (aErr) return res.status(500).json({ success: false, error: aErr.message });

  // 제목 기준 중복 제거 (여러 세션에서 같은 기사 수집 가능)
  const seen = new Set<string>();
  const deduped = (articles || []).filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  res.json({ success: true, data: deduped, total: deduped.length, session_count: sessions.length });
});

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
    positive_pct: total > 0 ? Math.round(pos / total * 100) : null,
  };
}

app.get('/api/history/category-totals', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const period = (req.query.period as string) || 'all';

  let sessionQuery = supabase.from('news_sessions').select('id').eq('is_error', false);
  if (period !== 'all') sessionQuery = sessionQuery.gte('collected_at', getPeriodStart(period));

  const { data: sessions, error: sErr } = await sessionQuery;
  if (sErr || !sessions?.length) return res.json({ success: true, data: [] });

  const { data: cats, error: cErr } = await supabase
    .from('category_stats')
    .select('category, count, avg_sentiment')
    .in('session_id', sessions.map(s => s.id));

  if (cErr) return res.status(500).json({ success: false, error: cErr.message });

  const map = new Map<string, { total: number; sentimentSum: number; sentimentCount: number }>();
  for (const c of cats || []) {
    const e = map.get(c.category) || { total: 0, sentimentSum: 0, sentimentCount: 0 };
    e.total += c.count || 0;
    if (c.avg_sentiment != null) { e.sentimentSum += c.avg_sentiment; e.sentimentCount++; }
    map.set(c.category, e);
  }

  const data = Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      total: v.total,
      avg_sentiment: v.sentimentCount > 0 ? Math.round(v.sentimentSum / v.sentimentCount) : null,
    }))
    .sort((a, b) => b.total - a.total);

  res.json({ success: true, data, session_count: sessions.length });
});

app.get('/api/history/stats', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });
  const [week, month] = await Promise.all([
    getStatsByPeriod('7d'),
    getStatsByPeriod('30d'),
  ]);
  res.json({ success: true, data: { week, month } });
});

app.get('/api/history/latest-session', async (req, res) => {
  if (!supabase) return res.status(503).json({ success: false, error: 'DB not connected' });

  const { data: session, error: sErr } = await supabase
    .from('news_sessions')
    .select('id, overall_trend, model_used, collected_at')
    .eq('is_error', false)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single();

  if (sErr || !session) return res.json({ success: false, error: 'No session found' });

  const [{ data: cats }, { data: keywords }, { data: articles }] = await Promise.all([
    supabase.from('category_stats').select('category, count, avg_sentiment').eq('session_id', session.id),
    supabase.from('keyword_stats').select('keyword, score, sentiment').eq('session_id', session.id).order('score', { ascending: false }),
    supabase.from('article_summaries').select('title, summary, category, url, sentiment, sentiment_score').eq('session_id', session.id),
  ]);

  res.json({
    success: true,
    modelUsed: session.model_used,
    collectedAt: session.collected_at,
    data: {
      overallTrend: session.overall_trend || '',
      categories: (cats || []).map(c => ({ name: c.category, count: c.count, averageSentiment: c.avg_sentiment })),
      keyTopics: (keywords || []).map(k => ({ keyword: k.keyword, score: k.score, sentiment: k.sentiment || 'neutral' })),
      summaries: (articles || []).map(a => ({ title: a.title, summary: a.summary, category: a.category, url: a.url, sentiment: a.sentiment, sentimentScore: a.sentiment_score })),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/news-analysis', async (req, res) => {
  try {
    let headlines: { title: string; url: string; expectedCategory?: string }[] = [];
    
    const NAVER_SECTIONS = [
      { id: '100', name: '정치' },
      { id: '101', name: '경제' },
      { id: '102', name: '사회' },
      { id: '103', name: '생활/문화' },
      { id: '105', name: 'IT/과학' },
      { id: '104', name: '세계' }
    ];

    try {
      // Fetch up to 5 articles from each specific section
      await Promise.all(NAVER_SECTIONS.map(async (section) => {
        try {
          const response = await fetch(`https://news.naver.com/section/${section.id}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const html = await response.text();
          const $ = cheerio.load(html);
          
          let count = 0;
          // .sa_text_strong is commonly used in Naver News section pages
          $('.sa_text_strong, .cjs_t, .sh_text_headline').each((i, el) => {
            if (count >= 5) return; // Get up to 5 articles per category
            
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
          console.warn(`Failed to fetch from Naver News section ${section.name}`, e);
        }
      }));
      
      // Shuffle the headlines so they are mixed in the UI
      headlines.sort(() => Math.random() - 0.5);
      
    } catch (e) {
      console.warn('Failed to fetch from Naver News', e);
    }

    // Limit to top 18 headlines for analysis (3 per category * 6 categories = 18)
    // This reduction helps smaller models like gemma-3-4b-it complete the output without truncation.
    const topHeadlines = headlines.slice(0, 18);

    if (topHeadlines.length === 0) {
      return res.json({ 
        success: true, 
        data: {
          overallTrend: "현재 수집된 뉴스가 없습니다. 잠시 후 다시 시도해주세요.",
          categories: [],
          keyTopics: [],
          summaries: []
        }, 
        rawHeadlines: [],
        modelUsed: GEMINI_MODELS[currentModelIndex] 
      });
    }

    // Select the next Gemini model in the rotation
    const currentModel = GEMINI_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    console.log(`Analyzing news using model: ${currentModel}`);

    // Use Gemini to analyze trends and summarize
    const prompt = `
    Analyze the following news headlines and provide a JSON response.
    STRICT INSTRUCTION: ALL text fields (overallTrend, summaries, keyword) MUST be written in KOREAN. 
    ENGLISH IS STRICTLY FORBIDDEN for any descriptive text.
    
    Headlines:
    ${topHeadlines.map((h, i) => `${i + 1}. [Category: ${h.expectedCategory || 'Unknown'}] [${sanitizeText(h.title)}](${h.url})`).join('\n')}

    Respond ONLY with a valid JSON object.
    CRITICAL JSON RULES:
    1. NEVER use double quotes (") inside value strings. Use single quotes (') or just plain text if needed.
    2. Ensure every property name is in double quotes.
    3. NO trailing commas.
    4. Provide the result as ONE compact JSON object.
    
    IMPORTANT: Keep the "summary" field extremely brief (under 50 characters).
    The "overallTrend" should be a comprehensive summary of 2-3 sentences.
    
    Structure:
    {
      "overallTrend": "현재 수집된 뉴스들의 핵심 이슈와 전반적인 흐름을 한국어 2-3문장으로 집약적으로 요약.",
      "categories": [
        { 
          "name": "카테고리명 (정치, 경제, 사회, 생활/문화, IT/과학, 세계)", 
          "count": 1,
          "averageSentiment": "1-100 사이의 평균 감정 점수"
        }
      ],
      "keyTopics": [
        { 
          "keyword": "핵심 키워드 (한국어)", 
          "sentiment": "positive/negative/neutral", 
          "score": "1-100 사이의 점수 (해당 키워드의 화제성 또는 강도)" 
        }
      ],
      "summaries": [
        { 
          "title": "원본 헤드라인", 
          "summary": "한국어 1줄 요약(50자 이내)", 
          "category": "카테고리명", 
          "url": "원본 URL",
          "sentiment": "positive/negative/neutral",
          "sentimentScore": "1-100 사이의 점수 (매우 부정적 1 ~ 매우 긍정적 100, 중립은 50 근처)"
        }
      ]
    }
    
    SENTIMENT GUIDELINES:
    - POSITIVE: 호재, 성장, 개선, 성공, 혜택, 긍정적 변화
    - NEGATIVE: 악재, 하락, 갈등, 사고, 비판, 우려, 부정적 영향
    - NEUTRAL: 단순 정보 전달, 발표, 일상적 소식, 대립되는 의견이 균형을 이룸
    
    Ensure sentiment scores are differentiated (don't use 100 or 50 for everything).
    `;

    const normalizedModel = currentModel.toLowerCase();
    const isGemini = normalizedModel.includes('gemini');
    console.log(`[SERVER] Requesting analysis using model: ${currentModel} | JSON Mode: ${isGemini}`);

    // 중복 체크와 Gemma 분석을 병렬 실행 (지연 없음)
    const [isDuplicate, aiResponse] = await Promise.all([
      isDuplicateSession(topHeadlines.map(h => h.url)),
      ai.getGenerativeModel({
        model: currentModel,
        generationConfig: {
          ...(isGemini ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: 6000,
          temperature: 0,
        }
      }).generateContent(prompt),
    ]);

    const responseText = aiResponse.response.text() || '';
    let analysis = extractAndFixJson(responseText);

    if (!analysis) {
      console.warn(`[${currentModel}] Failed to extract valid JSON. Raw response:`, responseText);

      const errMsg = `JSON parsing failed for model ${currentModel}`;
      if (!isDuplicate) saveSessionToDb({}, currentModel, { rawResponse: responseText }, true, errMsg);

      analysis = {
        overallTrend: `[${currentModel} 응답 처리 실패 — 잠시 후 다시 시도해주세요]`,
        categories: [],
        keyTopics: [],
        summaries: []
      };
    } else {
      if (!Array.isArray(analysis.summaries)) analysis.summaries = [];
      if (!Array.isArray(analysis.categories)) analysis.categories = [];
      if (!Array.isArray(analysis.keyTopics)) analysis.keyTopics = [];
      analysis.overallTrend = analysis.overallTrend || "";

      if (isDuplicate) {
        console.log('[Supabase] 중복 세션 감지 — DB 저장 생략');
      } else {
        saveSessionToDb(analysis, currentModel, { data: analysis, rawHeadlines: topHeadlines }, false);
      }
    }

    res.json({
      success: true,
      data: analysis,
      rawHeadlines: topHeadlines,
      modelUsed: currentModel
    });
  } catch (error: any) {
    console.error('Error fetching/analyzing news:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze news: ' + (error.message || 'Unknown error') 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if not running on Vercel as a serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
