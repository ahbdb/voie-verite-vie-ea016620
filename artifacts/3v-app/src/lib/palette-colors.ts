/**
 * Palette Colors - 3V Liturgical and Theme Colors
 * Colori per i tempi liturgici cattolici e temi aggiuntivi
 */

export type PaletteTheme = 
  | 'default' 
  | 'advent' 
  | 'christmas' 
  | 'epiphany' 
  | 'lent' 
  | 'easter' 
  | 'pentecost' 
  | 'ordinary' 
  | 'marine' 
  | 'forest' 
  | 'sunset' 
  | 'midnight' 
  | 'rose';

export interface PaletteColors {
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  destructive: string;
  muted: string;
  mutedForeground: string;
  liturgicalColor?: string;
  season?: string;
}

export const PALETTE_THEMES: Record<PaletteTheme, PaletteColors> = {
  default: {
    name: 'Default',
    description: 'Colore predefinito - Verde smeraldo 3V',
    primary: '#2d7a54',
    secondary: '#e8f4f1',
    accent: '#d4af37',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#f0f0f0',
    mutedForeground: '#666666',
    liturgicalColor: 'green',
    season: 'Ordinary Time',
  },

  advent: {
    name: 'Advent',
    description: 'Periodo di Avvento - Viola liturgico',
    primary: '#6b3fa0',
    secondary: '#f3e8ff',
    accent: '#fbbf24',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#f5f3ff',
    mutedForeground: '#666666',
    liturgicalColor: 'purple',
    season: 'Advent',
  },

  christmas: {
    name: 'Christmas',
    description: 'Natale - Bianco e oro',
    primary: '#b8a038',
    secondary: '#fffbeb',
    accent: '#ef4444',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#7f1d1d',
    muted: '#fefef8',
    mutedForeground: '#666666',
    liturgicalColor: 'white',
    season: 'Christmas',
  },

  epiphany: {
    name: 'Epiphany',
    description: 'Epifania - Verde chiaro',
    primary: '#0d9488',
    secondary: '#ccfbf1',
    accent: '#fbbf24',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#e0f2f1',
    mutedForeground: '#666666',
    liturgicalColor: 'green',
    season: 'Epiphany',
  },

  lent: {
    name: 'Lent',
    description: 'Quaresima - Viola penitenziale',
    primary: '#7c3aed',
    secondary: '#f5f3ff',
    accent: '#d4af37',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#991b1b',
    muted: '#ede9fe',
    mutedForeground: '#666666',
    liturgicalColor: 'purple',
    season: 'Lent',
  },

  easter: {
    name: 'Easter',
    description: 'Pasqua - Bianco e oro celebrativo',
    primary: '#dc2626',
    secondary: '#fecaca',
    accent: '#fbbf24',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#7f1d1d',
    muted: '#fef2f2',
    mutedForeground: '#666666',
    liturgicalColor: 'white',
    season: 'Easter',
  },

  pentecost: {
    name: 'Pentecost',
    description: 'Pentecoste - Rosso del fuoco dello Spirito Santo',
    primary: '#991b1b',
    secondary: '#fee2e2',
    accent: '#fbbf24',
    background: '#ffffff',
    foreground: '#ffffff',
    destructive: '#7f1d1d',
    muted: '#fef2f2',
    mutedForeground: '#ffffff',
    liturgicalColor: 'red',
    season: 'Pentecost',
  },

  ordinary: {
    name: 'Ordinary Time',
    description: 'Tempo ordinario - Verde classico',
    primary: '#16a34a',
    secondary: '#dcfce7',
    accent: '#d4af37',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#f0fdf4',
    mutedForeground: '#666666',
    liturgicalColor: 'green',
    season: 'Ordinary Time',
  },

  marine: {
    name: 'Marine',
    description: 'Tema marino - Blu e turchese',
    primary: '#0369a1',
    secondary: '#e0f2fe',
    accent: '#06b6d4',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#f0f9ff',
    mutedForeground: '#666666',
    season: 'Custom',
  },

  forest: {
    name: 'Forest',
    description: 'Tema foresta - Verde scuro e marrone',
    primary: '#1e5631',
    secondary: '#e8e8d8',
    accent: '#d4a574',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#8b4513',
    muted: '#f5f5f0',
    mutedForeground: '#666666',
    season: 'Custom',
  },

  sunset: {
    name: 'Sunset',
    description: 'Tema tramonto - Arancione e rosa',
    primary: '#ea580c',
    secondary: '#fed7aa',
    accent: '#fb7185',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#fef3c7',
    mutedForeground: '#666666',
    season: 'Custom',
  },

  midnight: {
    name: 'Midnight',
    description: 'Tema mezzanotte - Blu scuro e argento',
    primary: '#1e293b',
    secondary: '#e2e8f0',
    accent: '#38bdf8',
    background: '#0f172a',
    foreground: '#ffffff',
    destructive: '#f87171',
    muted: '#334155',
    mutedForeground: '#cbd5e1',
    season: 'Custom',
  },

  rose: {
    name: 'Rose',
    description: 'Tema rosa - Domenica Gaudete',
    primary: '#be185d',
    secondary: '#fbcfe8',
    accent: '#d4af37',
    background: '#ffffff',
    foreground: '#1a1a1a',
    destructive: '#dc2626',
    muted: '#fdf2f8',
    mutedForeground: '#666666',
    liturgicalColor: 'rose',
    season: 'Advent/Lent',
  },
};

