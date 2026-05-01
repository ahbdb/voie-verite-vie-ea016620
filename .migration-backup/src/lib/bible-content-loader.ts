/**
 * Bible Content Loader — Lazy loading optimisé
 */

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BibleChapter {
  number: number;
  verses: BibleVerse[];
}

export interface BibleBookContent {
  id: number;
  name: string;
  abbreviation: string;
  chapters: BibleChapter[];
}

import { loadBibleBookLazy, fileNameMap } from '@/data/bible-content/index';

// Cache mémoire
const bookCache: Map<string, BibleBookContent | null> = new Map();
const chapterCache: Map<string, BibleVerse[] | null> = new Map();

export const loadBibleBook = async (bookKey: string): Promise<BibleBookContent | null> => {
  if (!bookKey) return null;
  
  if (bookCache.has(bookKey)) return bookCache.get(bookKey) || null;

  const moduleKey = fileNameMap[bookKey.toLowerCase()];
  if (!moduleKey) return null;

  const content = await loadBibleBookLazy(moduleKey);
  if (!content) return null;

  bookCache.set(bookKey, content);
  return content;
};

export const loadBibleChapter = async (
  bookKey: string,
  chapterNumber: number
): Promise<BibleVerse[] | null> => {
  const cacheKey = `${bookKey}-${chapterNumber}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey) || null;

  const bookContent = await loadBibleBook(bookKey);
  if (!bookContent) return null;

  const chapter = (bookContent.chapters as any[]).find((c: any) => {
    const cn = Number(c.number ?? c.chapter);
    return !Number.isNaN(cn) && cn === chapterNumber;
  });

  if (!chapter) return null;

  const verses = (chapter.verses || []).map((v: any) => ({
    number: Number(v.number ?? v.verse),
    text: v.text
  }));

  const result = verses.length > 0 ? verses : null;
  chapterCache.set(cacheKey, result);
  return result;
};

// Aliases for backward compat
export const loadBibleBookCached = loadBibleBook;
export const loadBibleChapterCached = loadBibleChapter;

export const loadBibleVerse = async (
  bookKey: string,
  chapterNumber: number,
  verseNumber: number
): Promise<string | null> => {
  const verses = await loadBibleChapter(bookKey, chapterNumber);
  if (!verses) return null;
  return verses.find((v) => v.number === verseNumber)?.text || null;
};

export const preloadBibleChapters = async (
  bookKey: string,
  chapters: number
): Promise<void> => {
  // Just preload the book itself (one lazy import)
  await loadBibleBook(bookKey);
};

export const clearBibleCache = (): void => {
  bookCache.clear();
  chapterCache.clear();
};
