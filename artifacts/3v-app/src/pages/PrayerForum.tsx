import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Send, User, Calendar, MessageCircle, HandHeart, Plus, Clock, Flame, X } from 'lucide-react';

interface PrayerRequest {
  id: string; title: string; content: string; is_anonymous: boolean; prayer_count: number;
  created_at: string; user_id: string | null;
  profiles?: { full_name: string | null } | null; user_role?: string | null;
}
interface PrayerResponse {
  id: string; content: string; created_at: string; user_id: string | null;
  profiles?: { full_name: string | null } | null; user_role?: string | null;
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const PrayerForum = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);
  const [responses, setResponses] = useState<PrayerResponse[]>([]);
  const [responseContent, setResponseContent] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [prayedFor, setPrayedFor] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'recent' | 'popular'>('recent');

  useEffect(() => { fetchPrayerRequests(); }, []);

  const fetchPrayerRequests = async () => {
    try {
      const { data, error } = await supabase.from('prayer_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const withProfiles = await Promise.all(
        (data || []).map(async (r) => {
          let profiles = null, user_role = null;
          if (!r.is_anonymous && r.user_id) {
            const { data: p } = await supabase.from('profiles').select('full_name').eq('id', r.user_id).maybeSingle();
            profiles = p;
            const { data: rd } = await supabase.from('user_roles').select('role').eq('user_id', r.user_id).maybeSingle();
            user_role = rd?.role || null;
          }
          return { ...r, profiles, user_role };
        })
      );
      setRequests(withProfiles);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchResponses = async (id: string) => {
    const { data } = await supabase.from('prayer_responses').select('*').eq('prayer_request_id', id).order('created_at', { ascending: true });
    const withProfiles = await Promise.all(
      (data || []).map(async (r) => {
        let profiles = null, user_role = null;
        if (r.user_id) {
          const { data: p } = await supabase.from('profiles').select('full_name').eq('id', r.user_id).maybeSingle();
          profiles = p;
          const { data: rd } = await supabase.from('user_roles').select('role').eq('user_id', r.user_id).maybeSingle();
          user_role = rd?.role || null;
        }
        return { ...r, profiles, user_role };
      })
    );
    setResponses(withProfiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('prayer_requests').insert({ user_id: user.id, title: title.trim(), content: content.trim(), is_anonymous: isAnonymous });
      toast({ title: t('prayer.submitted') || "Demande soumise" });
      setTitle(''); setContent(''); setIsAnonymous(false); fetchPrayerRequests();
    } catch {} finally { setSubmitting(false); }
  };

  const handlePray = async (id: string, count: number) => {
    if (prayedFor.has(id)) return;
    await supabase.from('prayer_requests').update({ prayer_count: count + 1 }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, prayer_count: r.prayer_count + 1 } : r));
    setPrayedFor(prev => new Set([...prev, id]));
    toast({ title: "🙏 Merci" });
  };

  const handleSubmitResponse = async () => {
    if (!user || !responseContent.trim() || !selectedRequest) return;
    setSubmittingResponse(true);
    try {
      await supabase.from('prayer_responses').insert({ prayer_request_id: selectedRequest.id, user_id: user.id, content: responseContent.trim() });
      setResponseContent(''); fetchResponses(selectedRequest.id);
    } catch {} finally { setSubmittingResponse(false); }
  };

  const getTimeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    return new Date(d).toLocaleDateString('fr-FR');
  };

  const getAuthor = (r: PrayerRequest) => r.is_anonymous ? 'Anonyme' : r.user_role === 'admin_principal' ? '👑 Admin' : r.profiles?.full_name || 'Membre';

  const sorted = tab === 'popular' ? [...requests].sort((a, b) => b.prayer_count - a.prayer_count).slice(0, 15) : requests.slice(0, 15);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header with aurora */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8 relative">
            <motion.div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-cathedral-gold/5 blur-3xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 5, repeat: Infinity }} />
            <p className="text-xs tracking-[0.3em] uppercase text-cathedral-gold/70 mb-2 font-inter">{t('prayer.community') || 'Communauté'}</p>
            <h1 className="text-3xl md:text-5xl font-cinzel font-bold text-gradient-gold mb-2">{t('prayer.title')}</h1>
            <p className="text-sm text-muted-foreground font-inter">{t('prayer.subtitle')} {t('prayer.verse')}</p>
          </motion.div>

          <div className="cathedral-line w-full mb-8" />

          <div className="grid lg:grid-cols-3 gap-10">
            {/* Left - Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div>
                  <h3 className="text-base font-cinzel font-bold text-foreground mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cathedral-gold" />{t('prayer.newIntention')}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input placeholder={t('prayer.intentionTitle')} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="border-border/40" />
                    <Textarea placeholder={t('prayer.intentionContent')} value={content} onChange={e => setContent(e.target.value)} rows={3} maxLength={1000} className="border-border/40" />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-inter cursor-pointer">
                      <Checkbox checked={isAnonymous} onCheckedChange={c => setIsAnonymous(c as boolean)} />{t('common.anonymous')}
                    </label>
                    <Button type="submit" disabled={submitting} size="sm" className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-cathedral-navy gap-2">
                      <Send className="w-3 h-3" />{submitting ? '...' : t('prayer.share')}
                    </Button>
                  </form>
                </div>
                <div className="cathedral-line w-full" />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xl font-cinzel font-bold text-foreground">{requests.length}</p>
                    <p className="text-[10px] text-muted-foreground font-inter uppercase tracking-wider">{t('prayer.intentions')}</p>
                  </div>
                  <div>
                    <p className="text-xl font-cinzel font-bold text-foreground">{requests.reduce((s, r) => s + r.prayer_count, 0)}</p>
                    <p className="text-[10px] text-muted-foreground font-inter uppercase tracking-wider">{t('prayer.prayers')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - List */}
            <div className="lg:col-span-2">
              <div className="flex gap-4 mb-6">
                {(['recent', 'popular'] as const).map(t2 => (
                  <button key={t2} onClick={() => setTab(t2)} className={`text-sm font-inter pb-1 border-b-2 transition-colors ${tab === t2 ? 'border-cathedral-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t2 === 'recent' ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t('prayer.recent')}</span> : <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{t('prayer.mostPrayed')}</span>}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-cathedral-gold border-t-transparent" /></div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-12">
                  <HandHeart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-inter">{t('prayer.noPrayers')}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sorted.map((r, i) => (
                    <motion.div key={r.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.03 }}
                      onClick={() => { setSelectedRequest(r); fetchResponses(r.id); }}
                      className="flex items-start gap-4 py-4 border-b border-border/20 cursor-pointer hover:bg-muted/30 transition-colors px-2 -mx-2 rounded">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{r.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-inter">{r.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/60 font-inter">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{getAuthor(r)}</span>
                          <span>{getTimeAgo(r.created_at)}</span>
                        </div>
                      </div>
                      <Button variant={prayedFor.has(r.id) ? "secondary" : "outline"} size="sm"
                        onClick={e => { e.stopPropagation(); handlePray(r.id, r.prayer_count); }}
                        disabled={prayedFor.has(r.id)} className="flex-shrink-0 gap-1 text-xs">
                        <Heart className={`w-3 h-3 ${prayedFor.has(r.id) ? 'fill-current' : ''}`} />{r.prayer_count}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail overlay */}
        <AnimatePresence>
          {selectedRequest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                className="max-w-xl w-full max-h-[85vh] bg-card border border-border/40 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border/20">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-cinzel font-bold text-foreground">{selectedRequest.title}</h3>
                    <button onClick={() => setSelectedRequest(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 font-inter whitespace-pre-wrap">{selectedRequest.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/60 font-inter">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{getAuthor(selectedRequest)}</span>
                    <span><Calendar className="w-3 h-3 inline mr-1" />{new Date(selectedRequest.created_at).toLocaleDateString('fr-FR')}</span>
                    <Badge variant="outline" className="text-[10px] border-cathedral-gold/30"><Heart className="w-3 h-3 mr-1" />{selectedRequest.prayer_count}</Badge>
                  </div>
                </div>
                <div className="p-6 max-h-[35vh] overflow-y-auto space-y-3">
                  <h4 className="text-sm font-cinzel font-bold text-foreground flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cathedral-gold" />Messages ({responses.length})
                  </h4>
                  {responses.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic font-inter">Soyez le premier à encourager.</p>
                  ) : responses.map(r => (
                    <div key={r.id} className="border-l-2 border-cathedral-gold/20 pl-3 py-1">
                      <p className="text-sm font-inter">{r.content}</p>
                      <span className="text-[10px] text-muted-foreground/50 font-inter">{r.profiles?.full_name || 'Membre'} • {new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border/20 flex gap-2">
                  <Textarea placeholder="Message d'encouragement..." value={responseContent} onChange={e => setResponseContent(e.target.value)} rows={2} className="flex-1 text-sm border-border/40" />
                  <Button onClick={handleSubmitResponse} disabled={submittingResponse || !responseContent.trim()} size="sm" className="bg-cathedral-gold hover:bg-cathedral-gold/90 text-cathedral-navy">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PrayerForum;
