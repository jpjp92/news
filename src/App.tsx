/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Articles } from './components/Articles';
import { Analytics } from './components/Analytics';
import { NewsProvider } from './context/NewsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme } = useTheme();

  return (
    <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark dark-bg' : 'bg-slate-50'} transition-colors duration-500 relative`}>
      {/* Light mode decorative glow */}
      {theme !== 'dark' && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full blur-[80px] pointer-events-none bg-pink-300/30"></div>
        </>
      )}
      {/* Dark mode orbs */}
      {theme === 'dark' && (
        <>
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </>
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'articles' && <Articles />}
          {activeTab === 'analytics' && <Analytics />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <NewsProvider>
        <AppContent />
      </NewsProvider>
    </ThemeProvider>
  );
}
