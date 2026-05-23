import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo3V from '@/assets/logo-3v.png';

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleLogin = () => {
    window.location.href = `/api/auth/login?return_to=${encodeURIComponent(window.location.origin + '/')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logo3V} alt="3V Logo" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-playfair">3V — Voie, Vérité, Vie</CardTitle>
          <CardDescription>Connectez-vous pour accéder à votre parcours biblique</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="w-full" size="lg" onClick={handleLogin}>
            Se connecter
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Association catholique Voie, Vérité, Vie — Cameroun
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
