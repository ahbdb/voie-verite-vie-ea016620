import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, BookOpen, Download, Heart,
  HandMetal, Cross, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

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
        days: Array.isArray(tr.days) ? tr.days : neuvaine.days,
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{localized.title} — Voie Vérité Vie</title>
      </Helmet>
      <Navigation />

      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/neuvaines')} className="gap-1 -ml-2">
              <ArrowLeft className="h-4 w-4" /> {t('common.novenas')}
            </Button>
            {localized.pdf_url && (
              <a href={localized.pdf_url} download target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1"><Download className="h-4 w-4" /> PDF</Button>
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-cinzel font-bold text-center text-foreground mb-4">
            {localized.title}
          </h1>

          {/* Day selector – flat pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            <button
              onClick={() => { setCurrentDay(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${currentDay === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('neuvaines.intro')}
            </button>
            {days.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => { setCurrentDay(i + 1); setActiveTab('meditation'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${currentDay === i + 1 ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => { setCurrentDay(totalPages - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${currentDay === totalPages - 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t('neuvaines.end')}
            </button>
          </div>

          {/* Content – flat, no Card wrapper */}
          <motion.div
            key={`${currentDay}-${lang}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* INTRODUCTION */}
            {currentDay === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Cross className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-cinzel font-bold">{t('neuvaines.introduction')}</h2>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{localized.introduction}</p>

                {localized.common_prayers?.opening && (
                  <div className="space-y-4 pt-6 border-t border-border">
                    <h3 className="text-sm font-cinzel font-bold text-primary uppercase tracking-wider">{t('neuvaines.openingPrayers')}</h3>
                    {localized.common_prayers.opening.signe_de_croix && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">✝ {t('neuvaines.signOfCross')}</h4>
                        <p className="text-sm italic text-muted-foreground">{localized.common_prayers.opening.signe_de_croix}</p>
                      </div>
                    )}
                    {localized.common_prayers.opening.priere_esprit_saint && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🕊️ {t('neuvaines.holySpirit')}</h4>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.opening.priere_esprit_saint}</p>
                      </div>
                    )}
                    {localized.common_prayers.opening.notre_pere && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🙏 {t('neuvaines.ourFather')}</h4>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.opening.notre_pere}</p>
                      </div>
                    )}
                  </div>
                )}

                {localized.common_prayers?.closing && (
                  <div className="space-y-4 pt-6 border-t border-border">
                    <h3 className="text-sm font-cinzel font-bold text-primary uppercase tracking-wider">{t('neuvaines.closingPrayers')}</h3>
                    {localized.common_prayers.closing.je_vous_salue_marie && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">🌹 {t('neuvaines.hailMary')}</h4>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.je_vous_salue_marie}</p>
                      </div>
                    )}
                    {localized.common_prayers.closing.je_vous_salue_joseph && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">⚜️ {t('neuvaines.hailJoseph')}</h4>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.je_vous_salue_joseph}</p>
                      </div>
                    )}
                    {localized.common_prayers.closing.gloire_au_pere && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">✨ {t('neuvaines.gloryBe')}</h4>
                        <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.gloire_au_pere}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DAY CONTENT */}
            {day && (
              <div className="space-y-6">
                <div className="text-center">
                  <Badge className="bg-primary text-primary-foreground mb-3">{t('neuvaines.day')} {day.day}</Badge>
                  <h2 className="text-xl md:text-2xl font-cinzel font-bold">{day.title}</h2>
                  <p className="text-muted-foreground text-sm mt-1 italic">{day.subtitle}</p>
                </div>

                {/* Opening prayers – collapsible, flat */}
                {localized.common_prayers?.opening && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2 py-2">
                      ☩ {t('neuvaines.opening')}
                      <span className="text-muted-foreground font-normal normal-case text-[10px]">({t('common.clickToExpand', { defaultValue: 'cliquer pour ouvrir' })})</span>
                    </summary>
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3 pb-4">
                      {localized.common_prayers.opening.signe_de_croix && <p className="text-sm italic text-muted-foreground">{localized.common_prayers.opening.signe_de_croix}</p>}
                      {localized.common_prayers.opening.priere_esprit_saint && <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.opening.priere_esprit_saint}</p>}
                      {localized.common_prayers.opening.notre_pere && <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.opening.notre_pere}</p>}
                    </div>
                  </details>
                )}

                {/* Scripture – gold accent */}
                <blockquote className="border-l-2 border-cathedral-gold/40 pl-4 py-2">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-cathedral-gold mt-0.5 shrink-0" />
                    <p className="text-sm italic font-medium text-foreground/80">{day.scripture}</p>
                  </div>
                </blockquote>

                {/* Tabs – flat pills, not boxed */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('meditation')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeTab === 'meditation' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t('neuvaines.meditation')}
                  </button>
                  <button
                    onClick={() => setActiveTab('intercessions')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeTab === 'intercessions' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t('neuvaines.intercessions')}
                  </button>
                </div>

                {activeTab === 'meditation' && (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{day.meditation}</p>
                )}

                {activeTab === 'intercessions' && (
                  <div className="space-y-4">
                    {day.intercessions?.map((int: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/20 pl-4">
                        <h4 className="font-semibold text-sm mb-1">
                          <Heart className="h-3.5 w-3.5 inline mr-1 text-primary" />
                          {int.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{int.text}</p>
                      </div>
                    ))}
                    <div className="text-center pt-4">
                      <HandMetal className="h-5 w-5 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium">{t('neuvaines.personalIntention')}</p>
                      <p className="text-xs text-muted-foreground italic mt-1">{t('neuvaines.personalIntentionDesc')}</p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {t('neuvaines.silenceDesc', { saint: localized.saint_name })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Closing prayers – collapsible */}
                {localized.common_prayers?.closing && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2 py-2">
                      ☩ {t('neuvaines.closing')}
                      <span className="text-muted-foreground font-normal normal-case text-[10px]">({t('common.clickToExpand', { defaultValue: 'cliquer pour ouvrir' })})</span>
                    </summary>
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3 pb-4">
                      {localized.common_prayers.closing.je_vous_salue_marie && <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.je_vous_salue_marie}</p>}
                      {localized.common_prayers.closing.je_vous_salue_joseph && <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.je_vous_salue_joseph}</p>}
                      {localized.common_prayers.closing.gloire_au_pere && <p className="text-sm whitespace-pre-line text-muted-foreground">{localized.common_prayers.closing.gloire_au_pere}</p>}
                      <p className="text-xs text-muted-foreground italic">🎵 {t('neuvaines.closingSong')}</p>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* CONCLUSION */}
            {currentDay === totalPages - 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Cross className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-cinzel font-bold">{t('neuvaines.conclusion')}</h2>
                </div>

                {localized.conclusion?.consecration && (
                  <div>
                    <h3 className="text-sm font-cinzel font-bold text-primary uppercase tracking-wider mb-3">
                      {t('neuvaines.consecration', { saint: localized.saint_name })}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{localized.conclusion.consecration}</p>
                  </div>
                )}

                {localized.conclusion?.litany && (
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-cinzel font-bold text-primary uppercase tracking-wider mb-3">
                      {t('neuvaines.litany', { saint: localized.saint_name })}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{localized.conclusion.litany}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Navigation – flat */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
            <Button variant="ghost" onClick={goPrev} disabled={currentDay === 0} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('neuvaines.previous')}</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentDay === 0 ? t('neuvaines.introduction') : currentDay === totalPages - 1 ? t('neuvaines.conclusion') : `${t('neuvaines.day')} ${currentDay} / ${days.length}`}
            </span>
            <Button variant="ghost" onClick={goNext} disabled={currentDay === totalPages - 1} className="gap-1">
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
