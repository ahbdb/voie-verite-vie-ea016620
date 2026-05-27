import { useState } from 'react';
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

type Gender = 'homme' | 'femme';
type MaritalStatus = 'celibataire' | 'marie' | 'veuf' | 'consacre';

const MARITAL_OPTIONS: { value: MaritalStatus; label: string; emoji: string }[] = [
  { value: 'celibataire', label: 'Célibataire',  emoji: '🕊️' },
  { value: 'marie',       label: 'Marié(e)',      emoji: '💍' },
  { value: 'veuf',        label: 'Veuf / Veuve',  emoji: '🕯️' },
  { value: 'consacre',    label: 'Vie consacrée', emoji: '✝️' },
];

export default function ProfileCompletion() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();

  // ── Étapes : 1 = genre, 2 = dates, 3 = bienvenue ────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Champ étape 1
  const [gender, setGender]               = useState<Gender | null>(null);

  // Champs étape 2
  const [birthDate, setBirthDate]         = useState('');
  const [baptismDate, setBaptismDate]     = useState('');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);
  const [weddingDate, setWeddingDate]     = useState('');

  const [saving, setSaving]               = useState(false);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  /* ── Passage étape 1 → 2 ──────────────────────────────────────────── */
  const handleStep1Next = () => {
    if (!gender) {
      toast.error('Veuillez choisir Frère ou Sœur.');
      return;
    }
    setStep(2);
  };

  /* ── Sauvegarde finale ──────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!birthDate) {
      toast.error('La date de naissance est obligatoire.');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    try {
      // 1. Mise à jour du profil
      const update: Record<string, string | null> = {
        gender,
        birth_date: birthDate,
      };
      if (baptismDate)   update.baptism_date   = baptismDate;
      if (maritalStatus) update.marital_status = maritalStatus;
      if (maritalStatus === 'marie' && weddingDate) update.wedding_date = weddingDate;

      const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
      if (error) throw error;

      // 2. Mise à jour des métadonnées Supabase Auth — indispensable pour que
      //    le garde lise immédiatement profileComplete = true et ne redirige plus.
      await supabase.auth.updateUser({ data: { gender } });

      // 3. Rafraîchir le contexte auth
      await refetch();

      // 4. Afficher l'écran de bienvenue (étape 3)
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Entrée dans l'application ──────────────────────────────────────── */
  const handleEnter = () => {
    navigate('/');
  };

  /* ── Textes selon le genre ──────────────────────────────────────────── */
  const beniLabel  = gender === 'femme' ? 'bénie' : 'béni';
  const cherLabel  = gender === 'femme' ? 'Chère sœur' : 'Cher frère';
  const titleLabel = gender === 'femme' ? 'Sœur' : 'Frère';

  /* ══════════════════════════════════════════════════════════════════════
     RENDU
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(220,55%,8%)] to-[hsl(220,55%,12%)] px-4 py-12">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo + titre */}
        <div className="text-center mb-6">
          <img src={logo3v} alt="3V" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-cinzel font-bold text-white mb-1">
            {step < 3
              ? `Bienvenue${firstName ? `, ${firstName}` : ''} 🙏`
              : `Bienvenue, ${titleLabel} ${firstName} ! 🎉`}
          </h1>

          {/* Indicateur de progression (étapes 1 et 2 seulement) */}
          {step < 3 && (
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-8 bg-cathedral-gold'
                      : s < step
                      ? 'w-4 bg-cathedral-gold/60'
                      : 'w-4 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Carte principale */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <AnimatePresence mode="wait">

            {/* ══════════════════════════════════════════════════════════
                ÉTAPE 1 — Genre (obligatoire)
            ══════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-cathedral-gold font-semibold text-xs uppercase tracking-widest mb-4">
                  Étape 1 — Vous êtes… <span className="text-red-400">*</span>
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {(['homme', 'femme'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`
                        flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
                        ${gender === g
                          ? 'border-cathedral-gold bg-cathedral-gold/10 shadow-lg shadow-cathedral-gold/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                        }
                      `}
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
                  className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-5 rounded-full disabled:opacity-40"
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

            {/* ══════════════════════════════════════════════════════════
                ÉTAPE 2 — Dates importantes
            ══════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* En-tête étape */}
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-cathedral-gold font-semibold text-xs uppercase tracking-widest">
                    Étape 2 — Dates importantes
                  </p>
                </div>

                {/* Date de naissance — OBLIGATOIRE */}
                <div>
                  <Label className="text-white/80 text-sm mb-1 block">
                    🎂 Date de naissance <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                  <p className="text-white/30 text-xs mt-1">
                    Pour que l'application vous souhaite votre anniversaire 🎉
                  </p>
                </div>

                {/* Date de baptême — facultatif */}
                <div>
                  <Label className="text-white/60 text-sm mb-1 block">
                    ✝️ Date de baptême{' '}
                    <span className="text-white/30 font-normal">(facultatif)</span>
                  </Label>
                  <Input
                    type="date"
                    value={baptismDate}
                    onChange={(e) => setBaptismDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>

                {/* Situation familiale — facultatif */}
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">
                    💛 Situation familiale{' '}
                    <span className="text-white/30 font-normal">(facultatif)</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MARITAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setMaritalStatus(maritalStatus === opt.value ? null : opt.value)
                        }
                        className={`
                          flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all
                          ${maritalStatus === opt.value
                            ? 'border-cathedral-gold bg-cathedral-gold/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25'
                          }
                        `}
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date de mariage — visible uniquement si marié(e) */}
                <AnimatePresence>
                  {maritalStatus === 'marie' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <Label className="text-white/60 text-sm mb-1 block">
                        💍 Date de mariage{' '}
                        <span className="text-white/30 font-normal">(facultatif)</span>
                      </Label>
                      <Input
                        type="date"
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bouton terminer */}
                <Button
                  onClick={handleSave}
                  disabled={!birthDate || saving}
                  className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-5 rounded-full disabled:opacity-40 mt-2"
                >
                  {saving ? 'Enregistrement…' : 'Terminer 🙏'}
                </Button>

                {!birthDate && (
                  <p className="text-white/40 text-xs text-center">
                    La date de naissance est requise.
                  </p>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                ÉTAPE 3 — Écran de bienvenue / vœux
            ══════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-4 space-y-5"
              >
                {/* Grande icône animée */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="text-6xl"
                >
                  {gender === 'femme' ? '👩‍🙏' : '🙏'}
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-white font-cinzel font-bold text-xl">
                    {cherLabel}{firstName ? ` ${firstName}` : ''} !
                  </h2>
                  <p className="text-cathedral-gold font-semibold text-sm">
                    Que Dieu vous garde {beniLabel} ✨
                  </p>
                </div>

                <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                  Votre profil est maintenant complet. L'application vous
                  souhaitera votre anniversaire et votre fête de baptême 🎉
                </p>

                <div className="pt-2 space-y-3">
                  {/* Petits rappels des vœux à venir */}
                  <div className="flex flex-col gap-2 text-sm">
                    {birthDate && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                        <span className="text-lg">🎂</span>
                        <span className="text-white/70">Anniversaire enregistré</span>
                        <span className="ml-auto text-cathedral-gold text-xs">✓</span>
                      </div>
                    )}
                    {baptismDate && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                        <span className="text-lg">✝️</span>
                        <span className="text-white/70">Anniversaire de baptême enregistré</span>
                        <span className="ml-auto text-cathedral-gold text-xs">✓</span>
                      </div>
                    )}
                    {maritalStatus === 'marie' && weddingDate && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
                        <span className="text-lg">💍</span>
                        <span className="text-white/70">Anniversaire de mariage enregistré</span>
                        <span className="ml-auto text-cathedral-gold text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleEnter}
                    className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-5 rounded-full mt-2"
                  >
                    Entrer dans l'application →
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
