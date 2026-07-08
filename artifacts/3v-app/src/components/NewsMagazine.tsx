import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, ExternalLink, Newspaper, Plus,
  Share2, Sparkles, Globe2, MapPin,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Article } from '@/hooks/useArticles';

const CATEGORY_BADGE: Record<string, string> = {
  association: 'Association',
  event:       'Événement',
  announcement:'Annonce',
  church:      'Église',
};

function proxyImg(url: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/&amp;/g, '&');
  if (clean.includes('supabase') || clean.includes('localhost')) return clean;
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&w=1200&output=webp&q=82`;
}

function GradientFallback({ className }: { className?: string }) {
  return (
    <div className={cn('w-full h-full flex items-center justify-center', className)}
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.35) 0%, hsl(var(--background)) 55%, hsl(var(--primary)/0.2) 100%)' }}>
      <Newspaper className="h-10 w-10 text-primary/40" />
    </div>
  );
}

function ArtImg({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  const url = proxyImg(src);
  if (!url || err) return <GradientFallback className={className} />;
  return (
    <img src={url} alt={alt} loading="lazy" onError={() => setErr(true)}
      className={cn('w-full h-full object-cover', className)} />
  );
}

async function sharePost(a: Article) {
  const url = a.external_url || `${window.location.origin}/actualites/${a.id}`;
  try {
    if (navigator.share) await navigator.share({ title: a.title, url });
    else { await navigator.clipboard.writeText(url); toast.success('Lien copié !'); }
  } catch {}
}

function ArticleLink({ article, className, children }: { article: Article; className?: string; children: React.ReactNode }) {
  const href = article.external_url || `/actualites/${article.id}`;
  if (article.external_url) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  return <Link to={href} className={className}>{children}</Link>;
}

function OriginBadge({ a }: { a: Article }) {
  const map = {
    movement:  { icon: Sparkles, label: '3V',       cls: 'bg-primary/95 text-primary-foreground' },
    universal: { icon: Globe2,   label: 'Vatican',  cls: 'bg-slate-900/90 text-white' },
    local:     { icon: MapPin,   label: a.country ?? 'Local', cls: 'bg-emerald-600/95 text-white' },
  }[a.origin] ?? { icon: Newspaper, label: 'News', cls: 'bg-primary/80 text-primary-foreground' };
  const Icon = map.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm', map.cls)}>
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

// ── HERO carrousel (À la une) ──────────────────────────────────────────────
const HeroCarousel = ({ items }: { items: Article[] }) => {
  const [i, setI] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    timer.current = setInterval(() => setI(x => (x + 1) % items.length), 6000);
    return () => clearInterval(timer.current);
  }, [items.length]);

  if (items.length === 0) return null;
  const a = items[i];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/60 h-[380px] md:h-[460px] group">
      <AnimatePresence mode="wait">
        <motion.div key={a.id} className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}>
          <ArtImg src={a.image_url} alt={a.title} className="group-hover:scale-[1.02] transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <OriginBadge a={a} />
          <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-black/40 backdrop-blur text-white/90 uppercase tracking-wider">
            {CATEGORY_BADGE[a.category] ?? 'Actualité'}
          </span>
        </div>
        <button onClick={() => void sharePost(a)}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 flex items-center justify-center transition">
          <Share2 className="h-4 w-4 text-white" />
        </button>
      </div>

      <ArticleLink article={a} className="absolute inset-x-0 bottom-0 p-5 md:p-8 z-10 block">
        <p className="text-[10px] tracking-[0.4em] uppercase text-primary-foreground/70 mb-2 font-medium">À la une</p>
        <h3 className="font-cinzel font-bold text-xl md:text-3xl text-white leading-tight drop-shadow-lg line-clamp-3">
          {a.title}
        </h3>
        {a.excerpt && (
          <p className="text-white/80 text-sm mt-3 leading-relaxed line-clamp-2 hidden md:block">{a.excerpt}</p>
        )}
        <div className="flex items-center gap-3 mt-4 text-xs text-white/70">
          <span>{formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: fr })}</span>
          {a.author_name && <><span>·</span><span>{a.author_name}</span></>}
          <ChevronRight className="h-4 w-4 ml-auto" />
        </div>
      </ArticleLink>

      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
          {items.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)}
              className={cn('h-1.5 rounded-full transition-all', idx === i ? 'bg-white w-6' : 'bg-white/40 w-1.5')} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Rail horizontal scroll-snap ────────────────────────────────────────────
const HRail = ({ items, emphasized = false }: { items: Article[]; emphasized?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') => {
    ref.current?.scrollBy({ left: dir === 'r' ? 320 : -320, behavior: 'smooth' });
  };

  return (
    <div className="relative group/rail">
      <div ref={ref}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
        {items.map(a => (
          <ArticleLink key={a.id} article={a}
            className={cn(
              'shrink-0 snap-start w-[280px] sm:w-[320px] rounded-xl overflow-hidden border transition-all duration-300 hover:-translate-y-0.5',
              emphasized
                ? 'border-primary/40 bg-gradient-to-br from-primary/8 to-transparent hover:border-primary/70 hover:shadow-[0_16px_40px_-16px_hsl(var(--primary)/0.4)]'
                : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.25)]',
            )}>
            <div className="relative aspect-[16/10] overflow-hidden">
              <ArtImg src={a.image_url} alt={a.title} className="group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 left-2"><OriginBadge a={a} /></div>
            </div>
            <div className="p-4">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80">
                {CATEGORY_BADGE[a.category] ?? '📰'}
              </span>
              <h4 className="font-cinzel font-semibold text-sm text-foreground leading-snug line-clamp-3 mt-1">{a.title}</h4>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                {formatDistanceToNow(new Date(a.published_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </ArticleLink>
        ))}
      </div>
      {items.length > 3 && (
        <>
          <button onClick={() => scroll('l')}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/95 border border-border shadow-md items-center justify-center hidden md:group-hover/rail:flex">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll('r')}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/95 border border-border shadow-md items-center justify-center hidden md:group-hover/rail:flex">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
};

// ── Section titrée ─────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, kicker, title, action }: {
  icon: any; kicker: string; title: string; action?: React.ReactNode;
}) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div>
      <p className="text-[10px] tracking-[0.4em] uppercase text-primary/70 mb-1 font-medium">{kicker}</p>
      <h3 className="text-xl md:text-2xl font-cinzel font-bold text-foreground flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h3>
    </div>
    {action}
  </div>
);

// ── Layout principal ──────────────────────────────────────────────────────
export const NewsMagazine = ({
  movement, universal, local, loading, isAdmin, userCountry,
}: {
  movement: Article[]; universal: Article[]; local: Article[];
  loading: boolean; isAdmin: boolean; userCountry: string | null;
}) => {
  // Vedette : priorité aux articles 3V featured, sinon universel récent
  const featuredPool = [
    ...movement.filter(a => a.featured),
    ...movement.slice(0, 2),
    ...universal.slice(0, 1),
  ].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i).slice(0, 3);

  const isEmpty = !loading && movement.length + universal.length + local.length === 0;

  return (
    <section className="py-10 md:py-16 bg-background border-y border-border/40">
      <div className="container mx-auto px-4 max-w-7xl space-y-12 md:space-y-14">

        {/* Header global */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.4em] uppercase text-primary/70 mb-2 font-medium">L'essentiel</p>
            <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-foreground flex items-center gap-2">
              <Newspaper className="h-7 w-7 text-primary" /> Actualités
            </h2>
          </div>
          {isAdmin && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Gérer</Link>
            </Button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl bg-muted/30 animate-pulse h-[380px]" />
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="rounded-xl bg-muted/30 animate-pulse h-24" />)}
            </div>
          </div>
        )}

        {/* Empty */}
        {isEmpty && (
          isAdmin ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
              <Newspaper className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune actualité disponible.</p>
              <Button asChild size="sm"><Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1.5" /> Créer le premier article</Link></Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Aucune actualité pour le moment.</p>
          )
        )}

        {/* HERO à la une */}
        {!loading && featuredPool.length > 0 && (
          <HeroCarousel items={featuredPool} />
        )}

        {/* 1. Mouvement 3V */}
        {!loading && movement.length > 0 && (
          <div>
            <SectionHeader
              icon={Sparkles} kicker="Notre mouvement" title="Actualités 3V"
              action={isAdmin && (
                <Button asChild size="sm" variant="ghost">
                  <Link to="/admin/news"><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter</Link>
                </Button>
              )}
            />
            <HRail items={movement} emphasized />
          </div>
        )}

        {/* 2. Vatican / Église universelle */}
        {!loading && universal.length > 0 && (
          <div>
            <SectionHeader icon={Globe2} kicker="Le Vatican & l'Église" title="Église universelle" />
            <HRail items={universal.slice(0, 12)} />
          </div>
        )}

        {/* 3. Église locale (pays de l'utilisateur) */}
        {!loading && local.length > 0 && (
          <div>
            <SectionHeader
              icon={MapPin}
              kicker="Près de chez vous"
              title={`Église locale — ${userCountry ?? ''}`}
            />
            <HRail items={local.slice(0, 12)} />
          </div>
        )}

        {/* Aucun local mais pays défini → suggestion */}
        {!loading && local.length === 0 && userCountry && movement.length + universal.length > 0 && (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-6 text-center">
            <MapPin className="h-6 w-6 text-primary/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Aucune actualité locale pour votre pays ({userCountry}) pour l'instant.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};

export default NewsMagazine;