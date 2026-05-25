import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sun, ExternalLink, Info, RefreshCw } from 'lucide-react';

const AELF_BASE = 'https://api.aelf.org/v1';

const ZONES = [
  { value: 'afrique',  label: 'Afrique' },
  { value: 'france',   label: 'France' },
  { value: 'belgique', label: 'Belgique' },
  { value: 'canada',   label: 'Canada' },
  { value: 'suisse',   label: 'Suisse' },
];

const TIME_SLOTS = [
  { id: 'morning',   label: 'Matin',      prayers: ['Offrande du matin', 'Prière à l\'Ange gardien', 'Angélus'] },
  { id: 'noon',      label: 'Midi',       prayers: ['Angélus', 'Veni Creator (courte)'] },
  { id: 'afternoon', label: 'Après-midi', prayers: ['Psaume 23', 'Mémoraré'] },
  { id: 'evening',   label: 'Soir',       prayers: ['Examen de conscience', 'Confiteor', 'Salve Regina'] },
];

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

interface AelfReading {
  titre?: string;
  texte?: string;
  ref?: string;
}

const AdminPriereQuotidienne = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [zone, setZone] = useState('afrique');
  const [gospel, setGospel] = useState<AelfReading | null>(null);
  const [aelfLoading, setAelfLoading] = useState(false);
  const [aelfError, setAelfError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  const fetchGospel = async () => {
    setAelfLoading(true);
    setAelfError(null);
    setGospel(null);
    try {
      const res = await fetch(`${AELF_BASE}/messes/${getTodayStr()}/${zone}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const lectures: AelfReading[] = data?.messes?.[0]?.lectures ?? [];
      const g = lectures.find((l: AelfReading) =>
        l.titre?.toLowerCase().includes('évangile') || l.titre?.toLowerCase().includes('evangile')
      ) ?? lectures[lectures.length - 1];
      setGospel(g ?? null);
    } catch (e: unknown) {
      setAelfError(e instanceof Error ? e.message : 'Erreur inconnue');
    }
    setAelfLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchGospel();
  }, [isAdmin, zone]);

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
          <Sun className="h-6 w-6 text-primary" /> Gestion — Prière Quotidienne
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Aperçu de l'Évangile du jour via l'API AELF et des créneaux de prière disponibles.
        </p>

        {/* Zone selector + refresh */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-foreground">Zone liturgique :</span>
          {ZONES.map((z) => (
            <button
              key={z.value}
              onClick={() => setZone(z.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                zone === z.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {z.label}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={fetchGospel} disabled={aelfLoading} className="ml-auto gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${aelfLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Gospel preview */}
        <Card className="border border-border mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Évangile du jour — {getTodayStr()}</CardTitle>
              <Badge variant="outline" className="text-xs">{ZONES.find((z) => z.value === zone)?.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {aelfLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Chargement depuis api.aelf.org…
              </div>
            )}
            {aelfError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                Erreur AELF : {aelfError}
              </div>
            )}
            {gospel && !aelfLoading && (
              <div className="space-y-2">
                {gospel.titre && <p className="font-semibold text-sm text-foreground">{gospel.titre}</p>}
                {gospel.ref && <p className="text-xs text-primary font-medium">{gospel.ref}</p>}
                {gospel.texte && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                    {stripHtml(gospel.texte)}
                  </p>
                )}
              </div>
            )}
            {!gospel && !aelfLoading && !aelfError && (
              <p className="text-sm text-muted-foreground">Aucun évangile trouvé pour aujourd'hui.</p>
            )}
          </CardContent>
        </Card>

        {/* Info banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 mb-6 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Source liturgique</p>
            <p>
              L'évangile et les lectures du jour sont fournis en temps réel par <strong>api.aelf.org</strong>.
              La détection de zone se fait automatiquement selon le fuseau horaire de l'utilisateur.
              Les textes de prière fixes sont intégrés dans{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">src/pages/PriereQuotidienne.tsx</code>.
            </p>
          </div>
        </div>

        {/* Prayer slots overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {TIME_SLOTS.map((slot) => (
            <Card key={slot.id} className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{slot.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {slot.prayers.map((p) => (
                    <li key={p} className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Link to="/priere-quotidienne">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Voir la page Prière Quotidienne
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminPriereQuotidienne;
