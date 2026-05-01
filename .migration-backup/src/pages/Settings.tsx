import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from '@/components/ui/button';
import { useSettings, type Theme, type TextSize } from '@/hooks/useSettings';
import { Sun, Moon, Monitor, Type, Bell, Globe, Lock, Download, Trash2, AlertTriangle, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const Settings = memo(() => {
  const { t } = useTranslation();
  const { settings, setTheme, setTextSize, setSelectedVoice, availableVoices } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <Sun className="w-5 h-5" /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon className="w-5 h-5" /> },
    { value: 'system', label: t('settings.system'), icon: <Monitor className="w-5 h-5" /> },
  ];

  const textSizeOptions: { value: TextSize; label: string; scale: string }[] = [
    { value: 'small', label: t('settings.small'), scale: '-10%' },
    { value: 'normal', label: t('settings.normal'), scale: t('settings.default') },
    { value: 'large', label: t('settings.large'), scale: '+15%' },
    { value: 'extra-large', label: t('settings.extraLarge'), scale: '+30%' },
  ];

  const clearCache = () => {
    if ('caches' in window) { caches.keys().then((names) => { names.forEach(name => { caches.delete(name); }); }); }
    localStorage.clear();
    alert(t('settings.clearCache'));
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: t('common.error'), variant: "destructive" }); return; }
      const userId = session.user.id;
      await supabase.from('profiles').delete().eq('id', userId).select();
      await supabase.from('user_roles').delete().eq('user_id', userId).select();
      try { await supabase.rpc('hard_delete_auth_user', { target_user_id: userId }); } catch {}
      try { await supabase.auth.signOut(); } catch {}
      localStorage.clear(); sessionStorage.clear();
      toast({ title: "✅ " + t('settings.deleteAccount') });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast({ title: t('common.error'), variant: "destructive" });
    } finally { setDeletingAccount(false); setDeleteDialogOpen(false); }
  };

  const testVoice = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Bonjour, ceci est un test de voix.');
    const voices = window.speechSynthesis.getVoices();
    if (settings.selectedVoice) {
      const voice = voices.find(v => v.voiceURI === settings.selectedVoice);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const Section = ({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) => (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="pb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-cathedral-gold" />
        <h2 className="text-base font-cinzel font-bold text-foreground">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground/60 font-inter mb-4">{desc}</p>
      {children}
      <div className="cathedral-line w-full mt-6" />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-cinzel font-bold text-foreground">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground font-inter">{t('settings.subtitle')}</p>
          </motion.div>

          <div className="space-y-2">
            {/* Theme */}
            <Section icon={Sun} title={t('settings.theme')} desc={t('settings.themeDesc')}>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map(option => (
                  <button key={option.value} onClick={() => setTheme(option.value)}
                    className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      settings.theme === option.value
                        ? 'border-cathedral-gold bg-cathedral-gold/5'
                        : 'border-border/40 hover:border-border'
                    }`}>
                    <span className={settings.theme === option.value ? 'text-cathedral-gold' : 'text-muted-foreground'}>{option.icon}</span>
                    <span className="text-xs font-inter">{option.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Text Size */}
            <Section icon={Type} title={t('settings.textSize')} desc={t('settings.textSizeDesc')}>
              <div className="space-y-2">
                {textSizeOptions.map(option => (
                  <button key={option.value} onClick={() => setTextSize(option.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center ${
                      settings.textSize === option.value
                        ? 'border-cathedral-gold bg-cathedral-gold/5'
                        : 'border-border/40 hover:border-border'
                    }`}>
                    <span className="text-sm font-inter">{option.label}</span>
                    <span className="text-xs text-muted-foreground/60">{option.scale}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Voice Selection */}
            <Section icon={Volume2} title={t('settings.voiceTitle', 'Voix de lecture')} desc={t('settings.voiceDesc', 'Choisissez la voix pour la lecture biblique')}>
              <div className="space-y-3">
                <Select
                  value={settings.selectedVoice || 'default'}
                  onValueChange={(val) => setSelectedVoice(val === 'default' ? null : val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('settings.selectVoice', 'Sélectionner une voix')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('settings.defaultVoice', 'Voix par défaut')}</SelectItem>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={testVoice} className="gap-2">
                  <Volume2 className="w-4 h-4" />
                  {t('settings.testVoice', 'Tester la voix')}
                </Button>
              </div>
            </Section>

            {/* Language */}
            <Section icon={Globe} title={t('settings.contentLanguage')} desc={t('settings.contentLanguageDesc')}>
              <LanguageSelector variant="full" />
            </Section>

            {/* Notifications */}
            <Section icon={Bell} title={t('settings.notifications')} desc={t('settings.notificationsDesc')}>
              <div className="space-y-3">
                {[t('settings.readingReminders'), t('settings.lentNotifications'), t('settings.activityNotifications'), t('settings.newsUpdates')].map((label, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer text-sm font-inter text-muted-foreground">
                    <input type="checkbox" className="w-4 h-4 accent-cathedral-gold" defaultChecked={i < 2} />{label}
                  </label>
                ))}
              </div>
            </Section>

            {/* App */}
            <Section icon={Download} title={t('settings.application')} desc={t('settings.appDesc')}>
              <Button variant="outline" size="sm" className="gap-2 border-cathedral-gold/30">
                <Download className="w-4 h-4" />{t('settings.installApp')}
              </Button>
            </Section>

            {/* Data & Privacy */}
            <Section icon={Lock} title={t('settings.dataPrivacy')} desc={t('settings.dataPrivacyDesc')}>
              <Button onClick={clearCache} variant="outline" size="sm" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />{t('settings.clearCache')}
              </Button>
            </Section>

            {/* Danger Zone */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h2 className="text-base font-cinzel font-bold text-destructive">{t('settings.dangerZone')}</h2>
              </div>
              <p className="text-xs text-destructive/60 font-inter mb-4">{t('settings.dangerZoneDesc')}</p>
              <p className="text-xs text-destructive/80 mb-3 font-inter">⚠️ {t('settings.deleteWarning')}</p>
              <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />{t('settings.deleteAccount')}
              </Button>
            </motion.div>

            {/* About */}
            <div className="pt-8 text-center">
              <p className="text-sm font-cinzel text-foreground">{t('brand.fullName')}</p>
              <p className="text-xs text-muted-foreground/40 font-inter">v1.0.0</p>
            </div>
          </div>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />{t('settings.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={deletingAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deletingAccount ? t('settings.deleting') : t('settings.deleteAccount')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default Settings;
