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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, Loader2, Newspaper, Eye, EyeOff,
  Star, StarOff, Image as ImageIcon, Link2, Video, ArrowLeft,
  Upload,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetch = async () => {
    const { data } = await db.from('news_posts').select('*').order('published_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { void fetch(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (post: NewsPost) => {
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
    void fetch();
  };

  const togglePublish = async (post: NewsPost) => {
    await db.from('news_posts').update({ is_published: !post.is_published }).eq('id', post.id);
    void fetch();
  };

  const toggleFeatured = async (post: NewsPost) => {
    await db.from('news_posts').update({ featured: !post.featured }).eq('id', post.id);
    void fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    await db.from('news_posts').delete().eq('id', id);
    toast.success('Supprimé');
    void fetch();
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
              <p className="text-sm text-muted-foreground mt-0.5">{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={openCreate} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Nouvel article
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-border/60">
            <Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Aucun article. Créez le premier !</p>
            <Button onClick={openCreate} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Créer</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className={cn(
                'flex items-start gap-4 rounded-2xl border p-4 transition-all',
                post.is_published ? 'border-border/60 bg-card' : 'border-border/30 bg-muted/20 opacity-60'
              )}>
                {/* Thumbnail */}
                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border/40">
                  {post.image_url
                    ? <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/30" /></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[post.category]}</Badge>
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
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title={post.featured ? 'Retirer de la une' : 'Mettre à la une'} onClick={() => toggleFeatured(post)}>
                    {post.featured ? <Star className="h-3.5 w-3.5 text-cathedral-gold fill-cathedral-gold" /> : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title={post.is_published ? 'Dépublier' : 'Publier'} onClick={() => togglePublish(post)}>
                    {post.is_published ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(post)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => handleDelete(post.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
