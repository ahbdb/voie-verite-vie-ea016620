import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import galleryRetreat from '@/assets/gallery-retreat.jpg';

interface GalleryImage {
  id: string; title: string; description: string | null; image_url: string; category: string; group_name: string | null;
}
interface GalleryGroup {
  name: string; title: string; description: string | null; coverImage: string; images: GalleryImage[];
}

const Gallery = () => {
  const { t } = useTranslation();
  const [selectedGroup, setSelectedGroup] = useState<GalleryGroup | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryGroups, setGalleryGroups] = useState<GalleryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadGallery(); }, []);

  const loadGallery = async () => {
    const { data } = await supabase.from('gallery_images').select('*').eq('is_published', true).order('sort_order', { ascending: true });
    if (data && data.length > 0) {
      const grouped = data.reduce((acc, img) => {
        const key = img.group_name || img.title;
        if (!acc[key]) acc[key] = { name: key, title: img.title, description: img.description, coverImage: img.image_url, images: [] };
        acc[key].images.push(img);
        return acc;
      }, {} as Record<string, GalleryGroup>);
      setGalleryGroups(Object.values(grouped));
    } else {
      setGalleryGroups([{ name: 'default', title: 'Retraite spirituelle', description: null, coverImage: galleryRetreat, images: [{ id: 'default-1', title: 'Retraite spirituelle', description: null, image_url: galleryRetreat, category: 'general', group_name: null }] }]);
    }
    setLoading(false);
  };

  const openGroup = (group: GalleryGroup) => { setSelectedGroup(group); setCurrentImageIndex(0); };
  const closeModal = () => { setSelectedGroup(null); setCurrentImageIndex(0); };
  const nextImage = () => { if (selectedGroup) setCurrentImageIndex(p => p < selectedGroup.images.length - 1 ? p + 1 : 0); };
  const prevImage = () => { if (selectedGroup) setCurrentImageIndex(p => p > 0 ? p - 1 : selectedGroup.images.length - 1); };

  if (loading) return (
    <div className="min-h-screen bg-background"><Navigation /><main className="pt-16 flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" /></main></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {/* Cathedral Hero */}
        <section className="relative h-[35vh] min-h-[260px] flex items-center justify-center overflow-hidden">
          <img src={galleryRetreat} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,55%,5%,0.7)] to-[hsl(220,55%,5%,0.85)]" />
          <motion.div className="relative z-10 text-center px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-3">{t('gallery.title')}</h1>
            <p className="text-white/60 text-base font-inter">{t('gallery.subtitle')}</p>
          </motion.div>
        </section>

        <section className="py-10">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryGroups.map((group, index) => (
                <motion.div
                  key={group.name}
                  className="group cursor-pointer rounded-2xl overflow-hidden border border-border shadow-subtle hover:shadow-cathedral transition-all duration-500"
                  onClick={() => openGroup(group)}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img src={group.coverImage} alt={group.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,55%,5%,0.8)] via-transparent to-transparent" />
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cathedral-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {group.images.length > 1 && (
                      <div className="absolute top-4 right-4 bg-[hsl(220,55%,5%,0.6)] backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        <Grid className="w-3 h-3" />{group.images.length}
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-playfair font-semibold text-white">{group.title}</h3>
                      {group.description && <p className="text-sm text-white/60 line-clamp-2 mt-1">{group.description}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {galleryGroups.length === 0 && (
              <div className="text-center py-16"><ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><h3 className="text-xl font-playfair font-semibold mb-2">{t('gallery.noImages')}</h3><p className="text-muted-foreground">{t('gallery.photosSoon')}</p></div>
            )}
          </div>
        </section>

        {/* Lightbox */}
        <AnimatePresence>
          {selectedGroup && (
            <motion.div
              className="fixed inset-0 bg-[hsl(220,55%,5%,0.95)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={closeModal}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="max-w-5xl max-h-[90vh] w-full bg-card rounded-2xl overflow-hidden shadow-cathedral flex flex-col"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="relative flex-shrink-0">
                  <Button variant="ghost" size="sm" className="absolute top-4 right-4 z-10 bg-[hsl(220,55%,5%,0.5)] text-white hover:bg-[hsl(220,55%,5%,0.7)]" onClick={closeModal}><X className="w-4 h-4" /></Button>
                  {selectedGroup.images.length > 1 && (
                    <>
                      <Button variant="ghost" size="sm" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-[hsl(220,55%,5%,0.5)] text-white" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft className="w-6 h-6" /></Button>
                      <Button variant="ghost" size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-[hsl(220,55%,5%,0.5)] text-white" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight className="w-6 h-6" /></Button>
                    </>
                  )}
                  <img src={selectedGroup.images[currentImageIndex].image_url} alt={selectedGroup.images[currentImageIndex].title} className="w-full max-h-[70vh] object-contain bg-[hsl(220,55%,5%)]" />
                  {selectedGroup.images.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[hsl(220,55%,5%,0.6)] backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">{currentImageIndex + 1} / {selectedGroup.images.length}</div>}
                </div>
                <div className="overflow-y-auto flex-1 p-6 border-t border-border">
                  <h3 className="text-2xl font-playfair font-bold text-foreground mb-2">{selectedGroup.images[currentImageIndex].title}</h3>
                  {selectedGroup.images[currentImageIndex].description && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedGroup.images[currentImageIndex].description}</p>}
                  {selectedGroup.images.length > 1 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {selectedGroup.images.map((img, idx) => (
                        <button key={img.id} onClick={() => setCurrentImageIndex(idx)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                          <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Gallery;
