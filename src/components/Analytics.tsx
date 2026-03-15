import React, { useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { TrendChart } from './TrendChart';
import { BarChart3, TrendingUp, RefreshCw, AlertCircle, PieChart, Activity } from 'lucide-react';
import { useNews } from '../context/NewsContext';

export function Analytics() {
  const { data, loading, error, fetchData } = useNews();

  const chartData = useMemo(() => {
    if (!data || !data.categories) return [];
    
    // Sort categories to maintain consistent order
    const sortedCategories = [...data.categories].sort((a, b) => b.count - a.count);
    
    return sortedCategories.map(cat => {
      // Find topics related to this category for a more granular sentiment
      // If none, we can use a randomized average sentiment or global average for visualization
      const relevantTopics = data.keyTopics.filter(t => t.keyword.includes(cat.name) || cat.name.includes(t.keyword));
      const avgSentiment = relevantTopics.length > 0 
        ? relevantTopics.reduce((acc, t) => acc + t.score, 0) / relevantTopics.length 
        : 50 + (Math.random() * 20); // Default to a neutral/slightly positive base if no mapping

      return {
        label: cat.name,
        articles: cat.count,
        sentiment: Math.round(avgSentiment)
      };
    });
  }, [data]);

  return (
    <div className="p-4 md:p-8 space-y-6 pb-12 w-full overflow-x-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">심층 데이터 분석</h1>
          <p className="text-gray-600 dark:text-gray-400">뉴스 트렌드와 감성 분석을 더 깊게 살펴봅니다</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-700/60 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-xl text-indigo-700 dark:text-indigo-400 font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {error && (
        <GlassCard className="p-4 bg-red-50/50 border-red-200/50 flex items-center gap-3 text-red-600 font-medium">
          <AlertCircle size={20} />
          <p>{error}</p>
        </GlassCard>
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <GlassCard className="h-64 bg-gray-200/50"></GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="h-64 bg-gray-200/50"></GlassCard>
            <GlassCard className="h-64 bg-gray-200/50"></GlassCard>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">주요 토픽 인공지능 분석</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.keyTopics?.map((topic, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white/30 dark:bg-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{topic.keyword}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
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
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                  <PieChart size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">카테고리별 비중</h2>
              </div>
              <div className="space-y-4">
                {data?.categories?.map((cat, idx) => {
                  const maxCount = Math.max(...(data.categories.map(c => c.count) || [1]));
                  const width = `${(cat.count / maxCount) * 100}%`;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{cat.count}개 기사</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" 
                          style={{ width }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-100/50 dark:bg-pink-900/30 rounded-xl text-pink-600 dark:text-pink-400">
                    <Activity size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">트렌드 오버뷰</h2>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">기사 수</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                    <span className="text-gray-600 dark:text-gray-400">감성 지수</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 -mx-6 -mb-6 min-h-[300px]">
                <TrendChart data={chartData} transparent hideHeader className="!p-6" />
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
