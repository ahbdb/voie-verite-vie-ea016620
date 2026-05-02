import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type TextSize = 'small' | 'normal' | 'large' | 'extra-large';
export type ColorPalette = 'liturgical' | 'blue' | 'green' | 'purple' | 'gold' | 'rose';

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

interface Settings {
  theme: Theme;
  textSize: TextSize;
  colorPalette: ColorPalette;
  selectedVoice: string | null;
}

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setTextSize: (size: TextSize) => void;
  setColorPalette: (palette: ColorPalette) => void;
  setSelectedVoice: (voiceURI: string | null) => void;
  isDarkMode: boolean;
  availableVoices: VoiceOption[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'normal',
  colorPalette: 'liturgical',
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

  const setColorPalette = (palette: ColorPalette) => {
    const updated = { ...settings, colorPalette: palette };
    setSettings(updated);
    localStorage.setItem('app-settings', JSON.stringify(updated));
    applyColorPalette(palette);
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

  const applyColorPalette = (palette: ColorPalette) => {
    const root = document.documentElement;
    
    if (palette === 'liturgical') {
      // Determine liturgical color based on current date
      const liturgicalColor = getLiturgicalColor();
      root.style.setProperty('--primary', liturgicalColor.primary);
      root.style.setProperty('--primary-glow', liturgicalColor.primaryGlow);
      root.style.setProperty('--accent', liturgicalColor.accent);
    } else {
      // Define static color palettes
      const palettes = {
        blue: {
          '--primary': '220 75% 55%',
          '--primary-glow': '220 65% 65%',
          '--accent': '220 60% 70%',
        },
        green: {
          '--primary': '155 55% 38%',
          '--primary-glow': '155 45% 48%',
          '--accent': '155 45% 72%',
        },
        purple: {
          '--primary': '269 35% 78%',
          '--primary-glow': '269 25% 85%',
          '--accent': '269 40% 65%',
        },
        gold: {
          '--primary': '43 65% 52%',
          '--primary-glow': '43 55% 72%',
          '--accent': '38 85% 55%',
        },
        rose: {
          '--primary': '350 65% 45%',
          '--primary-glow': '350 55% 55%',
          '--accent': '350 55% 42%',
        },
      };

      const selectedPalette = palettes[palette];
      Object.entries(selectedPalette).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  };

  const getLiturgicalColor = () => {
    const now = new Date();
    const year = now.getFullYear();
    
    // Simplified liturgical calendar logic
    // Advent: purple (4 weeks before Christmas)
    // Christmas: white (Dec 25 - Jan 5)
    // Lent: purple (40 days before Easter)
    // Easter: white/gold (Easter Sunday + 50 days)
    // Ordinary Time: green (rest of the year)
    
    const christmasStart = new Date(year, 11, 25); // Dec 25
    const christmasEnd = new Date(year, 0, 5); // Jan 5
    const adventStart = new Date(year, 11, 25);
    adventStart.setDate(adventStart.getDate() - 28); // 4 weeks before Christmas
    
    const easter = getEasterDate(year);
    const lentStart = new Date(easter);
    lentStart.setDate(lentStart.getDate() - 46); // 46 days before Easter (Ash Wednesday to Easter)
    
    const pentecost = new Date(easter);
    pentecost.setDate(pentecost.getDate() + 49); // 50 days after Easter (Pentecost is 49 days after Easter)
    
    const isChristmasSeason = now >= christmasStart || now <= christmasEnd;
    
    if (now >= adventStart && now < christmasStart) {
      // Advent - purple
      return {
        primary: '269 35% 78%', // purple
        primaryGlow: '269 25% 85%',
        accent: '269 40% 65%',
      };
    } else if (isChristmasSeason) {
      // Christmas season - white/gold
      return {
        primary: '43 65% 52%', // gold
        primaryGlow: '43 55% 72%',
        accent: '40 20% 95%', // white
      };
    } else if (now >= lentStart && now < easter) {
      // Lent - purple
      return {
        primary: '269 35% 78%', // purple
        primaryGlow: '269 25% 85%',
        accent: '269 40% 65%',
      };
    } else if (now >= easter && now <= pentecost) {
      // Easter season - white/gold
      return {
        primary: '43 65% 52%', // gold
        primaryGlow: '43 55% 72%',
        accent: '40 20% 95%', // white
      };
    } else {
      // Ordinary Time - green
      return {
        primary: '155 55% 38%', // green
        primaryGlow: '155 45% 48%',
        accent: '155 45% 72%',
      };
    }
  };

  // Helper function to calculate Easter date
  const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    applyTextSize(settings.textSize);
  }, [settings.textSize]);

  useEffect(() => {
    applyColorPalette(settings.colorPalette);
  }, [settings.colorPalette]);

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setTextSize, setColorPalette, setSelectedVoice, isDarkMode, availableVoices }}>
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
