import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo3V from '@/assets/logo-3v.png';

const Auth = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo3V} alt="3V Logo" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-playfair">{t('auth.title')}</CardTitle>
          <CardDescription>{t('auth.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('auth.loginPrompt', 'Connectez-vous pour accéder à toutes les fonctionnalités de la communauté 3V.')}
          </p>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href =
                'https://replit.com/auth_with_repl_site?domain=' +
                window.location.host +
                '&redirect_url=' +
                encodeURIComponent('/');
            }}
          >
            {t('auth.signInBtn', 'Se connecter')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
