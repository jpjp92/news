import React, { useState, useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { FileText, ExternalLink, RefreshCw, AlertCircle, Smile, Meh, Frown, Sparkles, Activity } from 'lucide-react';
import { useNews } from '../context/NewsContext';

export function Articles() {
  const { data, loading, error, fetchData, searchQuery, sentimentFilter, setSentimentFilter } = useNews();
  const articles = data?.summaries || [];
  
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const categories = useMemo(() => {
    const cats = new Set(articles.map(a => a.category));
    return ['전체', ...Array.from(cats)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let filtered = articles;
    if (selectedCategory !== '전체') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    if (sentimentFilter !== 'all') {
      // Assuming server return keywords with sentiment, we map it back or server returns it in summaries
      // Looking at server.ts, summaries have categorical sentiment analysis
      filtered = filtered.filter(article => {
        // Find if any keyTopic matches this article's category or title for sentiment
        // In server.ts the summaries don't have individual sentiment, but keyTopics have it.
        // Let's refine the server logic if needed, but for now let's assume 'summaries' might need sentiment or we infer it.
        // WAIT: NewsContext.tsx 'NewsAnalysis' interface has summaries with { title, summary, category, url }
        // Let's check server.ts again. 
        // In server.ts, the summaries are generated with { title, summary, category, url }
        // But the keyTopics have keyword, sentiment, score.
        // Actually, there's no direct sentiment in summaries. 
        // I should probably have updated the server to include sentiment in summaries too for better filtering.
        // But for now, let's try to match category sentiment from keyTopics as a fallback.
        const summarySentiment = article.sentiment; // Use the new individual sentiment field
        if (!summarySentiment) return sentimentFilter === 'all';
        return summarySentiment === sentimentFilter;
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.summary.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [articles, selectedCategory, searchQuery, sentimentFilter, data]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-0.5 rounded font-bold">{part}</span> 
        : part
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-12 w-full overflow-x-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">최신 뉴스 기사</h1>
          <p className="text-gray-600 dark:text-slate-300">오늘의 주요 뉴스를 요약해서 보여드립니다</p>
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

      {!loading && articles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/50 dark:bg-slate-800/40 text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/60 border border-white/60 dark:border-white/10'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="flex gap-4 items-center p-2 bg-white/30 dark:bg-slate-800/20 rounded-2xl border border-white/40 dark:border-white/10 w-fit">
          <div className="flex items-center gap-1.5 px-3 text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 mr-1">
            <Sparkles size={14} />
            감성 필터
          </div>
          <div className="flex gap-2">
            {[
              { id: 'all', label: '전체', icon: <Activity size={14} />, color: 'bg-indigo-500' },
              { id: 'positive', label: '긍정', icon: <Smile size={14} />, color: 'bg-emerald-500' },
              { id: 'neutral', label: '중립', icon: <Meh size={14} />, color: 'bg-gray-500' },
              { id: 'negative', label: '부정', icon: <Frown size={14} />, color: 'bg-rose-500' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setSentimentFilter(filter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  sentimentFilter === filter.id
                    ? `${filter.color} text-white shadow-sm`
                    : 'bg-white/50 dark:bg-slate-800/40 text-gray-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/60'
                }`}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <GlassCard key={i} className="p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-5 bg-gray-200 rounded w-full"></div>
                <div className="h-5 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mt-4"></div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article, idx) => (
            <GlassCard key={idx} className="p-6 flex flex-col hover:shadow-lg dark:hover:shadow-indigo-500/10 transition-shadow duration-300">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                  {article.category}
                </span>
                <FileText size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-3 line-clamp-2 leading-tight">
                {highlightText(article.title, searchQuery)}
              </h3>
              <p className="text-gray-600 dark:text-slate-300 text-sm flex-grow line-clamp-3">
                {highlightText(article.summary, searchQuery)}
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <a 
                  href={article.url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  원문 보기 <ExternalLink size={14} />
                </a>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
