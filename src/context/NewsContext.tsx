import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface NewsAnalysis {
  overallTrend: string;
  categories: { name: string; count: number; averageSentiment?: number }[];
  keyTopics: { keyword: string; sentiment: string; score: number }[];
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

export function NewsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<NewsAnalysis | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [collectedAt, setCollectedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
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

  // 마운트 시 DB 최신 세션 로드 (크롤링 없음)
  useEffect(() => {
    setLoading(true);
    fetch('/api/history/latest-session')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data);
          setModelUsed(json.modelUsed || '');
          setCollectedAt(json.collectedAt || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 새로고침: 실제 크롤링 + Gemma 분석
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news-analysis');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setModelUsed(json.modelUsed || '');
        setCollectedAt(new Date().toISOString());
      } else {
        setError(json.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

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
