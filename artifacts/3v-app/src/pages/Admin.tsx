import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FixSuperadminRole from '@/components/admin/FixSuperadminRole';
import {
  Home, Info, Calendar, BookOpen, MessageSquare,
  Image, HelpCircle, Mail, Bot, Settings, Users, Shield, Flame, Cross, User, Palette, Bell, Clock, Video
} from 'lucide-react';

const adminSectionKeys = [
  { titleKey: 'admin.sections.home', descKey: 'admin.sections.homeDesc', icon: Home, path: '/admin/home' },
  { titleKey: 'admin.sections.about', descKey: 'admin.sections.aboutDesc', icon: Info, path: '/admin/about' },
  { titleKey: 'admin.sections.author', descKey: 'admin.sections.authorDesc', icon: User, path: '/admin/author' },
  { titleKey: 'admin.sections.design', descKey: 'admin.sections.designDesc', icon: Palette, path: '/admin/design' },
  { titleKey: 'admin.sections.lent', descKey: 'admin.sections.lentDesc', icon: Flame, path: '/admin/careme2026' },
  { titleKey: 'admin.sections.stationsOfCross', descKey: 'admin.sections.stationsOfCrossDesc', icon: Cross, path: '/admin/chemin-de-croix' },
  { titleKey: 'admin.sections.activities', descKey: 'admin.sections.activitiesDesc', icon: Calendar, path: '/admin/activities' },
  { titleKey: 'admin.sections.biblicalReading', descKey: 'admin.sections.biblicalReadingDesc', icon: BookOpen, path: '/admin/readings' },
  { titleKey: 'admin.sections.prayerForum', descKey: 'admin.sections.prayerForumDesc', icon: MessageSquare, path: '/admin/prayers' },
  { titleKey: 'admin.sections.gallery', descKey: 'admin.sections.galleryDesc', icon: Image, path: '/admin/gallery' },
  { titleKey: 'admin.sections.faq', descKey: 'admin.sections.faqDesc', icon: HelpCircle, path: '/admin/faq' },
  { titleKey: 'admin.sections.contact', descKey: 'admin.sections.contactDesc', icon: Mail, path: '/admin/contact' },
  { titleKey: 'admin.sections.notifications', descKey: 'admin.sections.notificationsDesc', icon: Bell, path: '/admin/notifications' },
  { titleKey: 'admin.sections.scheduler', descKey: 'admin.sections.schedulerDesc', icon: Clock, path: '/admin/notification-scheduler' },
  { titleKey: 'admin.sections.videoRooms', descKey: 'admin.sections.videoRoomsDesc', icon: Video, path: '/admin/video' },
  { titleKey: 'admin.sections.aiAssistant', descKey: 'admin.sections.aiAssistantDesc', icon: Bot, path: '/admin/ai' },
  { titleKey: 'admin.sections.users', descKey: 'admin.sections.usersDesc', icon: Users, path: '/admin/users' },
];

interface Stats {
  users: number;
  readings: number;
  prayers: number;
  messages: number;
}

const Admin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, adminRole, loading, checked } = useAdmin();
  const [stats, setStats] = useState<Stats>({ users: 0, readings: 0, prayers: 0, messages: 0 });

  const getSections = () => {
    const sections = [...adminSectionKeys];
    const isMainAdmin = adminRole === 'admin_principal';
    if (isMainAdmin) {
      sections.push({
        titleKey: 'admin.administrators',
        descKey: 'admin.manageAdmins',
        icon: Shield,
        path: '/admin/admins'
      });
    }
    return sections;
  };

  useEffect(() => {
    if (loading) return;
    if (!user || (checked && !isAdmin)) {
      navigate('/');
    }
  }, [user, isAdmin, loading, checked, navigate]);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const [usersRes, readingsRes, prayersRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('biblical_readings').select('*', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('*', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true })
      ]);
      setStats({
        users: usersRes.count || 0,
        readings: readingsRes.count || 0,
        prayers: prayersRes.count || 0,
        messages: messagesRes.count || 0
      });
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
            {adminRole === 'admin_principal' && <span className="text-2xl">👑</span>}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">{t('admin.welcome')}</p>
            {adminRole === 'admin_principal' && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                {t('admin.adminPrincipal')}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getSections().map((section) => (
            <Link key={section.path} to={section.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-border hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t(section.titleKey)}</CardTitle>
                      <CardDescription>{t(section.descKey)}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {adminRole !== 'admin_principal' && (
          <div className="mb-8">
            <FixSuperadminRole />
          </div>
        )}

        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('admin.quickStats')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.users}</p>
              <p className="text-sm text-muted-foreground">{t('admin.users')}</p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.readings}</p>
              <p className="text-sm text-muted-foreground">{t('admin.readings')}</p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.prayers}</p>
              <p className="text-sm text-muted-foreground">{t('admin.prayers')}</p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-2xl font-bold text-primary">{stats.messages}</p>
              <p className="text-sm text-muted-foreground">{t('admin.messages')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;