import { useState } from 'react';
import { Sun, Moon, Database, RotateCcw, Check, Cpu } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useNews } from '../context/NewsContext';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSettings, resetSettings, ALL_CATEGORIES } = useSettings();
  const { modelUsed, clearRecentSearches, recentSearches } = useNews();
  const [resetDone, setResetDone] = useState(false);
  const [cleared, setCleared] = useState(false);

  const toggleCategory = (cat: string) => {
    const next = settings.enabledCategories.includes(cat)
      ? settings.enabledCategories.filter(c => c !== cat)
      : [...settings.enabledCategories, cat];
    if (next.length === 0) return; // 최소 1개 유지
    updateSettings({ enabledCategories: next });
  };

  const handleReset = () => {
    resetSettings();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  const handleClearSearches = () => {
    clearRecentSearches();
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">설정</h2>
        <p className="text-sm text-gray-500 dark:text-white/40 mt-1">앱 동작과 표시 방식을 조정합니다</p>
      </div>

      {/* 화면 설정 */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-white/80 uppercase tracking-wider">화면</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">테마</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">라이트 / 다크 모드 전환</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center transition-transform duration-300 ${
              theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'
            }`}>
              {theme === 'dark' ? <Moon size={13} className="text-indigo-500" /> : <Sun size={13} className="text-amber-500" />}
            </span>
          </button>
        </div>
      </GlassCard>

      {/* 뉴스 수집 설정 */}
      <GlassCard className="p-5 space-y-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-white/80 uppercase tracking-wider">뉴스 수집</h3>

        {/* 카테고리 */}
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white mb-1">관심 카테고리</p>
          <p className="text-xs text-gray-500 dark:text-white/40 mb-3">선택한 카테고리의 뉴스만 수집합니다 (최소 1개)</p>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => {
              const active = settings.enabledCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-white/40 dark:bg-white/5 text-gray-500 dark:text-white/40 border border-white/50 dark:border-white/10'
                  }`}
                >
                  {active && <Check size={10} className="inline mr-1" />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 기사 수 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white">세션당 기사 수</p>
            <span className="text-sm font-bold text-indigo-500">{settings.articleLimit}개</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40 mb-3">분석에 사용할 기사 수 (많을수록 응답 시간 증가)</p>
          <input
            type="range"
            min={6}
            max={30}
            step={6}
            value={settings.articleLimit}
            onChange={e => updateSettings({ articleLimit: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-white/30 mt-1">
            <span>6</span><span>12</span><span>18</span><span>24</span><span>30</span>
          </div>
        </div>
      </GlassCard>

      {/* AI 모델 설정 */}
      <GlassCard className="p-5 space-y-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-white/80 uppercase tracking-wider">AI 모델</h3>

        {/* 현재 모델 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">현재 사용 모델</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">서버에서 자동 로테이션 (gemma-3-12b ↔ 27b)</p>
          </div>
          <div className="flex items-center gap-2 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-full px-3 py-1.5">
            <Cpu size={13} className="text-indigo-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-white/70">
              {modelUsed || 'gemma-3-*b-it'}
            </span>
          </div>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Temperature</p>
            <span className="text-sm font-bold text-indigo-500">{settings.temperature.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/40 mb-3">낮을수록 일관된 JSON 출력 (파싱 안정성 ↑), 높을수록 다양한 표현</p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={settings.temperature}
            onChange={e => updateSettings({ temperature: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 dark:text-white/30 mt-1">
            <span>0 (안정)</span><span>1 (창의)</span>
          </div>
        </div>
      </GlassCard>

      {/* 데이터 관리 */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 dark:text-white/80 uppercase tracking-wider">데이터 관리</h3>

        {/* DB 상태 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">Supabase 연동</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">poc-test 프로젝트 · 수집 세션 자동 저장</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <Database size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-500">연결됨</span>
          </div>
        </div>

        {/* 검색어 초기화 */}
        <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">최근 검색어 초기화</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">저장된 검색어 {recentSearches.length}개</p>
          </div>
          <button
            onClick={handleClearSearches}
            disabled={recentSearches.length === 0}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              cleared
                ? 'bg-emerald-500 text-white'
                : recentSearches.length === 0
                  ? 'bg-white/20 dark:bg-white/5 text-gray-300 dark:text-white/20 cursor-not-allowed'
                  : 'bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400'
            }`}
          >
            {cleared ? '완료' : '초기화'}
          </button>
        </div>
      </GlassCard>

      {/* 초기화 */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-gray-500 dark:text-white/40 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
        >
          <RotateCcw size={13} />
          {resetDone ? '초기화 완료' : '모든 설정 초기화'}
        </button>
      </div>
    </div>
  );
}
