/**
 * Test du loader biblique
 * Vérifie que les fichiers JSON peuvent être chargés et parsés correctement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simulation du loader
const getBookFileName = (bookId) => {
  const allBooks = {
    1: 'genesis', 2: 'exodus', 3: 'leviticus', 4: 'numbers', 5: 'deuteronomy',
    6: 'joshua', 7: 'judges', 8: 'ruth', 9: '1-samuel', 10: '2-samuel',
    // ... (tous les autres)
  };

  if (allBooks[bookId]) {
    const bookIdPadded = bookId.toString().padStart(2, '0');
    return `${bookIdPadded}-${allBooks[bookId]}`;
  }
  return null;
};

const testLoadBibleChapter = (bookId, chapterNumber) => {
  try {
    const fileName = getBookFileName(bookId);
    if (!fileName) {
      console.log(`❌ Livre #${bookId} non trouvé`);
      return null;
    }

    const filePath = path.join(
      __dirname,
      'src/data/bible-content',
      `${fileName}.json`
    );

    if (!fs.existsSync(filePath)) {
      console.log(`❌ Fichier non trouvé: ${filePath}`);
      return null;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Support deux formats
    const chapter = content.chapters.find((c) =>
      c.number === chapterNumber || c.chapter === chapterNumber
    );

    if (!chapter) {
      console.log(`❌ Chapitre ${chapterNumber} non trouvé`);
      return null;
    }

    const verses = chapter.verses?.map((v) => ({
      number: v.number ?? v.verse,
      text: v.text,
    })) || [];

    return {
      bookId,
      bookName: content.name,
      chapter: chapterNumber,
      verseCount: verses.length,
      firstVerse: verses[0]?.text?.substring(0, 50) + '...',
    };
  } catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    return null;
  }
};

// Test
console.log('\n🧪 TEST CHARGEMENT BIBLIQUE\n');

const tests = [
  { book: 1, chapter: 1, name: 'Genèse 1' },
  { book: 2, chapter: 1, name: 'Exode 1' },
  { book: 2, chapter: 2, name: 'Exode 2' },
  { book: 40, chapter: 1, name: 'Matthieu 1' },
  { book: 66, chapter: 1, name: 'Apocalypse 1' },
];

tests.forEach((test) => {
  const result = testLoadBibleChapter(test.book, test.chapter);
  if (result) {
    console.log(`✅ ${test.name}`);
    console.log(`   Versets: ${result.verseCount}`);
    console.log(`   Premier: ${result.firstVerse}\n`);
  } else {
    console.log(`❌ ${test.name}\n`);
  }
});
