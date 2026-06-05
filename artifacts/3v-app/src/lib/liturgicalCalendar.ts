/**
 * liturgicalCalendar.ts
 * Calcule la couleur et la saison liturgique du jour (rite romain ordinaire).
 */

export type LiturgicalColor = 'green' | 'purple' | 'red' | 'white' | 'rose';

export interface LiturgicalDay {
  color: LiturgicalColor;
  /** Ex : "Temps ordinaire", "Carême", "Pâques" … */
  season: string;
  /** Ex : "Vert", "Violet", "Rouge" … */
  colorLabel: string;
  /** Hex pour inline style */
  colorHex: string;
  colorHexHover: string;
  /** true si le texte sur fond coloré doit être sombre */
  darkText: boolean;
}

// ── Computus (algorithme de la Pâque grégorienne) ──────────────────────────
function getEaster(year: number): Date {
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

function add(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Dimanche précédant (ou égal à) une date */
function prevSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** 1er dimanche de l'Avent = 4 semaines avant le 25 décembre */
function firstAdvent(year: number): Date {
  const christmas = new Date(year, 11, 25);
  const dow = christmas.getDay(); // 0 = dimanche
  // Reculer jusqu'au dimanche précédent, puis encore 3 semaines
  const lastSundayBeforeXmas = add(christmas, -(dow === 0 ? 7 : dow));
  return add(lastSundayBeforeXmas, -21);
}

/** Dimanche du Baptême du Seigneur (1er dimanche après le 6 janvier) */
function baptismOfLord(year: number): Date {
  const epiphany = new Date(year, 0, 6);
  const dow = epiphany.getDay();
  if (dow === 0) return add(epiphany, 7); // si le 6 est dimanche → suivant
  return add(epiphany, 7 - dow);
}

// ── Point d'entrée principal ─────────────────────────────────────────────────
export function getLiturgicalDay(date: Date = new Date()): LiturgicalDay {
  const year = date.getFullYear();
  // Normaliser à minuit
  const d = new Date(year, date.getMonth(), date.getDate());

  const easter  = getEaster(year);
  const ashWed  = add(easter, -46);
  const palmSun = add(easter, -7);
  const holyThu = add(easter, -3);
  const goodFri = add(easter, -2);
  const holySat = add(easter, -1);
  const pentec  = add(easter, 49);
  const laetare = add(easter, -21); // 4e dimanche du Carême (rose)
  const gaudete = add(firstAdvent(year - (d.getMonth() >= 11 ? 0 : 1)), 14); // 3e dim. Avent

  // ── Avent (varie : fin nov / déc) ────────────────────────────────────────
  const advent = firstAdvent(year); // Avent de cette année (début ~fin nov)
  if (d >= advent) {
    // Dimanche Gaudete (3e dimanche de l'Avent) → rose
    if (sameDMY(d, gaudete)) return mk('rose', 'Avent – Gaudete', 'Rose', '#be185d', '#9d174d');
    return mk('purple', 'Avent', 'Violet', '#5b21b6', '#4c1d95');
  }

  // ── Noël (25 déc → Baptême du Seigneur de l'année suivante) ─────────────
  const christmas = new Date(year, 11, 25);
  if (d >= christmas) return mk('white', 'Noël', 'Blanc/Or', '#b45309', '#92400e');

  // ── Temps ordinaire I (Baptême du Seigneur → Mercredi des Cendres) ───────
  const baptism = baptismOfLord(year);
  const christmasPrev = new Date(year - 1, 11, 25);
  // Si on est entre le 1er jan et le Baptême, c'est encore Noël
  if (d >= christmasPrev && d <= add(baptism, -1)) {
    return mk('white', 'Noël', 'Blanc/Or', '#b45309', '#92400e');
  }
  if (d >= baptism && d < ashWed) {
    return mk('green', 'Temps ordinaire', 'Vert', '#15803d', '#166534');
  }

  // ── Carême et Semaine Sainte ──────────────────────────────────────────────
  if (d >= ashWed && d <= holySat) {
    if (sameDMY(d, laetare))  return mk('rose',   'Carême – Laetare', 'Rose',   '#be185d', '#9d174d');
    if (sameDMY(d, palmSun))  return mk('red',    'Rameaux',           'Rouge',  '#991b1b', '#7f1d1d');
    if (sameDMY(d, holyThu))  return mk('white',  'Jeudi Saint',       'Blanc',  '#b45309', '#92400e');
    if (sameDMY(d, goodFri))  return mk('red',    'Vendredi Saint',    'Rouge',  '#991b1b', '#7f1d1d');
    if (sameDMY(d, holySat))  return mk('purple', 'Samedi Saint',      'Violet', '#5b21b6', '#4c1d95');
    return mk('purple', 'Carême', 'Violet', '#5b21b6', '#4c1d95');
  }

  // ── Temps pascal (Pâques → Pentecôte) ────────────────────────────────────
  if (d >= easter && d <= pentec) {
    if (sameDMY(d, pentec)) return mk('red', 'Pentecôte', 'Rouge', '#991b1b', '#7f1d1d');
    return mk('white', 'Temps pascal', 'Blanc/Or', '#b45309', '#92400e');
  }

  // ── Temps ordinaire II (après Pentecôte → Avent) ─────────────────────────
  return mk('green', 'Temps ordinaire', 'Vert', '#15803d', '#166534');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sameDMY(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}

function mk(
  color: LiturgicalColor,
  season: string,
  colorLabel: string,
  colorHex: string,
  colorHexHover: string,
): LiturgicalDay {
  return { color, season, colorLabel, colorHex, colorHexHover, darkText: false };
}

// ── Emoji indicateur ──────────────────────────────────────────────────────────
export function liturgicalEmoji(color: LiturgicalColor): string {
  return { green: '🟢', purple: '🟣', red: '🔴', white: '🟡', rose: '🌸' }[color];
}
