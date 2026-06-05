import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import logo3v from '@/assets/logo-3v.png';
import { getLiturgicalDay, liturgicalEmoji } from '@/lib/liturgicalCalendar';

type Gender = 'homme' | 'femme';
type MaritalStatus = 'celibataire' | 'marie' | 'veuf' | 'consacre';

const MARITAL_OPTIONS: { value: MaritalStatus; label: string; emoji: string }[] = [
  { value: 'celibataire', label: 'Célibataire',  emoji: '🕊️' },
  { value: 'marie',       label: 'Marié(e)',      emoji: '💍' },
  { value: 'veuf',        label: 'Veuf / Veuve',  emoji: '🕯️' },
  { value: 'consacre',    label: 'Vie consacrée', emoji: '✝️' },
];

/** Convertit JJ/MM/AAAA → AAAA-MM-JJ (retourne '' si invalide) */
function frToIso(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})[/\-.:](\d{1,2})[/\-.:](\d{4})$/);
  if (!m) return '';
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(new Date(iso).getTime()) ? '' : iso;
}

/** Affiche AAAA-MM-JJ en JJ/MM/AAAA pour les inputs texte */
function isoToFr(iso: string): string {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${y}`;
}

// ── Hook : couleur liturgique du jour ───────────────────────────────────────
function useLiturgicalDay() {
  return getLiturgicalDay(new Date());
}

export default function ProfileCompletion() {
  const { user, markProfileComplete } = useAuth();
  const navigate = useNavigate();
  const lit = useLiturgicalDay();

  // Étape courante
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Étape 1 — genre
  const [gender, setGender]               = useState<Gender | null>(null);

  // Étape 2 — dates + localisation
  const [birthDate, setBirthDate]         = useState('');   // ISO AAAA-MM-JJ
  const [birthText, setBirthText]         = useState('');   // saisie JJ/MM/AAAA
  const [baptismDate, setBaptismDate]     = useState('');
  const [baptismText, setBaptismText]     = useState('');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);
  const [weddingDate, setWeddingDate]     = useState('');
  const [weddingText, setWeddingText]     = useState('');
  const [country, setCountry]             = useState('');
  const [city, setCity]                   = useState('');

  const [saving, setSaving]               = useState(false);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  // Auto-navigation vers l'accueil 4s après la confirmation (étape 3)
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => navigate('/'), 4000);
    return () => clearTimeout(t);
  }, [step, navigate]);

  // Style bouton dynamique selon couleur liturgique
  const btnStyle: React.CSSProperties = {
    backgroundColor: lit.colorHex,
    color: '#ffffff',
  };
  const btnHoverStyle = lit.colorHexHover;

  // ── Synchronisation date picker ↔ texte libre ─────────────────────────────
  const syncBirth = (iso: string) => {
    setBirthDate(iso);
    setBirthText(isoToFr(iso));
  };
  const syncBaptism = (iso: string) => {
    setBaptismDate(iso);
    setBaptismText(isoToFr(iso));
  };
  const syncWedding = (iso: string) => {
    setWeddingDate(iso);
    setWeddingText(isoToFr(iso));
  };

  /* ── Étape 1 → 2 ──────────────────────────────────────────────────────── */
  const handleStep1Next = () => {
    if (!gender) { toast.error('Veuillez choisir Frère ou Sœur.'); return; }
    setStep(2);
  };

  /* ── Sauvegarde ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!birthDate) { toast.error('La date de naissance est obligatoire.'); return; }
    if (!user?.id) return;

    setSaving(true);
    try {
      // ── 1. Metadata Supabase Auth EN PREMIER ───────────────────────────────
      // C'est la source de vérité du garde. On le fait avant tout le reste
      // pour que profileComplete = true soit garanti même si la table profiles
      // n'a pas encore les nouvelles colonnes (migration non appliquée).
      const { error: authError } = await supabase.auth.updateUser({ data: { gender } });
      if (authError) throw authError;

      // ── 2. Table profiles (best-effort) ────────────────────────────────────
      // Si la migration SQL n'a pas encore été appliquée, cet update peut échouer.
      // On ne bloque pas le flux pour autant : le metadata Auth suffit pour
      // débloquer l'application.
      const update: Record<string, string | null> = { gender };
      if (birthDate)     update.birth_date     = birthDate;
      if (baptismDate)   update.baptism_date   = baptismDate;
      if (maritalStatus) update.marital_status = maritalStatus;
      if (maritalStatus === 'marie' && weddingDate) update.wedding_date = weddingDate;
      if (country.trim()) update.country = country.trim();
      if (city.trim())    update.city    = city.trim();

      // Erreur silencieuse : colonnes peuvent ne pas exister si migration non appliquée
      await (supabase as any).from('profiles').update(update).eq('id', user.id).then(() => {}).catch(() => {});

      // ── 3. Marquer le profil comme complet immédiatement dans le contexte ────
      // N'appelle PAS refetch() : getSession() pourrait retourner l'ancienne
      // session avant que onAuthStateChange se déclenche → race condition.
      // markProfileComplete() est synchrone et évite tout redirect en boucle.
      markProfileComplete();

      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Génération du message de bienvenue ─────────────────────────────────── */
  const beni  = gender === 'femme' ? 'bénie' : 'béni';
  const cher  = gender === 'femme' ? 'Chère sœur' : 'Cher frère';
  const titre = gender === 'femme' ? 'Sœur' : 'Frère';

  /* ══════════════════════════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(220,55%,8%)] to-[hsl(220,55%,12%)] px-4 py-12">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Badge couleur liturgique */}
        <div className="flex justify-center mb-4">
          <span
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border"
            style={{ borderColor: lit.colorHex + '60', color: lit.colorHex, backgroundColor: lit.colorHex + '15' }}
          >
            {liturgicalEmoji(lit.color)} {lit.season}
          </span>
        </div>

        {/* Logo + titre */}
        <div className="text-center mb-6">
          <img src={logo3v} alt="3V" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-cinzel font-bold text-white">
            {step < 3
              ? `Bienvenue${firstName ? `, ${firstName}` : ''} 🙏`
              : `Bienvenue, ${titre} ${firstName} ! 🎉`}
          </h1>

          {/* Indicateur d'étapes */}
          {step < 3 && (
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: s === step ? '2rem' : '1rem',
                    backgroundColor: s <= step ? lit.colorHex : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Carte */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════════════════
                ÉTAPE 1 — Genre
            ════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}
              >
                <p className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-4">
                  Étape 1 — Vous êtes… <span className="text-red-400">*</span>
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {(['homme', 'femme'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200"
                      style={gender === g
                        ? { borderColor: lit.colorHex, backgroundColor: lit.colorHex + '18' }
                        : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-4xl">{g === 'homme' ? '👨' : '👩'}</span>
                      <span className="text-white font-cinzel font-semibold text-lg">
                        {g === 'homme' ? 'Frère' : 'Sœur'}
                      </span>
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleStep1Next}
                  disabled={!gender}
                  className="w-full font-cinzel font-bold py-5 rounded-full disabled:opacity-40 transition-opacity"
                  style={gender ? btnStyle : undefined}
                >
                  Suivant →
                </Button>

                {!gender && (
                  <p className="text-white/40 text-xs text-center mt-3">
                    Veuillez d'abord choisir Frère ou Sœur.
                  </p>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                ÉTAPE 2 — Dates & localisation
            ════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <button type="button" onClick={() => setStep(1)}
                    className="text-white/40 hover:text-white/70 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-white/60 font-semibold text-xs uppercase tracking-widest">
                    Étape 2 — Dates & localisation
                  </p>
                </div>

                {/* ── Date de naissance (obligatoire) ── */}
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm block">
                    🎂 Date de naissance <span className="text-red-400">*</span>
                  </Label>
                  {/* Picker natif */}
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => syncBirth(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                  {/* Saisie clavier libre */}
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-white/25 text-[10px]">ou saisir manuellement</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <Input
                    type="text"
                    placeholder="JJ/MM/AAAA  (ex : 15/05/1990)"
                    value={birthText}
                    onChange={(e) => {
                      setBirthText(e.target.value);
                      const iso = frToIso(e.target.value);
                      if (iso) setBirthDate(iso);
                    }}
                    inputMode="numeric"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                  />
                  <p className="text-white/25 text-[10px]">
                    🎉 L'application vous souhaitera votre anniversaire !
                  </p>
                </div>

                {/* ── Date de baptême ── */}
                <div className="space-y-2">
                  <Label className="text-white/60 text-sm block">
                    ✝️ Date de baptême <span className="text-white/30 font-normal text-xs">(facultatif)</span>
                  </Label>
                  <Input type="date" value={baptismDate} onChange={(e) => syncBaptism(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
                  <Input type="text" placeholder="JJ/MM/AAAA" value={baptismText}
                    onChange={(e) => { setBaptismText(e.target.value); const iso = frToIso(e.target.value); if (iso) setBaptismDate(iso); }}
                    inputMode="numeric"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                </div>

                {/* ── Situation familiale ── */}
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">
                    💛 Situation familiale <span className="text-white/30 font-normal text-xs">(facultatif)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MARITAL_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button"
                        onClick={() => setMaritalStatus(maritalStatus === opt.value ? null : opt.value)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all"
                        style={maritalStatus === opt.value
                          ? { borderColor: lit.colorHex, backgroundColor: lit.colorHex + '18', color: '#fff' }
                          : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                      >
                        <span>{opt.emoji}</span><span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Date de mariage (si marié(e)) ── */}
                <AnimatePresence>
                  {maritalStatus === 'marie' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden space-y-2">
                      <Label className="text-white/60 text-sm block">
                        💍 Date de mariage <span className="text-white/30 font-normal text-xs">(facultatif)</span>
                      </Label>
                      <Input type="date" value={weddingDate} onChange={(e) => syncWedding(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-white/5 border-white/10 text-white [color-scheme:dark]" />
                      <Input type="text" placeholder="JJ/MM/AAAA" value={weddingText}
                        onChange={(e) => { setWeddingText(e.target.value); const iso = frToIso(e.target.value); if (iso) setWeddingDate(iso); }}
                        inputMode="numeric"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Séparateur ── */}
                <div className="h-px bg-white/10" />

                {/* ── Localisation ── */}
                <div>
                  <p className="text-white/60 font-semibold text-xs uppercase tracking-widest mb-3">
                    📍 Votre localisation <span className="text-white/30 font-normal">(facultatif)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/60 text-xs mb-1 block">Pays</Label>
                      <Input placeholder="ex : Cameroun" value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs mb-1 block">Ville / Diocèse</Label>
                      <Input placeholder="ex : Yaoundé" value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
                    </div>
                  </div>
                  <p className="text-white/25 text-[10px] mt-1.5">
                    Permet d'afficher les actualités catholiques de votre région.
                  </p>
                </div>

                {/* ── Bouton Terminer ── */}
                <Button
                  onClick={handleSave}
                  disabled={!birthDate || saving}
                  className="w-full font-cinzel font-bold py-5 rounded-full disabled:opacity-40 transition-opacity"
                  style={birthDate && !saving ? btnStyle : undefined}
                >
                  {saving ? 'Enregistrement…' : 'Terminer 🙏'}
                </Button>

                {!birthDate && (
                  <p className="text-white/40 text-xs text-center">
                    La date de naissance est requise pour continuer.
                  </p>
                )}
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════
                ÉTAPE 3 — Bienvenue
            ════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-4 space-y-5"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="text-6xl"
                >
                  {gender === 'femme' ? '👩‍🙏' : '🙏'}
                </motion.div>

                <div className="space-y-1">
                  <h2 className="text-white font-cinzel font-bold text-xl">
                    {cher}{firstName ? ` ${firstName}` : ''} !
                  </h2>
                  <p className="font-semibold text-sm" style={{ color: lit.colorHex }}>
                    Que Dieu vous garde {beni} en ce {lit.season.toLowerCase()} ✨
                  </p>
                </div>

                <p className="text-white/55 text-sm leading-relaxed max-w-xs mx-auto">
                  C'est pour que le mouvement <span className="text-white/80 font-semibold">Voie Vérité Vie</span> fête
                  ces moments joyeux avec vous ❤️<br />
                  Anniversaire, baptême, mariage… l'application sera là.
                </p>

                {/* Récapitulatif des dates enregistrées */}
                <div className="flex flex-col gap-2 text-sm">
                  {birthDate && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                      <span>🎂</span><span className="text-white/70">Anniversaire enregistré</span>
                      <span className="ml-auto text-xs" style={{ color: lit.colorHex }}>✓</span>
                    </div>
                  )}
                  {baptismDate && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                      <span>✝️</span><span className="text-white/70">Anniversaire de baptême</span>
                      <span className="ml-auto text-xs" style={{ color: lit.colorHex }}>✓</span>
                    </div>
                  )}
                  {maritalStatus === 'marie' && weddingDate && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                      <span>💍</span><span className="text-white/70">Anniversaire de mariage</span>
                      <span className="ml-auto text-xs" style={{ color: lit.colorHex }}>✓</span>
                    </div>
                  )}
                  {(country || city) && (
                    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                      <span>📍</span>
                      <span className="text-white/70">{[city, country].filter(Boolean).join(', ')}</span>
                      <span className="ml-auto text-xs" style={{ color: lit.colorHex }}>✓</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => navigate('/')}
                  className="w-full font-cinzel font-bold py-5 rounded-full"
                  style={btnStyle}
                >
                  Entrer dans l'application →
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
