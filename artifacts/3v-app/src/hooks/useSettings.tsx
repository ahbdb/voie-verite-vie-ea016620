import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type TextSize = 'small' | 'normal' | 'large' | 'extra-large';

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

interface Settings {
  theme: Theme;
  textSize: TextSize;
  selectedVoice: string | null;
}

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setTextSize: (size: TextSize) => void;
  setSelectedVoice: (voiceURI: string | null) => void;
  isDarkMode: boolean;
  availableVoices: VoiceOption[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'normal',
  selectedVoice: null,
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const voiceOptions: VoiceOption[] = voices
        .filter(v => v.lang.startsWith('fr') || v.lang.startsWith('en') || v.lang.startsWith('it'))
        .map(v => ({
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
        }));
      setAvailableVoices(voiceOptions);
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Settings;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.warn('Erreur parsing settings', e);
      }
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateDarkMode(saved ? JSON.parse(saved).theme : 'system', prefersDark);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      updateDarkMode(settings.theme, e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const updateDarkMode = (theme: Theme, systemDark: boolean) => {
    const shouldBeDark = theme === 'dark' || (theme === 'system' && systemDark);
    setIsDarkMode(shouldBeDark);
    applyTheme(shouldBeDark);
  };

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setTheme = (theme: Theme) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateDarkMode(theme, prefersDark);
    const updated = { ...settings, theme };
    setSettings(updated);
    localStorage.setItem('app-settings', JSON.stringify(updated));
  };

  const setTextSize = (size: TextSize) => {
    const updated = { ...settings, textSize: size };
    setSettings(updated);
    localStorage.setItem('app-settings', JSON.stringify(updated));
    applyTextSize(size);
  };

  const setSelectedVoice = (voiceURI: string | null) => {
    const updated = { ...settings, selectedVoice: voiceURI };
    setSettings(updated);
    localStorage.setItem('app-settings', JSON.stringify(updated));
  };

  const applyTextSize = (size: TextSize) => {
    const root = document.documentElement;
    const scales: Record<TextSize, number> = {
      'small': 0.9,
      'normal': 1,
      'large': 1.15,
      'extra-large': 1.3,
    };
    root.style.setProperty('--text-scale', String(scales[size]));
  };

  useEffect(() => {
    applyTextSize(settings.textSize);
  }, [settings.textSize]);

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setTextSize, setSelectedVoice, isDarkMode, availableVoices }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return ctx;
};
