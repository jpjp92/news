import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { TrendChart } from './TrendChart';
import { BookOpen, Hash, RefreshCw, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Sparkles, TrendingUp, TrendingDown, CalendarDays, BarChart3 } from 'lucide-react';
import { SentimentGauge } from './SentimentGauge';
import { useNews } from '../context/NewsContext';

interface PeriodStats {
  session_count: number;
  article_count: number;
  positive_pct: number | null;
}

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { data, modelUsed, collectedAt, loading, error, fetchData, searchQuery } = useNews();
  const [showAllSummaries, setShowAllSummaries] = useState(false);
  const [periodStats, setPeriodStats] = useState<{ week: PeriodStats; month: PeriodStats } | null>(null);
  const periodCardStyles = {
    warm: 'bg-[#e8ded1] dark:bg-[#4a3327]/45 text-[#c83a32] dark:text-[#d7a36f]',
    teal: 'bg-[#dce8e3] dark:bg-[#263d38]/52 text-[#1f6f68] dark:text-[#7fb2a8]',
  };

  useEffect(() => {
    fetch('/api/history/stats')
      .then(r => r.json())
      .then(json => { if (json.success) setPeriodStats(json.data); })
      .catch(() => {});
  }, []);

  const filteredSummaries = useMemo(() => {
    const allSummaries = data?.summaries || [];
    if (!searchQuery.trim()) return allSummaries;
    
    const query = searchQuery.toLowerCase();
    return allSummaries.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.summary.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [data?.summaries, searchQuery]);

  const displayedSummaries = showAllSummaries 
    ? filteredSummaries 
    : filteredSummaries.slice(0, 5);

  const sentimentStats = useMemo(() => {
    const summaries = data?.summaries || [];
    if (!summaries.length) return { posPct: 0, negPct: 0 };
    const pos = summaries.filter(t => t.sentiment === 'positive').length;
    const neg = summaries.filter(t => t.sentiment === 'negative').length;
    const posPct = Math.round((pos / summaries.length) * 100);
    const negPct = Math.round((neg / summaries.length) * 100);
    return { posPct, negPct };
  }, [data?.summaries]);

  const chartData = useMemo(() => {
    if (!data || !data.categories) return [];
    return data.categories.map(cat => ({
      label: cat.name,
      articles: cat.count,
      sentiment: Number(cat.averageSentiment) || 50
    }));
  }, [data]);

  const isEmptyState = !loading && !error && (!data || (data.summaries?.length || 0) === 0);

  return (
    <div className="p-3 md:p-4 space-y-5 md:space-y-6 pb-10 w-full overflow-x-hidden">
      <div className="relative overflow-hidden rounded-xl border border-white/70 dark:border-white/[0.08] bg-[linear-gradient(120deg,rgba(255,255,255,0.72),rgba(255,255,255,0.32)),linear-gradient(135deg,rgba(180,211,206,0.78),rgba(240,218,189,0.64)_52%,rgba(221,184,177,0.56))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)),linear-gradient(135deg,rgba(38,61,56,0.72),rgba(74,51,39,0.58)_54%,rgba(35,35,35,0.62))] shadow-[0_16px_38px_rgba(55,50,42,0.07)] dark:shadow-[0_16px_38px_rgba(0,0,0,0.26)] p-4 md:p-6">
      <div className="flex justify-between items-end gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-xs font-extrabold uppercase tracking-[0.18em] text-[#c83a32] dark:text-[#d7a36f] mb-2">Daily Intelligence</p>
          <h1 className="text-xl md:text-4xl font-extrabold text-[#202326] dark:text-white tracking-[-0.02em] leading-tight truncate">일일 뉴스 분석 리포트</h1>
          <p className="text-xs md:text-sm text-[#514c44] dark:text-white/70 flex items-center gap-1 flex-wrap mt-2">
            네이버 뉴스 AI 기반 인사이트
            {modelUsed && <span className="px-1.5 py-0.5 bg-white/45 dark:bg-white/[0.08] text-[#6f6a60] dark:text-[#d8d2c8] rounded-md text-[10px] md:text-xs font-medium border border-white/60 dark:border-white/10 shrink-0">{modelUsed}</span>}
            {collectedAt && <span className="text-[10px] md:text-xs text-gray-400 dark:text-white/30 shrink-0">{new Date(collectedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 수집</span>}
          </p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-4 md:py-2 bg-[#232323] dark:bg-[#d7a36f] hover:bg-[#3a3935] dark:hover:bg-[#e0b481] backdrop-blur-md border border-[#232323] dark:border-[#d7a36f] rounded-lg text-white dark:text-[#111316] font-medium transition-all disabled:opacity-50 text-xs md:text-sm shrink-0"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="hidden xs:inline">새로고침</span>
          <span className="xs:hidden">갱신</span>
        </button>
      </div>
      </div>

      {error && (
        <GlassCard className="p-4 bg-red-50/50 border-red-200/50 flex items-center gap-3 text-red-600">
          <AlertCircle size={18} className="md:w-5 md:h-5 shrink-0" />
          <p className="text-xs md:text-sm font-medium">{error}</p>
        </GlassCard>
      )}

      {isEmptyState && (
        <GlassCard className="p-4 md:p-5 border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-900/10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-semibold text-amber-800 dark:text-amber-300 truncate">표시할 분석 데이터가 아직 없습니다</p>
              <p className="text-[10px] md:text-xs text-amber-700/80 dark:text-amber-200/70 mt-0.5 line-clamp-1">
                분석을 다시 실행해보세요.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="shrink-0 px-2.5 py-1.5 text-[11px] md:text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap"
            >
              재시도
            </button>
          </div>
        </GlassCard>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left bg-white/58 dark:bg-white/[0.055]">
          <div className="p-2 md:p-3 bg-[#e8ded1] dark:bg-[#4a3327]/45 rounded-lg text-[#c83a32] dark:text-[#d7a36f]">
            <BookOpen size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">기사 수</p>
            <h3 className="text-lg md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? '..' : data?.summaries?.length || 0}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left bg-white/58 dark:bg-white/[0.055]">
          <div className="p-2 md:p-3 bg-[#dce8e3] dark:bg-emerald-900/30 rounded-lg text-[#1f6f68] dark:text-emerald-400">
            <TrendingUp size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">기사 긍정 비율</p>
            <h3 className="text-lg md:text-3xl font-bold text-[#1f6f68] dark:text-emerald-400">
              {loading ? '..' : `${sentimentStats.posPct}%`}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left bg-white/58 dark:bg-white/[0.055]">
          <div className="p-2 md:p-3 bg-[#ead9d3] dark:bg-rose-900/30 rounded-lg text-[#c83a32] dark:text-rose-400">
            <TrendingDown size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">기사 부정 비율</p>
            <h3 className="text-lg md:text-3xl font-bold text-[#c83a32] dark:text-rose-400">
              {loading ? '..' : `${sentimentStats.negPct}%`}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left bg-white/58 dark:bg-white/[0.055]">
          <div className="p-2 md:p-3 bg-[#ebe8df] dark:bg-white/[0.07] rounded-lg text-[#6f6a60] dark:text-[#b8b0a5]">
            <Hash size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">키워드</p>
            <h3 className="text-lg md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? '..' : data?.keyTopics?.length || 0}
            </h3>
          </div>
        </GlassCard>
      </div>

      {/* 주간 · 월간 통계 */}
      {periodStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[
            { label: '주간 통계', sublabel: '최근 7일', icon: <CalendarDays size={16} />, stats: periodStats.week, color: 'warm' as const },
            { label: '월간 통계', sublabel: '최근 30일', icon: <BarChart3 size={16} />, stats: periodStats.month, color: 'teal' as const },
          ].map(({ label, sublabel, icon, stats, color }) => (
            <GlassCard key={label} className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${periodCardStyles[color]}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-xs md:text-sm font-bold text-gray-700 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-white/30">{sublabel}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">수집 기사</p>
                    <p className="text-sm md:text-base font-bold text-gray-700 dark:text-white">{stats.article_count.toLocaleString()}개</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">수집 세션</p>
                    <p className="text-sm md:text-base font-bold text-gray-700 dark:text-white">{stats.session_count}회</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">긍정 비율</p>
                    <p className={`text-sm md:text-base font-bold ${stats.positive_pct !== null ? 'text-emerald-500' : 'text-gray-300 dark:text-white/20'}`}>
                      {stats.positive_pct !== null ? `${stats.positive_pct}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab?.('analytics')}
                className="text-xs text-[#c83a32] dark:text-[#d7a36f] hover:text-[#9f2f2a] dark:hover:text-[#e0b481] transition-colors flex-shrink-0"
              >
                <ArrowRight size={14} />
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="h-80 overflow-hidden">
            <TrendChart
              data={chartData}
              transparent
              hideHeader={false}
              title="카테고리별 기사 수 및 감성"
              subtitle="현재 세션 기준 카테고리별 기사 수와 평균 감성 점수"
              articlesLabel="기사 수"
              sentimentLabel="평균 감성"
            />
          </GlassCard>
          
          <GlassCard className="p-4 md:p-6 overflow-hidden border-[#ded9cf] dark:border-white/[0.1] relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-[#e8ded1] dark:bg-[#4a3327]/45 rounded-lg text-[#c83a32] dark:text-[#d7a36f]">
                <Sparkles size={18} />
              </div>
              <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-white">전체 뉴스 트렌드 분석</h3>
            </div>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/50 rounded w-full"></div>
                <div className="h-4 bg-white/50 rounded w-5/6"></div>
                <div className="h-4 bg-white/50 rounded w-4/5"></div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[#c83a32]/25 rounded-full"></div>
                <p className="text-xs md:text-base text-gray-700 dark:text-slate-200 leading-relaxed font-medium pl-2 italic">
                  "{data?.overallTrend || "현재 분석된 주요 뉴스 트렌드가 없습니다."}"
                </p>
                {!!data?.trendDrivers?.length && (
                  <div className="flex flex-wrap gap-1.5 mt-4 pl-2">
                    {data.trendDrivers.slice(0, 5).map(driver => (
                      <span
                        key={driver}
                        className="px-2 py-1 rounded-full bg-[#f2f0ea] dark:bg-white/[0.07] text-[#6f6a60] dark:text-[#d8d2c8] text-xs font-medium border border-[#ded9cf] dark:border-white/10"
                      >
                        #{driver}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3 text-right">
                  *AI 분석 결과로 실제 사실과 다를 수 있습니다.
                </p>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-white whitespace-nowrap">최근 뉴스 요약</h3>
              <div className="flex gap-2 flex-shrink-0">
                {data && data.summaries.length > 5 && (
                  <button
                    onClick={() => setShowAllSummaries(!showAllSummaries)}
                    className="text-[11px] md:text-xs text-[#c83a32] hover:text-[#9f2f2a] flex items-center gap-0.5 font-medium transition-colors whitespace-nowrap"
                  >
                    {showAllSummaries ? (
                      <><ChevronUp size={13} />축소</>
                    ) : (
                      <><ChevronDown size={13} />모두 보기 ({data.summaries.length})</>
                    )}
                  </button>
                )}
                {setActiveTab && (
                  <button
                    onClick={() => setActiveTab('articles')}
                    className="text-[11px] md:text-xs text-[#1f6f68] dark:text-[#7fb2a8] hover:text-[#15534e] dark:hover:text-[#9ccbc2] flex items-center gap-0.5 font-medium transition-colors whitespace-nowrap"
                  >
                    전체 기사 <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-4">
                    <div className="w-16 h-6 bg-white/50 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/50 rounded w-3/4"></div>
                      <div className="h-3 bg-white/50 rounded w-full"></div>
                    </div>
                  </div>
                ))
              ) : (
                displayedSummaries?.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setActiveTab?.('articles')}
                    className="p-3 md:p-4 rounded-lg bg-white/32 dark:bg-white/5 border border-[#ded9cf] dark:border-white/10 hover:bg-white/55 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold bg-[#ebe8df] dark:bg-white/[0.08] text-[#6f6a60] dark:text-[#d8d2c8] rounded-full">
                        {item.category}
                      </span>
                      <h4 className="text-xs md:text-base font-bold text-gray-800 dark:text-slate-100 line-clamp-1 flex-1 group-hover:text-[#c83a32] dark:group-hover:text-[#d7a36f] transition-colors" title={item.title}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300 ml-1">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <SentimentGauge topics={data?.keyTopics || []} loading={loading} />

          <GlassCard className="p-4 md:p-6">
            <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-white mb-4">주요 카테고리 분포</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                </div>
              ) : (
                data?.categories?.map((cat, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-white/32 dark:bg-white/5 border border-[#ded9cf] dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs md:text-base font-medium text-gray-700 dark:text-slate-300">{cat.name}</span>
                      <span className="text-xs md:text-base font-bold text-[#c83a32] dark:text-[#d7a36f] flex-shrink-0">{cat.count}개</span>
                    </div>
                    {cat.dominantIssue && (
                      <p className="text-xs text-gray-500 dark:text-white/40 mt-1 line-clamp-2">{cat.dominantIssue}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5 overflow-hidden">
            <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-white mb-4">실시간 인기 키워드</h3>
            <div className="max-h-[188px] overflow-y-auto overscroll-contain pr-1 -mr-1">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 py-2">
                      <div className="h-3 w-5 bg-white/30 rounded"></div>
                      <div className="h-3 flex-1 bg-white/30 rounded"></div>
                      <div className="h-2 w-16 bg-white/30 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (() => {
                const topics = [...(data?.keyTopics || [])].sort((a, b) => b.score - a.score);
                const maxScore = topics[0]?.score || 1;
                return topics.map((topic, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-2 border-b border-black/5 dark:border-white/10 last:border-0">
                    <span className="text-[10px] text-gray-400 dark:text-white/30 font-mono w-5 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs md:text-sm text-gray-700 dark:text-white/85 font-medium flex-1 truncate">
                      {topic.keyword}
                    </span>
                    <span className={`text-[11px] md:text-xs flex-shrink-0 ${
                      topic.sentiment === 'positive' ? 'text-emerald-500' :
                      topic.sentiment === 'negative' ? 'text-rose-500' :
                      'text-slate-400'
                    }`}>
                      {topic.sentiment === 'positive' ? '↑' : topic.sentiment === 'negative' ? '↓' : '—'}
                    </span>
                    <div className="w-16 h-1 bg-black/10 dark:bg-white/[0.07] rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#c83a32] to-[#dd9d66]"
                        style={{ width: `${Math.round((topic.score / maxScore) * 100)}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
