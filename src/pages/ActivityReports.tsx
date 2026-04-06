import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Calendar, ArrowRight, BookOpen, Camera, Cross, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayEntry {
  day: number; date: string; label?: string; readings: string;
  soi: string; prochain: string; dieu: string;
}
interface WeekEntry {
  title: string; period: string; days: DayEntry[];
}
interface ContentSection {
  title: string; icon?: string; body?: string; type?: string;
  items?: any[]; weeks?: WeekEntry[]; intro?: string;
  subsections?: any[]; details?: any; preparation?: string[];
  quote?: string; stats?: any[]; highlights?: string[];
  categories?: any[]; closing_quote?: string;
}
interface ActivityReport {
  id: string; title: string; description: string | null; summary: string | null;
  content: { sections?: ContentSection[] }; translations: Record<string, any>;
  pdf_url: string | null; cover_image_url: string | null; report_date: string;
  period_start: string | null; period_end: string | null;
  linked_activities: string[]; linked_galleries: string[];
  linked_spiritual_practices: string[]; is_published: boolean;
}

const practiceRoutes: Record<string, string> = {
  'careme-2026': '/careme-2026', 'chemin-de-croix': '/chemin-de-croix',
  'neuvaines': '/neuvaines', 'biblical-reading': '/biblical-reading',
};

