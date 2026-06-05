import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Orbit, ExternalLink, Info } from 'lucide-react';

const MYSTERIES = [
  { id: 'joyeux',    label: 'Mystères Joyeux',    day: 'Lundi & Samedi',    count: 5 },
  { id: 'lumineux',  label: 'Mystères Lumineux',   day: 'Jeudi',             count: 5 },
  { id: 'douloureux',label: 'Mystères Douloureux', day: 'Mardi & Vendredi',  count: 5 },
  { id: 'glorieux',  label: 'Mystères Glorieux',   day: 'Mercredi & Dimanche', count: 5 },
];

const AdminChapelet = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Orbit className="h-6 w-6 text-primary" /> Gestion du Chapelet
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Vue d'ensemble des mystères du Rosaire disponibles dans l'application.
        </p>

        {/* Info banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 mb-6 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Contenu statique</p>
            <p>
              Les textes du chapelet (prières, mystères, fruits spirituels, passages scripturaires)
              sont intégrés directement dans le code source de l'application. Pour modifier un texte,
              éditer le fichier <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">src/pages/Chapelet.tsx</code>.
            </p>
          </div>
        </div>

        {/* Mysteries overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {MYSTERIES.map((m) => (
            <Card key={m.id} className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{m.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Jour :</span> {m.day}</p>
                <p><span className="font-medium text-foreground">Dizaines :</span> {m.count} mystères × 10 Ave Maria</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Prayers checklist */}
        <Card className="border border-border mb-6">
          <CardHeader>
            <CardTitle className="text-base">Prières incluses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              {[
                'Credo des Apôtres',
                'Notre Père (réforme CEF 2017)',
                'Je vous salue Marie',
                'Gloire au Père',
                'Prière de Fatima (Ô mon Jésus)',
                'Salve Regina',
                'Fruit spirituel + passage scripturaire pour chaque mystère',
              ].map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> {p}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Link to live page */}
        <div className="flex justify-end">
          <Link to="/chapelet">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Voir la page Chapelet
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminChapelet;
