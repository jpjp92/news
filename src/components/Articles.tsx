import { useState, useMemo, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { FileText, ExternalLink, RefreshCw, AlertCircle, Smile, Meh, Frown, Activity, Database } from 'lucide-react';
import { useNews } from '../context/NewsContext';

type Period = 'session' | 'today' | '7d' | '30d';

interface DbArticle {
  id: string;
  session_id: string;
  title: string;
  summary: string;
  category: string;
  url: string;
  sentiment: string;
  sentiment_score: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  session: '현재 세션',
  today: '오늘',
  '7d': '7일',
  '30d': '30일',
};

export function Articles() {
  const { data, loading: sessionLoading, error: sessionError, fetchData, searchQuery, sentimentFilter, setSentimentFilter } = useNews();

  const [period, setPeriod] = useState<Period>('today');
  const [dbArticles, setDbArticles] = useState<DbArticle[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  // DB 기사 로딩
  useEffect(() => {
    if (period === 'session') return;
    setDbLoading(true);
    setDbError(null);
    fetch(`/api/history/articles?period=${period}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setDbArticles(json.data);
          setSessionCount(json.session_count);
        } else {
          setDbError(json.error || '데이터 로드 실패');
        }
      })
      .catch(() => setDbError('네트워크 오류'))
      .finally(() => setDbLoading(false));
  }, [period, refreshKey]);

  // 카테고리 변경 시 초기화
  useEffect(() => { setSelectedCategory('전체'); }, [period]);

  const handleRefresh = async () => {
    await fetchData();
    if (period !== 'session') setRefreshKey(k => k + 1);
  };

  const isDbMode = period !== 'session';
  const loading = isDbMode ? dbLoading : sessionLoading;
  const error = isDbMode ? dbError : sessionError;
  const rawArticles: any[] = isDbMode ? dbArticles : (data?.summaries || []);

  const categories = useMemo(() => {
    const cats = new Set(rawArticles.map(a => a.category).filter(Boolean));
    return ['전체', ...Array.from(cats)];
  }, [rawArticles]);

  const filteredArticles = useMemo(() => {
    let list = rawArticles;
    if (selectedCategory !== '전체') list = list.filter(a => a.category === selectedCategory);
    if (sentimentFilter !== 'all') list = list.filter(a => a.sentiment === sentimentFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawArticles, selectedCategory, sentimentFilter, searchQuery]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <span key={i} className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-0.5 rounded font-bold">{part}</span>
        : part
    );
  };

  const sentimentColor = (s: string) =>
    s === 'positive' ? 'text-emerald-500' : s === 'negative' ? 'text-rose-500' : 'text-slate-400';

  return (
    <div className="p-4 md:p-8 space-y-4 pb-12 w-full overflow-x-hidden">
      {/* 헤더 */}
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">최신 뉴스 기사</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {isDbMode
              ? <><Database size={12} className="inline mr-1" />{sessionCount}개 세션 수집 · 총 {rawArticles.length}개 기사 (중복 제거)</>
              : '현재 세션 실시간 분석 결과'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-700/60 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-xl text-indigo-700 dark:text-indigo-400 font-medium transition-all disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === p
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white/40 dark:bg-white/5 text-gray-500 dark:text-white/50 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <GlassCard className="p-4 bg-red-50/50 border-red-200/50 flex items-center gap-3 text-red-600 font-medium">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </GlassCard>
      )}

      {/* 통합 필터 */}
      {!loading && rawArticles.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider w-12 flex-shrink-0">카테고리</span>
            <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-gray-500 dark:text-white/50 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-black/5 dark:border-white/10 mb-2.5" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider w-12 flex-shrink-0">감성</span>
            <div className="flex gap-1.5">
              {[
                { id: 'all',      label: '전체', icon: <Activity size={12} />, active: 'bg-indigo-500' },
                { id: 'positive', label: '긍정', icon: <Smile size={12} />,    active: 'bg-emerald-500' },
                { id: 'neutral',  label: '중립', icon: <Meh size={12} />,      active: 'bg-slate-500' },
                { id: 'negative', label: '부정', icon: <Frown size={12} />,    active: 'bg-rose-500' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSentimentFilter(f.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sentimentFilter === f.id
                      ? `${f.active} text-white shadow-sm`
                      : 'text-gray-500 dark:text-white/50 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80'
                  }`}
                >
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-gray-400 dark:text-white/30">{filteredArticles.length}개</span>
          </div>
        </GlassCard>
      )}

      {/* 기사 목록 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <GlassCard key={i} className="p-6 h-48 animate-pulse flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200/50 dark:bg-white/10 rounded w-1/4" />
                <div className="h-5 bg-gray-200/50 dark:bg-white/10 rounded w-full" />
                <div className="h-5 bg-gray-200/50 dark:bg-white/10 rounded w-5/6" />
              </div>
              <div className="h-4 bg-gray-200/50 dark:bg-white/10 rounded w-full mt-4" />
            </GlassCard>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FileText size={36} className="mx-auto mb-3 text-gray-300 dark:text-white/20" />
          <p className="text-gray-500 dark:text-white/40 font-medium">
            {rawArticles.length === 0 ? '해당 기간에 수집된 기사가 없습니다' : '필터 조건에 맞는 기사가 없습니다'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((article, idx) => (
            <GlassCard key={idx} className="p-5 flex flex-col hover:shadow-lg dark:hover:shadow-indigo-500/10 transition-shadow duration-300">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                  {article.category}
                </span>
                {article.sentiment && (
                  <span className={`text-xs font-medium ${sentimentColor(article.sentiment)}`}>
                    {article.sentiment === 'positive' ? '↑ 긍정' : article.sentiment === 'negative' ? '↓ 부정' : '— 중립'}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-2 line-clamp-2 leading-tight flex-grow">
                {highlightText(article.title, searchQuery)}
              </h3>
              <p className="text-gray-600 dark:text-slate-300 text-sm line-clamp-2">
                {highlightText(article.summary, searchQuery)}
              </p>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <a
                  href={article.url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  원문 보기 <ExternalLink size={12} />
                </a>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
