import React, { useState, useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { TrendChart } from './TrendChart';
import { Activity, BookOpen, Hash, RefreshCw, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Sparkles } from 'lucide-react';
import { useNews } from '../context/NewsContext';

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

export function Dashboard({ setActiveTab }: DashboardProps) {
  const { data, modelUsed, loading, error, fetchData, searchQuery } = useNews();
  const [showAllSummaries, setShowAllSummaries] = useState(false);

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

  const chartData = useMemo(() => {
    if (!data || !data.categories) return [];
    const calculated = data.categories.map(cat => ({
      label: cat.name,
      articles: cat.count,
      sentiment: Number(cat.averageSentiment) || 50
    }));
    console.log('[DASHBOARD] Calculated chartData from real API results:', calculated);
    return calculated;
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
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6">
        <GlassCard className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-4 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl md:rounded-2xl text-indigo-600 dark:text-indigo-400">
            <BookOpen size={20} className="md:w-7 md:h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-white/60 truncate">기사 수</p>
            <h3 className="text-lg md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? ".." : data?.summaries?.length || 0}
            </h3>
          </div>
        </GlassCard>
        
        <GlassCard className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-4 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl md:rounded-2xl text-purple-600 dark:text-purple-400">
            <Hash size={20} className="md:w-7 md:h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-white/60 truncate">키워드</p>
            <h3 className="text-lg md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? ".." : data?.keyTopics?.length || 0}
            </h3>
          </div>
        </GlassCard>

        <GlassCard className="p-3 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left">
          <div className="p-2 md:p-4 bg-pink-100/50 dark:bg-pink-900/30 rounded-xl md:rounded-2xl text-pink-600 dark:text-pink-400">
            <Activity size={20} className="md:w-7 md:h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-white/60 truncate">분류</p>
            <h3 className="text-lg md:text-3xl font-bold text-gray-800 dark:text-white">
              {loading ? ".." : data?.categories?.length || 0}
            </h3>
          </div>
        </GlassCard>
      </div>

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

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">실시간 인기 키워드</h3>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                <div className="animate-pulse flex gap-2 flex-wrap">
                  <div className="h-8 w-20 bg-white/50 rounded-full"></div>
                  <div className="h-8 w-24 bg-white/50 rounded-full"></div>
                  <div className="h-8 w-16 bg-white/50 rounded-full"></div>
                </div>
              ) : (
                data?.keyTopics?.map((topic, idx) => {
                  const isPositive = topic.sentiment === 'positive';
                  const isNegative = topic.sentiment === 'negative';
                  return (
                    <span 
                      key={idx} 
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                        isPositive ? 'bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
                        isNegative ? 'bg-rose-100/50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400' :
                        'bg-gray-100/50 dark:bg-slate-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {topic.keyword} <span className="opacity-60 text-xs ml-1">{topic.score}</span>
                    </span>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
