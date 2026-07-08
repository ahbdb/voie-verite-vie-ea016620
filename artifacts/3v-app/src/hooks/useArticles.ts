import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ArticleOrigin = 'movement' | 'universal' | 'local';

export interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  external_url: string | null;
  category: string;
  author_name: string | null;
  published_at: string;
  source: 'db' | 'rss';
  origin: ArticleOrigin;
  country?: string | null;
  featured?: boolean;
  video_url?: string | null;
  content?: string | null;
}

const db = supabase as any;

const COUNTRY_MAP: Record<string, string> = {
  'cameroun': 'CM', 'cameroon': 'CM', 'france': 'FR', 'belgique': 'BE', 'belgium': 'BE',
  'suisse': 'CH', 'switzerland': 'CH', 'italie': 'IT', 'italy': 'IT',
  'allemagne': 'DE', 'germany': 'DE', 'espagne': 'ES', 'spain': 'ES', 'portugal': 'PT',
  'états-unis': 'US', 'usa': 'US', 'etats-unis': 'US',
  'royaume-uni': 'GB', 'uk': 'GB', 'pologne': 'PL', 'poland': 'PL',
  'sénégal': 'SN', 'senegal': 'SN', "côte d'ivoire": 'CI', 'ivory coast': 'CI',
  'togo': 'TG', 'bénin': 'BJ', 'benin': 'BJ', 'congo': 'CG', 'rdc': 'CD',
  'congo-kinshasa': 'CD', 'gabon': 'GA', 'madagascar': 'MG',
  'rwanda': 'RW', 'burundi': 'BI', 'canada': 'CA',
};

export function normalizeCountry(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  if (s.length === 2) return s.toUpperCase();
  return COUNTRY_MAP[s.toLowerCase()] ?? null;
}

/** Retourne les articles regroupés par origine, filtrés selon le pays de l'utilisateur. */
export function useArticles(limit = 30) {
  const { user } = useAuth();
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [movement, setMovement] = useState<Article[]>([]);
  const [universal, setUniversal] = useState<Article[]>([]);
  const [local, setLocal] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Détecter le pays de l'utilisateur (profil → nav.language)
  useEffect(() => {
    (async () => {
      if (user) {
        const { data } = await db.from('profiles').select('country').eq('id', user.id).maybeSingle();
        const code = normalizeCountry(data?.country);
        if (code) { setUserCountry(code); return; }
      }
      // Fallback navigateur
      const nav = (navigator.language || 'fr-FR').split('-')[1];
      setUserCountry(nav ? nav.toUpperCase() : 'FR');
    })();
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: dbRows }, { data: rssUniversal }, { data: rssLocal }] = await Promise.all([
      db.from('news_posts')
        .select('id,title,excerpt,image_url,video_url,content,external_url,category,author_name,published_at,featured,country')
        .eq('is_published', true)
        .order('featured', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(limit),
      db.from('rss_articles')
        .select('id,title,excerpt,image_url,external_url,category,author_name,published_at,country')
        .eq('is_broken', false)
        .is('country', null)
        .order('published_at', { ascending: false })
        .limit(limit),
      userCountry
        ? db.from('rss_articles')
            .select('id,title,excerpt,image_url,external_url,category,author_name,published_at,country')
            .eq('is_broken', false)
            .eq('country', userCountry)
            .order('published_at', { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [] }),
    ]);

    const known = new Set<string>();
    const mv: Article[] = (dbRows ?? []).map((r: any) => {
      if (r.external_url) known.add(r.external_url);
      return { ...r, source: 'db', origin: 'movement' } as Article;
    });
    const uni: Article[] = (rssUniversal ?? [])
      .filter((r: any) => !known.has(r.external_url))
      .map((r: any) => {
        known.add(r.external_url);
        return { ...r, source: 'rss', origin: 'universal', featured: false } as Article;
      });
    const loc: Article[] = (rssLocal ?? [])
      .filter((r: any) => !known.has(r.external_url))
      .map((r: any) => ({ ...r, source: 'rss', origin: 'local', featured: false } as Article));

    setMovement(mv);
    setUniversal(uni);
    setLocal(loc);
    setLoading(false);
  }, [limit, userCountry]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => { void load(); }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const articles = [...movement, ...universal, ...local];

  return { movement, universal, local, articles, loading, reload: load, userCountry };
}