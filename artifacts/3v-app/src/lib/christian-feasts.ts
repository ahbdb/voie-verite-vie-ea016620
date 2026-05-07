export interface ChristianFeast {
  id: string;
  name: string;
  date: string; // MM-DD format (fixed dates) or 'variable' for moveable feasts
  type: 'solemnity' | 'feast' | 'memorial' | 'anniversary' | 'custom';
  animationType: 'garland' | 'banner' | 'fireworks' | 'candles' | 'cross' | 'dove';
  color: string; // primary celebration color
  message: string;
  icon: string;
  enabled: boolean;
}

export const DEFAULT_FEASTS: ChristianFeast[] = [
  { id: 'noel', name: 'Noël', date: '12-25', type: 'solemnity', animationType: 'garland', color: '#c9a227', message: 'Joyeux Noël ! Que la lumière du Christ illumine votre cœur. ✝️🌟', icon: '🌟', enabled: true },
  { id: 'paques', name: 'Pâques', date: 'variable-easter', type: 'solemnity', animationType: 'fireworks', color: '#f5c842', message: 'Joyeuses Pâques ! Le Christ est ressuscité, Alléluia ! 🌸✝️', icon: '✝️', enabled: true },
  { id: 'pentecote', name: 'Pentecôte', date: 'variable-pentecost', type: 'solemnity', animationType: 'dove', color: '#ef4444', message: 'Bonne fête de la Pentecôte ! Que l\'Esprit Saint vous guide. 🕊️🔥', icon: '🕊️', enabled: true },
  { id: 'toussaint', name: 'Toussaint', date: '11-01', type: 'solemnity', animationType: 'candles', color: '#f59e0b', message: 'Bonne fête de la Toussaint ! Que les saints intercèdent pour nous. 🕯️', icon: '🕯️', enabled: true },
  { id: 'ascension', name: 'Ascension', date: 'variable-ascension', type: 'solemnity', animationType: 'cross', color: '#c9a227', message: 'Bonne fête de l\'Ascension du Seigneur ! 🌤️✝️', icon: '☁️', enabled: true },
  { id: 'assomption', name: 'Assomption de Marie', date: '08-15', type: 'solemnity', animationType: 'banner', color: '#60a5fa', message: 'Bonne fête de l\'Assomption ! Vive la Vierge Marie ! 🌹👑', icon: '🌹', enabled: true },
  { id: 'immaculee', name: 'Immaculée Conception', date: '12-08', type: 'solemnity', animationType: 'banner', color: '#60a5fa', message: 'Bonne fête de l\'Immaculée Conception de Marie ! 💙', icon: '💙', enabled: true },
  { id: 'epiphanie', name: 'Épiphanie', date: '01-06', type: 'solemnity', animationType: 'garland', color: '#f59e0b', message: 'Bonne fête des Rois Mages ! ⭐👑', icon: '⭐', enabled: true },
  { id: 'trinite', name: 'Trinité', date: 'variable-trinity', type: 'solemnity', animationType: 'cross', color: '#c9a227', message: 'Bonne fête de la Sainte Trinité ! Au nom du Père, du Fils et du Saint-Esprit. ✝️', icon: '✝️', enabled: true },
  { id: 'corpus-christi', name: 'Fête-Dieu', date: 'variable-corpus', type: 'solemnity', animationType: 'candles', color: '#f5c842', message: 'Bonne fête du Corps et du Sang du Christ ! 🍞', icon: '🍞', enabled: true },
  { id: 'sacre-coeur', name: 'Sacré-Cœur', date: 'variable-sacred-heart', type: 'feast', animationType: 'banner', color: '#ef4444', message: 'Bonne fête du Sacré-Cœur de Jésus ! ❤️‍🔥', icon: '❤️', enabled: true },
  { id: 'nativite-marie', name: 'Nativité de Marie', date: '09-08', type: 'feast', animationType: 'banner', color: '#60a5fa', message: 'Bonne fête de la Nativité de la Vierge Marie ! 🌹', icon: '🌹', enabled: true },
  { id: 'jean-baptiste', name: 'Saint Jean-Baptiste', date: '06-24', type: 'solemnity', animationType: 'candles', color: '#84cc16', message: 'Bonne fête de la Nativité de Saint Jean-Baptiste ! 🕊️', icon: '🕊️', enabled: true },
  { id: 'pierre-paul', name: 'Saints Pierre et Paul', date: '06-29', type: 'solemnity', animationType: 'cross', color: '#c9a227', message: 'Bonne fête des saints Apôtres Pierre et Paul ! ⛵', icon: '⛵', enabled: true },
  { id: 'saint-joseph', name: 'Saint Joseph', date: '03-19', type: 'solemnity', animationType: 'banner', color: '#f59e0b', message: 'Bonne fête de Saint Joseph ! ⚒️', icon: '⚒️', enabled: true },
  { id: 'annonciation', name: 'Annonciation', date: '03-25', type: 'solemnity', animationType: 'dove', color: '#60a5fa', message: 'Bonne fête de l\'Annonciation du Seigneur ! 🌸', icon: '🌸', enabled: true },
  { id: 'careme', name: 'Mercredi des Cendres', date: 'variable-ash-wednesday', type: 'memorial', animationType: 'cross', color: '#6b7280', message: 'Bon début du Carême ! Temps de prière, de jeûne et de partage. ✝️', icon: '✝️', enabled: true },
  { id: 'rameaux', name: 'Dimanche des Rameaux', date: 'variable-palm-sunday', type: 'solemnity', animationType: 'banner', color: '#84cc16', message: 'Hosanna ! Bonne fête des Rameaux ! 🌿', icon: '🌿', enabled: true },
  { id: 'avent', name: 'Premier Dimanche de l\'Avent', date: 'variable-advent', type: 'memorial', animationType: 'garland', color: '#7c3aed', message: 'Bienvenue dans le temps de l\'Avent ! Préparez le chemin du Seigneur. 🕯️', icon: '🕯️', enabled: true },
  { id: 'fondation-3v', name: 'Anniversaire du Mouvement 3V', date: '07-07', type: 'anniversary', animationType: 'fireworks', color: '#c9a227', message: 'Joyeux anniversaire au Mouvement Voie Vérité Vie ! 🎉✝️🎊', icon: '🎉', enabled: true },
];

