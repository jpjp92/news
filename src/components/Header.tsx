import React, { useState, useRef, useEffect } from 'react';
import { Search, Sun, Moon, Menu, History } from 'lucide-react';
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
    <GlassCard className="h-16 mx-4 mt-4 mb-3 px-6 flex items-center justify-between bg-[#fbfaf6]/72 backdrop-blur-md border-[#ded9cf] shadow-[0_10px_28px_rgba(55,50,42,0.06)] transition-colors duration-300 dark:bg-[#191a18]/72 dark:backdrop-blur-md dark:border-white/[0.09] dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
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
            placeholder="뉴스 검색" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#f2f0ea]/70 dark:bg-[#111316]/58 border border-[#ded9cf] dark:border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#c83a32]/20 focus:border-[#b7ada0] dark:focus:border-[#ba9a74]/60 placeholder-[#8a8479] dark:placeholder-[#8f8a80] text-[#202326] dark:text-[#f2eee7]"
          />
          {isFocused && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#fbfaf6]/95 dark:bg-[#191a18]/94 backdrop-blur-xl border border-[#ded9cf] dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
              <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">최근 검색어</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearRecentSearches(); }}
                className="text-[10px] text-[#c83a32] dark:text-[#d7a36f] hover:underline"
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
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-[#ebe8df] dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
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
          className="p-2 rounded-lg bg-[#f2f0ea]/70 dark:bg-white/[0.06] hover:bg-[#ebe8df] dark:hover:bg-white/[0.1] text-[#6f6a60] dark:text-[#d8d2c8] transition-all border border-transparent hover:border-[#ded9cf] dark:hover:border-white/10"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </GlassCard>
  );
}
