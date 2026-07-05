import React from 'react';
import { LayoutDashboard, Newspaper, TrendingUp, Settings, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ activeTab = 'dashboard', setActiveTab = () => {}, isOpen = true, setIsOpen = () => {} }: SidebarProps) {
  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* 모바일 드로어 */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* 드로어 패널 */}
          <div className="relative w-64 h-full bg-[#fbfaf6]/95 dark:bg-[#191a18]/94 backdrop-blur-xl border-r border-[#ded9cf] dark:border-white/10 flex flex-col shadow-2xl">
            <div className="p-4 flex items-center justify-end border-b border-black/5 dark:border-white/10">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors"
                title="사이드바 닫기"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 px-4 py-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3 px-2">메뉴</p>
              <nav className="space-y-1">
                <NavItem icon={<LayoutDashboard size={20} />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => handleNav('dashboard')} isOpen />
                <NavItem icon={<Newspaper size={20} />} label="최신 뉴스" active={activeTab === 'articles'} onClick={() => handleNav('articles')} isOpen />
                <NavItem icon={<TrendingUp size={20} />} label="핵심 분석" active={activeTab === 'analytics'} onClick={() => handleNav('analytics')} isOpen />
              </nav>
            </div>
            <div className="p-4 border-t border-black/5 dark:border-white/10">
              <NavItem icon={<Settings size={20} />} label="설정" active={activeTab === 'settings'} onClick={() => handleNav('settings')} isOpen />
            </div>
          </div>
        </div>
      )}

      {/* 데스크탑 사이드바 */}
      <GlassCard className={`h-[calc(100vh-2rem)] m-4 flex-col transition-all duration-300 hidden md:flex ${isOpen ? 'w-64' : 'w-20'} bg-[#fbfaf6]/76 dark:bg-[#191a18]/68 border-[#ded9cf] dark:border-white/[0.08]`}>
        <div className={`p-4 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen ? (
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-700/50"
              title="사이드바 닫기"
            >
              <PanelLeftClose size={20} />
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-xl hover:bg-gray-100/50 dark:hover:bg-slate-700/50 mt-1"
              title="사이드바 열기"
            >
              <PanelLeftOpen size={22} />
            </button>
          )}
        </div>
        <div className="px-4 py-2 flex-1 mt-2">
          {isOpen && <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-4 px-2">메뉴</p>}
          <nav className="space-y-2">
            <NavItem icon={<LayoutDashboard size={20} />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isOpen={isOpen} />
            <NavItem icon={<Newspaper size={20} />} label="최신 뉴스" active={activeTab === 'articles'} onClick={() => setActiveTab('articles')} isOpen={isOpen} />
            <NavItem icon={<TrendingUp size={20} />} label="핵심 분석" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} isOpen={isOpen} />
          </nav>
        </div>
        <div className="p-4">
          <NavItem icon={<Settings size={20} />} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} isOpen={isOpen} />
        </div>
      </GlassCard>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick, isOpen = true }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; isOpen?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-[#232323] dark:bg-[#d7a36f] text-white dark:text-[#111316] shadow-sm font-bold dark:border dark:border-[#d7a36f]/30 relative'
          : 'text-[#6f6a60] dark:text-[#b8b0a5] hover:bg-[#ebe8df] dark:hover:bg-white/[0.06] hover:text-[#202326] dark:hover:text-[#f2eee7]'
      }`}
      title={!isOpen ? label : undefined}
    >
      {active && (
        <span className="hidden dark:block absolute -left-[17px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#d7a36f] shadow-[0_0_10px_rgba(215,163,111,0.55)]" />
      )}
      <div className="flex-shrink-0">{icon}</div>
      {isOpen && <span className="ml-3 whitespace-nowrap">{label}</span>}
    </button>
  );
}
