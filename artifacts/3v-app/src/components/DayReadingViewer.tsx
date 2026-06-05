import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CheckCircle, Brain, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
  isCompleted?: boolean;
  onMarkComplete?: () => void;
  onShowQuiz?: () => void;
}

type ChapterEntry = {
  bookId: string;
  bookName: string;
  abbreviation: string;
  chapterNumber: number;
};

export default function DayReadingViewer({
  reading,
  onClose,
  isCompleted = false,
  onMarkComplete,
  onShowQuiz,
}: DayReadingViewerProps) {
  const { t, i18n } = useTranslation();
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number | null>(null);

  const parseChapters = (): ChapterEntry[] => {
    const chapters: ChapterEntry[] = [];
    try {
      const bookName = reading.books.trim();
      const chaptersStr = reading.chapters.trim();
      const book = (bibleBooks.books as any[]).find((b) => b.name === bookName);
      if (!book) { console.warn(`Book not found: ${bookName}`); return chapters; }
      const localizedName = translateBookName(bookName, i18n.language);
      const localizedAbbr = getBookAbbreviation(book, i18n.language);
      if (chaptersStr.includes('-') && !chaptersStr.includes(',')) {
        const [start, end] = chaptersStr.split('-').map((s) => parseInt(s.trim()));
        for (let i = start; i <= end; i++) {
          chapters.push({ bookId: book.fileName, bookName: localizedName, abbreviation: localizedAbbr, chapterNumber: i });
        }
      } else {
        const chapterNums = chaptersStr.split(',').map((s) => {
          const trimmed = s.trim();
          return parseInt(trimmed.split(':')[0]);
        });
        for (const num of chapterNums) {
          if (!isNaN(num)) {
            chapters.push({ bookId: book.fileName, bookName: localizedName, abbreviation: localizedAbbr, chapterNumber: num });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing chapters:', error);
    }
    return chapters;
  };

  const chapters = parseChapters();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const locale = lang === 'it' ? 'it-IT' : lang === 'en' ? 'en-US' : 'fr-FR';
  const dateStr = new Date(reading.date).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const translatedBookName = translateBookName(reading.books, i18n.language);
  const chaptersDisplay = reading.chapters.includes('-')
    ? `${reading.chapters.split('-')[0]} ${t('biblicalReading.to', { defaultValue: 'à' })} ${reading.chapters.split('-')[1]}`
    : reading.chapters;

  const isLastChapter = selectedChapterIdx !== null && selectedChapterIdx === chapters.length - 1;
  const isFirstChapter = selectedChapterIdx === 0;

  if (selectedChapterIdx !== null) {
    const ch = chapters[selectedChapterIdx];
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <Button variant="ghost" size="sm" onClick={() => setSelectedChapterIdx(null)} className="gap-1 -ml-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{t('dayReading.backToList')}</span>
            </Button>

            <div className="flex-1 text-center min-w-0">
              <p className="text-sm font-cinzel font-bold text-foreground truncate">
                {ch.bookName} {ch.chapterNumber}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t('dayReading.chapterOf', { current: selectedChapterIdx + 1, total: chapters.length })}
              </p>
            </div>

            <Badge variant="outline" className="text-[11px] flex-shrink-0">
              {t('biblicalReading.day')} {reading.day_number}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <BibleChapterViewer
              bookId={ch.bookId}
              bookName={ch.bookName}
              abbreviation={ch.abbreviation}
              chapterNumber={ch.chapterNumber}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/60 px-4 py-3">
          {isLastChapter && (
            <div className="max-w-4xl mx-auto mb-2 flex gap-2">
              {!isCompleted && onMarkComplete && (
                <Button
                  size="sm"
                  className="gap-1.5 flex-1 bg-primary text-primary-foreground shadow-md"
                  onClick={onMarkComplete}
                >
                  <CheckCircle className="w-4 h-4" />
                  {t('dayReading.markAndQuiz')}
                </Button>
              )}
              {isCompleted && onShowQuiz && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-1 border-primary text-primary"
                  onClick={onShowQuiz}
                >
                  <Brain className="w-4 h-4" />
                  {t('dayReading.doQuiz')}
                </Button>
              )}
              {isCompleted && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  disabled
                >
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {t('biblicalReading.completed')}
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isFirstChapter}
              onClick={() => setSelectedChapterIdx(selectedChapterIdx - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dayReading.prevChapter')}</span>
            </Button>

            <span className="text-xs text-muted-foreground">
              {selectedChapterIdx + 1} / {chapters.length}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={isLastChapter}
              onClick={() => setSelectedChapterIdx(selectedChapterIdx + 1)}
              className="gap-1.5"
            >
              <span className="hidden sm:inline">{t('dayReading.nextChapter')}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-start gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1 -ml-2 mt-1">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold">
              {t('biblicalReading.day')} {reading.day_number}: {translatedBookName} {chaptersDisplay}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)} •{' '}
              {reading.chapters_count > 1
                ? t('dayReading.chapterCountPlural', { count: reading.chapters_count })
                : t('dayReading.chapterCount', { count: reading.chapters_count })}
            </p>
          </div>
        </div>

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

        <div className="mb-8">
          <h2 className="text-sm font-cinzel font-bold uppercase tracking-wider text-primary mb-4">
            <BookOpen className="w-4 h-4 inline mr-1" />
            {t('dayReading.chaptersToRead')}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {chapters.map((ch, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto flex flex-col items-center justify-center p-3 text-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                onClick={() => setSelectedChapterIdx(idx)}
              >
                <span className="text-[10px] font-semibold text-muted-foreground">{ch.abbreviation}</span>
                <span className="text-lg font-bold">{ch.chapterNumber}</span>
              </Button>
            ))}
          </div>

          {chapters.length > 0 && (
            <div className="mt-4 text-center">
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedChapterIdx(0)}
              >
                <ChevronRight className="w-4 h-4" />
                {t('dayReading.startReading')}
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {!isCompleted && onMarkComplete && (
              <Button
                className="flex-1 gap-2"
                onClick={onMarkComplete}
              >
                <CheckCircle className="w-4 h-4" />
                {t('biblicalReading.markAsRead')}
              </Button>
            )}
            {isCompleted && (
              <Button variant="outline" className="flex-1 gap-2" disabled>
                <CheckCircle className="w-4 h-4 text-primary" />
                {t('biblicalReading.completed')}
              </Button>
            )}
            {isCompleted && onShowQuiz && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={onShowQuiz}
              >
                <Brain className="w-4 h-4" />
                {t('dayReading.doQuiz')}
              </Button>
            )}
          </div>

          <div>
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
    </div>
  );
}
