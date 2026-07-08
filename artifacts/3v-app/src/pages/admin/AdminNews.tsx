import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, Loader2, Newspaper, Eye, EyeOff,
  Star, StarOff, Image as ImageIcon, Link2, Video, ArrowLeft,
  Upload, Download, Filter, CalendarX, CheckSquare, Square, Globe2, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const db = supabase as any;

interface NewsPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  category: string;
  author_name: string | null;
  is_published: boolean;
  featured: boolean;
  tags: string[] | null;
  external_url: string | null;
  published_at: string;
  created_at: string;
  country?: string | null;
  _source?: 'db' | 'rss';
}

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  image_url: '',
  video_url: '',
  category: 'association',
  author_name: '',
  is_published: true,
  featured: false,
  tags: '',
  external_url: '',
  country: '',
};

const CATEGORY_LABELS: Record<string, string> = {
  association: '🏛️ Association',
  church: '⛪ Église',
  event: '📅 Événement',
  announcement: '📢 Annonce',
};

const AdminNews = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filtres & sélection ──
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'db' | 'rss'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [purging, setPurging] = useState(false);

  const loadPosts = async () => {
    const [{ data: dbRows }, { data: rssRows }] = await Promise.all([
      db.from('news_posts').select('*').order('published_at', { ascending: false }),
      db.from('rss_articles').select('id,title,excerpt,image_url,external_url,category,author_name,published_at,country,is_broken').order('published_at', { ascending: false }).limit(500),
    ]);
    const merged: NewsPost[] = [
      ...((dbRows ?? []).map((r: any) => ({ ...r, _source: 'db' as const }))),
      ...((rssRows ?? []).map((r: any) => ({
        ...r, content: null, video_url: null, tags: null,
        is_published: !r.is_broken, featured: false,
        created_at: r.published_at, _source: 'rss' as const,
      }))),
    ].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    setPosts(merged);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { void loadPosts(); }, []);

  // ── Liste filtrée ──
  const filtered = posts.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (filterSource !== 'all' && p._source !== filterSource) return false;
    if (filterStatus === 'published' && !p.is_published) return false;
    if (filterStatus === 'draft' && p.is_published) return false;
    if (dateFrom && new Date(p.published_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.published_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const toggleOne = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Supprimer définitivement ${selected.size} article(s) ?`)) return;
    const ids = [...selected];
    const dbIds  = ids.filter(id => posts.find(p => p.id === id)?._source === 'db');
    const rssIds = ids.filter(id => posts.find(p => p.id === id)?._source === 'rss');
    if (dbIds.length)  await db.from('news_posts').delete().in('id', dbIds);
    if (rssIds.length) await db.from('rss_articles').delete().in('id', rssIds);
    toast.success(`${ids.length} article(s) supprimé(s)`);
    void loadPosts();
  };

  const bulkSetPublished = async (val: boolean) => {
    if (selected.size === 0) return;
    const ids = [...selected].filter(id => posts.find(p => p.id === id)?._source === 'db');
    if (ids.length === 0) { toast.info('Sélection RSS : action non disponible'); return; }
    await db.from('news_posts').update({ is_published: val }).in('id', ids);
    toast.success(`${ids.length} article(s) ${val ? 'publiés' : 'dépubliés'}`);
    void loadPosts();
  };

  const purgeByDate = async () => {
    if (!dateTo && !dateFrom) { toast.error('Définissez une plage de dates d\'abord.'); return; }
    const count = filtered.length;
    if (count === 0) { toast.info('Aucun article ne correspond aux filtres.'); return; }
    if (!confirm(`Supprimer les ${count} article(s) filtrés (période ${dateFrom || '…'} → ${dateTo || '…'}) ?`)) return;
    setPurging(true);
    const dbIds  = filtered.filter(p => p._source === 'db').map(p => p.id);
    const rssIds = filtered.filter(p => p._source === 'rss').map(p => p.id);
    if (dbIds.length)  await db.from('news_posts').delete().in('id', dbIds);
    if (rssIds.length) await db.from('rss_articles').delete().in('id', rssIds);
    toast.success(`${count} article(s) supprimé(s)`);
    setPurging(false);
    void loadPosts();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (post: NewsPost) => {
    if (post._source === 'rss') {
      toast.info('Les articles RSS sont en lecture seule. Supprimez-les si besoin.');
      return;
    }
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content || '',
      image_url: post.image_url || '',
      video_url: post.video_url || '',
      category: post.category,
      author_name: post.author_name || '',
      is_published: post.is_published,
      featured: post.featured,
      tags: (post.tags || []).join(', '),
      external_url: post.external_url || '',
      country: post.country || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !user) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
      video_url: form.video_url.trim() || null,
      category: form.category,
      author_name: form.author_name.trim() || null,
      is_published: form.is_published,
      featured: form.featured,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      external_url: form.external_url.trim() || null,
      country: form.country.trim().toUpperCase() || null,
    };

    if (editingId) {
      const { error } = await db.from('news_posts').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Article mis à jour');
    } else {
      const { error } = await db.from('news_posts').insert({ ...payload, author_id: user.id });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Article publié');
    }
    setSaving(false);
    setDialogOpen(false);
    void loadPosts();
  };

  const togglePublish = async (post: NewsPost) => {
    if (post._source === 'rss') return;
    await db.from('news_posts').update({ is_published: !post.is_published }).eq('id', post.id);
    void loadPosts();
  };

  const toggleFeatured = async (post: NewsPost) => {
    if (post._source === 'rss') return;
    await db.from('news_posts').update({ featured: !post.featured }).eq('id', post.id);
    void loadPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    const p = posts.find(x => x.id === id);
    const table = p?._source === 'rss' ? 'rss_articles' : 'news_posts';
    await db.from(table).delete().eq('id', id);
    toast.success('Supprimé');
    void loadPosts();
  };

  // ── Helpers XML (fallback client-side) ────────────────────────────────────
  const parseRssXml = (xml: string, sourceName: string, existingUrls: Set<string>): object[] => {
    const items: object[] = [];
    const blocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const block of blocks) {
      const getTag = (tag: string) => {
        const cd = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
        if (cd) return cd[1].trim();
        const pl = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return pl ? pl[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim() : '';
      };
      const getAttr = (tag: string, attr: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'));
        return m ? m[1] : '';
      };
      const title = getTag('title');
      const link  = getTag('link') || getAttr('link', 'href');
      if (!title || !link || existingUrls.has(link)) continue;
      const desc  = getTag('description');
      const pub   = getTag('pubDate') || getTag('published');
      const img   = getAttr('enclosure', 'url') || getAttr('media:content', 'url') || getAttr('media:thumbnail', 'url') || null;
      items.push({
        title: title.slice(0, 255),
        excerpt: desc ? desc.replace(/\s+/g, ' ').slice(0, 300) : null,
        image_url: img,
        category: 'church',
        author_name: sourceName,
        is_published: true,
        featured: false,
        external_url: link,
        published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      });
      if (items.length >= 10) break;
    }
    return items;
  };

  // ── Fetch via CORS proxies (fallback) ──────────────────────────────────────
  const fetchRssWithProxy = async (url: string, sourceName: string, existingUrls: Set<string>): Promise<object[]> => {
    const proxies = [
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];
    for (const makeUrl of proxies) {
      try {
        const res = await fetch(makeUrl(url), { signal: AbortSignal.timeout(12000) });
        if (!res.ok) continue;
        const xml = await res.text();
        const parsed = parseRssXml(xml, sourceName, existingUrls);
        if (parsed.length > 0) return parsed;
      } catch { /* try next proxy */ }
    }
    return [];
  };

  const handleImportRss = async () => {
    setImporting(true);
    toast.info('Scraping en cours…');

    // ── Étape 1 : tenter l'Edge Function (serveur, aucun CORS) ──────────────
    try {
      const res = await fetch(
        'https://kaddsojhnkyfavaulrfc.supabase.co/functions/v1/fetch-news',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(60000) },
      );
      if (res.ok) {
        const json = await res.json() as { success: boolean; inserted: number; errors: string[] };
        if (json.inserted > 0) {
          toast.success(`${json.inserted} article(s) importé(s)`);
          void loadPosts();
          setImporting(false);
          return;
        }
        if (json.errors?.length) console.warn('Edge fn errors:', json.errors);
      }
    } catch { /* Edge Function non déployée → fallback */ }

    // ── Étape 2 : fetch client + RPC SECURITY DEFINER ───────────────────────
    const { data: existing } = await db.from('news_posts').select('external_url').not('external_url', 'is', null);
    const existingUrls: Set<string> = new Set((existing || []).map((p: any) => p.external_url as string));

    const RSS_SOURCES = [
      { url: 'https://fr.aleteia.org/feed/',                    name: 'Aleteia'            },
      { url: 'https://www.vaticannews.va/fr.rss.xml',           name: 'Vatican News'       },
      { url: 'https://www.imedias.eu/feed/',                    name: 'iMédia'             },
      { url: 'https://www.famillechretienne.fr/feed/',          name: 'Famille Chrétienne' },
      { url: 'https://www.la-croix.com/RSS/UNIVERS-RELIGION',   name: 'La Croix'           },
      { url: 'https://fr.zenit.org/feed/',                      name: 'Zenit'              },
    ];

    const results = await Promise.allSettled(
      RSS_SOURCES.map(s => fetchRssWithProxy(s.url, s.name, existingUrls))
    );

    const toInsert: object[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') toInsert.push(...r.value);
    }

    if (toInsert.length === 0) {
      toast.warning('Aucun nouvel article trouvé via les proxies. Utilise le script Node.js.');
      setImporting(false);
      return;
    }

    // Appel RPC SECURITY DEFINER (contourne RLS, ne nécessite que anon key)
    const { data: count, error } = await db.rpc('insert_church_articles', { articles: toInsert });
    if (error) {
      toast.error('Erreur : ' + error.message + ' — Applique d\'abord la migration SQL dans le Dashboard.');
    } else {
      toast.success(`${count ?? toInsert.length} article(s) importé(s)`);
      void loadPosts();
    }
    setImporting(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `news/${Date.now()}.${ext}`;
    const { error } = await (supabase.storage as any).from('news-images').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Erreur upload : ' + error.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = (supabase.storage as any).from('news-images').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast.success('Image uploadée');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="font-cinzel text-2xl font-bold text-foreground flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" /> Actualités
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filtered.length} / {posts.length} article{posts.length !== 1 ? 's' : ''}
                {selected.size > 0 && ` · ${selected.size} sélectionné(s)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportRss} disabled={importing} className="rounded-xl gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">Importer RSS</span>
            </Button>
            <Button onClick={openCreate} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Nouvel article
            </Button>
          </div>
        </div>

        {/* ── Filtres & purge ── */}
        <div className="mb-4 rounded-2xl border border-border/60 bg-card p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtres
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="rounded-lg h-9 text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={(v: any) => setFilterSource(v)}>
              <SelectTrigger className="rounded-lg h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sources</SelectItem>
                <SelectItem value="db">🕊️ Mouvement 3V</SelectItem>
                <SelectItem value="rss">🌐 Flux RSS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="rounded-lg h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="published">Publiés</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="Du" className="rounded-lg h-9 text-xs" />
            <Input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   placeholder="Au" className="rounded-lg h-9 text-xs" />
          </div>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Button size="sm" variant="ghost" onClick={() => {
              setFilterCat('all'); setFilterSource('all'); setFilterStatus('all');
              setDateFrom(''); setDateTo('');
            }} className="rounded-lg text-xs">Réinitialiser</Button>
            <div className="flex-1" />
            <Button size="sm" variant="destructive" onClick={purgeByDate} disabled={purging || filtered.length === 0}
              className="rounded-lg gap-1.5 text-xs">
              {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarX className="h-3.5 w-3.5" />}
              Supprimer les {filtered.length} article(s) filtré(s)
            </Button>
          </div>
        </div>

        {/* ── Barre d'actions multi-sélection ── */}
        {selected.size > 0 && (
          <div className="sticky top-20 z-30 mb-4 rounded-xl border border-primary/40 bg-primary/8 backdrop-blur px-4 py-2.5 flex items-center gap-2 flex-wrap shadow-lg shadow-primary/10">
            <span className="text-xs font-semibold text-foreground">{selected.size} sélectionné(s)</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => bulkSetPublished(true)}  className="rounded-lg gap-1 text-xs h-8"><Eye    className="h-3.5 w-3.5" /> Publier</Button>
            <Button size="sm" variant="ghost" onClick={() => bulkSetPublished(false)} className="rounded-lg gap-1 text-xs h-8"><EyeOff className="h-3.5 w-3.5" /> Dépublier</Button>
            <Button size="sm" variant="destructive" onClick={bulkDelete} className="rounded-lg gap-1 text-xs h-8"><Trash2 className="h-3.5 w-3.5" /> Supprimer</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="rounded-lg text-xs h-8">Annuler</Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border/60">
            <Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {posts.length === 0 ? 'Aucun article. Créez le premier !' : 'Aucun article ne correspond aux filtres.'}
            </p>
            <Button onClick={openCreate} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Créer</Button>
          </div>
        ) : (
          <>
          <div className="flex items-center gap-2 mb-2 px-2">
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
              {selected.size === filtered.length && filtered.length > 0
                ? <CheckSquare className="h-4 w-4 text-primary" />
                : <Square className="h-4 w-4" />}
              Tout sélectionner
            </button>
          </div>
          <div className="space-y-3">
            {filtered.map(post => (
              <div key={post.id} className={cn(
                'flex items-start gap-4 rounded-2xl border p-4 transition-all',
                selected.has(post.id) ? 'border-primary/60 bg-primary/5'
                  : post.is_published ? 'border-border/60 bg-card' : 'border-border/30 bg-muted/20 opacity-60'
              )}>
                <div className="pt-1">
                  <Checkbox checked={selected.has(post.id)} onCheckedChange={() => toggleOne(post.id)} />
                </div>
                {/* Thumbnail */}
                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border/40">
                  {post.image_url
                    ? <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/30" /></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[post.category]}</Badge>
                    {post._source === 'rss'
                      ? <Badge className="text-[10px] bg-slate-500/20 text-slate-300 border-slate-500/30"><Globe2 className="h-2.5 w-2.5 mr-1" /> RSS</Badge>
                      : <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">🕊️ 3V</Badge>}
                    {post.country && <Badge variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-1" />{post.country}</Badge>}
                    {post.featured && <Badge className="text-[10px] bg-cathedral-gold/20 text-cathedral-gold border-cathedral-gold/30">★ À la une</Badge>}
                    {!post.is_published && <Badge variant="secondary" className="text-[10px]">Brouillon</Badge>}
                  </div>
                  <p className="font-cinzel font-semibold text-foreground text-sm leading-snug line-clamp-1">{post.title}</p>
                  {post.excerpt && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.excerpt}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {format(new Date(post.published_at), 'PP', { locale: fr })}
                    {post.author_name && ` · ${post.author_name}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {post._source === 'db' && <>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title={post.featured ? 'Retirer de la une' : 'Mettre à la une'} onClick={() => toggleFeatured(post)}>
                    {post.featured ? <Star className="h-3.5 w-3.5 text-cathedral-gold fill-cathedral-gold" /> : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title={post.is_published ? 'Dépublier' : 'Publier'} onClick={() => togglePublish(post)}>
                    {post.is_published ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(post)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  </>}
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel flex items-center gap-2">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? 'Modifier l\'article' : 'Nouvel article'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre de l'article" className="mt-1 rounded-lg" />
            </div>

            {/* Category + Published */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Auteur</Label>
                <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))}
                  placeholder="Nom affiché" className="mt-1 rounded-lg" />
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <Label>Résumé court</Label>
              <Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                rows={2} placeholder="Accroche visible sur la homepage" className="mt-1 rounded-lg" />
            </div>

            {/* Content */}
            <div>
              <Label>Contenu (optionnel)</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={5} placeholder="Texte complet de l'article…" className="mt-1 rounded-lg font-mono text-sm" />
            </div>

            {/* Image */}
            <div>
              <Label>Image</Label>
              <div className="mt-1 flex gap-2">
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://… ou uploader ci-dessous" className="rounded-lg flex-1" />
                <Button type="button" variant="outline" className="rounded-lg shrink-0 gap-1.5"
                  onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 h-24 w-full object-cover rounded-lg border border-border/40" />
              )}
            </div>

            {/* Video URL */}
            <div>
              <Label className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> Vidéo (URL YouTube ou directe)</Label>
              <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/…" className="mt-1 rounded-lg" />
            </div>

            {/* External URL */}
            <div>
              <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Lien externe (si l'article est sur un autre site)</Label>
              <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))}
                placeholder="https://…" className="mt-1 rounded-lg" />
            </div>

            {/* Tags */}
            <div>
              <Label>Tags (séparés par des virgules)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="messe, jeunesse, Cameroun…" className="mt-1 rounded-lg" />
            </div>

            {/* Pays cible */}
            <div>
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Pays cible (optionnel)</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value.toUpperCase() }))}
                placeholder="FR, CM, IT… (vide = visible partout)" maxLength={2} className="mt-1 rounded-lg uppercase" />
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Code ISO à 2 lettres. Laisser vide pour un article visible dans le monde entier.
              </p>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch id="published" checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
                <Label htmlFor="published">Publié</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="featured" checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
                <Label htmlFor="featured">À la une</Label>
              </div>
            </div>

            <Button onClick={handleSave} disabled={!form.title.trim() || saving} className="w-full rounded-xl py-5 font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingId ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Enregistrer les modifications' : 'Publier l\'article'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNews;
