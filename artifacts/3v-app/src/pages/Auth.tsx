import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logo3V from '@/assets/logo-3v.png';

const Auth = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.fillAllFields', 'Veuillez remplir tous les champs'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(t('auth.wrongCredentials', 'Email ou mot de passe incorrect'));
        } else if (error.message.includes('Email not confirmed')) {
          toast.error(t('auth.confirmEmail', 'Veuillez confirmer votre email'));
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success(t('auth.welcome', 'Bienvenue !'));
      navigate('/');
    } catch {
      toast.error(t('auth.networkError', 'Problème de connexion. Vérifiez votre connexion internet.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error(t('auth.fillAllFields', 'Veuillez remplir tous les champs'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch', 'Les mots de passe ne correspondent pas'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort', 'Le mot de passe doit contenir au moins 6 caractères'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error(t('auth.emailAlreadyUsed', 'Cet email est déjà utilisé'));
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success(t('auth.confirmEmail', 'Vérifiez votre email pour confirmer votre inscription'));
    } catch {
      toast.error(t('auth.networkError', 'Problème de connexion. Vérifiez votre connexion internet.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo3V} alt="3V Logo" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-playfair">{t('auth.title', '3V - Voie, Vérité, Vie')}</CardTitle>
          <CardDescription>{t('auth.subtitle', 'Connectez-vous pour accéder à votre parcours biblique')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex rounded-lg overflow-hidden border mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              onClick={() => setMode('signin')}
            >
              {t('auth.signIn', 'Connexion')}
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              onClick={() => setMode('signup')}
            >
              {t('auth.signUp', 'Inscription')}
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">{t('auth.password', 'Mot de passe')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.signingIn', 'Connexion...') : t('auth.signInBtn', 'Se connecter')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="fullName">{t('auth.fullName', 'Nom complet')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email-signup">{t('auth.email', 'Email')}</Label>
                <Input
                  id="email-signup"
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password-signup">{t('auth.password', 'Mot de passe')}</Label>
                <Input
                  id="password-signup"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword', 'Confirmer le mot de passe')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.signingUp', 'Inscription...') : t('auth.signUpBtn', "S'inscrire")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
