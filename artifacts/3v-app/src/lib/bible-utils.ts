/**
 * Utility functions for multilingual Bible book names
 */
import bibleBooks from '@/data/bible-books.json';

type BookData = {
  name: string;
  name_en?: string;
  name_it?: string;
  abbreviation: string;
  abbreviation_en?: string;
  abbreviation_it?: string;
  fileName: string;
  [key: string]: any;
};

const normalizeLang = (lang: string): string => (lang || 'fr').toLowerCase().split('-')[0];

/**
 * Get localized book name
 */
export const getBookName = (book: BookData, lang: string): string => {
  const l = normalizeLang(lang);
  if (l === 'en') return book.name_en || book.name;
  if (l === 'it') return book.name_it || book.name;
  return book.name;
};

/**
 * Get localized abbreviation
 */
export const getBookAbbreviation = (book: BookData, lang: string): string => {
  const l = normalizeLang(lang);
  if (l === 'en') return book.abbreviation_en || book.abbreviation;
  if (l === 'it') return book.abbreviation_it || book.abbreviation;
  return book.abbreviation;
};

/**
 * Translate a French book name to the target language
 */
export const translateBookName = (frenchName: string, lang: string): string => {
  const l = normalizeLang(lang);
  if (l === 'fr') return frenchName;
  
  const book = (bibleBooks.books as BookData[]).find(b => b.name === frenchName);
  if (!book) return frenchName;
  
  return getBookName(book, lang);
};

/**
 * Find a book by any of its localized names
 */
export const findBookByName = (name: string): BookData | undefined => {
  const trimmed = name.trim();
  return (bibleBooks.books as BookData[]).find(b => 
    b.name === trimmed || 
    b.name_en === trimmed || 
    b.name_it === trimmed
  );
};