const ActivityReports = () => {
  const { t, i18n } = useTranslation();
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});
  const lang = i18n.language;

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const { data } = await (supabase as any).from('activity_reports')
      .select('*').eq('is_published', true).order('report_date', { ascending: false });
    if (data) setReports(data);
    setLoading(false);
  };

  const getTranslated = (report: ActivityReport, field: string) => {
    if (lang === 'fr') return (report as any)[field] || '';
    return report.translations?.[lang]?.[field] || (report as any)[field] || '';
  };

  const getSections = (report: ActivityReport): ContentSection[] => {
    if (lang !== 'fr' && report.translations?.[lang]?.sections) {
      return report.translations[lang].sections;
    }
    return report.content?.sections || [];
  };

  const getPdfUrl = (report: ActivityReport): string | null => {
    if (lang !== 'fr' && report.translations?.[lang]?.pdf_url) return report.translations[lang].pdf_url;
    return report.pdf_url;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(
      lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

  const toggleWeek = (idx: number) =>
    setExpandedWeeks(prev => ({ ...prev, [idx]: !prev[idx] }));

  const renderSection = (section: ContentSection, idx: number) => {
    const delay = idx * 0.05;

    // Stats section
    if (section.type === 'stats') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {section.stats?.map((s: any, i: number) => (
              <div key={i} className="text-center py-6">
                <div className="text-4xl md:text-5xl font-black text-primary mb-2">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {section.highlights && (
            <ul className="space-y-3">
              {section.highlights.map((h: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-foreground/80">
                  <span className="text-primary mt-1">✦</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      );
    }

    // Objectives section
    if (section.type === 'objectives') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          <div className="space-y-4">
            {section.items?.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-border/30 last:border-0">
                <span className="font-bold text-primary whitespace-nowrap text-sm uppercase tracking-wider min-w-[120px]">{item.label}</span>
                <span className="text-foreground/80">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    // Timeline section
    if (section.type === 'timeline') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          {section.body && <p className="text-foreground/70 mb-6">{section.body}</p>}
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
            {section.items?.map((item: any, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-primary" />
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{item.date}</div>
                <div className="font-semibold text-foreground mb-1">{item.label}</div>
                <div className="text-foreground/70 text-sm">{item.text}</div>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    // Weeks (40 days program)
    if (section.type === 'weeks') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          {section.intro && <p className="text-foreground/70 mb-6">{section.intro}</p>}
          <div className="space-y-2">
            {section.weeks?.map((week, wi) => (
              <div key={wi}>
                <button
                  onClick={() => toggleWeek(wi)}
                  className="w-full flex items-center justify-between py-4 px-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-left"
                >
                  <div>
                    <span className="font-bold text-foreground">{week.title}</span>
                    <span className="text-muted-foreground text-sm ml-3">{week.period}</span>
                  </div>
                  {expandedWeeks[wi] ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>
                {expandedWeeks[wi] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="py-2"
                  >
                    {week.days.map((day) => (
                      <div key={day.day} className="py-4 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {day.day}
                          </span>
                          <span className="font-semibold text-foreground">{day.date}</span>
                          {day.label && (
                            <span className="text-xs text-primary font-medium px-2 py-0.5 bg-primary/10 rounded-full">
                              {day.label}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground italic mb-3 ml-11">{day.readings}</div>
                        <div className="ml-11 space-y-1.5 text-sm">
                          <div className="flex gap-2">
                            <span className="font-bold text-amber-500 min-w-[80px]">SOI</span>
                            <span className="text-foreground/80">{day.soi}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold text-emerald-500 min-w-[80px]">PROCHAIN</span>
                            <span className="text-foreground/80">{day.prochain}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold text-sky-500 min-w-[80px]">DIEU</span>
                            <span className="text-foreground/80">{day.dieu}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    // Charity section
    if (section.type === 'charity') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          <p className="text-foreground/70 mb-6">{section.body}</p>
          {section.details && (
            <div className="space-y-2 mb-6">
              {Object.entries(section.details).map(([key, val]) => (
                <div key={key} className="flex gap-3 py-2 border-b border-border/20 last:border-0">
                  <span className="font-semibold text-primary capitalize min-w-[80px] text-sm">{key}</span>
                  <span className="text-foreground/80 text-sm">{val as string}</span>
                </div>
              ))}
            </div>
          )}
          {section.preparation && (
            <div className="relative pl-6 border-l-2 border-red-500/30 space-y-4 mb-6">
              {section.preparation.map((step, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[29px] w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-foreground/80 text-sm">{step}</span>
                </div>
              ))}
            </div>
          )}
          {section.quote && (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-2 italic text-foreground/60 text-sm">
              {section.quote}
            </blockquote>
          )}
        </motion.div>
      );
    }

    // Complementary activities
    if (section.type === 'complementary') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          {section.subsections?.map((sub: any, si: number) => (
            <div key={si} className="mb-8">
              <h3 className="text-lg font-bold text-foreground mb-2">{sub.title}</h3>
              {sub.body && <p className="text-foreground/70 text-sm mb-3">{sub.body}</p>}
              {sub.items && (
                <ul className="space-y-2">
                  {sub.items.map((item: string, ii: number) => (
                    <li key={ii} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </motion.div>
      );
    }

    // Perspectives
    if (section.type === 'perspectives') {
      return (
        <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h2>
          {section.body && <p className="text-foreground/70 mb-6 whitespace-pre-line">{section.body}</p>}
          {section.categories?.map((cat: any, ci: number) => (
            <div key={ci} className="mb-6">
              <h3 className="text-lg font-bold text-primary mb-2">{cat.title}</h3>
              <ul className="space-y-1.5">
                {cat.items.map((item: string, ii: number) => (
                  <li key={ii} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-0.5">→</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {section.closing_quote && (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-3 italic text-foreground/60 mt-8">
              {section.closing_quote}
            </blockquote>
          )}
        </motion.div>
      );
    }

    // Default text section
    return (
      <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
          {section.icon && <span className="text-3xl">{section.icon}</span>}
          {section.title}
        </h2>
        {section.body && (
          <div className="text-foreground/80 leading-relaxed whitespace-pre-line">{section.body}</div>
        )}
      </motion.div>
    );
  };

  // Detail view
  if (selectedReport) {
    const sections = getSections(selectedReport);
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <Helmet>
          <title>{getTranslated(selectedReport, 'title')} — Voie Vérité Vie</title>
        </Helmet>
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
          <button onClick={() => setSelectedReport(null)} className="text-primary text-sm font-medium mb-8 hover:underline flex items-center gap-1">
            ← {t('reports.activityReports')}
          </button>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(selectedReport.report_date)}
              {selectedReport.period_start && selectedReport.period_end && (
                <span> · {formatDate(selectedReport.period_start)} — {formatDate(selectedReport.period_end)}</span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-4">
              {getTranslated(selectedReport, 'title')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              {getTranslated(selectedReport, 'description')}
            </p>

            {/* PDF download */}
            {getPdfUrl(selectedReport) && (
              <a
                href={getPdfUrl(selectedReport)!}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('reports.downloadPdf')}
              </a>
            )}

            {/* Related badges */}
            {(selectedReport.linked_spiritual_practices.length > 0 || selectedReport.linked_galleries.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedReport.linked_spiritual_practices.map((p) => {
                  const route = practiceRoutes[p];
                  const key = p === 'careme-2026' ? 'lent2026' : p === 'chemin-de-croix' ? 'stationsOfCross' : p === 'neuvaines' ? 'novenas' : 'biblicalReading';
                  return route ? (
                    <Link key={p} to={route}>
                      <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">{t(`common.${key}`)}</Badge>
                    </Link>
                  ) : null;
                })}
                {selectedReport.linked_galleries.length > 0 && (
                  <Link to="/gallery">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">{t('common.gallery')}</Badge>
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-border my-10" />

          {/* Sections */}
          <div className="space-y-12">
            {sections.map((section, idx) => renderSection(section, idx))}
          </div>

          {/* Bottom CTA */}
          {getPdfUrl(selectedReport) && (
            <div className="mt-16 text-center">
              <div className="h-px bg-border mb-10" />
              <FileText className="w-10 h-10 text-primary/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">{t('reports.downloadFullReport')}</p>
              <a
                href={getPdfUrl(selectedReport)!}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-5 h-5" />
                {t('reports.downloadPdf')}
              </a>
            </div>
          )}

          {/* Signature */}
          <div className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">AHOUFACK DYLANNE BAUDOUIN</p>
            <p>Fondateur-Modérateur</p>
            <p>Mouvement Voie-Vérité-Vie (3V)</p>
            <p className="mt-2 italic">« Je suis le Chemin, la Vérité et la Vie » — Jean 14,6</p>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Helmet>
        <title>{t('reports.pageTitle')} — Voie Vérité Vie</title>
        <meta name="description" content={t('reports.pageDescription')} />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3">{t('reports.pageTitle')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('reports.pageDescription')}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p>{t('reports.noReports')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, idx) => (
              <motion.button
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => setSelectedReport(report)}
                className="w-full text-left group"
              >
                <div className="flex items-start gap-5 py-6 border-b border-border/40 hover:border-primary/40 transition-colors">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(report.report_date)}
                      {report.period_start && report.period_end && (
                        <span className="hidden sm:inline">· {formatDate(report.period_start)} — {formatDate(report.period_end)}</span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-1 truncate">
                      {getTranslated(report, 'title')}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getTranslated(report, 'summary') || getTranslated(report, 'description')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {report.linked_spiritual_practices.map((p) => {
                        const key = p === 'careme-2026' ? 'lent2026' : p === 'chemin-de-croix' ? 'stationsOfCross' : p === 'neuvaines' ? 'novenas' : 'biblicalReading';
                        return <Badge key={p} variant="outline" className="text-[10px]">{t(`common.${key}`)}</Badge>;
                      })}
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-4" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityReports;
