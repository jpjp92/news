import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sun, Moon, Menu, History, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useNews } from '../context/NewsContext';

interface HeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (isOpen: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { searchQuery, setSearchQuery, recentSearches, addRecentSearch, clearRecentSearches } = useNews();
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addRecentSearch(searchQuery);
      setIsFocused(false);
    }
  };

  return (
    <GlassCard className="h-16 mx-4 mt-4 px-6 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-xs hidden sm:block" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="뉴스 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-500 dark:placeholder-gray-400 text-slate-800 dark:text-gray-200"
          />
          {isFocused && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-20">
              <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">최근 검색어</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearRecentSearches(); }}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  모두 지우기
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(term);
                      setIsFocused(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2 transition-colors"
                  >
                    <History size={14} className="text-gray-400" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white/30 dark:bg-slate-800/40 hover:bg-white/50 dark:hover:bg-slate-700/60 text-gray-600 dark:text-gray-300 transition-all border border-transparent hover:border-white/20"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="p-2 rounded-full bg-white/30 dark:bg-slate-800/40 hover:bg-white/50 dark:hover:bg-slate-700/60 text-gray-600 dark:text-gray-300 transition-all border border-transparent hover:border-white/20 relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
        </div>
      </div>
    </GlassCard>
  );
}
