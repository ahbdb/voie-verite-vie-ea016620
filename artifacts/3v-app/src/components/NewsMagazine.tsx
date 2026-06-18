import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronRight, Newspaper, Plus, Clock, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Article } from '@/hooks/useArticles';

const CATEGORY_BADGE: Record<string, string> = {
  association: '🏛️ Association',
  event: '📅 Événement',
  announcement: '📢 Annonce',
  church: '⛪ Église',
};

const CATEGORY_TABS = [
  { value: 'all',          label: 'Tout' },
  { value: 'association',  label: 'Association' },
  { value: 'event',        label: 'Événements' },
  { value: 'announcement', label: 'Annonces' },
  { value: 'church',       label: 'Église' },
];

function proxyImg(url: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/&amp;/g, '&');
  if (clean.includes('supabase') || clean.includes('localhost')) return clean;
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=900&output=webp&q=80`;
}

function isNew(publishedAt: string) {
  return Date.now() - new Date(publishedAt).getTime() < 86_400_000;
}

async function sharePost(a: Article) {
  const url = a.external_url || `${window.location.origin}/actualites/${a.id}`;
  try {
    if (navigator.share) await navigator.share({ title: a.title, url });
    else { await navigator.clipboard.writeText(url); toast.success('Lien copié !'); }
  } catch {}
}

function ArticleLink({ article, className, children }: {
  article: Article; className?: string; children: React.ReactNode;
}) {
  const href = article.external_url || `/actualites/${article.id}`;
  if (article.external_url) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link to={href} className={className}>{children}</Link>;
}

// ── Carte vedette (grande, image plein-cadre, overlay gradient) ──────────────
const FeaturedCard = ({ article }: { article: Article }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = article.image_url && !imgError;

  return (
    <ArticleLink article={article} className="group block relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/50 transition-all duration-300 h-[420px] md:h-[480px] hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)]">
      {showImage ? (
        <>
          <img src={proxyImg(article.image_url)!} alt={article.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            loading="lazy" onError={() => setImgError(true)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)/0.35) 0%, hsl(var(--background)) 60%, hsl(var(--primary)/0.15) 100%)',
        }} />
      )}

      {/* Badges en haut */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/95 text-primary-foreground uppercase tracking-wider shadow-lg">
            {CATEGORY_BADGE[article.category] ?? '📰 Actualité'}
          </span>
          {isNew(article.published_at) && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white uppercase tracking-wider animate-pulse">
              Nouveau
            </span>
          )}
        </div>
        <button onClick={(e) => { e.preventDefault(); void sharePost(article); }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
          <Share2 className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      {/* Titre en bas */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 z-10">
        <h3 className="font-cinzel font-bold text-xl md:text-2xl text-white leading-tight drop-shadow-lg group-hover:text-primary-foreground transition-colors line-clamp-3">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-white/80 text-sm mt-3 leading-relaxed line-clamp-2 hidden md:block">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 mt-4 text-xs text-white/70">
          <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: fr })}</span>
          {article.author_name && <><span>·</span><span className="truncate">{article.author_name}</span></>}
          <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </ArticleLink>
  );
};

// ── Mini-carte horizontale (image carrée + titre) ───────────────────────────
const MiniCard = ({ article }: { article: Article }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = article.image_url && !imgError;
  return (
    <ArticleLink article={article} className="group flex gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-card/50 transition-all duration-200">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted/30 flex-shrink-0">
        {showImage ? (
          <img src={proxyImg(article.image_url)!} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.25), hsl(var(--muted)/0.4))',
          }}>
            <Newspaper className="h-6 w-6 text-primary/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 mb-1">
          {CATEGORY_BADGE[article.category] ?? '📰'}
        </span>
        <h4 className="font-cinzel font-semibold text-sm text-foreground leading-snug line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h4>
        <span className="text-[10px] text-muted-foreground/60 mt-auto pt-1">
          {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </ArticleLink>
  );
};

// ── Carte grille (image en haut + texte) ────────────────────────────────────
const GridCard = ({ article }: { article: Article }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = article.image_url && !imgError;
  const isExternal = !!article.external_url;

  return (
    <ArticleLink article={article} className="group block rounded-xl border border-border/60 hover:border-primary/40 bg-card overflow-hidden transition-all duration-300 hover:shadow-[0_12px_36px_-12px_hsl(var(--primary)/0.28)] hover:-translate-y-0.5 h-full">
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted/20">
        {showImage ? (
          <img src={proxyImg(article.image_url)!} alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)/0.22), hsl(var(--muted)/0.4))',
          }}>
            <Newspaper className="h-10 w-10 text-primary/30" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground uppercase tracking-wider">
            {CATEGORY_BADGE[article.category] ?? '📰'}
          </span>
        </div>
        {isNew(article.published_at) && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase animate-pulse">Nouveau</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-cinzel font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{article.excerpt}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground/70">
          <span className="truncate">
            {formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: fr })}
            {article.author_name && ` · ${article.author_name}`}
          </span>
          {isExternal
            ? <ExternalLink className="h-3 w-3 ml-2 shrink-0 group-hover:text-primary transition-colors" />
            : <ChevronRight className="h-3 w-3 ml-2 shrink-0 group-hover:text-primary transition-colors" />}
        </div>
      </div>
    </ArticleLink>
  );
};

// ── Layout magazine principal ────────────────────────────────────────────────
export const NewsMagazine = ({ articles, loading, isAdmin }: {
  articles: Article[]; loading: boolean; isAdmin: boolean;
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(
    () => activeCategory === 'all' ? articles : articles.filter(a => a.category === activeCategory),
    [articles, activeCategory],
  );

  const visibleTabs = useMemo(() => {
    const cats = new Set(articles.map(a => a.category));
    return CATEGORY_TABS.filter(t => t.value === 'all' || cats.has(t.value));
  }, [articles]);

  const featured = filtered[0];
  const sidebar  = filtered.slice(1, 4);
  const grid     = filtered.slice(4, 10);

  return (
    <section className="py-10 md:py-14 bg-background border-y border-border/40">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-primary/70 mb-2 font-medium">L'essentiel</p>
            <h2 className="text-2xl md:text-3xl font-cinzel font-bold text-foreground flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary" />
              Actualités
            </h2>
          </div>
          {isAdmin && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Gérer</Link>
            </Button>
          )}
        </div>

        {/* Tabs catégories */}
        {!loading && articles.length > 0 && visibleTabs.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {visibleTabs.map(tab => (
              <button key={tab.value} onClick={() => setActiveCategory(tab.value)}
                className={cn(
                  'shrink-0 text-xs px-4 py-2 rounded-full border transition-all duration-200 font-medium',
                  activeCategory === tab.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl bg-muted/30 animate-pulse h-[420px]" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="rounded-xl bg-muted/30 animate-pulse h-24" />)}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          isAdmin ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune actualité disponible.</p>
              <Button asChild size="sm"><Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Créer le premier article</Link></Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun article dans cette catégorie.</p>
          )
        ) : (
          <>
            {/* Layout magazine : vedette + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
              {featured && (
                <motion.div className="lg:col-span-2"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <FeaturedCard article={featured} />
                </motion.div>
              )}
              {sidebar.length > 0 && (
                <div className="flex flex-col gap-3">
                  {sidebar.map((a, i) => (
                    <motion.div key={a.id}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.05 + i * 0.05 }}>
                      <MiniCard article={a} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Grille en dessous */}
            {grid.length > 0 && (
              <div className="mt-6 md:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {grid.map((a, i) => (
                  <motion.div key={a.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}>
                    <GridCard article={a} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Lien vers toutes les actualités */}
            {filtered.length > 10 && (
              <div className="mt-8 text-center">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/actualites">Toutes les actualités <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default NewsMagazine;