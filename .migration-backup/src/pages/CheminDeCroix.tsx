import { memo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Cross, Share2, Printer, BookOpen } from 'lucide-react';
import { getCheminDeCroixData } from '@/data/chemin-de-croix-data';
import { supabase } from '@/integrations/supabase/client';
import { generateShareImage, shareImage } from '@/lib/share-utils';
import { useToast } from '@/components/ui/use-toast';
import stainedGlass from '@/assets/stained-glass-cross.jpg';

interface Station { number: number; title: string; reading: string; text: string; meditation: string; prayer: string; }

const mergeCheminContent = (rawContent: any, baseData: any) => ({ ...baseData, ...rawContent, intro: { ...baseData.intro, ...(rawContent?.intro || {}) }, conclusion: { ...baseData.conclusion, ...(rawContent?.conclusion || {}) }, stations: Array.isArray(rawContent?.stations) && rawContent.stations.length > 0 ? rawContent.stations : baseData.stations, adoration: rawContent?.adoration || baseData.adoration });

const CheminDeCroix = memo(() => {
  const { t, i18n } = useTranslation();
  const cheminDeCroixData = getCheminDeCroixData(i18n.language);
  const [selectedStation, setSelectedStation] = useState<any | null>(null);
  const [activeSection, setActiveSection] = useState<'intro' | 'stations' | 'conclusion'>('stations');
  const [sharingProgress, setSharingProgress] = useState<{ current: number, total: number } | null>(null);
  const subscriptionRef = useRef<any>(null);
  const { toast } = useToast();

  const printPage = () => window.print();
  const shareProgram = async () => {
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: `${t('chemin.title')} — Voie-Vérité-Vie`, text: t('chemin.subtitle'), url: window.location.href }); }
      else { await navigator.clipboard.writeText(window.location.href); }
    } catch (err) { console.error(err); }
  };

  const goToNextStation = (stations: any[]) => { if (!selectedStation) return; const idx = stations.findIndex(s => s.number === selectedStation.number); if (idx < stations.length - 1) setSelectedStation(stations[idx + 1]); };
  const goToPreviousStation = (stations: any[]) => { if (!selectedStation) return; const idx = stations.findIndex(s => s.number === selectedStation.number); if (idx > 0) setSelectedStation(stations[idx - 1]); };

  const shareStation = async (adoration: string) => {
    if (!selectedStation) return;
    try {
      const blob = await generateShareImage({ title: selectedStation.title, reading: selectedStation.reading, text: selectedStation.text, meditation: selectedStation.meditation, prayer: selectedStation.prayer, adoration, number: selectedStation.number, type: 'station' });
      if (blob) await shareImage(blob, `Station-${String(selectedStation.number).padStart(2, '0')}`);
    } catch (error) { console.error('❌ Erreur:', error); }
  };

  const shareAllStations = async (stations: any[], adoration: string) => {
    if (stations.length === 0) return;
    setSharingProgress({ current: 0, total: stations.length });
    for (let idx = 0; idx < stations.length; idx++) {
      try {
        setSharingProgress({ current: idx + 1, total: stations.length });
        const blob = await generateShareImage({ title: stations[idx].title, reading: stations[idx].reading, text: stations[idx].text, meditation: stations[idx].meditation, prayer: stations[idx].prayer, adoration: cheminDeCroixData.adoration, number: stations[idx].number, type: 'station' });
        if (blob) await shareImage(blob, `Station-${String(stations[idx].number).padStart(2, '0')}`);
      } catch (error) { console.error(`❌ Erreur station ${stations[idx].number}:`, error); }
      await new Promise(resolve => setTimeout(resolve, !/android|iphone|ipad/i.test(navigator.userAgent) ? 500 : 300));
    }
    setSharingProgress(null);
    toast({ title: `✝️ ${t('chemin.allStationsShared')}` });
  };

  const [contentData, setContentData] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { data, error } = await supabase.from('page_content').select('*').eq('page_key', 'chemin-de-croix').single();
        if (error) return;
        const content = data.content as { stations?: Station[] } | null;
        if (content) setContentData(mergeCheminContent(content, cheminDeCroixData));
      } catch (err) { console.error('❌ [CheminDeCroix] Failed to load content:', err); }
    };
    void loadContent();
    if (!subscriptionRef.current) {
      subscriptionRef.current = supabase.channel('chemin_de_croix_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'page_content', filter: `page_key=eq.chemin-de-croix` }, (payload: any) => { if (payload.new?.content) setContentData(mergeCheminContent(payload.new.content, cheminDeCroixData)); else void loadContent(); }).subscribe();
    }
    return () => { subscriptionRef.current?.unsubscribe(); subscriptionRef.current = null; };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        (async () => {
          const { data, error } = await supabase.from('page_content').select('*').eq('page_key', 'chemin-de-croix').single();
          if (data?.content && !error) setContentData(mergeCheminContent(data.content, cheminDeCroixData));
        })();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const effective = contentData || cheminDeCroixData;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {sharingProgress && (
        <div className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground p-3 z-50 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1"><span>{t('chemin.sharingInProgress')}</span><span>{sharingProgress.current}/{sharingProgress.total}</span></div>
            <div className="w-full bg-primary-foreground/20 rounded-full h-1.5"><div className="bg-cathedral-gold h-1.5 rounded-full transition-all duration-300" style={{ width: `${(sharingProgress.current / sharingProgress.total) * 100}%` }} /></div>
          </div>
        </div>
      )}

      {/* Hero – Image bleeds to edges */}
      <header className="relative h-[40vh] min-h-[280px] flex items-end overflow-hidden">
        <img src={stainedGlass} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <motion.div className="relative z-10 container mx-auto px-4 pb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Cross className="w-7 h-7 text-cathedral-gold mb-2" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-bold text-foreground mb-1">{effective.intro.title}</h1>
          <p className="text-muted-foreground text-sm max-w-xl">{effective.intro.subtitle}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">⏱️ {effective.intro.duration}</p>
        </motion.div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Section pills */}
        <div className="flex gap-2 mb-6">
          {(['intro', 'stations', 'conclusion'] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeSection === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {s === 'intro' ? `📖 ${t('chemin.introTab')}` : s === 'stations' ? `✝️ ${t('chemin.stationsTab')}` : `✨ ${t('chemin.conclusionTab')}`}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 mb-6">
          <Button size="sm" onClick={printPage} variant="outline" className="gap-1.5"><Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('chemin.print')}</span></Button>
          <Button size="sm" onClick={shareProgram} variant="outline" className="gap-1.5"><Share2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('chemin.share')}</span></Button>
          <Button size="sm" onClick={() => shareAllStations(effective.stations, effective.adoration)} variant="outline" className="gap-1.5 ml-auto"><Share2 className="w-3.5 h-3.5" />{t('chemin.shareAll14')}</Button>
        </div>

        <AnimatePresence mode="wait">
          {activeSection === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{effective.intro.introduction}</p>
              <p className="text-xs italic text-cathedral-gold/70 font-playfair">{effective.intro.verse}</p>
            </motion.div>
          )}

          {activeSection === 'stations' && (
            <motion.div key="stations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="divide-y divide-border">
                {effective.stations.map((station: any, idx: number) => (
                  <motion.button
                    key={idx}
                    onClick={() => setSelectedStation(station)}
                    className="w-full text-left py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <span className="text-2xl font-cinzel font-bold text-primary/40 group-hover:text-primary transition-colors w-10 text-center flex-shrink-0">
                      {String(station.number).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{station.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">{station.reading}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0 transition-colors" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'conclusion' && (
            <motion.div key="conclusion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{cheminDeCroixData.conclusion.text}</p>
              <div className="border-l-2 border-cathedral-gold/30 pl-4">
                <p className="text-sm leading-relaxed whitespace-pre-line">{cheminDeCroixData.conclusion.prayer}</p>
              </div>
              <p className="text-center text-sm font-semibold text-primary italic whitespace-pre-line">{t('chemin.adorationText')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Station detail dialog – flat, no card-in-card */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => { if (!open) setSelectedStation(null); }}>
        <DialogContent id={selectedStation ? 'share-source' : undefined} className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl font-cinzel font-bold text-primary">{String(selectedStation?.number).padStart(2, '0')}</span>
              <div><h2 className="text-lg font-semibold">{selectedStation?.title}</h2><p className="text-xs text-muted-foreground">{selectedStation?.reading}</p></div>
            </DialogTitle>
            <DialogDescription className="sr-only">{t('chemin.title')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <p className="text-center text-sm font-semibold text-primary/80 whitespace-pre-line">{cheminDeCroixData.adoration}</p>

            <blockquote className="border-l-2 border-cathedral-gold/40 pl-4 text-sm italic text-muted-foreground">
              "{selectedStation?.text}"
            </blockquote>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">💭 {t('chemin.meditationLabel')}</h3>
              <p className="text-sm leading-relaxed">{selectedStation?.meditation}</p>
            </div>

            <div className="bg-muted/40 rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">🙏 {t('chemin.prayerLabel')}</h3>
              <p className="text-sm italic">{selectedStation?.prayer}</p>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">{t('neuvaines.ourFather')}... • {t('neuvaines.hailMary')}...</p>
            </div>

            <div className="flex gap-2 pt-3 border-t border-border">
              <Button onClick={() => goToPreviousStation(effective.stations)} disabled={selectedStation?.number === 1} size="sm" variant="outline" className="flex-1 gap-1"><ChevronLeft className="w-4 h-4" /></Button>
              <Button onClick={() => shareStation(effective.adoration)} size="sm" variant="outline" className="flex-1 gap-1"><Share2 className="h-4 w-4" /></Button>
              <Button onClick={() => setSelectedStation(null)} size="sm" variant="ghost" className="flex-1">✕</Button>
              <Button onClick={() => goToNextStation(effective.stations)} disabled={selectedStation?.number === 14} size="sm" variant="outline" className="flex-1 gap-1"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default CheminDeCroix;
