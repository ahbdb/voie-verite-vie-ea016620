import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, BookOpen, Eye, Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Neuvaine {
  id: string;
  title: string;
  saint_name: string;
  description: string | null;
  introduction: string | null;
  common_prayers: any;
  days: any[];
  conclusion: any;
  pdf_url: string | null;
  image_url: string | null;
  is_published: boolean;
  total_days: number;
  created_at: string;
}

interface DayForm {
  day: number;
  title: string;
  subtitle: string;
  scripture: string;
  meditation: string;
  intercessions: { title: string; text: string }[];
}

const emptyDay = (n: number): DayForm => ({
  day: n,
  title: '',
  subtitle: '',
  scripture: '',
  meditation: '',
  intercessions: [
    { title: '', text: '' },
    { title: '', text: '' },
    { title: '', text: '' },
    { title: '', text: '' },
  ],
});

const AdminNeuvaines = () => {
  const navigate = useNavigate();
  const [neuvaines, setNeuvaines] = useState<Neuvaine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [saintName, setSaintName] = useState('');
  const [description, setDescription] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [totalDays, setTotalDays] = useState(9);
  const [days, setDays] = useState<DayForm[]>([]);
  const [pdfUrl, setPdfUrl] = useState('');

  const fetchNeuvaines = async () => {
    const { data, error } = await supabase
      .from('neuvaines')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNeuvaines(data.map(n => ({
        ...n,
        days: Array.isArray(n.days) ? n.days as any[] : [],
        common_prayers: n.common_prayers || {},
        conclusion: n.conclusion || {},
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchNeuvaines(); }, []);

  const resetForm = () => {
    setTitle(''); setSaintName(''); setDescription(''); setIntroduction('');
    setIsPublished(true); setTotalDays(9); setDays([]); setPdfUrl('');
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDays(Array.from({ length: 9 }, (_, i) => emptyDay(i + 1)));
    setEditOpen(true);
  };

  const openEdit = (n: Neuvaine) => {
    setEditingId(n.id);
    setTitle(n.title);
    setSaintName(n.saint_name);
    setDescription(n.description || '');
    setIntroduction(n.introduction || '');
    setIsPublished(n.is_published);
    setTotalDays(n.total_days);
    setPdfUrl(n.pdf_url || '');
    setDays(n.days.length > 0 ? n.days : Array.from({ length: n.total_days }, (_, i) => emptyDay(i + 1)));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !saintName.trim()) {
      toast.error('Le titre et le nom du saint sont requis.');
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      saint_name: saintName.trim(),
      description: description.trim() || null,
      introduction: introduction.trim() || null,
      is_published: isPublished,
      total_days: totalDays,
      days: days as any,
      pdf_url: pdfUrl.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('neuvaines').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('neuvaines').insert(payload));
    }

    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(editingId ? 'Neuvaine mise à jour !' : 'Neuvaine créée !');
      setEditOpen(false);
      resetForm();
      fetchNeuvaines();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette neuvaine ?')) return;
    const { error } = await supabase.from('neuvaines').delete().eq('id', id);
    if (error) toast.error('Erreur: ' + error.message);
    else { toast.success('Neuvaine supprimée'); fetchNeuvaines(); }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from('neuvaines').update({ is_published: !current }).eq('id', id);
    if (!error) fetchNeuvaines();
  };

  const updateDay = (index: number, field: keyof DayForm, value: any) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const updateIntercession = (dayIdx: number, intIdx: number, field: 'title' | 'text', value: string) => {
    setDays(prev => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const ints = [...d.intercessions];
      ints[intIdx] = { ...ints[intIdx], [field]: value };
      return { ...d, intercessions: ints };
    }));
  };

  const handleDaysCountChange = (count: number) => {
    setTotalDays(count);
    if (count > days.length) {
      setDays([...days, ...Array.from({ length: count - days.length }, (_, i) => emptyDay(days.length + i + 1))]);
    } else {
      setDays(days.slice(0, count));
    }
  };

  return (
    <AdminPageWrapper title="Gestion des Neuvaines">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground text-sm">{neuvaines.length} neuvaine(s)</p>
        <Button onClick={openCreate} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4" /> Nouvelle neuvaine
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {neuvaines.map(n => (
            <Card key={n.id} className="border-amber-200/50">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{n.title}</h3>
                    <Badge variant={n.is_published ? 'default' : 'secondary'} className="text-xs">
                      {n.is_published ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.saint_name} · {n.total_days} jours · {n.days.length} jours remplis</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/neuvaines/${n.id}`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(n)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => togglePublish(n.id, n.is_published)}>
                    {n.is_published ? '👁️' : '👁️‍🗨️'}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier la neuvaine' : 'Nouvelle neuvaine'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="days">Jours ({totalDays})</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Titre *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Neuvaine à Saint Joseph" />
                </div>
                <div>
                  <Label>Nom du Saint *</Label>
                  <Input value={saintName} onChange={e => setSaintName(e.target.value)} placeholder="Saint Joseph" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>Introduction</Label>
                <Textarea value={introduction} onChange={e => setIntroduction(e.target.value)} rows={6} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de jours</Label>
                  <Input type="number" min={1} max={30} value={totalDays} onChange={e => handleDaysCountChange(Number(e.target.value))} />
                </div>
                <div>
                  <Label>URL du PDF</Label>
                  <Input value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} placeholder="/neuvaines/fichier.pdf" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <Label>Publier</Label>
              </div>
            </TabsContent>

            <TabsContent value="days" className="mt-4">
              <Tabs defaultValue="day-0" className="w-full">
                <TabsList className="flex flex-wrap gap-1 h-auto">
                  {days.map((_, i) => (
                    <TabsTrigger key={i} value={`day-${i}`} className="text-xs">
                      Jour {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {days.map((d, i) => (
                  <TabsContent key={i} value={`day-${i}`} className="space-y-3 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Titre du jour</Label>
                        <Input value={d.title} onChange={e => updateDay(i, 'title', e.target.value)} />
                      </div>
                      <div>
                        <Label>Sous-titre</Label>
                        <Input value={d.subtitle} onChange={e => updateDay(i, 'subtitle', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label>Parole de Dieu (référence)</Label>
                      <Input value={d.scripture} onChange={e => updateDay(i, 'scripture', e.target.value)} />
                    </div>
                    <div>
                      <Label>Méditation</Label>
                      <Textarea value={d.meditation} onChange={e => updateDay(i, 'meditation', e.target.value)} rows={6} />
                    </div>
                    <div>
                      <Label className="font-bold">Intercessions</Label>
                      {d.intercessions.map((int, j) => (
                        <div key={j} className="grid grid-cols-1 gap-2 mt-2 p-3 bg-muted/30 rounded-lg">
                          <Input
                            value={int.title}
                            onChange={e => updateIntercession(i, j, 'title', e.target.value)}
                            placeholder={`Titre intercession ${j + 1}`}
                            className="text-sm"
                          />
                          <Textarea
                            value={int.text}
                            onChange={e => updateIntercession(i, j, 'text', e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-bold font-['Playfair_Display']">{title || 'Titre'}</h2>
                <p className="text-muted-foreground">{description || 'Description...'}</p>
                <div className="flex flex-wrap gap-2">
                  {days.filter(d => d.title).map((d, i) => (
                    <Badge key={i} variant="outline">Jour {d.day}: {d.title}</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? 'Sauvegarde...' : editingId ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageWrapper>
  );
};

export default AdminNeuvaines;
