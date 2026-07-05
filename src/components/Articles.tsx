import { useState, useMemo, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { FileText, ExternalLink, RefreshCw, AlertCircle, Smile, Meh, Frown, Activity, Database, X } from 'lucide-react';
import { useNews } from '../context/NewsContext';

type Period = 'session' | 'today' | '7d' | '30d' | 'all';
type SortOrder = 'newest' | 'oldest';

interface DbArticle {
  id: string;
  session_id: string;
  title: string;
  summary: string;
  category: string;
  url: string;
  sentiment: string;
  sentiment_score: number;
  collected_at?: string | null;
  order_index?: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  session: '현재 세션',
  today: '오늘',
  '7d': '7일',
  '30d': '30일',
  all: '전체',
};

export function Articles() {
  const { data, loading: sessionLoading, error: sessionError, fetchData, searchQuery, setSearchQuery, sentimentFilter, setSentimentFilter } = useNews();

  const [period, setPeriod] = useState<Period>('today');
  const [dbArticles, setDbArticles] = useState<DbArticle[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const pageSize = isMobile ? 10 : 30;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncPageSize = () => setIsMobile(mediaQuery.matches);
    syncPageSize();
    mediaQuery.addEventListener('change', syncPageSize);
    return () => mediaQuery.removeEventListener('change', syncPageSize);
  }, []);

  // DB 기사 로딩
  useEffect(() => {
    if (period === 'session') return;
    setDbLoading(true);
    setDbError(null);
    fetch(`/api/history/articles?period=${period}`)
      .then(r => {
        if (!r.ok) throw Object.assign(new Error(), { status: r.status });
        return r.json();
      })
      .then(json => {
        if (json.success) {
          setDbArticles(json.data);
          setSessionCount(json.session_count);
        } else {
          setDbError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      })
      .catch((err) => {
        const status = err?.status;
        if (status === 429) setDbError('요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.');
        else if (status >= 500) setDbError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        else setDbError('네트워크 연결을 확인해주세요.');
      })
      .finally(() => setDbLoading(false));
  }, [period, refreshKey]);

  // 카테고리 변경 시 초기화
  useEffect(() => { setSelectedCategory('전체'); }, [period]);

  const handleRefresh = async () => {
    await fetchData();
    if (period !== 'session') setRefreshKey(k => k + 1);
  };

  const isDbMode = period !== 'session';
  const useCurrentSessionFallback = period === 'today' && !dbLoading && !dbError && dbArticles.length === 0 && (data?.summaries?.length || 0) > 0;
  const loading = isDbMode ? dbLoading : sessionLoading;
  const error = isDbMode ? dbError : sessionError;
  const rawArticles: any[] = isDbMode
    ? (useCurrentSessionFallback ? (data?.summaries || []) : dbArticles)
    : (data?.summaries || []);

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
    return [...list].sort((a, b) => {
      const aTime = new Date(a.collected_at || a.created_at || 0).getTime();
      const bTime = new Date(b.collected_at || b.created_at || 0).getTime();
      const aOrder = Number(a.order_index ?? rawArticles.indexOf(a));
      const bOrder = Number(b.order_index ?? rawArticles.indexOf(b));
      const newestCompare = bTime - aTime || aOrder - bOrder;
      const oldestCompare = aTime - bTime || bOrder - aOrder;
      return sortOrder === 'newest' ? newestCompare : oldestCompare;
    });
  }, [rawArticles, selectedCategory, sentimentFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const visibleArticles = filteredArticles.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [period, selectedCategory, sentimentFilter, searchQuery, sortOrder, useCurrentSessionFallback, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const highlightText = (text: string, query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return text;
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === trimmedQuery.toLowerCase()
        ? <span key={i} className="bg-[#c83a32]/15 dark:bg-[#d7a36f]/18 text-[#c83a32] dark:text-[#d7a36f] px-0.5 rounded font-bold">{part}</span>
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
              ? useCurrentSessionFallback
                ? <><Database size={12} className="inline mr-1" />오늘 DB 기사 없음 · 현재 세션 {rawArticles.length}개 기사 표시</>
                : <><Database size={12} className="inline mr-1" />{sessionCount}개 세션 수집 · 총 {rawArticles.length}개 기사</>
              : '현재 세션 실시간 분석 결과'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#232323] dark:bg-[#d7a36f] hover:bg-[#3a3935] dark:hover:bg-[#e0b481] backdrop-blur-md border border-[#232323] dark:border-[#d7a36f] rounded-lg text-white dark:text-[#111316] font-medium transition-all disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === p
                ? 'bg-[#232323] dark:bg-[#d7a36f] text-white dark:text-[#111316] shadow-sm'
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
      {useCurrentSessionFallback && (
        <GlassCard className="p-4 border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200">
          <p className="text-sm font-medium">오늘 수집된 DB 데이터가 없어 현재 세션 결과를 대신 보여주고 있습니다.</p>
        </GlassCard>
      )}

      {!loading && rawArticles.length > 0 && (
        <GlassCard className="p-3">
          {searchQuery.trim() && (
            <>
              <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg bg-[#ebe8df]/70 dark:bg-white/[0.045] border border-[#ded9cf] dark:border-white/10 px-3 py-2">
                <p className="min-w-0 truncate text-xs text-gray-600 dark:text-white/60">
                  검색어 <span className="font-bold text-[#202326] dark:text-[#f2eee7]">"{searchQuery.trim()}"</span> 관련 기사
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-[#c83a32] dark:text-[#d7a36f] hover:text-[#9f2f2a] dark:hover:text-[#e0b481]"
                >
                  <X size={12} />
                  해제
                </button>
              </div>
              <div className="border-t border-black/5 dark:border-white/10 mb-2.5" />
            </>
          )}
          <div className="flex items-center gap-1.5 mb-2.5 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase w-10 flex-shrink-0">카테고리</span>
            <div className="flex gap-1 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#232323] dark:bg-[#d7a36f] text-white dark:text-[#111316] shadow-sm'
                      : 'text-gray-500 dark:text-white/50 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-black/5 dark:border-white/10 mb-2.5" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase w-10 flex-shrink-0">감성</span>
            <div className="flex gap-1 flex-1">
              {[
                { id: 'all',      label: '전체', icon: <Activity size={11} />, active: 'bg-[#232323] dark:bg-[#d7a36f] dark:text-[#111316]' },
                { id: 'positive', label: '긍정', icon: <Smile size={11} />,    active: 'bg-emerald-500' },
                { id: 'neutral',  label: '중립', icon: <Meh size={11} />,      active: 'bg-slate-500' },
                { id: 'negative', label: '부정', icon: <Frown size={11} />,    active: 'bg-rose-500' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSentimentFilter(f.id)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    sentimentFilter === f.id
                      ? `${f.active} text-white shadow-sm`
                      : 'text-gray-500 dark:text-white/50 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80'
                  }`}
                >
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
            <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-white/30">
              {filteredArticles.length}개 / {safeCurrentPage}페이지
            </span>
          </div>
          <div className="border-t border-black/5 dark:border-white/10 my-2.5" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase w-10 flex-shrink-0">정렬</span>
            <div className="flex gap-1 flex-1 min-w-0">
              {[
                { id: 'newest' as const, label: '최신순' },
                { id: 'oldest' as const, label: '오래된순' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setSortOrder(option.id)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    sortOrder === option.id
                      ? 'bg-[#232323] dark:bg-[#d7a36f] text-white dark:text-[#111316] shadow-sm'
                      : 'text-gray-500 dark:text-white/50 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-400 dark:text-white/30">
            <span>
              {startIndex + 1}-{Math.min(startIndex + pageSize, filteredArticles.length)} / {filteredArticles.length}개 표시
            </span>
            {filteredArticles.length > pageSize && (
              <span>
                {pageSize}개씩 페이지 단위로 보여줍니다
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleArticles.map((article, idx) => (
            <GlassCard key={idx} className="p-5 flex flex-col hover:shadow-lg dark:hover:shadow-[#d7a36f]/10 transition-shadow duration-300">
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-0.5 bg-[#ebe8df] dark:bg-white/[0.08] text-[#6f6a60] dark:text-[#d8d2c8] rounded-full text-[10px] font-semibold whitespace-nowrap truncate max-w-[7rem]">
                  {article.category}
                </span>
                {article.sentiment && (
                  <span className={`text-[11px] font-medium ${sentimentColor(article.sentiment)}`}>
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
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c83a32] dark:text-[#d7a36f] hover:text-[#9f2f2a] dark:hover:text-[#e0b481] text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    원문 보기 <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-gray-400 dark:text-slate-500 text-xs font-medium">
                    원문 링크 없음
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-gray-600 dark:text-white/70 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/60 dark:hover:bg-white/10"
              >
                이전
              </button>
              <span className="text-sm text-gray-500 dark:text-white/40 min-w-[6rem] text-center">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-[#232323] dark:bg-[#d7a36f] text-white dark:text-[#111316] hover:bg-[#3a3935] dark:hover:bg-[#e0b481] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
