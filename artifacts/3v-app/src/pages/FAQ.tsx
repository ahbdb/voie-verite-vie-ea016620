import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Search, Book, Heart, Users, Calendar, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FAQItem { id: string; question: string; answer: string; category: string; sort_order: number; }

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const FAQ = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = [
    { id: 'general', name: t('faq.categories.general'), icon: HelpCircle },
    { id: 'spiritualite', name: t('faq.categories.spiritualite'), icon: Heart },
    { id: 'activites', name: t('faq.categories.activites'), icon: Calendar },
    { id: 'lecture', name: t('faq.categories.lecture'), icon: Book },
    { id: 'communaute', name: t('faq.categories.communaute'), icon: Users },
    { id: 'contact', name: t('faq.categories.contact'), icon: HelpCircle },
  ];

  useEffect(() => { loadFAQ(); }, []);

  const loadFAQ = async () => {
    const { data } = await supabase.from('faq_items').select('*').eq('is_published', true).order('sort_order', { ascending: true });
    if (data) setFaqData(data);
    setLoading(false);
  };

  const filtered = faqData.filter(i => i.question.toLowerCase().includes(searchTerm.toLowerCase()) || i.answer.toLowerCase().includes(searchTerm.toLowerCase()));
  const grouped = categories.reduce((a, c) => { a[c.id] = filtered.filter(i => i.category === c.id); return a; }, {} as Record<string, FAQItem[]>);

  if (loading) {
    return (<div className="min-h-screen bg-background"><Navigation /><main className="pt-16 flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-2 border-cathedral-gold border-t-transparent" /></main></div>);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header with glow */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8 relative">
            <motion.div className="absolute -top-10 right-0 w-48 h-48 rounded-full bg-cathedral-gold/5 blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 6, repeat: Infinity }} />
            <p className="text-xs tracking-[0.3em] uppercase text-cathedral-gold/70 mb-2 font-inter">FAQ</p>
            <h1 className="text-3xl md:text-5xl font-cinzel font-bold text-gradient-gold mb-3">{t('faq.title')}</h1>
            <p className="text-sm text-muted-foreground font-inter mb-6">{t('faq.subtitle')}</p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-4 h-4" />
              <Input placeholder={t('faq.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 border-border/40" />
            </div>
          </motion.div>

          <div className="cathedral-line w-full mb-8" />

          {/* Categories */}
          <div className="space-y-10">
            {categories.map(cat => {
              const items = grouped[cat.id] || [];
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <motion.div key={cat.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <h2 className="text-lg font-cinzel font-bold text-foreground mb-4 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-cathedral-gold" />{cat.name}
                    <span className="text-[10px] text-muted-foreground/50 font-inter ml-1">({items.length})</span>
                  </h2>
                  <div className="space-y-1">
                    {items.map(faq => (
                      <div key={faq.id} className="border-b border-border/20">
                        <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                          className="w-full text-left py-4 flex justify-between items-center gap-4 hover:text-foreground transition-colors">
                          <span className="text-sm font-inter font-medium text-foreground">{faq.question}</span>
                          <span className={`text-cathedral-gold transition-transform ${openId === faq.id ? 'rotate-45' : ''}`}>+</span>
                        </button>
                        {openId === faq.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pb-4">
                            <p className="text-sm text-muted-foreground font-inter leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-inter">{t('faq.noResults')}</p>
              <button onClick={() => setSearchTerm('')} className="text-cathedral-gold text-sm mt-2 hover:underline font-inter">{t('faq.seeAll')}</button>
            </div>
          )}

          {/* Contact CTA */}
          <div className="cathedral-line w-full my-10" />
          <div className="text-center">
            <HelpCircle className="w-8 h-8 text-cathedral-gold/40 mx-auto mb-3" />
            <h3 className="text-lg font-cinzel font-bold text-foreground mb-2">{t('faq.notFound')}</h3>
            <p className="text-sm text-muted-foreground font-inter mb-4">{t('faq.notFoundDesc')}</p>
            <a href="/contact" className="inline-flex items-center px-5 py-2 bg-cathedral-gold hover:bg-cathedral-gold/90 text-cathedral-navy text-sm font-inter rounded-lg transition-colors">
              {t('faq.contactUs')}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQ;
