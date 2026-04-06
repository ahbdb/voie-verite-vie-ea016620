import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Calendar, MapPin, ArrowRight, BookOpen, Camera, Cross, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActivityReport {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  content: Record<string, any>;
  translations: Record<string, any>;
  pdf_url: string | null;
  cover_image_url: string | null;
  report_date: string;
  period_start: string | null;
  period_end: string | null;
  linked_activities: string[];
  linked_galleries: string[];
  linked_spiritual_practices: string[];
  is_published: boolean;
}

const practiceRoutes: Record<string, string> = {
  'careme-2026': '/careme-2026',
  'chemin-de-croix': '/chemin-de-croix',
  'neuvaines': '/neuvaines',
  'biblical-reading': '/biblical-reading',
};

const practiceIcons: Record<string, any> = {
  'careme-2026': Cross,
  'chemin-de-croix': Cross,
  'neuvaines': BookOpen,
  'biblical-reading': BookOpen,
};

const ActivityReports = () => {
  const { t, i18n } = useTranslation();
  const [reports, setReports] = useState<ActivityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language;

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const { data } = await supabase
      .from('activity_reports')
      .select('*')
      .eq('is_published', true)
      .order('report_date', { ascending: false });
    if (data) setReports(data as unknown as ActivityReport[]);
    setLoading(false);
  };

  const getTranslated = (report: ActivityReport, field: string) => {
    if (lang === 'fr') return (report as any)[field] || '';
    const tr = report.translations as Record<string, any>;
    return tr?.[lang]?.[field] || (report as any)[field] || '';
  };

  const getContentSections = (report: ActivityReport): { title: string; body: string }[] => {
    if (lang !== 'fr' && report.translations?.[lang]?.sections) {
      return report.translations[lang].sections;
    }
    return report.content?.sections || [];
  };

  const getPdfUrl = (report: ActivityReport): string | null => {
    if (lang !== 'fr' && report.translations?.[lang]?.pdf_url) {
      return report.translations[lang].pdf_url;
    }
    return report.pdf_url;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  const formatPeriod = (start: string | null, end: string | null) => {
    if (!start || !end) return '';
    return `${formatDate(start)} — ${formatDate(end)}`;
  };

  if (selectedReport) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <Helmet>
          <title>{getTranslated(selectedReport, 'title')} — Voie Vérité Vie</title>
        </Helmet>

        <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
          {/* Back button */}
          <Button variant="ghost" onClick={() => setSelectedReport(null)} className="mb-6">
            ← {t('common.back')}
          </Button>

          {/* Cover */}
          {selectedReport.cover_image_url && (
            <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
              <img src={selectedReport.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {getTranslated(selectedReport, 'title')}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedReport.report_date)}
              </span>
              {selectedReport.period_start && selectedReport.period_end && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formatPeriod(selectedReport.period_start, selectedReport.period_end)}
                </span>
              )}
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {getTranslated(selectedReport, 'description')}
            </p>
          </motion.div>

          {/* Download button */}
          {getPdfUrl(selectedReport) && (
            <a
              href={getPdfUrl(selectedReport)!}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors mb-10"
            >
              <Download className="w-5 h-5" />
              {t('reports.downloadPdf')}
            </a>
          )}

          {/* Content sections */}
          <div className="space-y-8">
            {getContentSections(selectedReport).map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="prose prose-lg dark:prose-invert max-w-none"
              >
                <h2 className="text-2xl font-bold text-foreground border-l-4 border-primary pl-4 mb-4">
                  {section.title}
                </h2>
                <div className="text-foreground/80 leading-relaxed whitespace-pre-line">
                  {section.body}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Linked practices & galleries */}
          {(selectedReport.linked_spiritual_practices.length > 0 || selectedReport.linked_galleries.length > 0) && (
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-xl font-bold text-foreground mb-4">{t('reports.relatedContent')}</h3>
              <div className="flex flex-wrap gap-3">
                {selectedReport.linked_spiritual_practices.map((practice) => {
                  const route = practiceRoutes[practice];
                  const Icon = practiceIcons[practice] || BookOpen;
                  return route ? (
                    <Link key={practice} to={route}>
                      <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-accent">
                        <Icon className="w-4 h-4" />
                        {t(`common.${practice === 'careme-2026' ? 'lent2026' : practice === 'chemin-de-croix' ? 'stationsOfCross' : practice === 'neuvaines' ? 'novenas' : 'biblicalReading'}`)}
                        <ArrowRight className="w-3 h-3" />
                      </Badge>
                    </Link>
                  ) : null;
                })}
                {selectedReport.linked_galleries.length > 0 && (
                  <Link to="/gallery">
                    <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-accent">
                      <Camera className="w-4 h-4" />
                      {t('common.gallery')}
                      <ArrowRight className="w-3 h-3" />
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Download CTA at bottom */}
          {getPdfUrl(selectedReport) && (
            <div className="mt-12 p-6 bg-primary/5 rounded-2xl text-center">
              <FileText className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-foreground font-medium mb-4">{t('reports.downloadFullReport')}</p>
              <a
                href={getPdfUrl(selectedReport)!}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-5 h-5" />
                {t('reports.downloadPdf')}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Helmet>
        <title>{t('reports.pageTitle')} — Voie Vérité Vie</title>
        <meta name="description" content={t('reports.pageDescription')} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t('reports.pageTitle')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('reports.pageDescription')}
          </p>
        </motion.div>

        {/* Reports grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{t('reports.noReports')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group border-border/50 h-full"
                  onClick={() => setSelectedReport(report)}
                >
                  {report.cover_image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={report.cover_image_url}
                        alt={getTranslated(report, 'title')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <FileText className="w-16 h-16 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(report.report_date)}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {getTranslated(report, 'title')}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {getTranslated(report, 'summary') || getTranslated(report, 'description')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.linked_spiritual_practices.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {t(`common.${p === 'careme-2026' ? 'lent2026' : p === 'chemin-de-croix' ? 'stationsOfCross' : p === 'neuvaines' ? 'novenas' : 'biblicalReading'}`)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">
                      {t('reports.readReport')}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityReports;