const STORAGE_KEY = '3v-christian-feasts';

export function loadFeasts(): ChristianFeast[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChristianFeast[];
      const defaultIds = new Set(DEFAULT_FEASTS.map(f => f.id));
      const storedIds = new Set(parsed.map((f: ChristianFeast) => f.id));
      const newFeasts = DEFAULT_FEASTS.filter(f => !storedIds.has(f.id));
      return [...parsed, ...newFeasts];
    }
  } catch {}
  return DEFAULT_FEASTS;
}

export function saveFeasts(feasts: ChristianFeast[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feasts));
  } catch {}
}

function getEasterDate(year: number): Date {
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
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getFirstSundayOfAdvent(year: number): Date {
  const christmas = new Date(year, 11, 25);
  const dayOfWeek = christmas.getDay();
  const daysBack = dayOfWeek === 0 ? 28 : dayOfWeek + 21;
  return addDays(christmas, -daysBack);
}

export function checkFeastToday(feasts: ChristianFeast[]): ChristianFeast | null {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${month}-${day}`;
  const year = now.getFullYear();

  const easter = getEasterDate(year);
  const pentecost = addDays(easter, 49);
  const ascension = addDays(easter, 39);
  const trinity = addDays(easter, 56);
  const corpusChristi = addDays(easter, 60);
  const sacredHeart = addDays(easter, 68);
  const ashWednesday = addDays(easter, -46);
  const palmSunday = addDays(easter, -7);
  const firstAdvent = getFirstSundayOfAdvent(year);

  const variableDates: Record<string, Date> = {
    'variable-easter': easter,
    'variable-pentecost': pentecost,
    'variable-ascension': ascension,
    'variable-trinity': trinity,
    'variable-corpus': corpusChristi,
    'variable-sacred-heart': sacredHeart,
    'variable-ash-wednesday': ashWednesday,
    'variable-palm-sunday': palmSunday,
    'variable-advent': firstAdvent,
  };

  const fmtDate = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  for (const feast of feasts) {
    if (!feast.enabled) continue;
    if (feast.date.startsWith('variable-')) {
      const varDate = variableDates[feast.date];
      if (varDate && fmtDate(varDate) === today) return feast;
    } else if (feast.date === today) {
      return feast;
    }
  }
  return null;
}
