/**
 * Utilitaire pour grouper les lectures bibliques par jour intelligemment
 * Exemple: "Genèse 1-4" au lieu de 4 boutons séparés
 */

export interface Reading {
  id: string;
  day_number: number;
  date: string;
  month: number;
  year?: number;
  books: string;
  chapters: string;
  chapters_count: number;
  type: string;
  comment: string | null;
}

export interface GroupedReading {
  // Identifiant unique du groupe (pour clé React)
  groupId: string;
  // Jour de début du groupe
  startDay: number;
  // Jour de fin du groupe
  endDay: number;
  // Label affiché: "Genèse 1-4"
  label: string;
  // Date du premier jour
  date: string;
  // Tous les jours du groupe
  readings: Reading[];
  // Nombre total de chapitres lus
  totalChapters: number;
  // Les commentaires regroupés
  comments: (string | null)[];
}

/**
 * Regroupe les lectures en jours logiques
 * Par exemple: si "Genèse 1", "Genèse 2", "Genèse 3", "Genèse 4" sont consécutifs,
 * ils forment un seul groupe "Genèse 1-4"
 */
export function groupReadingsByDay(readings: Reading[]): GroupedReading[] {
  if (readings.length === 0) return [];

  // Trier par jour
  const sorted = [...readings].sort((a, b) => a.day_number - b.day_number);

  const groups: GroupedReading[] = [];
  let currentGroup: Reading[] = [sorted[0]];
  let currentBookName = getBookName(sorted[0].books);
  let currentChapterStart = getFirstChapterNumber(sorted[0].chapters);

  for (let i = 1; i < sorted.length; i++) {
    const reading = sorted[i];
    const bookName = getBookName(reading.books);
    const chapterNum = getFirstChapterNumber(reading.chapters);
    
    // Vérifier si c'est une continuation logique du groupe
    const isConsecutive = 
      bookName === currentBookName &&
      chapterNum === getLastChapterNumber(sorted[i - 1].chapters) + 1 &&
      reading.day_number === sorted[i - 1].day_number + 1;

    if (isConsecutive) {
      // Ajouter au groupe actuel
      currentGroup.push(reading);
    } else {
      // Créer le groupe précédent et démarrer un nouveau
      groups.push(createGroup(currentGroup, currentBookName, currentChapterStart));
      currentGroup = [reading];
      currentBookName = bookName;
      currentChapterStart = chapterNum;
    }
  }

  // Ajouter le dernier groupe
  if (currentGroup.length > 0) {
    groups.push(createGroup(currentGroup, currentBookName, currentChapterStart));
  }

  return groups;
}

/**
 * Crée un groupe à partir des lectures
 */
function createGroup(
  readings: Reading[],
  bookName: string,
  chapterStart: number
): GroupedReading {
  const chapterEnd = getLastChapterNumber(readings[readings.length - 1].chapters);
  const chaptersRange = chapterStart === chapterEnd 
    ? `${chapterStart}`
    : `${chapterStart}-${chapterEnd}`;

  const totalChapters = readings.reduce((sum, r) => sum + r.chapters_count, 0);
  
  return {
    groupId: `${readings[0].id}-group`,
    startDay: readings[0].day_number,
    endDay: readings[readings.length - 1].day_number,
    label: `${bookName} ${chaptersRange}`,
    date: readings[0].date,
    readings,
    totalChapters,
    comments: readings.map(r => r.comment).filter(Boolean),
  };
}

/**
 * Extrait le nom du livre du champ "books"
 * Exemple: "Genèse" de "Genèse; Exode" (prend le premier)
 */
function getBookName(books: string): string {
  return books.split(';')[0].trim();
}

/**
 * Récupère le premier numéro de chapitre du champ "chapters"
 * Exemple: 1 de "1, 2, 3, 4"
 */
function getFirstChapterNumber(chapters: string): number {
  const match = chapters.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Récupère le dernier numéro de chapitre du champ "chapters"
 * Exemple: 4 de "1, 2, 3, 4"
 */
function getLastChapterNumber(chapters: string): number {
  const numbers = chapters.match(/\d+/g) || [];
  if (numbers.length === 0) return 0;
  return parseInt(numbers[numbers.length - 1], 10);
}
