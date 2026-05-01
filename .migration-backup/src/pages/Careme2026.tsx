import { memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Flame, Heart, BookOpen, Users, Calendar, Share2, Printer, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { generateShareImage, shareImage } from '@/lib/share-utils';
import { getCaremeData } from '@/data/careme-2026-data';
import stainedGlass from '@/assets/stained-glass-cross.jpg';

const Careme2026 = memo(() => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const caremeData = getCaremeData(i18n.language);
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyCareme, notify } = useNotifications();
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [contentData, setContentData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'calendar'>('calendar');
  const [sharingProgress, setSharingProgress] = useState<{ current: number, total: number } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  const allDays = contentData?.days || caremeData.fullProgram.flatMap((week: any) =>
    week.days.map((day: any) => ({ date: day.date, title: day.title || '', readings: day.readings || '', actions: day.actions, weekTitle: week.title }))
  );

  const weekGroups = contentData
    ? allDays.reduce((acc: any, day: any) => {
        const lastWeek = acc[acc.length - 1];
        if (lastWeek && lastWeek.title === day.weekTitle) { lastWeek.days.push(day); } else { acc.push({ title: day.weekTitle, days: [day], range: '' }); }
        return acc;
      }, [])
    : caremeData.fullProgram;

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  const parseDateFromLabel = (label: string): Date | null => {
    const months: Record<string, number> = { janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5, juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11 };
    const m = label.toLowerCase().match(/(\d{1,2})(?:er)?\s*(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = months[m[2].toLowerCase() as keyof typeof months];
    if (Number.isNaN(day) || month === undefined) return null;
    return new Date(2026, month, day, 0, 0, 0, 0);
  };

  const isSunday = (d: any) => { const s = (d?.date || d?.title || '').toString().toLowerCase(); return s.startsWith('dimanche') || s.includes('dimanche'); };
  const isCompletedDate = (dateObj: Date | null) => dateObj ? completedDates.includes(toIsoDate(dateObj)) : false;
  const canMarkCompleted = (dateObj: Date | null) => dateObj !== null && dateObj !== undefined;

  const loadContent = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('page_content').select('*').eq('page_key', 'careme-2026').single();
      if (error) return;
      const content = data.content as { days?: any[] } | null;
      if (content?.days) setContentData(content);
    } catch (err) { console.error('❌ [Careme2026] Failed to load content:', err); }
  }, []);

  const loadUserProgress = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any).from('user_program_progress').select('date').eq('user_id', user.id).eq('program_key', 'careme-2026');
      if (error?.code === 'PGRST116' || error) return;
      setCompletedDates((data || []).map((r: any) => r.date));
    } catch (err) { console.warn('⚠️ Failed to load progress:', err); }
  }, [user]);

  const markCompleted = async (dateObj: Date | null) => {
    if (!user || !dateObj) return window.location.assign('/auth');
    if (!canMarkCompleted(dateObj)) { toast({ title: t('common.error'), variant: 'destructive' }); return; }
    const dateStr = toIsoDate(dateObj);
    setCompletedDates((s) => Array.from(new Set([...s, dateStr])));
    try {
      await (supabase as any).from('user_program_progress').upsert({ user_id: user.id, program_key: 'careme-2026', date: dateStr }, { onConflict: 'user_id,program_key,date' });
      toast({ title: t('careme.dayMarkedCompleted') });
      await notifyCareme(new Date().getDate(), `Jour complété! 🙏`);
    } catch (err) { toast({ title: t('common.error'), description: t('careme.saveError'), variant: 'destructive' }); }
  };

  const unmarkCompleted = async (dateObj: Date | null) => {
    if (!user || !dateObj) return;
    const dateStr = toIsoDate(dateObj);
    setCompletedDates((s) => s.filter(d => d !== dateStr));
    try { await (supabase as any).from('user_program_progress').delete().eq('user_id', user.id).eq('program_key', 'careme-2026').eq('date', dateStr); toast({ title: t('careme.dayRemoved') }); } catch (err) { console.error(err); }
  };

  const shareDay = async (day: any) => {
    if (!day) return;
    try {
      const dayNum = allDays.filter((d: any) => !isSunday(d)).findIndex((d: any) => d.date === day.date) + 1;
      const blob = await generateShareImage({ title: `${day.date}${day.title ? ' - ' + day.title : ''}`, reading: day.readings, text: day.actions?.soi ? `🪞 ${day.actions.soi}` : undefined, meditation: day.actions?.prochain ? `❤️ ${day.actions.prochain}` : undefined, prayer: day.actions?.dieu ? `🙏 ${day.actions.dieu}` : undefined, number: dayNum, type: 'day' });
      if (blob) { await shareImage(blob, `Careme-Jour-${String(dayNum).padStart(2, '0')}`); }
    } catch (error) { console.error('Erreur:', error); }
  };

  const shareAllDays = async () => {
    const nonSundayDays = allDays.filter((d: any) => !isSunday(d));
    if (nonSundayDays.length === 0) return;
    setSharingProgress({ current: 0, total: nonSundayDays.length });
    for (let idx = 0; idx < nonSundayDays.length; idx++) {
      const day = nonSundayDays[idx];
      try {
        setSharingProgress({ current: idx + 1, total: nonSundayDays.length });
        const actionsList = [day.actions?.soi ? `🪞 Soi: ${day.actions.soi}` : null, day.actions?.prochain ? `❤️ Prochain: ${day.actions.prochain}` : null, day.actions?.dieu ? `🙏 Dieu: ${day.actions.dieu}` : null].filter(Boolean).join('\n\n');
        const blob = await generateShareImage({ title: 'Actions pour aujourd\'hui', subtitle: `Jour ${idx + 1}/40 - ${day.date}`, text: actionsList, number: idx + 1, type: 'day' });
        if (blob) await shareImage(blob, `Careme-Actions-Jour-${String(idx + 1).padStart(2, '0')}`);
      } catch (error) { console.error(`❌ Erreur jour ${idx + 1}:`, error); }
      await new Promise(resolve => setTimeout(resolve, !/android|iphone|ipad/i.test(navigator.userAgent) ? 500 : 300));
    }
    setSharingProgress(null);
    toast({ title: `✝️ ${t('careme.allDaysShared')}` });
  };

  useEffect(() => {
    loadContent();
    loadUserProgress();
    if (!subscription) {
      const sub = supabase.channel('careme_2026_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'page_content', filter: `page_key=eq.careme-2026` }, (payload: any) => {
        if (payload.new?.content?.days) setContentData(payload.new.content); else loadContent();
      }).subscribe();
      setSubscription(sub);
    }
    return () => { if (subscription) subscription.unsubscribe(); };
  }, [user, loadContent, loadUserProgress, subscription]);

  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') loadContent(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [loadContent]);

  const nonSundayDays = allDays.filter((d: any) => !isSunday(d));
  const completionRate = nonSundayDays.length > 0 ? Math.round((completedDates.length / nonSundayDays.length) * 100) : 0;
  const printPage = () => window.print();
  const shareProgram = async () => {
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Carême 2026 — Voie-Vérité-Vie', text: '40 jours de prière, pénitence et partage', url: window.location.href }); }
      else { await navigator.clipboard.writeText(window.location.href); toast({ title: t('careme.linkCopied') }); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {sharingProgress && (
        <div className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground p-3 z-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1"><span>{t('careme.sharingInProgress')}</span><span>{sharingProgress.current}/{sharingProgress.total}</span></div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-1.5"><div className="bg-cathedral-gold h-1.5 rounded-full transition-all duration-300" style={{ width: `${(sharingProgress.current / sharingProgress.total) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {/* Hero */}
      <header className="relative h-[40vh] min-h-[280px] flex items-end overflow-hidden">
        <img src={stainedGlass} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <motion.div className="relative z-10 container mx-auto px-4 pb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Flame className="w-7 h-7 text-cathedral-gold mb-2" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-bold text-foreground mb-1">{t('careme.title')}</h1>
          <p className="text-muted-foreground text-sm max-w-xl">{t('careme.subtitle')}</p>
        </motion.div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Progress – flat */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{completedDates.length}/{nonSundayDays.length} {t('careme.daysCompleted')}</span>
            <span className="font-cinzel font-bold text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2.5" />
        </div>

        {/* Section pills + toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['overview', 'calendar'] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeSection === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {s === 'overview' ? `📅 ${t('careme.overviewTab')}` : `📋 ${t('careme.calendarTab')}`}
            </button>
          ))}
          <button
            onClick={() => navigate('/chemin-de-croix')}
            className="px-4 py-2 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
          >
            ✝️ {t('careme.stationsOfCross')}
          </button>
          <div className="flex gap-1.5 ml-auto">
            <button onClick={() => navigate('/reports')} className="h-8 px-2 text-xs text-primary hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{t('reports.activityReports')}</button>
            <Button size="sm" onClick={printPage} variant="ghost" className="h-8 w-8 p-0"><Printer className="w-3.5 h-3.5" /></Button>
            <Button size="sm" onClick={shareProgram} variant="ghost" className="h-8 w-8 p-0"><Share2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Three pillars – flat, side by side */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex gap-3 items-start p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-sm">{t('careme.prayer')}</p><p className="text-xs text-muted-foreground mt-1">{t('careme.prayerDesc')}</p></div>
                </div>
                <div className="flex gap-3 items-start p-4 rounded-xl bg-accent/5 border border-accent/10">
                  <Heart className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-sm">{t('careme.penance')}</p><p className="text-xs text-muted-foreground mt-1">{t('careme.penanceDesc')}</p></div>
                </div>
                <div className="flex gap-3 items-start p-4 rounded-xl bg-cathedral-gold/5 border border-cathedral-gold/10">
                  <Users className="w-5 h-5 text-cathedral-gold flex-shrink-0 mt-0.5" />
                  <div><p className="font-semibold text-sm">{t('careme.sharing')}</p><p className="text-xs text-muted-foreground mt-1">{t('careme.sharingDesc')}</p></div>
                </div>
              </div>

              {/* Daily rhythm – flat table */}
              <div>
                <h3 className="font-cinzel font-bold text-lg mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />{t('careme.dailyRhythm')}</h3>
                <div className="divide-y divide-border">
                  {[
                    { time: '05:00', label: t('careme.introductionPrayer') },
                    { time: t('careme.allDay'), label: t('careme.soberFasting') },
                    { time: '18:00', label: t('careme.breakPrayer') },
                    { time: t('careme.evening'), label: t('careme.examConscience') },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between py-3 text-sm">
                      <span className="text-muted-foreground">{item.time}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <Button size="sm" onClick={shareAllDays} variant="outline" className="w-full gap-2"><Share2 className="w-4 h-4" />{t('careme.shareAll40')}</Button>

              {weekGroups.map((week: any, weekIdx: number) => (
                <div key={weekIdx}>
                  {/* Week title – flat divider */}
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-cinzel font-bold text-sm text-primary whitespace-nowrap">{week.title}</h3>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{week.range}</span>
                  </div>

                  {/* Days – flat grid of pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {week.days.map((day: any, dayIdx: number) => {
                      const dateObj = parseDateFromLabel(day.date);
                      const isCompleted = isCompletedDate(dateObj);
                      const isSun = isSunday(day);
                      return (
                        <button
                          key={dayIdx}
                          onClick={() => !isSun && setSelectedDay({ ...day, dateObj })}
                          disabled={isSun}
                          className={`p-3 rounded-lg text-left transition-all active:scale-[0.97] ${
                            isSun ? 'opacity-40 cursor-default bg-muted/30' : 'hover:bg-muted/50 cursor-pointer'
                          } ${isCompleted ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{day.date}</div>
                              {day.title && <div className="text-xs text-primary/70 line-clamp-1 mt-0.5">{day.title}</div>}
                            </div>
                            {isCompleted && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Day detail dialog – flat */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => { if (!open) setSelectedDay(null); }}>
        <DialogContent id={selectedDay ? 'share-source' : undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-cinzel">{selectedDay?.date}</DialogTitle>
            {selectedDay?.title && <p className="text-sm text-muted-foreground mt-1">{selectedDay.title}</p>}
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedDay?.readings && (
              <div className="border-l-2 border-cathedral-gold/40 pl-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{t('careme.biblicalReadings')}</p>
                <p className="text-sm">{selectedDay.readings}</p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg p-4 bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-primary" /><h3 className="font-semibold text-xs uppercase tracking-wider">🪞 {t('careme.self')}</h3></div>
                <p className="text-sm text-muted-foreground">{selectedDay?.actions?.soi}</p>
              </div>
              <div className="rounded-lg p-4 bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-accent" /><h3 className="font-semibold text-xs uppercase tracking-wider">❤️ {t('careme.neighbor')}</h3></div>
                <p className="text-sm text-muted-foreground">{selectedDay?.actions?.prochain}</p>
              </div>
              <div className="rounded-lg p-4 bg-cathedral-gold/5 border border-cathedral-gold/10">
                <div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-cathedral-gold" /><h3 className="font-semibold text-xs uppercase tracking-wider">🙏 {t('careme.god')}</h3></div>
                <p className="text-sm text-muted-foreground">{selectedDay?.actions?.dieu}</p>
              </div>
            </div>
            {selectedDay?.dateObj && !isSunday(selectedDay) && (
              <div className="flex gap-2 pt-3 border-t border-border">
                <Button onClick={() => shareDay(selectedDay)} size="sm" variant="outline" className="flex-1 gap-1"><Share2 className="w-4 h-4" /><span className="hidden sm:inline">{t('careme.share')}</span></Button>
                <Button size="sm" className="flex-1 gap-1" onClick={() => isCompletedDate(selectedDay.dateObj) ? unmarkCompleted(selectedDay.dateObj) : markCompleted(selectedDay.dateObj)} variant={isCompletedDate(selectedDay.dateObj) ? 'default' : 'outline'} disabled={!isCompletedDate(selectedDay.dateObj) && !canMarkCompleted(selectedDay.dateObj)}><Check className="w-4 h-4" /><span className="hidden sm:inline">{isCompletedDate(selectedDay.dateObj) ? t('careme.completed') : t('careme.complete')}</span></Button>
                <Button size="sm" onClick={() => setSelectedDay(null)} variant="ghost">✕</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default Careme2026;
