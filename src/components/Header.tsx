import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (isOpen: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 mx-4 mt-4 mb-3 px-5 md:px-6 flex items-center justify-between bg-[#fbfaf6]/72 backdrop-blur-md border border-[#ded9cf] rounded-xl shadow-[0_10px_28px_rgba(55,50,42,0.06)] transition-colors duration-300 dark:bg-[#191a18]/72 dark:border-white/[0.09] dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
      <div className="flex items-center gap-3 min-w-0">
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-[#ebe8df] dark:hover:bg-white/[0.08] text-[#6f6a60] dark:text-[#d8d2c8] transition-all"
          onClick={() => setSidebarOpen && setSidebarOpen(!sidebarOpen)}
          title="사이드바 열기"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-sm md:text-base font-extrabold tracking-[0.18em] text-[#202326] dark:text-[#f2eee7] truncate">
            NEWS DASH
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-[#f2f0ea]/70 dark:bg-white/[0.06] hover:bg-[#ebe8df] dark:hover:bg-white/[0.1] text-[#6f6a60] dark:text-[#d8d2c8] transition-all border border-transparent hover:border-[#ded9cf] dark:hover:border-white/10"
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
