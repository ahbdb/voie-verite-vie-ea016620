import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateShareImage } from '@/lib/share-utils';

const examples = [
  {
    id: 'short',
    label: 'Station courte',
    data: {
      title: 'Station V — Jésus porte sa croix',
      reading: 'Jn 19, 17',
      text: 'Voici le texte biblique court.',
      meditation: "Contemplez sa force.",
      prayer: "Seigneur, accompagne-nous.",
      adoration: 'Nous t\'adorons, ô Christ.',
      number: 5,
      type: 'station' as const,
    },
  },
  {
    id: 'long',
    label: 'Station longue',
    data: {
      title: 'Station XII — Jésus meurt sur la croix',
      reading: 'Jn 19, 28-30',
      text: 'Jésus, sachant que tout était maintenant achevé, et pour que l\'Écriture s\'accomplisse, dit : « J\'ai soif. » Il y avait là un vase plein de vinaigre. Ils mirent une éponge imbibée de vinaigre sur une branche d\'hysope et la portèrent à sa bouche. Quand Jésus eut pris le vinaigre, il dit : « Tout est consommé. » Et inclinant la tête, il remit l\'esprit.',
      meditation: "La rédemption est accomplie. Le sacrifice suprême pour notre salut.",
      prayer: "Merci pour ton sacrifice. Donne-nous la grâce de vivre la Résurrection.",
      adoration: 'Nous t\'adorons, ô Christ, et nous te bénissons.',
      number: 12,
      type: 'station' as const,
    },
  },
  {
    id: 'actions',
    label: 'Actions Carême',
    data: {
      title: 'Actions pour aujourd\'hui',
      subtitle: 'Jour 15/40 — Lundi, 17 février 2026',
      text: '🪞 Soi: Abandon du confort\n❤️ Prochain: Visite aux malades\n🙏 Dieu: Méditation prolongée',
      number: 15,
      type: 'day' as const,
    },
  },
];

interface ImageState {
  src: string | null;
  status: string;
}

export default function ShareDebug() {
  const [images, setImages] = useState<Record<string, ImageState>>({});

  useEffect(() => {
    (async () => {
      for (const ex of examples) {
        setImages(prev => ({ ...prev, [ex.id]: { src: null, status: 'En attente...' } }));
        const blob = await generateShareImage(ex.data);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImages(prev => ({ ...prev, [ex.id]: { src: url, status: 'Générée ✓' } }));
        } else {
          setImages(prev => ({ ...prev, [ex.id]: { src: null, status: 'Échec ✕' } }));
        }
      }
    })();

    return () => {
      Object.values(images).forEach(img => {
        if (img.src) URL.revokeObjectURL(img.src);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Galerie de partage — Qualité des images</h1>
        <p className="mb-8 text-sm text-gray-600 dark:text-slate-300">Trois cas de test : contenu court, long et actions. Les zones encadrées sont clonées pour générer les images.</p>

        <Tabs defaultValue="short" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="short">Station courte</TabsTrigger>
            <TabsTrigger value="long">Station longue</TabsTrigger>
            <TabsTrigger value="actions">Actions Carême</TabsTrigger>
          </TabsList>

          {examples.map(ex => (
            <TabsContent key={ex.id} value={ex.id} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aperçu du DOM source */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Aperçu interface</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div id="share-source" className="bg-white border rounded-lg p-6 shadow-sm max-w-2xl space-y-3 dark:bg-slate-900 dark:text-slate-100">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <img src="/logo-3v.png" alt="logo" className="h-12" />
                        <div className="text-2xl font-bold text-purple-700">
                          {String(ex.data.number).padStart(2, '0')}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-center text-3xl font-extrabold text-violet-800 mb-3">
                          {ex.data.title}
                        </h2>
                        {ex.data.reading && (
                          <p className="text-center text-sm text-violet-500 mb-4 font-semibold">
                            {ex.data.reading}
                          </p>
                        )}
                      </div>

                      {ex.data.text && (
                        <div className="bg-violet-50 border-l-4 border-violet-600 p-4 rounded dark:bg-violet-950">
                          <p className="italic text-lg text-violet-900 whitespace-pre-line dark:text-violet-100">
                            {ex.data.text}
                          </p>
                        </div>
                      )}

                      {ex.data.subtitle && (
                        <p className="text-center text-sm text-violet-600 italic dark:text-violet-200">
                          {ex.data.subtitle}
                        </p>
                      )}

                      {ex.data.meditation && (
                        <div>
                          <h3 className="font-semibold text-sm">💭 Méditation</h3>
                          <p className="text-sm text-gray-700 dark:text-slate-200">{ex.data.meditation}</p>
                        </div>
                      )}

                      {ex.data.prayer && (
                        <div>
                          <h3 className="font-semibold text-sm">🙏 Prière</h3>
                          <p className="text-sm italic text-gray-700 dark:text-slate-200">{ex.data.prayer}</p>
                        </div>
                      )}

                      {ex.data.adoration && (
                        <div className="border-t pt-3">
                          <p className="text-center text-xs text-violet-700 font-semibold dark:text-violet-200">
                            {ex.data.adoration}
                          </p>
                        </div>
                      )}

                      <div className="mt-6 pt-6 border-t flex items-center gap-3 justify-center">
                        <img src="/logo-3v.png" alt="logo" className="h-6" />
                        <span className="font-semibold text-violet-700 text-sm dark:text-violet-200">VOIE, VÉRITÉ, VIE</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Image générée */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Image générée</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center min-h-96">
                    <div className="mb-4 text-sm text-gray-600 font-semibold dark:text-slate-300">
                      {images[ex.id]?.status || 'Chargement...'}
                    </div>
                    {images[ex.id]?.src ? (
                      <div className="flex flex-col items-center gap-4">
                        <img 
                          src={images[ex.id].src ?? undefined} 
                          alt="share-preview" 
                          className="border rounded" 
                          style={{ width: 270, height: 480, objectFit: 'cover' }} 
                        />
                        <a 
                          className="inline-block bg-violet-600 text-white px-4 py-2 rounded text-sm hover:bg-violet-700"
                          href={images[ex.id].src ?? undefined}
                          download={`share-${ex.id}.png`}
                        >
                          Télécharger
                        </a>
                      </div>
                    ) : (
                      <div className="h-96 w-72 bg-gray-100 flex items-center justify-center rounded border dark:bg-slate-800">
                        {images[ex.id]?.status === 'Échec ✕' ? 'Erreur' : 'Génération...'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100">
                <CardContent className="pt-6 text-sm text-blue-900">
                  <p><strong>ℹ️ Note :</strong> La zone « Aperçu interface » (gauche) est le DOM source clonée pour générer l'image (droite). Ajustez les tailles de texte ou contenus dans le formulaire pour voir les changements.</p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
