import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import logo3V from '@/assets/logo-3v.png';

type Gender = 'homme' | 'femme';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]               = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep]   = useState<1 | 2>(1);

  // Login fields
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');

  // Signup fields
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [gender, setGender]           = useState<Gender | null>(null);

  const [isLoading, setIsLoading]     = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  /* ── Connexion ──────────────────────────────────────────────────────── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Erreur de connexion');
    } else {
      toast.success('Connecté avec succès !');
      navigate('/');
    }
    setIsLoading(false);
  };

  /* ── Inscription étape 1 → étape 2 ─────────────────────────────────── */
  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      toast.error('Prénom, email et mot de passe sont obligatoires');
      return;
    }
    if (signupPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSignupStep(2);
  };

  /* ── Inscription finale ─────────────────────────────────────────────── */
  const handleSignUp = async () => {
    if (!gender) {
      toast.error('Veuillez indiquer si vous êtes un frère ou une sœur');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, firstName.trim(), lastName.trim(), gender);
    if (error) {
      toast.error(error.message || "Erreur lors de l'inscription");
    } else {
      toast.success('Inscription réussie ! Bienvenue 🙏');
      navigate('/');
    }
    setIsLoading(false);
  };

  const resetSignup = () => {
    setSignupStep(1);
    setFirstName('');
    setLastName('');
    setSignupEmail('');
    setSignupPassword('');
    setGender(null);
  };

  /* ── Chargement ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     MODE : CONNEXION
  ══════════════════════════════════════════════════════════════════════ */
  if (mode === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo3V} alt="3V Logo" className="w-20 h-20 object-contain" />
            </div>
            <CardTitle className="text-2xl font-playfair">3V — Voie, Vérité, Vie</CardTitle>
            <CardDescription>Connectez-vous à votre parcours biblique</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">ou</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setMode('signup'); resetSignup(); setEmail(''); setPassword(''); }}
              disabled={isLoading}
            >
              Créer un compte
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Association catholique Voie, Vérité, Vie — Cameroun
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     MODE : INSCRIPTION (2 étapes)
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(220,55%,8%)] to-[hsl(220,55%,12%)] px-4 py-10">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* En-tête */}
        <div className="text-center mb-6">
          <img src={logo3V} alt="3V" className="w-14 h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-cinzel font-bold text-white">Créer un compte</h1>

          {/* Indicateur d'étapes */}
          <div className="flex justify-center gap-2 mt-3">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === signupStep
                    ? 'w-8 bg-cathedral-gold'
                    : s < signupStep
                    ? 'w-4 bg-cathedral-gold/60'
                    : 'w-4 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <AnimatePresence mode="wait">

            {/* ── Étape 1 : Identité ───────────────────────────────────── */}
            {signupStep === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignupStep1}
                className="space-y-4"
              >
                <p className="text-cathedral-gold font-semibold text-xs uppercase tracking-widest mb-3">
                  Étape 1 — Identité
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">
                      Prénom <span className="text-red-400">*</span>
                    </label>
                    <Input
                      placeholder="Jean"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1 block">Nom</label>
                    <Input
                      placeholder="Dupont"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isLoading}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-white/60 text-xs mb-1 block">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="jean@exemple.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs mb-1 block">
                    Mot de passe <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="6 caractères minimum"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-5 rounded-full"
                >
                  Suivant →
                </Button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); resetSignup(); }}
                  className="w-full text-white/40 hover:text-white/70 text-sm text-center mt-1 transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </motion.form>
            )}

            {/* ── Étape 2 : Genre ─────────────────────────────────────── */}
            {signupStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-cathedral-gold font-semibold text-xs uppercase tracking-widest">
                    Étape 2 — Vous êtes… <span className="text-red-400">*</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(['homme', 'femme'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
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
                  onClick={handleSignUp}
                  disabled={!gender || isLoading}
                  className="w-full bg-cathedral-gold hover:bg-cathedral-gold/90 text-secondary font-cinzel font-bold py-5 rounded-full disabled:opacity-40"
                >
                  {isLoading ? 'Inscription…' : "S'inscrire 🙏"}
                </Button>

                {!gender && (
                  <p className="text-white/40 text-xs text-center">
                    Veuillez d'abord choisir Frère ou Sœur.
                  </p>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
