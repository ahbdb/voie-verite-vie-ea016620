import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ChevronRight, ChevronDown } from 'lucide-react';
import logo3v from '@/assets/logo-3v.png';

type Gender = 'homme' | 'femme';
type MaritalStatus = 'celibataire' | 'marie' | 'veuf' | 'consacre';

const MARITAL_OPTIONS: { value: MaritalStatus; label: string; emoji: string }[] = [
  { value: 'celibataire', label: 'Célibataire',   emoji: '🕊️' },
  { value: 'marie',       label: 'Marié(e)',       emoji: '💍' },
  { value: 'veuf',        label: 'Veuf / Veuve',   emoji: '🕯️' },
  { value: 'consacre',    label: 'Vie consacrée',  emoji: '✝️' },
];

export default function ProfileCompletion() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();

  const [gender, setGender]               = useState<Gender | null>(null);
  const [birthDate, setBirthDate]         = useState('');
  const [baptismDate, setBaptismDate]     = useState('');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(null);
  const [weddingDate, setWeddingDate]     = useState('');
  const [showOptional, setShowOptional]   = useState(false);
  const [saving, setSaving]               = useState(false);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  const handleSave = async () => {
    if (!gender) {
      toast.error('Veuillez indiquer si vous êtes un frère ou une sœur.');
      return;
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      const update: Record<string, string | null> = { gender };
      if (birthDate)     update.birth_date    = birthDate;
      if (baptismDate)   update.baptism_date  = baptismDate;
      if (maritalStatus) update.marital_status = maritalStatus;
      if (maritalStatus === 'marie' && weddingDate) update.wedding_date = weddingDate;

      const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
      if (error) throw error;

      await refetch();
      toast.success('Profil mis à jour 🙏');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(220,55%,8%)] to-[hsl(220,55%,12%)] px-4 py-12">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo3v} alt="3V" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-cinzel font-bold text-white mb-2">
            Bienvenue{firstName ? `, ${firstName}` : ''} 🙏
          </h1>
          <p className="text-white/60 text-sm max-w-sm mx-auto">
            Pour personnaliser votre expérience, nous avons besoin de quelques informations.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

          {/* Genre — OBLIGATOIRE */}
          <div className="mb-8">
            <p className="text-cathedral-gold font-semibold text-sm uppercase tracking-widest mb-4">
              Vous êtes… <span className="text-red-400 ml-1">*</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Informations facultatives — toggle */}
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-4 transition-colors"
          >
            {showOptional ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Informations facultatives (anniversaires, situation…)
          </button>

          <AnimatePresence>
            {showOptional && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-5 pb-2">
                  {/* Date de naissance */}
                  <div>
                    <Label className="text-white/70 text-sm mb-1 block">🎂 Date de naissance</Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    />
                  </div>

                  {/* Date de baptême */}
                  <div>
                    <Label className="text-white/70 text-sm mb-1 block">✝️ Date de baptême</Label>
                    <Input
                      type="date"
                      value={baptismDate}
                      onChange={(e) => setBaptismDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    />
                  </div>

                  {/* Situation familiale */}
                  <div>
                    <Label className="text-white/70 text-sm mb-2 block">💛 Situation familiale</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {MARITAL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMaritalStatus(maritalStatus === opt.value ? null : opt.value)}
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
                        <Label className="text-white/70 text-sm mb-1 block">💍 Date de mariage</Label>
                        <Input
                          type="date"
                          value={weddingDate}
                          onChange={(e) => setWeddingDate(e.target.value)}
                          className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton continuer */}
          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={!gender || saving}
              className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-6 rounded-full text-base disabled:opacity-40"
            >
              {saving ? 'Enregistrement…' : 'Continuer dans l\'application →'}
            </Button>
            {!gender && (
              <p className="text-white/40 text-xs text-center mt-3">
                Veuillez d'abord choisir Frère ou Sœur.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
