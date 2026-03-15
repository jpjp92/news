import React from 'react';
import { LayoutDashboard, Newspaper, TrendingUp, Settings, LogOut, Hexagon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ activeTab = 'dashboard', setActiveTab = () => {}, isOpen = true, setIsOpen = () => {} }: SidebarProps) {
  return (
    <GlassCard className={`h-[calc(100vh-2rem)] m-4 flex flex-col transition-all duration-300 hidden md:flex ${isOpen ? 'w-64' : 'w-20'} dark:bg-slate-900/60 dark:border-white/5`}>
      <div className={`p-4 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen ? (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-2 rounded-xl text-white flex-shrink-0">
                <Hexagon size={24} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 whitespace-nowrap">
                뉴스 트렌드 분석
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-slate-700/50"
              title="사이드바 닫기"
            >
              <PanelLeftClose size={20} />
            </button>
          </>
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
        <nav className="space-y-2">
          <NavItem icon={<Settings size={20} />} label="설정" isOpen={isOpen} />
          <NavItem icon={<LogOut size={20} />} label="로그아웃" isOpen={isOpen} />
        </nav>
      </div>
    </GlassCard>
  );
}

function NavItem({ icon, label, active = false, onClick, isOpen = true }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; isOpen?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-white/60 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] font-bold' 
          : 'text-gray-600 dark:text-white/60 hover:bg-white/30 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-white'
      }`}
      title={!isOpen ? label : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      {isOpen && <span className="ml-3 whitespace-nowrap">{label}</span>}
    </button>
  );
}
