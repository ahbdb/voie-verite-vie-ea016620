import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, BookOpen, CheckCircle, Brain, Library, Flame, Clock3, ListFilter, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { QuizModal } from '@/components/QuizModal';
import { BibleBookSelector } from '@/components/BibleBookSelector';
import DayReadingViewer from '@/components/DayReadingViewer';
import { logger } from '@/lib/logger';
import { translateBookName } from '@/lib/bible-utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Reading {
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

interface UserProgress {
  reading_id: string;
  completed: boolean;
}

const TOTAL_PROGRAM_DAYS = 358;

// ─── Tablet breakpoint (< 1024px = mobile + tablet) ──────────────────────────
const TABLET_BREAKPOINT = 1024;
function useIsMobileOrTablet() {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const check = () => setIs(window.innerWidth < TABLET_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return is;
}

const BiblicalReading = () => {
  const { t, i18n } = useTranslation();
  const isMobileOrTablet = useIsMobileOrTablet();

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getFullYear()}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  // On mobile/tablet: null = showing the month grid, string = showing that month's readings
  const [mobileActiveMonth, setMobileActiveMonth] = useState<string | null>(null);
  const [selectedTestament, setSelectedTestament] = useState<'all' | 'old' | 'new'>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [activeTab, setActiveTab] = useState('program');
  const [allReadings, setAllReadings] = useState<Reading[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizReading, setQuizReading] = useState<Reading | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedDayReading, setSelectedDayReading] = useState<Reading | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadAllReadings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('biblical_readings')
        .select('id, day_number, date, month, year, books, chapters, chapters_count, type, comment')
        .order('day_number');

      if (error) {
        const cached = localStorage.getItem('biblical_readings_cache');
        if (cached) {
          try { setAllReadings(JSON.parse(cached)); } catch { setAllReadings([]); }
        }
      } else {
        setAllReadings(data || []);
        localStorage.setItem('biblical_readings_cache', JSON.stringify(data || []));
      }
    } catch {
      const cached = localStorage.getItem('biblical_readings_cache');
      if (cached) {
        try { setAllReadings(JSON.parse(cached)); } catch { setAllReadings([]); }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserProgress = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_reading_progress')
      .select('reading_id, completed')
      .eq('user_id', user.id);
    setUserProgress((data || []) as UserProgress[]);
  }, [user]);

  useEffect(() => {
    const cached = localStorage.getItem('biblical_readings_cache');
    if (cached) {
      try { setAllReadings(JSON.parse(cached)); setLoading(false); } catch { setLoading(true); }
    }
    void loadAllReadings();
    if (user) void loadUserProgress();
  }, [user, loadAllReadings, loadUserProgress]);

  const completedSet = useMemo(
    () => new Set(userProgress.filter((p) => p.completed).map((p) => p.reading_id)),
    [userProgress]
  );
  const isCompleted = useCallback((id: string) => completedSet.has(id), [completedSet]);

  const getLocale = () => {
    const lang = i18n.language?.split('-')[0] || 'fr';
    if (lang === 'it') return 'it-IT';
    if (lang === 'en') return 'en-US';
    return 'fr-FR';
  };

  const monthsOrder = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(getLocale(), { month: 'short' });
    const keys = [
      { m: 11, y: 2025 }, { m: 12, y: 2025 },
      { m: 1, y: 2026 }, { m: 2, y: 2026 }, { m: 3, y: 2026 }, { m: 4, y: 2026 },
      { m: 5, y: 2026 }, { m: 6, y: 2026 }, { m: 7, y: 2026 }, { m: 8, y: 2026 },
      { m: 9, y: 2026 }, { m: 10, y: 2026 }, { m: 11, y: 2026 },
    ];
    return keys.map(({ m, y }) => {
      const label = fmt.format(new Date(y, m - 1, 1));
      return { key: `${m}-${y}`, name: `${label.charAt(0).toUpperCase() + label.slice(1)} ${y}` };
    });
  }, [i18n.language]);

  const monthStats = useMemo(() =>
    monthsOrder.reduce<Record<string, { total: number; completed: number; ratio: number }>>((acc, month) => {
      const [m, y] = month.key.split('-').map(Number);
      const monthReadings = allReadings.filter((r) => r.month === m && r.year === y);
      const completed = monthReadings.filter((r) => completedSet.has(r.id)).length;
      const total = monthReadings.length;
      acc[month.key] = { total, completed, ratio: total > 0 ? Math.round((completed / total) * 100) : 0 };
      return acc;
    }, {}),
    [monthsOrder, allReadings, completedSet]
  );

  // Index of currently active month in the ordered list (for prev/next navigation)
  const validMonths = useMemo(
    () => monthsOrder.filter((m) => (monthStats[m.key]?.total ?? 0) > 0),
    [monthsOrder, monthStats]
  );

  const activeMobileMonthIndex = useMemo(() => {
    if (!mobileActiveMonth) return -1;
    return validMonths.findIndex((m) => m.key === mobileActiveMonth);
  }, [mobileActiveMonth, validMonths]);

  const goToMobileMonth = (key: string) => {
    setMobileActiveMonth(key);
    setSelectedMonth(key);
    setSelectedTestament('all');
  };

  const filteredReadings = useMemo(() => {
    const effectiveMonth = isMobileOrTablet ? mobileActiveMonth : selectedMonth;
    let filtered = allReadings;

    if (effectiveMonth && effectiveMonth !== 'all') {
      const [month, year] = effectiveMonth.split('-').map(Number);
      filtered = filtered.filter((r) => r.month === month && r.year === year);
    }

    if (selectedTestament !== 'all') {
      const ntBooks = ['Matthieu','Marc','Luc','Jean','Actes','Romains','Corinthiens','Galates',
        'Éphésiens','Philippiens','Colossiens','Thessaloniciens','Timothée','Tite','Philémon',
        'Hébreux','Jacques','Pierre','Jude','Apocalypse'];
      filtered = selectedTestament === 'old'
        ? filtered.filter((r) => !ntBooks.some((nt) => r.books.includes(nt)))
        : filtered.filter((r) => ntBooks.some((nt) => r.books.includes(nt)));
    }

    if (onlyUnread) filtered = filtered.filter((r) => !completedSet.has(r.id));
    return filtered;
  }, [allReadings, selectedMonth, mobileActiveMonth, isMobileOrTablet, selectedTestament, onlyUnread, completedSet]);

  const completedCount = useMemo(() => userProgress.filter((p) => p.completed).length, [userProgress]);
  const progressPercentage = useMemo(
    () => Math.round((completedCount / TOTAL_PROGRAM_DAYS) * 100),
    [completedCount]
  );

  const todayReading = useMemo(() => {
    if (!allReadings.length) return null;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return allReadings.find((r) => r.date === todayIso)
      || allReadings.find((r) => !isCompleted(r.id))
      || allReadings[0];
  }, [allReadings, isCompleted]);

  const toggleReadingComplete = async (reading: Reading) => {
    if (!user) return navigate('/auth');
    const existing = userProgress.find((p) => p.reading_id === reading.id);
    const wasCompleted = existing?.completed;
    try {
      if (existing) {
        await supabase.from('user_reading_progress')
          .update({ completed: !existing.completed, completed_at: !existing.completed ? new Date().toISOString() : null })
          .eq('user_id', user.id).eq('reading_id', reading.id);
      } else {
        await supabase.from('user_reading_progress').insert({
          user_id: user.id, reading_id: reading.id, completed: true, completed_at: new Date().toISOString(),
        });
      }
      await loadUserProgress();
      if (!wasCompleted) { setQuizReading(reading); setShowQuiz(true); toast({ title: t('biblicalReading.readingCompleted') }); }
    } catch {
      toast({ title: t('common.error'), description: t('biblicalReading.updateError'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (selectedDayReading) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <Navigation />
          <DayReadingViewer
            reading={selectedDayReading as any}
            onClose={() => setSelectedDayReading(null)}
            isCompleted={isCompleted(selectedDayReading.id)}
            onMarkComplete={() => toggleReadingComplete(selectedDayReading)}
            onShowQuiz={() => { setQuizReading(selectedDayReading); setShowQuiz(true); }}
          />
        </div>
        {showQuiz && quizReading && (
          <QuizModal reading={quizReading} isOpen={showQuiz} onClose={() => { setShowQuiz(false); setQuizReading(null); }} />
        )}
      </>
    );
  }

  // ─── Readings list (shared by both desktop and mobile month view) ─────────
  const ReadingsList = () => (
    <div className="space-y-3">
      {filteredReadings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {t('about.noReadingsForFilter')}
        </div>
      ) : (
        filteredReadings.map((reading) => {
          const completed = isCompleted(reading.id);
          return (
            <div key={reading.id} className={`rounded-xl border p-4 transition-colors ${completed ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex items-start gap-3">
                <div className="w-14 rounded-lg border border-border bg-muted/40 px-2 py-1 text-center flex-shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(reading.date).toLocaleDateString(getLocale(), { month: 'short' })}
                  </p>
                  <p className="text-lg leading-none font-cinzel font-bold text-primary">
                    {new Date(reading.date).toLocaleDateString(getLocale(), { day: 'numeric' })}
                  </p>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('biblicalReading.day')} {reading.day_number}</p>
                  <Button
                    variant="link" size="sm"
                    className="p-0 h-auto text-left font-semibold text-sm text-foreground hover:text-primary leading-snug justify-start"
                    onClick={() => setSelectedDayReading(reading)}
                  >
                    {translateBookName(reading.books, i18n.language)} {reading.chapters}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {reading.chapters_count}{' '}
                    {reading.chapters_count > 1 ? t('biblicalReading.chaptersPlural') : t('biblicalReading.chapters')}
                  </p>
                  {reading.comment && <p className="text-xs italic text-muted-foreground line-clamp-2">{reading.comment}</p>}
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                  {completed && (
                    <Button size="sm" variant="outline"
                      onClick={() => { setQuizReading(reading); setShowQuiz(true); }}
                      className="gap-1.5 text-xs"
                    >
                      <Brain className="w-3.5 h-3.5" />Quiz
                    </Button>
                  )}
                  <Button size="sm" variant={completed ? 'default' : 'outline'}
                    onClick={() => toggleReadingComplete(reading)}
                    className="gap-1.5 text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {completed ? t('biblicalReading.completed') : t('biblicalReading.markAsRead')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ─── MOBILE / TABLET: Month detail view ──────────────────────────────────
  if (isMobileOrTablet && mobileActiveMonth) {
    const monthLabel = validMonths.find((m) => m.key === mobileActiveMonth)?.name ?? '';
    const stats = monthStats[mobileActiveMonth];
    const prevMonth = activeMobileMonthIndex > 0 ? validMonths[activeMobileMonthIndex - 1] : null;
    const nextMonth = activeMobileMonthIndex < validMonths.length - 1 ? validMonths[activeMobileMonthIndex + 1] : null;

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16">
          {/* Top bar */}
          <div className="sticky top-16 z-20 bg-card border-b border-border/60 px-4 py-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setMobileActiveMonth(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
              {t('common.back', 'Retour')}
            </button>

            <span className="font-cinzel font-bold text-foreground text-base truncate max-w-[160px]">{monthLabel}</span>

            <button
              onClick={() => nextMonth && goToMobileMonth(nextMonth.key)}
              disabled={!nextMonth}
              className={`flex items-center gap-1 text-xs font-medium transition-opacity ${nextMonth ? 'text-primary hover:opacity-80' : 'text-muted-foreground opacity-40 cursor-not-allowed'}`}
            >
              {nextMonth ? nextMonth.name.split(' ')[0] : t('biblicalReading.nextMonth', 'Suivant')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="container mx-auto px-4 max-w-2xl py-4 space-y-4">
            {/* Month progress */}
            {stats && stats.total > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stats.completed}/{stats.total} {t('biblicalReading.completedLabel')}</span>
                  <span className="font-cinzel font-bold text-primary">{stats.ratio}%</span>
                </div>
                <Progress value={stats.ratio} className="h-2" />
              </div>
            )}

            {/* Testament filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: t('biblicalReading.all') },
                { key: 'old', label: t('biblicalReading.oldTestament') },
                { key: 'new', label: t('biblicalReading.newTestament') },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSelectedTestament(f.key as 'all' | 'old' | 'new')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTestament === f.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setOnlyUnread((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  onlyUnread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <ListFilter className="w-3 h-3" />
                {onlyUnread ? t('about.unreadReadings') : t('about.allReadings')}
              </button>
            </div>

            <ReadingsList />

            {/* Bottom prev/next navigation */}
            <div className="flex items-center justify-between pt-2 pb-6">
              <Button variant="outline" size="sm"
                onClick={() => prevMonth && goToMobileMonth(prevMonth.key)}
                disabled={!prevMonth}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                {prevMonth ? prevMonth.name : t('biblicalReading.prevMonth', 'Précédent')}
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => nextMonth && goToMobileMonth(nextMonth.key)}
                disabled={!nextMonth}
                className="gap-1.5"
              >
                {nextMonth ? nextMonth.name : t('biblicalReading.nextMonth', 'Suivant')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>

        {showQuiz && quizReading && (
          <QuizModal reading={quizReading} isOpen={showQuiz} onClose={() => { setShowQuiz(false); setQuizReading(null); }} />
        )}
      </div>
    );
  }

  // ─── MOBILE / TABLET: Month grid view ────────────────────────────────────
  if (isMobileOrTablet) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-16">
          {/* Header */}
          <section className="border-b border-border/60 bg-card">
            <div className="container mx-auto px-4 max-w-2xl py-5 space-y-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-cinzel font-bold text-foreground">{t('biblicalReading.title')}</h1>
                <p className="text-xs text-muted-foreground">{t('biblicalReading.subtitle')}</p>
              </div>

              {todayReading && (
                <button
                  type="button"
                  onClick={() => setSelectedDayReading(todayReading)}
                  className="w-full text-left rounded-xl border border-border bg-background p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                        <Flame className="w-3.5 h-3.5" />
                        {t('about.readingOfDay')}
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {t('biblicalReading.day')} {todayReading.day_number} · {translateBookName(todayReading.books, i18n.language)} {todayReading.chapters}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-muted-foreground">{t('about.progression')}</div>
                      <div className="text-lg font-cinzel font-bold text-primary">{progressPercentage}%</div>
                    </div>
                  </div>
                  <Progress value={progressPercentage} className="h-1.5 mt-3" />
                </button>
              )}
            </div>
          </section>

          {/* Tabs: Programme | Livres */}
          <section className="container mx-auto px-4 max-w-2xl py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="program" className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4" />{t('biblicalReading.programTab')}
                </TabsTrigger>
                <TabsTrigger value="books" className="flex items-center gap-1.5 text-sm">
                  <Library className="w-4 h-4" />{t('biblicalReading.booksTab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="program" className="space-y-4">
                {/* Global progress card */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{completedCount}/{TOTAL_PROGRAM_DAYS} {t('biblicalReading.completedLabel')}</span>
                    <span className="font-cinzel font-bold text-primary">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {/* Month grid */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    {t('biblicalReading.selectMonth', 'Choisissez un mois')}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {validMonths.map((month) => {
                      const stats = monthStats[month.key] ?? { total: 0, completed: 0, ratio: 0 };
                      const isCurrent = month.key === currentMonthKey;

                      return (
                        <button
                          key={month.key}
                          onClick={() => goToMobileMonth(month.key)}
                          className={`rounded-2xl border p-4 text-left transition-all active:scale-95 relative ${
                            isCurrent
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500'
                              : 'border-border bg-card hover:bg-muted/40'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                          )}
                          <p className={`text-sm font-bold mb-1 pr-3 ${isCurrent ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                            {month.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mb-2">
                            {stats.completed}/{stats.total} {t('biblicalReading.completedLabel')}
                          </p>
                          <Progress value={stats.ratio} className="h-1.5" />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-semibold text-primary">{stats.ratio}%</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              {t('common.open', 'Ouvrir')} <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="books" className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-cinzel font-bold">{t('biblicalReading.exploreBooks')}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t('biblicalReading.exploreBooksDesc')}</p>
                <BibleBookSelector />
              </TabsContent>
            </Tabs>
          </section>
        </main>

        {showQuiz && quizReading && (
          <QuizModal reading={quizReading} isOpen={showQuiz} onClose={() => { setShowQuiz(false); setQuizReading(null); }} />
        )}
      </div>
    );
  }

  // ─── DESKTOP: original layout (unchanged) ────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="border-b border-border/60 bg-card">
          <div className="container mx-auto px-4 max-w-6xl py-6 space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-foreground">{t('biblicalReading.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('biblicalReading.subtitle')}</p>
            </div>

            {todayReading && (
              <button
                type="button"
                onClick={() => setSelectedDayReading(todayReading)}
                className="w-full text-left rounded-xl border border-border bg-background p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                      <Flame className="w-4 h-4" />{t('about.readingOfDay')}
                    </div>
                    <p className="text-base md:text-lg font-semibold text-foreground">
                      {t('biblicalReading.day')} {todayReading.day_number} · {translateBookName(todayReading.books, i18n.language)} {todayReading.chapters}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      {new Date(todayReading.date).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{t('about.progression')}</div>
                    <div className="text-xl font-cinzel font-bold text-primary">{progressPercentage}%</div>
                  </div>
                </div>
                <div className="mt-3"><Progress value={progressPercentage} className="h-2" /></div>
              </button>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 max-w-6xl py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="program" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /><span>{t('biblicalReading.programTab')}</span>
              </TabsTrigger>
              <TabsTrigger value="books" className="flex items-center gap-2">
                <Library className="w-4 h-4" /><span>{t('biblicalReading.booksTab')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="program" className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('about.readingProgram')}</p>
                    <p className="text-xs text-muted-foreground">{completedCount}/{TOTAL_PROGRAM_DAYS} {t('biblicalReading.completedLabel')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyUnread((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${onlyUnread ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    {onlyUnread ? t('about.unreadReadings') : t('about.allReadings')}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('about.totalProgress')}</span>
                    <span className="font-cinzel font-bold text-primary">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
                <button
                  onClick={() => setSelectedMonth('all')}
                  className={`rounded-xl border p-3 text-left transition-colors flex-shrink-0 w-32 sm:w-auto ${selectedMonth === 'all' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/40'}`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('about.filter')}</p>
                  <p className="text-sm font-semibold text-foreground">{t('biblicalReading.all')}</p>
                </button>

                {monthsOrder.map((month) => {
                  const stats = monthStats[month.key];
                  if (!stats || stats.total === 0) return null;
                  const isSelected = selectedMonth === month.key;
                  const isCurrent = month.key === currentMonthKey;
                  return (
                    <button
                      key={month.key}
                      onClick={() => setSelectedMonth(month.key)}
                      className={`rounded-xl border p-3 text-left transition-colors flex-shrink-0 w-32 sm:w-auto relative ${
                        isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : isCurrent ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-900/30'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      {isCurrent && !isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-semibold truncate ${isCurrent && !isSelected ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                          {month.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{stats.completed}/{stats.total}</span>
                      </div>
                      <Progress value={stats.ratio} className="h-1.5 mt-2" />
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: t('biblicalReading.all') },
                  { key: 'old', label: t('biblicalReading.oldTestament') },
                  { key: 'new', label: t('biblicalReading.newTestament') },
                ].map((f) => (
                  <button key={f.key} onClick={() => setSelectedTestament(f.key as 'all' | 'old' | 'new')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTestament === f.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >{f.label}</button>
                ))}
              </div>

              <ReadingsList />
            </TabsContent>

            <TabsContent value="books" className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-cinzel font-bold">{t('biblicalReading.exploreBooks')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t('biblicalReading.exploreBooksDesc')}</p>
              <BibleBookSelector />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      {showQuiz && quizReading && (
        <QuizModal reading={quizReading} isOpen={showQuiz} onClose={() => { setShowQuiz(false); setQuizReading(null); }} />
      )}
    </div>
  );
};

export default BiblicalReading;
