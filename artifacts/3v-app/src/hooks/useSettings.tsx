import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type TextSize = 'small' | 'normal' | 'large' | 'extra-large';
export type PaletteId = 'cathedral-gold' | 'ocean-blue' | 'forest-green' | 'burgundy-royal' | 'dawn-gold' | 'custom';

export interface ColorPalette {
  id: PaletteId;
  label: string;
  primary: string;
  accent: string;
  stainedBlue: string;
  cathedralGold: string;
}

export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: 'cathedral-gold',
    label: 'Cathédrale Or',
    primary: '43 65% 52%',
    accent: '350 55% 42%',
    stainedBlue: '220 75% 55%',
    cathedralGold: '43 65% 52%',
  },
  {
    id: 'ocean-blue',
    label: 'Océan Bleu',
    primary: '220 75% 55%',
    accent: '155 55% 38%',
    stainedBlue: '43 65% 52%',
    cathedralGold: '220 75% 55%',
  },
  {
    id: 'forest-green',
    label: 'Forêt Émeraude',
    primary: '155 60% 40%',
    accent: '43 65% 52%',
    stainedBlue: '220 55% 55%',
    cathedralGold: '155 60% 40%',
  },
  {
    id: 'burgundy-royal',
    label: 'Bordeaux Royal',
    primary: '350 65% 40%',
    accent: '220 55% 45%',
    stainedBlue: '43 65% 52%',
    cathedralGold: '350 65% 40%',
  },
  {
    id: 'dawn-gold',
    label: 'Aube Dorée',
    primary: '38 85% 55%',
    accent: '350 45% 45%',
    stainedBlue: '220 65% 50%',
    cathedralGold: '38 85% 55%',
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    primary: '43 65% 52%',
    accent: '350 55% 42%',
    stainedBlue: '220 75% 55%',
    cathedralGold: '43 65% 52%',
  },
];

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

interface Settings {
  theme: Theme;
  textSize: TextSize;
  selectedVoice: string | null;
  paletteId: PaletteId;
  customPrimary: string;
  customAccent: string;
  customStained: string;
}

interface SettingsContextType {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setTextSize: (size: TextSize) => void;
  setSelectedVoice: (voiceURI: string | null) => void;
  isDarkMode: boolean;
  availableVoices: VoiceOption[];
  activePalette: ColorPalette;
  setPaletteById: (id: PaletteId) => void;
  setCustomColors: (primary: string, accent: string, stained: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'normal',
  selectedVoice: null,
  paletteId: 'cathedral-gold',
  customPrimary: '43 65% 52%',
  customAccent: '350 55% 42%',
  customStained: '220 75% 55%',
};

function hslStringToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length !== 3) return '#c9a227';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export { hslStringToHex, hexToHsl };

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      const voiceOptions: VoiceOption[] = voices
        .filter(v => v.lang.startsWith('fr') || v.lang.startsWith('en') || v.lang.startsWith('it'))
        .map(v => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
      setAvailableVoices(voiceOptions);
    };
    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Settings>;
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        updateDarkMode(merged.theme, prefersDark);
        applyPaletteVars(merged);
        applyTextSize(merged.textSize);
      } catch (e) {
        console.warn('Erreur parsing settings', e);
      }
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      updateDarkMode('system', prefersDark);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => updateDarkMode(settings.theme, e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const updateDarkMode = (theme: Theme, systemDark: boolean) => {
    const shouldBeDark = theme === 'dark' || (theme === 'system' && systemDark);
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const applyPaletteVars = (s: Settings) => {
    const root = document.documentElement;
    let palette: ColorPalette;
    if (s.paletteId === 'custom') {
      palette = {
        id: 'custom',
        label: 'Personnalisé',
        primary: s.customPrimary,
        accent: s.customAccent,
        stainedBlue: s.customStained,
        cathedralGold: s.customPrimary,
      };
    } else {
      palette = PRESET_PALETTES.find(p => p.id === s.paletteId) || PRESET_PALETTES[0];
    }
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--ring', palette.primary);
    root.style.setProperty('--sidebar-primary', palette.primary);
    root.style.setProperty('--sidebar-ring', palette.primary);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--stained-blue', palette.stainedBlue);
    root.style.setProperty('--cathedral-gold', palette.cathedralGold);
    root.style.setProperty('--divine-gold-deep', palette.cathedralGold);
  };

  const applyTextSize = (size: TextSize) => {
    const scales: Record<TextSize, number> = { small: 0.9, normal: 1, large: 1.15, 'extra-large': 1.3 };
    document.documentElement.style.setProperty('--text-scale', String(scales[size]));
  };

  const saveSettings = (updated: Settings) => {
    setSettings(updated);
    localStorage.setItem('app-settings', JSON.stringify(updated));
  };

  const setTheme = (theme: Theme) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    updateDarkMode(theme, prefersDark);
    saveSettings({ ...settings, theme });
  };

  const setTextSize = (size: TextSize) => {
    applyTextSize(size);
    saveSettings({ ...settings, textSize: size });
  };

  const setSelectedVoice = (voiceURI: string | null) => {
    saveSettings({ ...settings, selectedVoice: voiceURI });
  };

  const setPaletteById = (id: PaletteId) => {
    const updated = { ...settings, paletteId: id };
    applyPaletteVars(updated);
    saveSettings(updated);
  };

  const setCustomColors = (primary: string, accent: string, stained: string) => {
    const updated = { ...settings, paletteId: 'custom' as PaletteId, customPrimary: primary, customAccent: accent, customStained: stained };
    applyPaletteVars(updated);
    saveSettings(updated);
  };

  useEffect(() => {
    applyTextSize(settings.textSize);
  }, [settings.textSize]);

  const activePalette: ColorPalette =
    settings.paletteId === 'custom'
      ? { id: 'custom', label: 'Personnalisé', primary: settings.customPrimary, accent: settings.customAccent, stainedBlue: settings.customStained, cathedralGold: settings.customPrimary }
      : PRESET_PALETTES.find(p => p.id === settings.paletteId) || PRESET_PALETTES[0];

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setTextSize, setSelectedVoice, isDarkMode, availableVoices, activePalette, setPaletteById, setCustomColors }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
};
