import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { AdminPageWrapper } from '@/components/admin/AdminPageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Trash2, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin_principal' | 'admin' | 'moderator';
}

const AdminManagementContent = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin_principal', 'admin', 'moderator'] as any);

      if (!adminRoles || adminRoles.length === 0) {
        setAdmins([]);
        return;
      }

      const userIds = adminRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const adminUsers = profiles?.map(profile => {
        const role = adminRoles.find(r => r.user_id === profile.id)?.role;
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: role as any,
        };
      }) || [];

      setAdmins(adminUsers);
    } catch (error) {
      console.error('Error loading admins:', error);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const updateAdminRole = async (userId: string, newRole: 'admin' | 'moderator') => {
    try {
      const adminToUpdate = admins.find(a => a.id === userId);
      if (adminToUpdate?.email === 'ahdybau@gmail.com') {
        toast.error(t('admin.cannotModifyCreator'));
        return;
      }
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
      toast.success(t('admin.roleUpdated'));
      loadAdmins();
    } catch (error) {
      toast.error(t('admin.updateError'));
      console.error(error);
    }
  };

  const deleteAdmin = async () => {
    if (!selectedAdminId) return;
    try {
      const adminToDelete = admins.find(a => a.id === selectedAdminId);
      if (adminToDelete?.email === 'ahdybau@gmail.com') {
        toast.error(t('admin.cannotRemoveCreator'));
        setDeleteDialogOpen(false);
        return;
      }
      await supabase.from('user_roles').delete().eq('user_id', selectedAdminId);
      toast.success(t('admin.adminDeleted'));
      setDeleteDialogOpen(false);
      loadAdmins();
    } catch (error) {
      toast.error(t('admin.deleteError2'));
      console.error(error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_principal': return `👑 ${t('admin.adminPrincipal')}`;
      case 'admin': return `🔐 Admin`;
      case 'moderator': return `📋 ${t('admin.moderatorLabel')}`;
      default: return t('common.user') ?? 'User';
    }
  };

  if (loading) return <AdminLoadingSpinner />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('admin.back')}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8" /> {t('admin.manageTitle')}
          </h1>
          <p className="text-muted-foreground">{t('admin.principalOnlyPage')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {admins.length} {t('admin.administrators').toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.nameCol')}</TableHead>
                  <TableHead>{t('admin.emailCol')}</TableHead>
                  <TableHead>{t('admin.roleCol')}</TableHead>
                  <TableHead>{t('admin.actionsCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isCurrentUser = user?.id === admin.id;
                  
                  return (
                    <TableRow key={admin.id} className={isCurrentUser ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {admin.full_name || t('admin.notSpecified')}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">{t('admin.you')}</span>}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            admin.role === 'admin_principal' ? 'default' :
                            admin.role === 'admin' ? 'secondary' :
                            'outline'
                          }
                        >
                          {getRoleLabel(admin.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {!isCurrentUser && admin.role !== 'admin_principal' && (
                          <>
                            <Select 
                              value={admin.role}
                              onValueChange={(newRole: any) => updateAdminRole(admin.id, newRole)}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">{t('admin.moderatorLabel')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (admin.email === 'ahdybau@gmail.com') {
                                  toast.error(t('admin.cannotRemoveCreator'));
                                  return;
                                }
                                setSelectedAdminId(admin.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.removeAdminRights')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.removeAdminConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={deleteAdmin} className="bg-destructive">
            {t('admin.remove')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const AdminManagement = () => (
  <AdminPageWrapper requiresPrincipal>
    <AdminManagementContent />
  </AdminPageWrapper>
);

export default AdminManagement;
