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
import { Settings } from './components/Settings';
import { NewsProvider } from './context/NewsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const { theme } = useTheme();

  return (
    <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark dark-bg' : 'bg-slate-50'} transition-colors duration-500 relative`}>
      {/* Light mode orbs */}
      {theme !== 'dark' && (
        <>
          <div className="orb orb-light-1"></div>
          <div className="orb orb-light-2"></div>
          <div className="orb orb-light-3"></div>
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
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <NewsProvider>
          <AppContent />
        </NewsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
