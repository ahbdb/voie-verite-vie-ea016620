import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Radio, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NewsPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  category: string;
  author_name: string | null;
  featured: boolean;
  published_at: string;
  external_url: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  association: '🏛️ Association',
  event: '📅 Événement',
  announcement: '📢 Annonce',
  church: '⛪ Église',
};

const Actualites = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    (supabase as any)
      .from('news_posts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) {
          setNotFound(true);
        } else if (data.external_url) {
          window.location.href = data.external_url;
          return;
        } else {
          setPost(data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 max-w-3xl flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  if (notFound || !post) return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 max-w-3xl text-center">
        <p className="text-5xl mb-4">🕊️</p>
        <h1 className="text-xl font-bold mb-2">Article introuvable</h1>
        <p className="text-muted-foreground mb-6">Cet article n'existe pas ou a été supprimé.</p>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">

        <Button
          variant="ghost"
          className="mb-6 px-0 -ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        {/* Image principale */}
        {post.image_url && (
          <div className="rounded-2xl overflow-hidden aspect-video mb-6 bg-muted">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {/* Catégorie + Date */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABEL[post.category] ?? post.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(post.published_at), 'd MMMM yyyy', { locale: fr })}
            {post.author_name && ` · ${post.author_name}`}
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-2xl sm:text-3xl font-bold font-cinzel leading-tight mb-4">
          {post.title}
        </h1>

        {/* Résumé */}
        {post.excerpt && (
          <p className="text-base text-muted-foreground leading-relaxed mb-6 border-l-2 border-primary/40 pl-4 italic">
            {post.excerpt}
          </p>
        )}

        {/* CTA événement/live */}
        {post.category === 'event' && (
          <div className="my-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">📡 Événement en direct</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Un live ou appel est peut-être en cours ou planifié pour cet événement.
              </p>
            </div>
            <Link to="/calls-lives" className="shrink-0">
              <Button size="sm" className="gap-2">
                <Radio className="h-4 w-4" /> Voir les lives & appels
              </Button>
            </Link>
          </div>
        )}

        {/* Contenu HTML */}
        {post.content ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : post.excerpt && !post.content ? (
          <p className="text-foreground/80 leading-relaxed">{post.excerpt}</p>
        ) : null}

        {/* Lien externe de secours */}
        {post.external_url && (
          <a
            href={post.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Lire l'article original
          </a>
        )}
      </main>
    </div>
  );
};

export default Actualites;
