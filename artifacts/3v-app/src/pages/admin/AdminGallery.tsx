import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Image, Plus, Pencil, Trash2, Upload, X, Loader2, Grid } from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  sort_order: number;
  is_published: boolean;
  group_name: string | null;
}

const AdminGallery = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    group_name: '',
    sort_order: 0,
    is_published: true
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) loadImages();
  }, [isAdmin]);

  const loadImages = async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setImages(data);
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
      const filePath = `gallery/${fileName}`;

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
    
    if (editingImage) {
      // Mode édition - une seule image
      const imageUrl = uploadedImages[0] || editingImage.image_url;
      const { error } = await supabase
        .from('gallery_images')
        .update({ 
          title: formData.title,
          description: formData.description || null,
          image_url: imageUrl,
          category: 'general',
          group_name: formData.group_name || null,
          sort_order: formData.sort_order,
          is_published: formData.is_published
        })
        .eq('id', editingImage.id);
      if (error) {
        console.error('❌ Update gallery error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Image modifiée');
        toast.success('Image modifiée');
      }
    } else {
      // Mode ajout - plusieurs images possibles
      if (uploadedImages.length === 0) {
        toast.error('Veuillez uploader au moins une image');
        return;
      }

      // Use group_name for grouping multiple images
      const groupName = formData.group_name || (uploadedImages.length > 1 ? formData.title : null);

      const imagesToInsert = uploadedImages.map((url, index) => ({
        title: uploadedImages.length === 1 ? formData.title : `${formData.title}`,
        description: formData.description || null,
        image_url: url,
        category: 'general',
        group_name: groupName,
        sort_order: formData.sort_order + index,
        is_published: formData.is_published
      }));

      const { error } = await supabase
        .from('gallery_images')
        .insert(imagesToInsert);
      
      if (error) {
        console.error('❌ Insert gallery error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Images ajoutées');
        toast.success(`${imagesToInsert.length} image(s) ajoutée(s)`);
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
    loadImages();
  };

  const handleEdit = (image: GalleryImage) => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      description: image.description || '',
      group_name: image.group_name || '',
      sort_order: image.sort_order,
      is_published: image.is_published
    });
    setUploadedImages([image.image_url]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette image ?')) {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) {
        console.error('❌ Delete gallery error:', error);
        toast.error('Erreur: ' + error.message);
      } else {
        console.log('✅ Image supprimée');
        toast.success('Image supprimée');
        loadImages();
      }
    }
  };

  const togglePublished = async (image: GalleryImage) => {
    await supabase
      .from('gallery_images')
      .update({ is_published: !image.is_published })
      .eq('id', image.id);
    loadImages();
  };

  // Open the "Ajouter" dialog pre-filled for a specific album (group_name)
  const handleAddToAlbum = (groupName: string, title?: string) => {
    setEditingImage(null);
    setFormData({
      title: title || '',
      description: '',
      group_name: groupName,
      sort_order: 0,
      is_published: true
    });
    setUploadedImages([]);
    setIsDialogOpen(true);
  };

  // Delete all images that belong to the given album (group_name)
  const handleDeleteAlbum = async (groupName: string) => {
    if (!groupName) return;
    if (!confirm(`Supprimer l'album "${groupName}" et toutes ses images ?`)) return;

    const { error } = await supabase.from('gallery_images').delete().eq('group_name', groupName);
    if (error) {
      console.error('❌ Delete album error:', error);
      toast.error('Erreur: ' + error.message);
    } else {
      console.log('✅ Album supprimé:', groupName);
      toast.success('Album supprimé');
      loadImages();
    }
  };

  // Rename an album (update group_name for all images in that group)
  const handleRenameAlbum = async (oldName: string) => {
    const newName = prompt("Nouveau nom d'album", oldName);
    if (!newName || newName === oldName) return;

    const { error } = await supabase.from('gallery_images').update({ group_name: newName }).eq('group_name', oldName);
    if (error) {
      console.error('❌ Rename album error:', error);
      toast.error('Erreur: ' + error.message);
    } else {
      console.log(`✅ Album renommé: ${oldName} -> ${newName}`);
      toast.success('Album renommé');
      loadImages();
    }
  };

  const resetForm = () => {
    setEditingImage(null);
    setUploadedImages([]);
    setFormData({ title: '', description: '', group_name: '', sort_order: 0, is_published: true });
  };

  // Group images by group_name for display
  const groupedImages = images.reduce((acc, img) => {
    const key = img.group_name || img.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(img);
    return acc;
  }, {} as Record<string, GalleryImage[]>);

  if (loading) return <AdminLoadingSpinner />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6" /> Gestion de la Galerie
          </h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingImage ? 'Modifier' : 'Ajouter'} {editingImage ? 'une image' : 'des images'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Titre *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="Titre de l'album ou de l'image"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder="Description optionnelle"
                  />
                </div>
                <div>
                  <Label>Nom du groupe (pour regrouper plusieurs images)</Label>
                  <Input
                    value={formData.group_name}
                    onChange={(e) => setFormData({...formData, group_name: e.target.value})}
                    placeholder="Ex: Retraite 2025, Conférence Janvier..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Les images avec le même nom de groupe seront affichées ensemble dans l'application.
                  </p>
                </div>
                <div>
                  <Label>Images {!editingImage && '(plusieurs fichiers possibles)'}</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        multiple={!editingImage}
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
                            {editingImage ? 'Changer l\'image' : 'Sélectionner des images'}
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {uploadedImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={url} 
                              alt={`Preview ${index + 1}`} 
                              className="h-20 w-full object-cover rounded border"
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
                <div>
                  <Label>Ordre d'affichage</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                  />
                  <Label>Publié</Label>
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {editingImage ? 'Modifier' : `Ajouter ${uploadedImages.length > 0 ? `(${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''})` : ''}`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Display grouped images */}
        <div className="space-y-6">
          {Object.entries(groupedImages).map(([groupKey, groupImages]) => (
            <div key={groupKey} className="bg-card rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{groupImages[0].title}</h3>
                  {groupImages.length > 1 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Grid className="h-3 w-3" />
                      {groupImages.length} images
                    </Badge>
                  )}
                  {groupImages[0].group_name && (
                    <Badge variant="outline">{groupImages[0].group_name}</Badge>
                  )}
                </div>

                {groupImages[0].group_name && (
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleAddToAlbum(groupImages[0].group_name, groupImages[0].title)} title="Ajouter des images à cet album">
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => handleRenameAlbum(groupImages[0].group_name)} title="Renommer l'album">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDeleteAlbum(groupImages[0].group_name)} title="Supprimer l'album">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {groupImages.map((image) => (
                  <div key={image.id} className={`relative group ${!image.is_published ? 'opacity-50' : ''}`}>
                    <div className="aspect-square rounded overflow-hidden">
                      <img src={image.image_url} alt={image.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleEdit(image)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDelete(image.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="absolute top-1 right-1">
                      <Switch 
                        checked={image.is_published} 
                        onCheckedChange={() => togglePublished(image)} 
                        className="scale-75"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {images.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Aucune image dans la galerie</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminGallery;