export const LITURGICAL_PALETTES = {
  advent: PALETTE_THEMES.advent,
  christmas: PALETTE_THEMES.christmas,
  epiphany: PALETTE_THEMES.epiphany,
  lent: PALETTE_THEMES.lent,
  easter: PALETTE_THEMES.easter,
  pentecost: PALETTE_THEMES.pentecost,
  ordinary: PALETTE_THEMES.ordinary,
} as const;

export const CUSTOM_PALETTES = {
  marine: PALETTE_THEMES.marine,
  forest: PALETTE_THEMES.forest,
  sunset: PALETTE_THEMES.sunset,
  midnight: PALETTE_THEMES.midnight,
  rose: PALETTE_THEMES.rose,
} as const;

/**
 * Get palette by theme name
 */
export function getPaletteByTheme(theme: PaletteTheme): PaletteColors {
  return PALETTE_THEMES[theme] || PALETTE_THEMES.default;
}

/**
 * Get all available themes
 */
export function getAllThemes(): Array<{ id: PaletteTheme; name: string; description: string }> {
  return Object.entries(PALETTE_THEMES).map(([id, palette]) => ({
    id: id as PaletteTheme,
    name: palette.name,
    description: palette.description,
  }));
}

/**
 * Get liturgical themes only
 */
export function getLiturgicalThemes() {
  return Object.entries(LITURGICAL_PALETTES).map(([id, palette]) => ({
    id: id as keyof typeof LITURGICAL_PALETTES,
    name: palette.name,
    description: palette.description,
  }));
}

/**
 * Get custom themes only
 */
export function getCustomThemes() {
  return Object.entries(CUSTOM_PALETTES).map(([id, palette]) => ({
    id: id as keyof typeof CUSTOM_PALETTES,
    name: palette.name,
    description: palette.description,
  }));
}

/**
 * Convert palette to CSS variables
 */
export function generateCSSVariables(palette: PaletteColors): Record<string, string> {
  return {
    '--primary': palette.primary,
    '--primary-foreground': palette.background,
    '--secondary': palette.secondary,
    '--secondary-foreground': palette.foreground,
    '--accent': palette.accent,
    '--background': palette.background,
    '--foreground': palette.foreground,
    '--destructive': palette.destructive,
    '--destructive-foreground': '#ffffff',
    '--muted': palette.muted,
    '--muted-foreground': palette.mutedForeground,
  };
}
