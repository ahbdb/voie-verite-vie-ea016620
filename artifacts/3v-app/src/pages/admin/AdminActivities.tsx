import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState, useRef } from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Plus, Pencil, Trash2, Users, Upload, X, Loader2, Clock, CheckCircle } from 'lucide-react';

type Activity = Tables<'activities'> & {
  allow_registration?: boolean;
};

interface Registration {
  id: string;
  activity_name: string;
  phone_country_code: string;
  phone_number: string;
  created_at: string;
  user_id: string;
}

const AdminActivities = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    price: 'Gratuit',
    is_published: true,
    allow_registration: true
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadActivities();
      loadRegistrations();
    }
  }, [isAdmin]);

  const loadActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: true });
    if (data) setActivities(data);
  };

  const loadRegistrations = async () => {
    const { data } = await supabase
      .from('activity_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRegistrations(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `activities/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Erreur lors de l'upload de ${file.name}`);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      newUrls.push(publicUrl.publicUrl);
    }

    setUploadedImages(prev => [...prev, ...newUrls]);
    setUploading(false);
    if (newUrls.length > 0) {
      toast.success(`${newUrls.length} image(s) uploadée(s)`);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.start_date) {
      toast.error('La date de début est obligatoire');
      return;
    }

    const imageUrl = uploadedImages.length > 0 ? uploadedImages[0] : null;
    
    // Format time display for legacy compatibility
    const timeDisplay = formData.end_time 
      ? `${formData.start_time} - ${formData.end_time}` 
      : formData.start_time;

    const activityData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      date: formData.start_date, // Legacy field
      time: timeDisplay, // Legacy field
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      location: formData.location,
      price: formData.price,
      is_published: formData.is_published,
      image_url: imageUrl,
      max_participants: 9999 // No limit
    };

    if (editingActivity) {
      const { error } = await supabase
        .from('activities')
        .update(activityData)
        .eq('id', editingActivity.id);
      if (error) {
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Activité modifiée');
      }
    } else {
      const { error } = await supabase
        .from('activities')
        .insert(activityData);
      if (error) {
        toast.error('Erreur lors de l\'ajout');
      } else {
        toast.success('Activité ajoutée');
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
    loadActivities();
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      title: activity.title,
      description: activity.description,
      category: activity.category,
      start_date: activity.start_date || activity.date,
      end_date: activity.end_date || '',
      start_time: activity.start_time || activity.time.split(' - ')[0] || '',
      end_time: activity.end_time || activity.time.split(' - ')[1] || '',
      location: activity.location,
      price: activity.price ?? 'Gratuit',
      is_published: activity.is_published ?? true,
      allow_registration: activity.allow_registration ?? true
    });
    setUploadedImages(activity.image_url ? [activity.image_url] : []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette activité ?')) {
      await supabase.from('activities').delete().eq('id', id);
      toast.success('Activité supprimée');
      loadActivities();
    }
  };

  const togglePublished = async (activity: Activity) => {
    await supabase
      .from('activities')
      .update({ is_published: !activity.is_published })
      .eq('id', activity.id);
    loadActivities();
  };

  const resetForm = () => {
    setEditingActivity(null);
    setUploadedImages([]);
    setFormData({
      title: '',
      description: '',
      category: 'general',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      location: '',
      price: 'Gratuit',
      is_published: true,
      allow_registration: true
    });
  };

  const getRegistrationCount = (activityTitle: string) => {
    return registrations.filter(r => r.activity_name === activityTitle).length;
  };

  const getActivityStatus = (activity: Activity) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityDate = new Date(activity.start_date || activity.date);
    activityDate.setHours(0, 0, 0, 0);
    
    // Check end date if exists
    if (activity.end_date) {
      const endDate = new Date(activity.end_date);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < today) return 'past';
      if (activityDate <= today && endDate >= today) return 'ongoing';
    } else {
      if (activityDate < today) return 'past';
    }
    
    if (activityDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'past':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground"><CheckCircle className="h-3 w-3 mr-1" /> Passée</Badge>;
      case 'today':
        return <Badge className="bg-green-500 text-white"><Clock className="h-3 w-3 mr-1" /> Aujourd'hui</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" /> En cours</Badge>;
      default:
        return <Badge variant="outline" className="border-primary text-primary"><Calendar className="h-3 w-3 mr-1" /> À venir</Badge>;
    }
  };

  const formatDateRange = (activity: Activity) => {
    const startDate = new Date(activity.start_date || activity.date).toLocaleDateString('fr-FR');
    if (activity.end_date) {
      const endDate = new Date(activity.end_date).toLocaleDateString('fr-FR');
      return `${startDate} - ${endDate}`;
    }
    return startDate;
  };

  // Group activities
  const pastActivities = activities.filter(a => getActivityStatus(a) === 'past');
  const upcomingActivities = activities.filter(a => getActivityStatus(a) !== 'past');

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6" /> Gestion des Activités
        </h1>

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">À venir ({upcomingActivities.length})</TabsTrigger>
            <TabsTrigger value="past">Passées ({pastActivities.length})</TabsTrigger>
            <TabsTrigger value="registrations">Inscriptions ({registrations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <div className="flex justify-end mb-4">
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle activité</Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingActivity ? 'Modifier' : 'Créer'} une activité</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Titre *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={4}
                        required
                      />
                    </div>
                    
                    {/* Upload d'images */}
                    <div>
                      <Label>Image de l'activité</Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={uploading}
                            className="w-full"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Upload en cours...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Sélectionner une image
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {uploadedImages.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {uploadedImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={url} 
                                  alt={`Preview ${index + 1}`} 
                                  className="h-24 w-full object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeUploadedImage(index)}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date de début *</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label>Date de fin (optionnel)</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                          min={formData.start_date}
                        />
                      </div>
                    </div>

                    {/* Heures */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Heure de début</Label>
                        <Input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Heure de fin (optionnel)</Label>
                        <Input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Lieu *</Label>
                        <Input
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label>Prix</Label>
                        <Input
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                          placeholder="Gratuit"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_published}
                          onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                        />
                        <Label>Publié</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.allow_registration}
                          onCheckedChange={(checked) => setFormData({...formData, allow_registration: checked})}
                        />
                        <Label>Permettre les inscriptions</Label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={uploading}>
                      {editingActivity ? 'Modifier' : 'Créer'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Inscrits</TableHead>
                      <TableHead>Publié</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell>{formatDateRange(activity)}</TableCell>
                        <TableCell>{getStatusBadge(getActivityStatus(activity))}</TableCell>
                        <TableCell>{activity.location}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {getRegistrationCount(activity.title)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch checked={activity.is_published} onCheckedChange={() => togglePublished(activity)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(activity)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(activity.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Lieu</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastActivities.map((activity) => (
                      <TableRow key={activity.id} className="opacity-70">
                        <TableCell className="font-medium">{activity.title}</TableCell>
                        <TableCell>{formatDateRange(activity)}</TableCell>
                        <TableCell>{activity.location}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {getRegistrationCount(activity.title)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(activity.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="registrations">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activité</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Date d'inscription</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.activity_name}</TableCell>
                        <TableCell>{reg.phone_country_code} {reg.phone_number}</TableCell>
                        <TableCell>{new Date(reg.created_at).toLocaleDateString('fr-FR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminActivities;
