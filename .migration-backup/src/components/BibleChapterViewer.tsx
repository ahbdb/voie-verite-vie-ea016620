import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui/use-toast';
import { loadBibleChapterCached, clearBibleCache, BibleVerse } from '@/lib/bible-content-loader';
import { supabase } from '@/integrations/supabase/client';

interface BibleChapterViewerProps {
  bookId: string;
  bookName: string;
  abbreviation: string;
  chapterNumber: number;
  totalChapters?: number;
  onChapterChange?: (ch: number) => void;
  onChapterTextReady?: (text: string) => void;
  onBack?: () => void;
}

export const BibleChapterViewer = ({
  bookId,
  bookName,
  abbreviation,
  chapterNumber,
  totalChapters,
  onChapterChange,
  onChapterTextReady,
}: BibleChapterViewerProps) => {
  const { t, i18n } = useTranslation();
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const lang = i18n.language?.split('-')[0] || 'fr';

  useEffect(() => {
    let isMounted = true;

    const loadChapter = async () => {
      try {
        setLoading(true);
        setInitialLoadDone(false);
        setError(null);

        let chapterVerses = await loadBibleChapterCached(bookId, chapterNumber);
        if (!chapterVerses) {
          clearBibleCache();
          chapterVerses = await loadBibleChapterCached(bookId, chapterNumber);
        }

        if (!isMounted) return;

        if (!chapterVerses) {
          setError(t('bibleChapter.chapterNotAvailable', { chapter: chapterNumber, book: bookName }));
          setVerses([]);
          setLoading(false);
          return;
        }

        if (lang === 'fr') {
          const patchKey = `bible_patched_fr_${bookId}_${chapterNumber}`;
          const cached = localStorage.getItem(patchKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.length > 0) {
                setVerses(parsed);
                setLoading(false);
                return;
              }
            } catch {
              // ignore parse cache errors
            }
          }

          const nonEmpty = chapterVerses.filter((v: any) => v.text && v.text.trim());
          setVerses(nonEmpty);
          setLoading(false);

          const hasEmpty = chapterVerses.some((v: any) => !v.text || v.text.trim() === '');
          if (hasEmpty) {
            supabase.functions
              .invoke('translate-bible-chapter', {
                body: {
                  verses: chapterVerses,
                  bookName,
                  chapterNumber,
                  bookFileName: bookId,
                  patchEmptyVerses: true,
                },
              })
              .then(({ data }) => {
                if (isMounted && data?.verses?.length > 0) {
                  const patched = data.verses.filter((v: any) => v.text && v.text.trim());
                  setVerses(patched);
                  if (data.patched > 0) {
                    localStorage.setItem(patchKey, JSON.stringify(patched));
                  }
                }
              })
              .catch(() => {});
          }
          return;
        }

        const cacheKey = `bible_${lang}_${bookId}_${chapterNumber}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.length > 0) {
              setVerses(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // ignore parse cache errors
          }
        }

        setLoading(false);
        const { data, error: fnError } = await supabase.functions.invoke('translate-bible-chapter', {
          body: { verses: chapterVerses, bookName, chapterNumber, targetLang: lang, bookFileName: bookId },
        });

        if (!isMounted) return;

        if (!fnError && data?.verses?.length > 0) {
          setVerses(data.verses);
          localStorage.setItem(cacheKey, JSON.stringify(data.verses));
        } else {
          setVerses(chapterVerses.filter((v: any) => v.text && v.text.trim()));
        }
      } catch (err) {
        if (isMounted) {
          setError(t('bibleChapter.loadError', { error: String(err) }));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialLoadDone(true);
        }
      }
    };

    loadChapter();
    return () => {
      isMounted = false;
    };
  }, [bookId, chapterNumber, bookName, t, lang]);

  useEffect(() => {
    if (!onChapterTextReady) return;
    const text = verses.map((verse) => `${verse.number}. ${verse.text}`).join(' ');
    onChapterTextReady(text);
  }, [verses, onChapterTextReady]);

  const generateVerseImage = useCallback(async (verseNumber: number): Promise<Blob | null> => {
    const reference = `${abbreviation} ${chapterNumber}:${verseNumber}`;
    const text = verses.find((v) => Number(v.number) === Number(verseNumber))?.text || '';

    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute; left: -9999px; top: -9999px;
      width: 600px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 40px; font-family: Georgia, serif; border-radius: 16px;
    `;
    container.innerHTML = `
      <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <p style="font-size: 18px; line-height: 1.7; color: #1f2937; margin: 0 0 16px 0; font-style: italic;">"${text}"</p>
        <p style="font-size: 14px; color: #7c3aed; font-weight: 600; margin: 0; text-align: right;">— ${reference}</p>
      </div>
    `;
    document.body.appendChild(container);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(container, { backgroundColor: null, scale: 2, useCORS: true });
      document.body.removeChild(container);
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
    } catch {
      document.body.removeChild(container);
      return null;
    }
  }, [abbreviation, chapterNumber, verses]);

  const copyToClipboard = useCallback(
    async (verseText: string, verseNumber: number) => {
      const blob = await generateVerseImage(verseNumber);
      if (blob && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast({ title: t('bibleChapter.copied'), description: t('bibleChapter.imageCopied', 'Image copiée dans le presse-papiers') });
          return;
        } catch {}
      }
      navigator.clipboard.writeText(verseText);
      toast({ title: t('bibleChapter.copied'), description: t('bibleChapter.verseCopied') });
    },
    [generateVerseImage, toast, t]
  );

  const shareVerse = useCallback(
    async (verseNumber: number) => {
      const reference = `${abbreviation} ${chapterNumber}:${verseNumber}`;
      const appUrl = 'https://voie-verite-vie.lovable.app';
      const blob = await generateVerseImage(verseNumber);

      if (blob && navigator.share) {
        const file = new File([blob], `${reference.replace(/\s+/g, '-')}.png`, { type: 'image/png' });
        const canShareFiles = navigator.canShare?.({ files: [file] });

        try {
          if (canShareFiles) {
            // Share image + URL together — the image IS the clickable link on social platforms
            await navigator.share({
              url: appUrl,
              files: [file],
            });
          } else {
            // Device can't share files — share URL only
            await navigator.share({ url: appUrl, text: `${reference}` });
          }
          return;
        } catch {}
      }

      // Fallback: download image
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reference.replace(/\s+/g, '-')}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: t('bibleChapter.imageDownloaded', 'Image téléchargée') });
      }
    },
    [abbreviation, chapterNumber, generateVerseImage, toast, t]
  );

  const saveVerse = useCallback(
    (verseNumber: number) => {
      const reference = `${abbreviation} ${chapterNumber}:${verseNumber}`;
      const text = verses.find((v) => Number(v.number) === Number(verseNumber))?.text || '';
      const savedVerses = JSON.parse(localStorage.getItem('saved_verses') || '[]');
      const verseData = { reference, text, bookName, savedAt: new Date().toISOString() };
      const isAlreadySaved = savedVerses.some((v: any) => v.reference === reference);

      if (!isAlreadySaved) {
        savedVerses.push(verseData);
        localStorage.setItem('saved_verses', JSON.stringify(savedVerses));
        toast({ title: t('bibleChapter.verseSaved'), description: t('bibleChapter.verseSavedDesc', { ref: reference }) });
      } else {
        toast({ title: t('bibleChapter.alreadySaved'), description: t('bibleChapter.alreadySavedDesc', { ref: reference }) });
      }
    },
    [abbreviation, chapterNumber, verses, bookName, toast, t]
  );

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {verses.length > 0 && (
        <div>
          {verses.map((verse) => (
            <div key={verse.number} className="py-0">
              <p className="m-0 text-base leading-relaxed text-foreground">
                <span className="mr-1 text-xs font-semibold text-primary">{verse.number}</span>
                <span>{verse.text}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {verses.length === 0 && initialLoadDone && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('bibleChapter.noVerses')}</p>
        </div>
      )}

      {totalChapters && onChapterChange && (
        <div className="flex justify-between items-center mt-8 pt-4 border-t">
          <button
            disabled={chapterNumber <= 1}
            onClick={() => onChapterChange(chapterNumber - 1)}
            className="text-sm font-medium text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            ← {t('bibleChapter.prevChapter', 'Précédent')}
          </button>
          <span className="text-xs text-muted-foreground">
            {chapterNumber} / {totalChapters}
          </span>
          <button
            disabled={chapterNumber >= totalChapters}
            onClick={() => onChapterChange(chapterNumber + 1)}
            className="text-sm font-medium text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            {t('bibleChapter.nextChapter', 'Suivant')} →
          </button>
        </div>
      )}
    </div>
  );
};

export default BibleChapterViewer;
