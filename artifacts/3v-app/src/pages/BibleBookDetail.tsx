import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Play, Pause, Square, Loader2 } from 'lucide-react';
import BibleChapterViewer from '@/components/BibleChapterViewer';
import { preloadBibleChapters, clearBibleCache } from '@/lib/bible-content-loader';
import bibleBooks from '@/data/bible-books.json';
import { getBookName, getBookAbbreviation } from '@/lib/bible-utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGeminiTTS } from '@/hooks/useGeminiTTS';
import { useToast } from '@/components/ui/use-toast';

interface BookData {
  id: number;
  name: string;
  fileName: string;
  testament: 'old' | 'new';
  abbreviation: string;
  chapters: number;
  order: number;
  apocrypha?: boolean;
}

const BibleBookDetail = () => {
  const { t, i18n } = useTranslation();
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterText, setChapterText] = useState('');
  const chapterButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Gemini TTS
  const {
    speak, stop, pause, resume,
    speaking: isSpeaking, paused: isPaused, loading: ttsLoading, supported: ttsSupported,
  } = useGeminiTTS();

  useEffect(() => {
    if (bookId) {
      const foundBook = (bibleBooks.books as BookData[]).find((b) => b.fileName === bookId);
      setBook(foundBook || null);
      setLoading(false);
      clearBibleCache();
      if (foundBook) {
        preloadBibleChapters(foundBook.fileName, foundBook.chapters).catch(() => {});
      }
    }
  }, [bookId]);

  // Arrêter la lecture quand le chapitre change
  useEffect(() => {
    stop();
    setTimeout(() => {
      chapterButtonsRef.current.get(selectedChapter)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }, [selectedChapter, stop]);

  const handlePlayVoice = useCallback(() => {
    if (!ttsSupported) {
      toast({
        title: t('common.error'),
        description: t('bibleBook.voiceUnsupported'),
      });
      return;
    }
    if (!chapterText.trim()) {
      toast({
        title: t('bibleBook.voiceNoTextTitle'),
        description: t('bibleBook.voiceNoTextDesc'),
      });
      return;
    }
    const chapterIntro = `${t('bibleBook.chaptersTitle')} ${selectedChapter}. `;
    const cleanText    = chapterText.replace(/\d+\.\s*/g, ' ').trim();
    speak(chapterIntro + cleanText);
  }, [chapterText, selectedChapter, t, speak, ttsSupported, toast]);

  const handleStopVoice    = useCallback(() => stop(), [stop]);
  const handlePauseResume  = useCallback(() => { if (isPaused) resume(); else pause(); }, [isPaused, pause, resume]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-16 pb-8">
          <section className="py-12">
            <div className="container mx-auto px-4 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('bibleBook.bookNotFound')}</h1>
              <p className="text-muted-foreground mb-6">{t('bibleBook.bookNotFoundDesc')}</p>
              <Button onClick={() => navigate('/biblical-reading')} variant="default">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const localizedName = getBookName(book, i18n.language);
  const localizedAbbr = getBookAbbreviation(book, i18n.language);
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-16 pb-8">
        <div className="border-b bg-background/95 backdrop-blur sticky top-16 z-20">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Button
                onClick={() => navigate('/biblical-reading')}
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                title={t('common.back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {!isSpeaking && !ttsLoading ? (
                <Button
                  onClick={handlePlayVoice}
                  variant="outline"
                  size="sm"
                  disabled={!chapterText.trim() || !ttsSupported}
                >
                  <Play className="w-4 h-4 mr-1" />
                  {t('bibleBook.voiceRead')}
                </Button>
              ) : ttsLoading ? (
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Génération…
                </Button>
              ) : (
                <>
                  <Button onClick={handlePauseResume} variant="outline" size="sm">
                    {isPaused ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}
                    {isPaused ? t('bibleBook.voiceResume') : t('bibleBook.voicePause')}
                  </Button>
                  <Button onClick={handleStopVoice} variant="outline" size="sm">
                    <Square className="w-4 h-4 mr-1" />
                    {t('bibleBook.voiceStop')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-b bg-background sticky top-[7.25rem] z-10">
          <div className="container mx-auto px-4">
            <div className="py-1 flex items-center gap-2">
              <Select
                value={String(selectedChapter)}
                onValueChange={(val) => {
                  const ch = Number(val);
                  setSelectedChapter(ch);
                  // Scroll the chapter button into view
                  setTimeout(() => {
                    chapterButtonsRef.current.get(ch)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 50);
                }}
              >
                <SelectTrigger className="w-auto min-w-[120px] h-9 text-xs gap-1">
                  <SelectValue placeholder={`${t('bibleBook.chaptersTitle')} ${selectedChapter}`} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {chapters.map((ch) => (
                    <SelectItem key={ch} value={String(ch)}>
                      {t('bibleBook.chaptersTitle')} {ch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ScrollArea className="flex-1">
                <div className="flex items-center gap-1 pr-2">
                  {chapters.map((ch) => (
                    <Button
                      key={ch}
                      ref={(el) => {
                        if (el) chapterButtonsRef.current.set(ch, el);
                      }}
                      variant={ch === selectedChapter ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-9 min-w-12 px-3"
                      onClick={() => setSelectedChapter(ch)}
                    >
                      {ch}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        </div>

        <section className="py-4">
          <div className="container mx-auto px-4 max-w-3xl">
            <BibleChapterViewer
              bookId={book.fileName}
              bookName={localizedName}
              abbreviation={localizedAbbr}
              chapterNumber={selectedChapter}
              totalChapters={book.chapters}
              onChapterChange={setSelectedChapter}
              onChapterTextReady={setChapterText}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default BibleBookDetail;
