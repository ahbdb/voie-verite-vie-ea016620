import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, BookOpen, Download, Heart,
  Cross, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { NeuvaineProse, NeuvaineLitany } from '@/components/NeuvaineProse';

interface DayContent {
  day: number;
  title: string;
  subtitle: string;
  scripture: string;
  meditation: string;
  intercessions: { title: string; text: string }[];
}

interface NeuvaineFull {
  id: string;
  title: string;
  saint_name: string;
  description: string | null;
  introduction: string | null;
  common_prayers: any;
  days: DayContent[];
  conclusion: any;
  pdf_url: string | null;
  total_days: number;
  translations: Record<string, any> | null;
}

const NeuvaineDayView = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [neuvaine, setNeuvaine] = useState<NeuvaineFull | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'meditation' | 'intercessions'>('meditation');
  const lang = i18n.language?.substring(0, 2);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('neuvaines').select('*').eq('id', id).single();
      if (!error && data) {
        setNeuvaine({
          ...data,
          days: Array.isArray(data.days) ? (data.days as any[]) : [],
          common_prayers: data.common_prayers || {},
          conclusion: data.conclusion || {},
          total_days: data.total_days ?? 9,
          translations: (data as any).translations || null
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  // Get localized content
  const localized = useMemo(() => {
    if (!neuvaine) return null;
    
    if (lang !== 'fr' && neuvaine.translations && neuvaine.translations[lang]) {
      const tr = neuvaine.translations[lang];
      return {
        title: tr.title || neuvaine.title,
        saint_name: tr.saint_name || neuvaine.saint_name,
        description: tr.description || neuvaine.description,
        introduction: tr.introduction || neuvaine.introduction,
        common_prayers: tr.common_prayers || neuvaine.common_prayers,
        // Traduction partielle possible : on retombe sur le FR jour par jour
        days: Array.isArray(tr.days)
          ? neuvaine.days.map((d, i) => tr.days[i] ?? d)
          : neuvaine.days,
        conclusion: tr.conclusion || neuvaine.conclusion,
        pdf_url: tr.pdf_url || neuvaine.pdf_url,
      };
    }
    
    return {
      title: neuvaine.title,
      saint_name: neuvaine.saint_name,
      description: neuvaine.description,
      introduction: neuvaine.introduction,
      common_prayers: neuvaine.common_prayers,
      days: neuvaine.days,
      conclusion: neuvaine.conclusion,
      pdf_url: neuvaine.pdf_url,
    };
  }, [neuvaine, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex justify-center items-center pt-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!neuvaine || !localized) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 text-center">
          <p className="text-muted-foreground">{t('neuvaines.notFound')}</p>
          <Button variant="outline" onClick={() => navigate('/neuvaines')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('neuvaines.back')}
          </Button>
        </div>
      </div>
    );
  }

  const days = localized.days;
  const totalPages = days.length + 2;
  const day = currentDay > 0 && currentDay <= days.length ? days[currentDay - 1] : null;

  const goNext = () => { if (currentDay < totalPages - 1) { setCurrentDay(currentDay + 1); setActiveTab('meditation'); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const goPrev = () => { if (currentDay > 0) { setCurrentDay(currentDay - 1); setActiveTab('meditation'); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

  const isIntro = currentDay === 0;
  const isEnd = currentDay === totalPages - 1;
  const progress = Math.round((currentDay / (totalPages - 1)) * 100);

  const openingItems: { key: string; label: string; text: string; italic?: boolean }[] = [
    { key: 'sc', label: t('neuvaines.signOfCross'), text: localized.common_prayers?.opening?.signe_de_croix, italic: true },
    { key: 'es', label: t('neuvaines.holySpirit'), text: localized.common_prayers?.opening?.priere_esprit_saint },
    { key: 'np', label: t('neuvaines.ourFather'), text: localized.common_prayers?.opening?.notre_pere },
  ].filter((x) => !!x.text) as any;

  const closingItems: { key: string; label: string; text: string }[] = [
    { key: 'jm', label: t('neuvaines.hailMary'), text: localized.common_prayers?.closing?.je_vous_salue_marie },
    { key: 'jj', label: t('neuvaines.hailJoseph'), text: localized.common_prayers?.closing?.je_vous_salue_joseph },
    { key: 'gp', label: t('neuvaines.gloryBe'), text: localized.common_prayers?.closing?.gloire_au_pere },
  ].filter((x) => !!x.text) as any;

  /** Titre de section liturgique, filet doré. */
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px w-6 bg-cathedral-gold/50" />
      <h3 className="text-[0.7rem] font-cinzel font-bold uppercase tracking-[0.22em] text-cathedral-gold whitespace-nowrap">
        {children}
      </h3>
      <span className="h-px flex-1 bg-cathedral-gold/20" />
    </div>
  );

  const PrayerList = ({ items }: { items: { key: string; label: string; text: string; italic?: boolean }[] }) => (
    <div className="space-y-5">
      {items.map((it) => (
        <div key={it.key} className="border-l border-cathedral-gold/30 pl-4">
          <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground/70 mb-1.5">
            {it.label}
          </h4>
          <p className={`text-[0.95rem] leading-[1.85] whitespace-pre-line text-muted-foreground ${it.italic ? 'italic' : ''}`}>
            {it.text}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{localized.title} — Voie Vérité Vie</title>
        <meta name="description" content={(localized.description ?? '').slice(0, 155)} />
      </Helmet>
      <Navigation />

      <main className="pt-20 pb-16">
        {/* En-tête liturgique */}
        <header className="border-b border-border/60 bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="container mx-auto px-4 max-w-3xl py-6 md:py-8">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/neuvaines')} className="gap-1 -ml-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> {t('common.novenas')}
              </Button>
              {localized.pdf_url && (
                <a href={localized.pdf_url} download target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                </a>
              )}
            </div>

            <div className="text-center">
              {localized.saint_name && (
                <p className="text-[0.68rem] uppercase tracking-[0.28em] text-cathedral-gold mb-2">
                  {localized.saint_name}
                </p>
              )}
              <h1 className="text-2xl md:text-[2.1rem] leading-tight font-cinzel font-bold text-foreground">
                {localized.title}
              </h1>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="h-px w-10 bg-cathedral-gold/40" />
                <Cross className="h-3.5 w-3.5 text-cathedral-gold" />
                <span className="h-px w-10 bg-cathedral-gold/40" />
              </div>
            </div>
          </div>
        </header>

        {/* Barre de jours collante */}
        <div className="sticky top-16 z-20 border-b border-border/60 bg-background/85 backdrop-blur-md">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => { setCurrentDay(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`shrink-0 px-3 h-8 rounded-full text-[0.7rem] font-medium uppercase tracking-wider transition-colors ${isIntro ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {t('neuvaines.intro')}
              </button>
              {days.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { setCurrentDay(i + 1); setActiveTab('meditation'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`shrink-0 w-8 h-8 rounded-full text-xs font-semibold tabular-nums transition-colors ${currentDay === i + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => { setCurrentDay(totalPages - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`shrink-0 px-3 h-8 rounded-full text-[0.7rem] font-medium uppercase tracking-wider transition-colors ${isEnd ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {t('neuvaines.end')}
              </button>
            </div>
            <div className="h-[2px] bg-border/50">
              <div className="h-full bg-cathedral-gold transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-3xl pt-8">
          <motion.div key={`${currentDay}-${lang}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* INTRODUCTION */}
            {isIntro && (
              <div className="space-y-10">
                <div>
                  <SectionTitle>{t('neuvaines.introduction')}</SectionTitle>
                  <NeuvaineProse text={localized.introduction} dropCap />
                </div>

                {openingItems.length > 0 && (
                  <section>
                    <SectionTitle>{t('neuvaines.openingPrayers')}</SectionTitle>
                    <PrayerList items={openingItems} />
                  </section>
                )}

                {closingItems.length > 0 && (
                  <section>
                    <SectionTitle>{t('neuvaines.closingPrayers')}</SectionTitle>
                    <PrayerList items={closingItems} />
                  </section>
                )}
              </div>
            )}

            {/* JOUR */}
            {day && (
              <div className="space-y-9">
                <div className="text-center">
                  <p className="text-[0.68rem] uppercase tracking-[0.28em] text-cathedral-gold mb-2">
                    {t('neuvaines.day')} {day.day} / {days.length}
                  </p>
                  <h2 className="text-xl md:text-2xl font-cinzel font-bold text-foreground">{day.title}</h2>
                  {day.subtitle && <p className="text-sm text-muted-foreground italic mt-1.5">{day.subtitle}</p>}
                </div>

                {/* Écriture */}
                {day.scripture && (
                  <blockquote className="relative rounded-lg border border-cathedral-gold/25 bg-cathedral-gold/[0.05] px-5 py-4">
                    <BookOpen className="h-4 w-4 text-cathedral-gold mb-2" />
                    <p className="text-[0.98rem] leading-[1.9] italic text-foreground/85 whitespace-pre-line">{day.scripture}</p>
                  </blockquote>
                )}

                {openingItems.length > 0 && (
                  <details className="group border-y border-border/60 py-3">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-[0.7rem] font-cinzel font-bold uppercase tracking-[0.2em] text-cathedral-gold">
                      {t('neuvaines.opening')}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="pt-4"><PrayerList items={openingItems} /></div>
                  </details>
                )}

                {/* Onglets */}
                <div>
                  <div className="flex gap-6 border-b border-border/60 mb-6">
                    {(['meditation', 'intercessions'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2.5 -mb-px text-[0.72rem] font-semibold uppercase tracking-[0.16em] border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-cathedral-gold text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground/80'
                        }`}
                      >
                        {t(`neuvaines.${tab}`)}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'meditation' && <NeuvaineProse text={day.meditation} />}

                  {activeTab === 'intercessions' && (
                    <div className="space-y-6">
                      {day.intercessions?.map((int: any, i: number) => (
                        <div key={i} className="flex gap-4">
                          <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-cathedral-gold/40 text-[0.65rem] font-semibold text-cathedral-gold flex items-center justify-center tabular-nums">
                            {i + 1}
                          </span>
                          <div>
                            <h4 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground/75 mb-1.5">{int.title}</h4>
                            <p className="text-[0.95rem] leading-[1.85] text-muted-foreground whitespace-pre-line">{int.text}</p>
                          </div>
                        </div>
                      ))}
                      <div className="rounded-lg border border-border/70 bg-muted/30 px-5 py-4 text-center">
                        <Heart className="h-4 w-4 text-primary mx-auto mb-2" />
                        <p className="text-sm font-semibold text-foreground">{t('neuvaines.personalIntention')}</p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('neuvaines.personalIntentionDesc')}</p>
                        <p className="text-xs text-muted-foreground italic mt-2">
                          {t('neuvaines.silenceDesc', { saint: localized.saint_name })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {closingItems.length > 0 && (
                  <details className="group border-y border-border/60 py-3">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-[0.7rem] font-cinzel font-bold uppercase tracking-[0.2em] text-cathedral-gold">
                      {t('neuvaines.closing')}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="pt-4 space-y-4">
                      <PrayerList items={closingItems} />
                      <p className="text-xs text-muted-foreground italic">{t('neuvaines.closingSong')}</p>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* CONCLUSION */}
            {isEnd && (
              <div className="space-y-10">
                {localized.conclusion?.consecration && (
                  <section>
                    <SectionTitle>{t('neuvaines.consecration', { saint: localized.saint_name })}</SectionTitle>
                    <NeuvaineProse text={localized.conclusion.consecration} />
                  </section>
                )}

                {localized.conclusion?.litany && (
                  <section>
                    <SectionTitle>{t('neuvaines.litany', { saint: localized.saint_name })}</SectionTitle>
                    <NeuvaineLitany text={localized.conclusion.litany} />
                  </section>
                )}

                {!localized.conclusion?.consecration && !localized.conclusion?.litany && (
                  <div className="text-center py-10">
                    <Cross className="h-6 w-6 text-cathedral-gold mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t('neuvaines.conclusion')}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Navigation bas de page */}
          <div className="flex items-center justify-between mt-12 pt-5 border-t border-border/60">
            <Button variant="ghost" size="sm" onClick={goPrev} disabled={isIntro} className="gap-1 text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('neuvaines.previous')}</span>
            </Button>
            <span className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              {isIntro ? t('neuvaines.introduction') : isEnd ? t('neuvaines.conclusion') : `${t('neuvaines.day')} ${currentDay} / ${days.length}`}
            </span>
            <Button variant="ghost" size="sm" onClick={goNext} disabled={isEnd} className="gap-1 text-muted-foreground">
              <span className="hidden sm:inline">{t('neuvaines.next')}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NeuvaineDayView;
