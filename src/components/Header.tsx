import { Sun, Moon, Menu } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (isOpen: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <GlassCard className="h-16 mx-4 mt-4 mb-3 px-6 flex items-center justify-between bg-[#fbfaf6]/72 backdrop-blur-md border-[#ded9cf] shadow-[0_10px_28px_rgba(55,50,42,0.06)] transition-colors duration-300 dark:bg-[#191a18]/72 dark:backdrop-blur-md dark:border-white/[0.09] dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={24} />
        </button>
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
