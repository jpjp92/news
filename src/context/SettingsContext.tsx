import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const ALL_CATEGORIES = ['정치', '경제', '사회', '생활/문화', 'IT/과학', '세계'] as const;

export interface AppSettings {
  enabledCategories: string[];
  articleLimit: number;
  temperature: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  enabledCategories: [...ALL_CATEGORIES],
  articleLimit: 18,
  temperature: 0,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  ALL_CATEGORIES: readonly string[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem('appSettings');
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, ALL_CATEGORIES }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
}
