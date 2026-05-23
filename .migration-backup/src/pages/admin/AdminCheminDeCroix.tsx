import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Cross, Plus, Edit2, Trash2, Save, Eye, Download } from 'lucide-react';
import { cheminDeCroixData } from '@/data/chemin-de-croix-data';

interface Station {
  number: number;
  title: string;
  reading: string;
  text: string;
  meditation: string;
  prayer: string;
}

interface CheminProgram {
  id?: string;
  page_key: string;
  title: string | null;
  subtitle: string | null;
  content: any;
  updated_at?: string;
}

const AdminCheminDeCroix = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [programContent, setProgramContent] = useState<CheminProgram | null>(null);
  const [formData, setFormData] = useState({
    title: 'Chemin de Croix',
    subtitle: '14 stations de méditation',
    community: 'Communauté Voie, Vérité, Vie',
    verse: '"Je suis le Chemin, la Vérité et la Vie" - Jean 14,6',
    duration: '20 minutes',
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [previewingStation, setPreviewingStation] = useState<Station | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  const loadContent = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('page_key', 'chemin-de-croix')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading content:', error);
        return;
      }

      if (data) {
        setProgramContent(data as CheminProgram);
        setFormData({
          title: data.title || 'Chemin de Croix',
          subtitle: data.subtitle || '14 stations de méditation',
          community: '',
          verse: '',
          duration: ''
        });
        const content = (data.content as any) || {};
        if (content.community) setFormData(prev => ({ ...prev, community: content.community }));
        if (content.verse) setFormData(prev => ({ ...prev, verse: content.verse }));
        if (content.duration) setFormData(prev => ({ ...prev, duration: content.duration }));
        if (content.stations && Array.isArray(content.stations) && content.stations.length > 0) {
          setStations(content.stations as Station[]);
        } else {
          setStations(cheminDeCroixData.stations);
        }
      } else {
        setStations(cheminDeCroixData.stations);
      }
    } catch (err) {
      console.error('Failed to load content', err);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadContent();
  }, [isAdmin, loadContent]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStationChange = (field: string, value: string | number) => {
    if (!editingStation) return;
    setEditingStation({
      ...editingStation,
      [field]: value,
    });
  };

  const addOrUpdateStation = async () => {
    if (!editingStation || !editingStation.title) {
      toast.error('Veuillez remplir au moins le titre');
      return;
    }

    // Update local state first
    const updatedStations = stations.map(s => 
      s.number === editingStation.number ? editingStation : s
    );
    
    // If new station, add it
    if (!stations.some(s => s.number === editingStation.number)) {
      updatedStations.push(editingStation);
    }

    // Sort by number
    updatedStations.sort((a, b) => a.number - b.number);
    setStations(updatedStations);

    // Auto-save to database immediately
    console.log('💾 [Admin] Auto-saving station to database...');
    try {
      const contentData = {
        community: formData.community,
        verse: formData.verse,
        duration: formData.duration,
        stations: updatedStations,
        conclusion: cheminDeCroixData.conclusion,
      };

      const { error: updateError } = await supabase
        .from('page_content')
        .update({
          content: contentData as any,
          title: formData.community,
          updated_at: new Date().toISOString()
        })
        .eq('page_key', 'chemin-de-croix');

      if (!updateError) {
        console.log('✅ [Admin] Station auto-saved to database!');
      } else {
        console.warn('⚠️ [Admin] Auto-save failed:', updateError);
      }
    } catch (err) {
      console.error('❌ [Admin] Auto-save error:', err);
    }

    setEditingStation(null);
    setShowStationDialog(false);
    toast.success(editingStation.number ? 'Station mise à jour' : 'Station ajoutée');
  };

  const deleteStation = async (number: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette station ?')) {
      const updatedStations = stations.filter(s => s.number !== number);
      setStations(updatedStations);

      // Auto-save to database immediately
      console.log('💾 [Admin] Auto-saving deletion to database...');
      try {
        const contentData = {
          community: formData.community,
          verse: formData.verse,
          duration: formData.duration,
          stations: updatedStations,
          conclusion: cheminDeCroixData.conclusion,
        };

        const { error: updateError } = await supabase
          .from('page_content')
          .update({
            content: contentData as any,
            title: formData.community,
            updated_at: new Date().toISOString()
          })
          .eq('page_key', 'chemin-de-croix');

        if (!updateError) {
          console.log('✅ [Admin] Deletion auto-saved to database!');
        } else {
          console.warn('⚠️ [Admin] Auto-save failed:', updateError);
        }
      } catch (err) {
        console.error('❌ [Admin] Auto-save error:', err);
      }

      toast.success('Station supprimée');
    }
  };

  const openEditDialog = (station: Station) => {
    setEditingStation({ ...station });
    setShowStationDialog(true);
  };

  const openNewStationDialog = () => {
    const nextNumber = Math.max(...stations.map(s => s.number), 0) + 1;
    setEditingStation({
      number: nextNumber,
      title: '',
      reading: '',
      text: '',
      meditation: '',
      prayer: '',
    });
    setShowStationDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const contentData = {
        community: formData.community,
        verse: formData.verse,
        duration: formData.duration,
        stations: stations.sort((a, b) => a.number - b.number),
        conclusion: cheminDeCroixData.conclusion,
      };

      console.log('💾 [AdminCheminDeCroix] Saving - chemin-de-croix, stations count:', stations.length);
      console.log('📋 [AdminCheminDeCroix] First station being saved:', stations[0]);

      let saveSuccess = false;

      // Try: First attempt with UPDATE (direct save to table)
      console.log('📝 [AdminCheminDeCroix] Attempting direct table UPDATE...');
      const { error: updateError } = await supabase
        .from('page_content')
        .update({
          content: contentData as any,
          title: 'Chemin de Croix',
          subtitle: '14 stations de méditation',
          updated_at: new Date().toISOString()
        })
        .eq('page_key', 'chemin-de-croix');

      if (!updateError) {
        console.log('✅ [AdminCheminDeCroix] Direct UPDATE succeeded');
        saveSuccess = true;
      } else {
        console.warn('⚠️ [AdminCheminDeCroix] Direct UPDATE failed, trying RPC as fallback');
        
        // Fallback: Try RPC if direct update fails
        const { error: rpcError } = await supabase.rpc('update_page_content_data', {
          p_page_key: 'chemin-de-croix',
          p_content: contentData as any
        });

        if (!rpcError) {
          console.log('✅ [AdminCheminDeCroix] RPC succeeded');
          saveSuccess = true;
        } else {
          console.error('❌ [AdminCheminDeCroix] Both UPDATE and RPC failed:', rpcError);
          toast.error('Erreur lors de la sauvegarde. Vérifiez que la table page_content existe.');
        }
      }

      if (!saveSuccess) {
        setSaving(false);
        return;
      }
      
      toast.success('Chemin de Croix sauvegardé! ✓');
      
      // Wait a bit for DB to settle
      await new Promise(r => setTimeout(r, 1000));
      
      // Try to reload
      console.log('🔄 [AdminCheminDeCroix] Reloading content...');
      try {
        const { data: freshData, error: loadError } = await supabase
          .from('page_content')
          .select('*')
          .eq('page_key', 'chemin-de-croix')
          .single();
        
        if (loadError) {
          console.warn('⚠️ [AdminCheminDeCroix] Load error:', loadError);
        } else if (freshData) {
          const freshContent = (freshData.content as { stations?: Station[] } | null) ?? null;
          console.log('✅ [AdminCheminDeCroix] Fresh data loaded:', freshContent?.stations?.length ?? 0, 'stations');
          setProgramContent(freshData as CheminProgram);
          if (freshContent?.stations) {
            setStations(freshContent.stations);
            console.log('✅ [AdminCheminDeCroix] UI updated with fresh data from DB');
          }
        }
      } catch (reloadErr) {
        console.error('❌ [AdminCheminDeCroix] Reload failed:', reloadErr);
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
      console.error('Error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4 hover:bg-purple-100">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
          <Cross className="h-8 w-8 text-purple-700" /> Gestion du Chemin de Croix
        </h1>

        <div className="grid gap-6">
          {/* Section 1: Informations générales */}
          <Card className="border-purple-100 dark:border-purple-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:bg-gradient-to-r dark:from-purple-950 dark:to-purple-900/50">
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      placeholder="Chemin de Croix"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subtitle">Sous-titre</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => handleFormChange('subtitle', e.target.value)}
                      placeholder="Chemin de Croix"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="community">Communauté</Label>
                    <Input
                      id="community"
                      value={formData.community}
                      onChange={(e) => handleFormChange('community', e.target.value)}
                      placeholder="Communauté Voie, Vérité, Vie"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Durée</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => handleFormChange('duration', e.target.value)}
                      placeholder="20 minutes"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="verse">Verset</Label>
                  <Textarea
                    id="verse"
                    value={formData.verse}
                    onChange={(e) => handleFormChange('verse', e.target.value)}
                    placeholder='"Je suis le Chemin, la Vérité et la Vie" - Jean 14,6'
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="gap-2 bg-purple-700 hover:bg-purple-600"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Section 2: Gestion des stations */}
          <Card className="border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 flex flex-row items-center justify-between space-y-0 dark:bg-gradient-to-r dark:from-purple-950 dark:to-purple-900/50">
              <CardTitle>Stations ({stations.length})</CardTitle>
              <Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNewStationDialog} className="gap-2 bg-purple-700 hover:bg-purple-600">
                    <Plus className="h-4 w-4" /> Ajouter une station
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStation?.number ? `Modifier la station ${editingStation.number}` : 'Ajouter une nouvelle station'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="sr-only">Formulaire pour {editingStation?.number ? 'modifier' : 'créer'} une station du Chemin de Croix</div>

                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="number">Numéro</Label>
                        <Input
                          id="number"
                          type="number"
                          min="1"
                          max="14"
                          value={editingStation?.number || ''}
                          onChange={(e) => handleStationChange('number', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="title">Titre</Label>
                        <Input
                          id="title"
                          value={editingStation?.title || ''}
                          onChange={(e) => handleStationChange('title', e.target.value)}
                          placeholder="Jésus est condamné à mort"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reading">Référence biblique</Label>
                      <Input
                        id="reading"
                        value={editingStation?.reading || ''}
                        onChange={(e) => handleStationChange('reading', e.target.value)}
                        placeholder="Matthieu 27, 22"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="text">Texte biblique</Label>
                      <Textarea
                        id="text"
                        value={editingStation?.text || ''}
                        onChange={(e) => handleStationChange('text', e.target.value)}
                        placeholder='"Pilate leur dit..."'
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="meditation">Méditation</Label>
                      <Textarea
                        id="meditation"
                        value={editingStation?.meditation || ''}
                        onChange={(e) => handleStationChange('meditation', e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="prayer">Prière</Label>
                      <Textarea
                        id="prayer"
                        value={editingStation?.prayer || ''}
                        onChange={(e) => handleStationChange('prayer', e.target.value)}
                        placeholder="Seigneur, donne-nous..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <Button variant="outline" onClick={() => { setShowStationDialog(false); setEditingStation(null); }}>
                        Annuler
                      </Button>
                      <Button onClick={addOrUpdateStation} className="bg-purple-700 hover:bg-purple-600">
                        {editingStation?.number ? 'Mettre à jour' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="pt-6">
              {stations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Aucune station programmée.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stations.map((station, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-purple-700 text-lg w-8">
                            {String(station.number).padStart(2, '0')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{station.title}</div>
                            <div className="text-xs text-gray-600">{station.reading}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Dialog open={previewingStation?.number === station.number} onOpenChange={(open) => { if (!open) setPreviewingStation(null); }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPreviewingStation(station)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{previewingStation?.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded dark:bg-purple-950 dark:border-purple-700 dark:text-slate-100">
                              <p className="text-sm italic">{previewingStation?.text}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Méditation</h4>
                              <p className="text-sm">{previewingStation?.meditation}</p>
                            </div>
                            <div className="bg-purple-100 p-4 rounded">
                                <h4 className="font-semibold text-sm mb-2">Prière</h4>
                                <p className="text-sm italic">{previewingStation?.prayer}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(station)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteStation(station.number)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Statistiques */}
          <Card className="border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:border-purple-800 dark:bg-gradient-to-br dark:from-purple-950 dark:to-purple-900/50">
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-purple-200 dark:bg-slate-900 dark:border-purple-800 dark:text-slate-100">
                  <div className="text-2xl font-bold text-purple-700">{stations.length}</div>
                  <div className="text-sm text-gray-600">Stations disponibles</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">14</div>
                  <div className="text-sm text-gray-600">Stations requises</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminCheminDeCroix;
