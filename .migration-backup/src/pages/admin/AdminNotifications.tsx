import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { AdminNotificationPanel } from '@/components/admin/AdminNotificationPanel';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/hooks/useAdmin';

export const AdminNotifications = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return <AdminLoadingSpinner />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gestion des notifications</h1>
            <p className="text-sm text-muted-foreground">
              Créez des notifications persistantes pour les utilisateurs de l’application.
            </p>
          </div>
        </div>

        <AdminNotificationPanel />
      </main>
    </div>
  );
};

export default AdminNotifications;
