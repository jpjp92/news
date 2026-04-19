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
  const { data, modelUsed, loading, error, fetchData, searchQuery } = useNews();
  const [showAllSummaries, setShowAllSummaries] = useState(false);
  const [periodStats, setPeriodStats] = useState<{ week: PeriodStats; month: PeriodStats } | null>(null);

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
    const topics = data?.keyTopics || [];
    if (!topics.length) return { posPct: 0, negPct: 0 };
    const pos = topics.filter(t => t.sentiment === 'positive').length;
    const neg = topics.filter(t => t.sentiment === 'negative').length;
    const posPct = Math.round((pos / topics.length) * 100);
    const negPct = Math.round((neg / topics.length) * 100);
    return { posPct, negPct };
  }, [data?.keyTopics]);

  const chartData = useMemo(() => {
    if (!data || !data.categories) return [];
    return data.categories.map(cat => ({
      label: cat.name,
      articles: cat.count,
      sentiment: Number(cat.averageSentiment) || 50
    }));
  }, [data]);

  return (
    <div className="p-4 space-y-6 pb-10 w-full overflow-x-hidden">
      <div className="flex justify-between items-end">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white truncate">일일 뉴스 분석 리포트</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-white/70 flex items-center gap-1 flex-wrap">
            네이버 뉴스 AI 기반 인사이트
            {modelUsed && <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md text-[10px] md:text-xs font-medium border border-indigo-200 dark:border-indigo-800 shrink-0">{modelUsed}</span>}
          </p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-700/60 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-xl text-indigo-700 dark:text-indigo-400 font-medium transition-all disabled:opacity-50 text-sm shrink-0"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="hidden xs:inline">새로고침</span>
          <span className="xs:hidden">갱신</span>
        </button>
      </div>

      {error && (
        <GlassCard className="p-4 bg-red-50/50 border-red-200/50 flex flex-col gap-2 text-red-600">
          <div className="flex items-center gap-3 font-semibold">
            <AlertCircle size={20} />
            <p>뉴스 분석 오류</p>
          </div>
          <p className="text-sm ml-8">
            {error.includes('API key not valid') || error.includes('GEMINI_API_KEY') ? (
              <>
                <strong>Gemini API 키가 설정되지 않았거나 유효하지 않습니다.</strong><br/>
                로컬 환경의 <code>.env</code> 파일에 <code>GEMINI_API_KEY</code>가 올바르게 설정되어 있는지 확인해주세요.<br/>
                <span className="text-xs opacity-75 mt-2 block">서버 요류 상세: {error}</span>
              </>
            ) : (
              error
            )}
          </p>
        </GlassCard>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-3 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <BookOpen size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">기사 수</p>
            <h3 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? '..' : data?.summaries?.length || 0}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-3 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">긍정 비율</p>
            <h3 className="text-xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? '..' : `${sentimentStats.posPct}%`}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-3 bg-rose-100/50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
            <TrendingDown size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">부정 비율</p>
            <h3 className="text-xl md:text-3xl font-bold text-rose-500 dark:text-rose-400">
              {loading ? '..' : `${sentimentStats.negPct}%`}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-5 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
            <Hash size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/60 truncate">키워드</p>
            <h3 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? '..' : data?.keyTopics?.length || 0}
            </h3>
          </div>
        </GlassCard>
      </div>

      {/* 주간 · 월간 통계 */}
      {periodStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[
            { label: '주간 통계', sublabel: '최근 7일', icon: <CalendarDays size={16} />, stats: periodStats.week, color: 'indigo' },
            { label: '월간 통계', sublabel: '최근 30일', icon: <BarChart3 size={16} />, stats: periodStats.month, color: 'purple' },
          ].map(({ label, sublabel, icon, stats, color }) => (
            <GlassCard key={label} className="p-4 flex items-center gap-4">
              <div className={`p-2.5 bg-${color}-100/50 dark:bg-${color}-900/30 rounded-xl text-${color}-600 dark:text-${color}-400 flex-shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-sm font-bold text-gray-700 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-white/30">{sublabel}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">수집 기사</p>
                    <p className="text-base font-bold text-gray-700 dark:text-white">{stats.article_count.toLocaleString()}개</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">수집 세션</p>
                    <p className="text-base font-bold text-gray-700 dark:text-white">{stats.session_count}회</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-white/30">긍정 비율</p>
                    <p className={`text-base font-bold ${stats.positive_pct !== null ? 'text-emerald-500' : 'text-gray-300 dark:text-white/20'}`}>
                      {stats.positive_pct !== null ? `${stats.positive_pct}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab?.('analytics')}
                className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex-shrink-0"
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
            <TrendChart data={chartData} transparent hideHeader={false} />
          </GlassCard>
          
          <GlassCard className="p-6 overflow-hidden border-indigo-200/30 dark:border-indigo-500/20 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Sparkles size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">전체 뉴스 트렌드 분석</h3>
            </div>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/50 rounded w-full"></div>
                <div className="h-4 bg-white/50 rounded w-5/6"></div>
                <div className="h-4 bg-white/50 rounded w-4/5"></div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full"></div>
                <p className="text-gray-700 dark:text-slate-200 leading-relaxed font-medium pl-2 italic">
                  "{data?.overallTrend || "현재 분석된 주요 뉴스 트렌드가 없습니다."}"
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-3 text-right">
                  *AI 분석 결과로 실제 사실과 다를 수 있습니다.
                </p>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">최근 뉴스 요약</h3>
              <div className="flex gap-3">
                {data && data.summaries.length > 5 && (
                  <button 
                    onClick={() => setShowAllSummaries(!showAllSummaries)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium transition-colors"
                  >
                    {showAllSummaries ? (
                      <><ChevronUp size={16} /> 축소하기</>
                    ) : (
                      <><ChevronDown size={16} /> 모두 보기 ({data.summaries.length})</>
                    )}
                  </button>
                )}
                {setActiveTab && (
                  <button 
                    onClick={() => setActiveTab('articles')}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    전체 기사 보기 <ArrowRight size={16} />
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
                    className="p-4 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-100/50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-gray-800 dark:text-slate-100 line-clamp-1 flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={item.title}>
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 ml-1">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <SentimentGauge topics={data?.keyTopics || []} loading={loading} />

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">주요 카테고리 분포</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                  <div className="h-8 bg-white/50 rounded w-full"></div>
                </div>
              ) : (
                data?.categories?.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10">
                    <span className="font-medium text-gray-700 dark:text-slate-300">{cat.name}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{cat.count}개</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">실시간 인기 키워드</h3>
            <div className="space-y-0">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
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
                    <span className="text-sm text-gray-700 dark:text-white/85 font-medium flex-1 truncate">
                      {topic.keyword}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${
                      topic.sentiment === 'positive' ? 'text-emerald-500' :
                      topic.sentiment === 'negative' ? 'text-rose-500' :
                      'text-slate-400'
                    }`}>
                      {topic.sentiment === 'positive' ? '↑' : topic.sentiment === 'negative' ? '↓' : '—'}
                    </span>
                    <div className="w-16 h-1 bg-black/10 dark:bg-white/[0.07] rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400"
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
