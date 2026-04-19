import { useState, useEffect, useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { TrendChart } from './TrendChart';
import { BarChart3, TrendingUp, RefreshCw, AlertCircle, PieChart, Activity, Calendar, Repeat2 } from 'lucide-react';
import { useNews } from '../context/NewsContext';

type Period = 'current' | 'today' | '7d' | '30d';

interface Session {
  id: string;
  collected_at: string;
  article_count: number;
  model_used: string;
  is_error: boolean;
  overall_trend: string;
}

interface KeywordStat {
  keyword: string;
  appearance_count: number;
  avg_score: number;
  dominant_sentiment: 'positive' | 'negative' | 'neutral';
  pos_count: number;
  neg_count: number;
}

interface SentimentDay {
  date: string;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  session_count: number;
}

interface CategoryTotal {
  category: string;
  total: number;
  avg_sentiment: number | null;
}

const PERIOD_LABELS: Record<Period, string> = {
  current: '현재 세션',
  today: '오늘',
  '7d': '7일',
  '30d': '30일',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Analytics() {
  const { data, loading, error, fetchData } = useNews();
  const [period, setPeriod] = useState<Period>('current');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [sentimentTrend, setSentimentTrend] = useState<SentimentDay[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [overviewTrend, setOverviewTrend] = useState<SentimentDay[]>([]);

  // 마운트 시 전체 카테고리 집계 + 7d 트렌드 로드
  useEffect(() => {
    Promise.all([
      fetch('/api/history/category-totals?period=all').then(r => r.json()),
      fetch('/api/history/sentiment?period=7d').then(r => r.json()),
    ]).then(([cats, trend]) => {
      if (cats.success) setCategoryTotals(cats.data);
      if (trend.success) setOverviewTrend(trend.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (period === 'current') return;
    setHistLoading(true);
    setHistError(null);

    Promise.all([
      fetch(`/api/history/sessions?period=${period}`).then(r => r.json()),
      fetch(`/api/history/keywords?period=${period}`).then(r => r.json()),
      fetch(`/api/history/sentiment?period=${period}`).then(r => r.json()),
    ])
      .then(([s, k, t]) => {
        setSessions(s.success ? s.data : []);
        setKeywords(k.success ? k.data : []);
        setSentimentTrend(t.success ? t.data : []);
        if (!s.success) setHistError(s.error || '데이터 로드 실패');
      })
      .catch(() => setHistError('네트워크 오류'))
      .finally(() => setHistLoading(false));
  }, [period]);

  const overviewChartData = useMemo(() =>
    overviewTrend.map(d => ({
      label: formatDay(d.date),
      articles: d.session_count,
      sentiment: d.positive_pct,
    })), [overviewTrend]);

  const sentimentChartData = useMemo(() =>
    sentimentTrend.map(d => ({
      label: formatDay(d.date),
      articles: d.session_count,
      sentiment: d.positive_pct,
    })), [sentimentTrend]);

  const isHistorical = period !== 'current';

  return (
    <div className="p-4 md:p-8 space-y-6 pb-12 w-full overflow-x-hidden">
      {/* 헤더 */}
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">심층 데이터 분석</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">뉴스 트렌드와 감성 분석을 기간별로 살펴봅니다</p>
        </div>
        {period === 'current' && (
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-700/60 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-xl text-indigo-700 dark:text-indigo-400 font-medium transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        )}
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white/40 dark:bg-white/5 text-gray-600 dark:text-white/50 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            {p === 'current' ? <><Activity size={13} className="inline mr-1.5" />현재 세션</> : <><Calendar size={13} className="inline mr-1.5" />{PERIOD_LABELS[p]}</>}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {(error || histError) && (
        <GlassCard className="p-4 bg-red-50/50 border-red-200/50 flex items-center gap-3 text-red-600 font-medium">
          <AlertCircle size={20} />
          <p className="text-sm">{error || histError}</p>
        </GlassCard>
      )}

      {/* ── 현재 세션 뷰 ── */}
      {period === 'current' && (
        loading ? (
          <div className="space-y-6 animate-pulse">
            <GlassCard className="h-64 bg-gray-200/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="h-64 bg-gray-200/50" />
              <GlassCard className="h-64 bg-gray-200/50" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <TrendingUp size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">주요 토픽 분석</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...(data?.keyTopics || [])].sort((a, b) => b.score - a.score).map((topic, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/30 dark:bg-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{topic.keyword}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {topic.sentiment === 'positive' ? '긍정적' : topic.sentiment === 'negative' ? '부정적' : '중립적'}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${
                      topic.sentiment === 'positive' ? 'text-emerald-500' :
                      topic.sentiment === 'negative' ? 'text-rose-500' : 'text-gray-500'
                    }`}>
                      {topic.score}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <PieChart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">카테고리별 비중</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">전체 수집 기사 누적 기준</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {categoryTotals.length > 0 ? (
                    (() => {
                      const maxTotal = Math.max(...categoryTotals.map(c => c.total), 1);
                      const grandTotal = categoryTotals.reduce((s, c) => s + c.total, 0);
                      return categoryTotals.map((cat, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{cat.category}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {cat.total}개 <span className="text-xs opacity-60">({Math.round(cat.total / grandTotal * 100)}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(cat.total / maxTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    data?.categories?.map((cat, idx) => {
                      const maxCount = Math.max(...(data.categories.map(c => c.count)), 1);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                            <span className="text-gray-500 dark:text-gray-400">{cat.count}개</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(cat.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-pink-100/50 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">트렌드 오버뷰</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">최근 7일 수집 세션 수 · 긍정 비율</p>
                  </div>
                </div>
                <div className="flex-1 -mx-6 -mb-6 min-h-[220px]">
                  <TrendChart data={overviewChartData.length > 0 ? overviewChartData : undefined} transparent hideHeader className="!p-6" />
                </div>
              </GlassCard>
            </div>
          </div>
        )
      )}

      {/* ── 기간별 히스토리 뷰 ── */}
      {isHistorical && (
        histLoading ? (
          <div className="space-y-6 animate-pulse">
            <GlassCard className="h-48 bg-gray-200/50" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="h-64 bg-gray-200/50" />
              <GlassCard className="h-64 bg-gray-200/50" />
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <BarChart3 size={40} className="mx-auto mb-3 text-gray-300 dark:text-white/20" />
            <p className="text-gray-500 dark:text-white/40 font-medium">해당 기간에 수집된 데이터가 없습니다</p>
            <p className="text-sm text-gray-400 dark:text-white/25 mt-1">새로고침으로 데이터를 수집해보세요</p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* 세션 목록 */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">수집 세션 목록</h2>
                  <p className="text-xs text-gray-500 dark:text-white/40">총 {sessions.length}개 세션</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sessions.map((s, idx) => (
                  <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                    s.is_error
                      ? 'bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-500/20'
                      : 'bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10'
                  }`}>
                    <span className="text-xs text-gray-400 dark:text-white/30 font-mono w-5 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-gray-500 dark:text-white/40 flex-shrink-0 w-28">{formatDate(s.collected_at)}</span>
                    <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${s.is_error ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                    <span className="text-gray-700 dark:text-white/70 flex-1 line-clamp-1">{s.is_error ? '파싱 오류' : s.overall_trend}</span>
                    <span className="text-xs text-gray-400 dark:text-white/30 flex-shrink-0">{s.article_count}개</span>
                    <span className="text-[10px] text-indigo-400/70 flex-shrink-0 hidden sm:block">{s.model_used?.replace('gemma-3-', 'g3-')}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 키워드 반복 순위 */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <Repeat2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">반복 키워드 TOP 20</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">기간 내 등장 횟수 기준</p>
                  </div>
                </div>
                <div className="space-y-0 max-h-72 overflow-y-auto pr-1">
                  {keywords.map((k, idx) => (
                    <div key={k.keyword} className="flex items-center gap-2 py-2 border-b border-black/5 dark:border-white/10 last:border-0">
                      <span className="text-[10px] text-gray-400 dark:text-white/30 font-mono w-5 flex-shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-white/80 flex-1 truncate">{k.keyword}</span>
                      <span className={`text-xs flex-shrink-0 ${
                        k.dominant_sentiment === 'positive' ? 'text-emerald-500' :
                        k.dominant_sentiment === 'negative' ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {k.dominant_sentiment === 'positive' ? '↑' : k.dominant_sentiment === 'negative' ? '↓' : '—'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-white/30 flex-shrink-0 w-10 text-right">{k.appearance_count}회</span>
                      <div className="w-14 h-1 bg-black/10 dark:bg-white/[0.07] rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
                          style={{ width: `${Math.round((k.appearance_count / (keywords[0]?.appearance_count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* 감성 트렌드 */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-pink-100/50 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">일별 감성 추이</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">긍정 키워드 비율 기준</p>
                  </div>
                </div>
                {sentimentTrend.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-4">
                      {sentimentTrend.map(d => (
                        <div key={d.date}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-white/50">{formatDay(d.date)}</span>
                            <span className="text-emerald-500 font-medium">긍정 {d.positive_pct}%</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${d.positive_pct}%` }} className="bg-emerald-400 transition-all duration-500" />
                            <div style={{ width: `${d.neutral_pct}%` }} className="bg-slate-300 dark:bg-slate-600 transition-all duration-500" />
                            <div style={{ width: `${d.negative_pct}%` }} className="bg-rose-400 transition-all duration-500" />
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-white/25 mt-0.5">{d.session_count}회 수집</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400 dark:text-white/30 pt-2 border-t border-black/5 dark:border-white/10">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />긍정</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />중립</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />부정</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-white/30 text-center py-8">데이터 없음</p>
                )}
              </GlassCard>
            </div>
          </div>
        )
      )}
    </div>
  );
}
