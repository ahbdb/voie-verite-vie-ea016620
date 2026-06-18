import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  featured?: boolean;
  video_url?: string | null;
  content?: string | null;
}

const db = supabase as any;

/**
 * Hook unique pour récupérer la fusion :
 *   - `news_posts` (éditorial — source de vérité)
 *   - `rss_articles` (cache serveur des flux catholiques)
 *
 * Plus de fetch RSS côté navigateur : tout passe par la table `rss_articles`
 * remplie par l'edge function `fetch-news` (cron 30 min).
 */
export function useArticles(limit = 40) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: dbRows }, { data: rssRows }] = await Promise.all([
      db.from('news_posts')
        .select('id,title,excerpt,image_url,video_url,content,external_url,category,author_name,published_at,featured')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(limit),
      db.from('rss_articles')
        .select('id,title,excerpt,image_url,external_url,category,author_name,published_at')
        .eq('is_broken', false)
        .order('published_at', { ascending: false })
        .limit(limit),
    ]);

    const knownLinks = new Set(
      (dbRows ?? []).map((r: any) => r.external_url).filter(Boolean),
    );

    const dbArticles: Article[] = (dbRows ?? []).map((r: any) => ({ ...r, source: 'db' as const }));
    const rssArticles: Article[] = (rssRows ?? [])
      .filter((r: any) => !knownLinks.has(r.external_url))
      .map((r: any) => ({ ...r, source: 'rss' as const, featured: false }));

    const merged = [...dbArticles, ...rssArticles].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    setArticles(merged);
    setLoading(false);
  }, [limit]);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh toutes les 15 min
  useEffect(() => {
    const id = setInterval(() => { void load(); }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { articles, loading, reload: load };
}