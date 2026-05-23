import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import BibleChapterViewer from './BibleChapterViewer';
import bibleBooks from '@/data/bible-books.json';
import { translateBookName, getBookAbbreviation } from '@/lib/bible-utils';

interface Reading {
  id: string;
  day_number: number;
  date: string;
  books: string;
  chapters: string;
  chapters_count: number;
  comment?: string;
  testament?: 'old' | 'new';
}

interface DayReadingViewerProps {
  reading: Reading;
  onClose: () => void;
}

export default function DayReadingViewer({ reading, onClose }: DayReadingViewerProps) {
  const { t, i18n } = useTranslation();
  const [selectedChapter, setSelectedChapter] = useState<{ bookId: string; bookName: string; abbreviation: string; chapterNumber: number } | null>(null);

  const parseChapters = (): { bookId: string; bookName: string; abbreviation: string; chapterNumber: number }[] => {
    const chapters: { bookId: string; bookName: string; abbreviation: string; chapterNumber: number }[] = [];
    try {
      const bookName = reading.books.trim();
      const chaptersStr = reading.chapters.trim();
      const book = (bibleBooks.books as any[]).find((b) => b.name === bookName);
      if (!book) { console.warn(`Book not found: ${bookName}`); return chapters; }
      const localizedName = translateBookName(bookName, i18n.language);
      const localizedAbbr = getBookAbbreviation(book, i18n.language);
      if (chaptersStr.includes('-') && !chaptersStr.includes(',')) {
        const [start, end] = chaptersStr.split('-').map(s => parseInt(s.trim()));
        for (let i = start; i <= end; i++) { chapters.push({ bookId: book.fileName, bookName: localizedName, abbreviation: localizedAbbr, chapterNumber: i }); }
      } else {
        const chapterNums = chaptersStr.split(',').map(s => { const trimmed = s.trim(); return parseInt(trimmed.split(':')[0]); });
        for (const num of chapterNums) { if (!isNaN(num)) { chapters.push({ bookId: book.fileName, bookName: localizedName, abbreviation: localizedAbbr, chapterNumber: num }); } }
      }
    } catch (error) { console.error('Error parsing chapters:', error, { books: reading.books, chapters: reading.chapters }); }
    return chapters;
  };

  const chapters = parseChapters();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const locale = lang === 'it' ? 'it-IT' : lang === 'en' ? 'en-US' : 'fr-FR';
  const dateStr = new Date(reading.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const translatedBookName = translateBookName(reading.books, i18n.language);
  const chaptersDisplay = reading.chapters.includes('-')
    ? `${reading.chapters.split('-')[0]} ${t('biblicalReading.to', { defaultValue: 'à' })} ${reading.chapters.split('-')[1]}`
    : reading.chapters;

  if (selectedChapter) {
    return (
      <BibleChapterViewer
        bookId={selectedChapter.bookId}
        bookName={selectedChapter.bookName}
        abbreviation={selectedChapter.abbreviation}
        chapterNumber={selectedChapter.chapterNumber}
        onBack={() => setSelectedChapter(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header – flat */}
        <div className="flex items-start gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 -ml-2 mt-1">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold">
              {t('biblicalReading.day')} {reading.day_number}: {translatedBookName} {chaptersDisplay}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} • {reading.chapters_count > 1
                ? t('dayReading.chapterCountPlural', { count: reading.chapters_count })
                : t('dayReading.chapterCount', { count: reading.chapters_count })}
            </p>
          </div>
        </div>

        {/* Commentary – flat blockquote */}
        {reading.comment && (
          <blockquote className="border-l-2 border-cathedral-gold/40 pl-4 mb-8">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground">
              {reading.comment.split('\n\n').map((paragraph, idx) => {
                if (paragraph.trim().match(/^─+$/)) return <hr key={idx} className="border-border my-4" />;
                return <p key={idx} className="whitespace-pre-wrap">{paragraph}</p>;
              })}
            </div>
          </blockquote>
        )}

        {/* Chapters – flat grid */}
        <div className="mb-8">
          <h2 className="text-sm font-cinzel font-bold uppercase tracking-wider text-primary mb-4">
            📚 {t('dayReading.chaptersToRead')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {chapters.map((ch, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto flex flex-col items-center justify-center p-3 text-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                onClick={() => setSelectedChapter(ch)}
              >
                <span className="text-[10px] font-semibold text-muted-foreground">{ch.abbreviation}</span>
                <span className="text-lg font-bold">{ch.chapterNumber}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Tips – flat text */}
        <div className="border-t border-border pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            💡 {t('dayReading.howToContinue')}
          </h3>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>✓ {t('dayReading.tipClickChapter')}</li>
            <li>✓ {t('dayReading.tipTakeTime')}</li>
            <li>✓ {t('dayReading.tipMeditate')}</li>
            <li>✓ {t('dayReading.tipMarkComplete')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
