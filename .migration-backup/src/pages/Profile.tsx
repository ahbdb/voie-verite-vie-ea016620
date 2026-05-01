import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, BookOpen, Heart, Activity, Mail, LogOut, Clock, Upload, ImageMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  birth_date: string | null;
  avatar_url: string | null;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Profile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState({ prayersCount: 0, favoritesCount: 0, readingDays: 0 });

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/');
      return;
    }
    void loadUserData();
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [{ data: profileData }, { count: prayersCount }, { count: readingDays }] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, created_at, birth_date, avatar_url').eq('id', user.id).single(),
        supabase.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_reading_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
      ]);

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setBirthDate(profileData.birth_date || '');
      }

      setStats({
        prayersCount: prayersCount || 0,
        favoritesCount: 0,
        readingDays: readingDays || 0,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const payload = {
        id: user.id,
        email: user.email || profile?.email || '',
        full_name: fullName.trim() || null,
        birth_date: birthDate || null,
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;

      toast.success('Profil mis à jour');
      await loadUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Échec de sauvegarde du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilise JPG, PNG ou WEBP');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Image trop lourde (max 5MB)');
      return;
    }

    try {
      setUploadingAvatar(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('Échec de l’upload de la photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      setUploadingAvatar(true);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
      toast.success('Photo supprimée');
    } catch (error) {
      console.error('Avatar removal failed:', error);
      toast.error('Échec de suppression de la photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatDate = (date: string) => {
    const locale = i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const statItems = [
    { icon: Activity, value: stats.prayersCount, label: t('profile.prayerRequests') },
    { icon: Heart, value: stats.favoritesCount, label: t('profile.savedPrayers') },
    { icon: BookOpen, value: stats.readingDays, label: t('profile.readingDays') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-cinzel font-bold text-foreground">{t('profile.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <Avatar className="w-20 h-20 border border-border">
                  <AvatarImage src={profile.avatar_url || undefined} alt="Avatar" />
                  <AvatarFallback>
                    <User className="w-8 h-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
                    <Upload className="w-4 h-4" />
                    {uploadingAvatar ? 'Upload en cours...' : 'Changer la photo'}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · Max 5MB</p>
                    {profile.avatar_url && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        disabled={uploadingAvatar}
                      >
                        <ImageMinus className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom complet</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('profile.notProvided')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de naissance</label>
                  <Input type="date" value={birthDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </p>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('profile.memberSince')} {formatDate(profile.created_at || '')}
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Sauvegarde...' : t('common.save')}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            {statItems.map((s, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center">
                  <s.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-cinzel font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
