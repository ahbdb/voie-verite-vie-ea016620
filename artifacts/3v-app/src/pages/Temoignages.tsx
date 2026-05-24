import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navigation from '@/components/Navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Heart, Sparkles, Send, User, Lock, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = [
  { value: 'guerison', label: '🙏 Guérison', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { value: 'conversion', label: '✨ Conversion', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'famille', label: '👨‍👩‍👧 Famille', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'travail', label: '💼 Travail', color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  { value: 'foi', label: '🕊️ Foi', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  { value: 'autre', label: '🌿 Autre', color: 'bg-muted text-muted-foreground border-border' },
];

interface Testimonial {
  id: string;
  titre: string;
  recit: string;
  categorie: string;
  prenom: string | null;
  created_at: string;
}

const Temoignages = () => {
  const { user } = useAuth();
  const [published, setPublished] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [titre, setTitre] = useState('');
  const [recit, setRecit] = useState('');
  const [categorie, setCategorie] = useState('foi');
  const [prenom, setPrenom] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    fetchPublished();
  }, []);

  const fetchPublished = async () => {
    // Published testimonials are stored in contact_messages with type = 'testimonial_published'
    const { data } = await (supabase as any)
      .from('contact_messages')
      .select('id, name, subject, message, created_at, type')
      .eq('type', 'testimonial_published')
      .order('created_at', { ascending: false });

    if (data) {
      setPublished(data.map((d: any) => ({
        id: d.id,
        titre: d.subject || 'Témoignage',
        recit: d.message,
        categorie: d.name?.split('|')[1] || 'foi',
        prenom: d.name?.split('|')[0] || null,
        created_at: d.created_at,
      })));
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!titre.trim() || !recit.trim()) {
      toast.error('Veuillez remplir le titre et le récit.');
      return;
    }
    setSubmitting(true);
    const name = anonymous ? 'Anonyme|' + categorie : (prenom.trim() || 'Anonyme') + '|' + categorie;
    const { error } = await (supabase as any).from('contact_messages').insert({
      name,
      email: user?.email || 'anonyme@3v.app',
      subject: titre.trim(),
      message: recit.trim(),
      type: 'testimonial_pending',
    });

    if (error) {
      toast.error('Erreur lors de l\'envoi.');
    } else {
      toast.success('Témoignage envoyé ! Il sera publié après validation. Merci ❤️');
      setShowForm(false);
      setTitre(''); setRecit(''); setPrenom(''); setCategorie('foi');
    }
    setSubmitting(false);
  };

  const getCatConfig = (val: string) => CATEGORIES.find(c => c.value === val) ?? CATEGORIES[CATEGORIES.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Témoignages — Voie Vérité Vie</title>
        <meta name="description" content="Partagez et découvrez les témoignages de grâces de la communauté 3V." />
      </Helmet>
      <Navigation />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-cathedral-gold/20 bg-gradient-cathedral pt-28 pb-12 text-center px-4">
        <div className="absolute inset-0 bg-gradient-stained opacity-50 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cathedral-gold/40 bg-background/10 backdrop-blur-sm mb-5">
            <Sparkles className="h-3.5 w-3.5 text-cathedral-gold" />
            <span className="text-xs uppercase tracking-[0.2em] text-cathedral-gold font-medium">Grâces reçues</span>
          </div>
          <h1 className="font-cinzel text-4xl sm:text-5xl font-bold text-white mb-4">Témoignages</h1>
          <div className="cathedral-line w-24 h-px mx-auto my-4" />
          <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Les merveilles que Dieu accomplit dans nos vies témoignent de sa présence. Partagez votre grâce, encouragez vos frères et sœurs.
          </p>
          <Button onClick={() => setShowForm(v => !v)} className="mt-6 bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold rounded-full px-6">
            <MessageCircle className="h-4 w-4 mr-2" /> Partager mon témoignage
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Submission form */}
        {showForm && (
          <div className="rounded-2xl border border-cathedral-gold/30 bg-card p-6 shadow-lg">
            <h2 className="font-cinzel text-xl font-bold text-foreground mb-5 flex items-center gap-2">
              <Heart className="h-5 w-5 text-cathedral-gold" /> Mon témoignage
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Titre *</label>
                <Input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Guérison miraculeuse après une neuvaine..." className="mt-1 rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Votre récit *</label>
                <Textarea value={recit} onChange={e => setRecit(e.target.value)} rows={6} placeholder="Racontez ce que Dieu a fait dans votre vie..." className="mt-1 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Catégorie</label>
                  <Select value={categorie} onValueChange={setCategorie}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!anonymous && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Votre prénom</label>
                    <Input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom (optionnel)" className="mt-1 rounded-xl" />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded" />
                <Lock className="h-3.5 w-3.5" /> Publier anonymement
              </label>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Annuler</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-cathedral-gold hover:bg-cathedral-gold/90 text-black font-bold">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Votre témoignage sera relu par un modérateur avant publication.</p>
            </div>
          </div>
        )}

        {/* Categories filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <Badge key={c.value} variant="outline" className={`cursor-pointer ${c.color} rounded-full px-3 py-1 text-xs`}>
              {c.label}
            </Badge>
          ))}
        </div>

        {/* Testimonials list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cathedral-gold" />
          </div>
        ) : published.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 rounded-full bg-cathedral-gold/10 blur-3xl" />
              <div className="relative h-24 w-24 rounded-full border border-cathedral-gold/20 bg-gradient-to-br from-card to-cathedral-gold/5 flex items-center justify-center text-4xl">
                🕊️
              </div>
            </div>
            <h3 className="font-cinzel text-2xl font-semibold text-foreground mb-2">Soyez le premier à témoigner</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">Aucun témoignage publié pour l'instant. Votre récit peut encourager toute la communauté.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {published.map(t => {
              const cat = getCatConfig(t.categorie);
              return (
                <div key={t.id} className="group rounded-2xl border border-border/70 bg-card hover:border-cathedral-gold/30 hover:shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.15)] transition-all p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs rounded-full ${cat.color}`}>{cat.label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(t.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <h3 className="font-cinzel font-bold text-foreground text-lg mb-3">{t.titre}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{t.recit}</p>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                    {t.prenom ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" /> {t.prenom}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Anonyme
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Temoignages;
