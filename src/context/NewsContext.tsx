import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from './SettingsContext';

export interface NewsAnalysis {
  overallTrend: string;
  trendDrivers?: string[];
  categories: { name: string; count: number; averageSentiment?: number; dominantIssue?: string }[];
  keyTopics: { keyword: string; sentiment: string; score: number; reason?: string }[];
  summaries: { title: string; summary: string; category: string; url?: string; sentiment?: string; sentimentScore?: number }[];
}

interface NewsContextType {
  data: NewsAnalysis | null;
  modelUsed: string;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  collectedAt: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sentimentFilter: string;
  setSentimentFilter: (sentiment: string) => void;
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

function getHttpErrorMessage(status: number): string {
  if (status === 429) return 'AI 분석 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
  if (status === 503) return 'AI 서비스가 일시적으로 점검 중입니다. 잠시 후 다시 시도해주세요.';
  if (status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

function hasMeaningfulData(analysis: NewsAnalysis | null | undefined) {
  if (!analysis) return false;
  if ((analysis.summaries?.length || 0) > 0) return true;
  if ((analysis.categories?.length || 0) > 0) return true;
  if ((analysis.keyTopics?.length || 0) > 0) return true;
  return Boolean(analysis.overallTrend?.trim());
}

export function NewsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [data, setData] = useState<NewsAnalysis | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const addRecentSearch = (term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t !== term);
      return [term, ...filtered].slice(0, 5);
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const requestFreshAnalysis = async (): Promise<{ success: boolean; data?: NewsAnalysis; modelUsed?: string; error?: string }> => {
    let res: Response;
    try {
      res = await fetch('/api/news-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch {
      return { success: false, error: '네트워크 연결을 확인해주세요.' };
    }

    if (!res.ok) {
      return { success: false, error: getHttpErrorMessage(res.status) };
    }

    return res.json();
  };

  // 새로고침: 실제 크롤링 + Gemini 분석
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await requestFreshAnalysis();
      if (json.success) {
        setData(json.data ?? null);
        setModelUsed(json.modelUsed || '');
        setCollectedAt(new Date().toISOString());
      } else {
        setError(json.error || '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch {
      setError('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 마운트 시 최신 세션을 우선 로드하고, 없으면 자동으로 1회 수집
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setLoading(true);
      setError(null);
      try {
        let latestJson: any = null;
        try {
          const latestRes = await fetch('/api/history/latest-session');
          if (latestRes.ok) {
            latestJson = await latestRes.json();
          }
        } catch {
          // DB 조회 실패 시 조용히 신규 수집으로 진행
        }

        if (cancelled) return;

        if (latestJson?.success && hasMeaningfulData(latestJson.data)) {
          setData(latestJson.data);
          setModelUsed(latestJson.modelUsed || '');
          setCollectedAt(latestJson.collectedAt || null);
          return;
        }

        const freshJson = await requestFreshAnalysis();
        if (cancelled) return;

        if (freshJson.success) {
          setData(freshJson.data ?? null);
          setModelUsed(freshJson.modelUsed || '');
          setCollectedAt(new Date().toISOString());
        } else {
          setError(freshJson.error || '초기 데이터를 불러오지 못했습니다. 새로고침을 눌러주세요.');
        }
      } catch {
        if (!cancelled) {
          setError('네트워크 연결을 확인해주세요.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NewsContext.Provider value={{
      data,
      modelUsed,
      collectedAt,
      loading,
      error,
      fetchData,
      searchQuery,
      setSearchQuery,
      sentimentFilter,
      setSentimentFilter,
      recentSearches,
      addRecentSearch,
      clearRecentSearches
    }}>
      {children}
    </NewsContext.Provider>
  );
}

export function useNews() {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}
