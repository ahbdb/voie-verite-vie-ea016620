import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

interface Neuvaine {
  id: string;
  title: string;
  saint_name: string;
  description: string | null;
  pdf_url: string | null;
  total_days: number;
  is_published: boolean;
  translations: Record<string, any> | null;
}

const Neuvaines = () => {
  const { t, i18n } = useTranslation();
  const [neuvaines, setNeuvaines] = useState<Neuvaine[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const lang = i18n.language?.substring(0, 2);

  useEffect(() => {
    const fetchNeuvaines = async () => {
      const { data, error } = await supabase
        .from('neuvaines')
        .select('id, title, saint_name, description, pdf_url, total_days, is_published, translations')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (!error && data) setNeuvaines(data as any[]);
      setLoading(false);
    };
    fetchNeuvaines();
  }, []);

  const getLocalized = (n: Neuvaine, field: 'title' | 'description' | 'pdf_url' | 'saint_name') => {
    if (lang !== 'fr' && n.translations && n.translations[lang]) {
      return n.translations[lang][field] || (n as any)[field];
    }
    return (n as any)[field];
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('neuvaines.title')} — Voie Vérité Vie</title>
        <meta name="description" content={t('neuvaines.subtitle')} />
      </Helmet>
      <Navigation />
      <main className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <BookOpen className="h-7 w-7 text-primary mx-auto mb-3" />
            <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-foreground">{t('neuvaines.title')}</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">{t('neuvaines.subtitle')}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : neuvaines.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">{t('neuvaines.noNeuvaines')}</p>
          ) : (
            <div className="divide-y divide-border">
              {neuvaines.map((n, idx) => {
                const localTitle = getLocalized(n, 'title');
                const localDesc = getLocalized(n, 'description');
                const localPdf = getLocalized(n, 'pdf_url');
                
                return (
                  <motion.button
                    key={n.id}
                    className="w-full text-left py-5 flex items-start gap-4 hover:bg-muted/30 transition-colors group"
                    onClick={() => navigate(`/neuvaines/${n.id}`)}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">{localTitle}</h2>
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">{n.total_days} {t('neuvaines.days')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{localDesc}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                      {localPdf && (
                        <a
                          href={localPdf}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-full hover:bg-muted transition-colors"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Neuvaines;
