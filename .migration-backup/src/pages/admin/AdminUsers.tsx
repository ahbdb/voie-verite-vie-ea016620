import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Users, Shield, Trash2, AlertCircle, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin_principal' | 'admin' | 'moderator' | 'user';
  created_at?: string;
}

type UserPermission = 
  | 'manage_readings'
  | 'manage_prayers'
  | 'manage_gallery'
  | 'manage_users'
  | 'manage_contacts'
  | 'view_contacts'
  | 'create_notifications'
  | 'moderate_content'
  | 'manage_activities'
  | 'manage_faq'
  | 'manage_about'
  | 'view_analytics';

interface UserPermissionData {
  user_id: string;
  permission: UserPermission;
  granted_at: string;
}

const AVAILABLE_PERMISSIONS: { id: UserPermission; labelKey: string; categoryKey: string }[] = [
  { id: 'manage_readings', labelKey: 'admin.usersPage.perms.manageReadings', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_prayers', labelKey: 'admin.usersPage.perms.managePrayers', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_gallery', labelKey: 'admin.usersPage.perms.manageGallery', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_activities', labelKey: 'admin.usersPage.perms.manageActivities', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_faq', labelKey: 'admin.usersPage.perms.manageFAQ', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_about', labelKey: 'admin.usersPage.perms.manageAbout', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'moderate_content', labelKey: 'admin.usersPage.perms.moderateContent', categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_users', labelKey: 'admin.usersPage.perms.manageUsers', categoryKey: 'admin.usersPage.permCategories.users' },
  { id: 'manage_contacts', labelKey: 'admin.usersPage.perms.manageContacts', categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'view_contacts', labelKey: 'admin.usersPage.perms.viewContacts', categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'create_notifications', labelKey: 'admin.usersPage.perms.createNotifications', categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'view_analytics', labelKey: 'admin.usersPage.perms.viewAnalytics', categoryKey: 'admin.usersPage.permCategories.analytics' },
];

const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin, adminRole, loading: authLoading } = useAdmin();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<UserPermissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<UserPermission>>(new Set());

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/');
      } else {
        loadData();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes, permissionsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        (supabase as any).from('user_permissions').select('*')
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data as UserPermissionData[]);
    } finally {
      setLoading(false);
    }
  };

  const getUserPermissions = (userId: string): UserPermission[] => {
    return permissions
      .filter(p => p.user_id === userId)
      .map(p => p.permission);
  };

  const getUserRole = (userId: string): UserRole['role'] => {
    const role = roles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getRoleLabel = (role: UserRole['role']) => {
    switch (role) {
      case 'admin_principal': return t('admin.usersPage.adminPrincipal');
      case 'admin': return t('admin.usersPage.admin');
      case 'moderator': return t('admin.usersPage.moderator');
      default: return t('admin.usersPage.user');
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole['role']) => {
    try {
      const currentRole = getUserRole(userId);
      
      if (currentRole !== 'user') {
        const deleteRes = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (deleteRes.error) {
          console.error('❌ Delete role error:', deleteRes.error);
          toast.error(t('admin.genericError') + ': ' + deleteRes.error.message);
          return;
        }
      }

      if (newRole !== 'user') {
        const insertRes = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
        if (insertRes.error) {
          console.error('❌ Insert role error:', insertRes.error);
          toast.error(t('admin.genericError') + ': ' + insertRes.error.message);
          return;
        }
      }

      console.log('✅ Rôle mis à jour');
      toast.success(t('admin.usersPage.roleUpdated'));
      loadData();
    } catch (error) {
      console.error('❌ Exception:', error);
      toast.error(t('admin.usersPage.roleUpdateError'));
    }
  };

  const openPermissionDialog = (userId: string) => {
    const userPermissions = getUserPermissions(userId);
    setSelectedUserId(userId);
    setSelectedPermissions(new Set(userPermissions));
    setPermissionDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!selectedUserId) return;
    try {
      // Delete existing permissions
      const deleteRes = await (supabase as any).from('user_permissions').delete().eq('user_id', selectedUserId);
      if (deleteRes.error) {
        console.error('❌ Delete permissions error:', deleteRes.error);
      }
      
      // Insert new permissions
      if (selectedPermissions.size > 0) {
        const newPermissions = Array.from(selectedPermissions).map(permission => ({
          user_id: selectedUserId,
          permission,
          granted_by: user?.id
        }));
        const insertRes = await (supabase as any).from('user_permissions').insert(newPermissions);
        if (insertRes.error) {
          console.error('❌ Insert permissions error:', insertRes.error);
          toast.error(t('admin.genericError') + ': ' + insertRes.error.message);
          return;
        }
      }

      toast.success(t('admin.updated'));
      setPermissionDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('❌ Exception:', error);
      toast.error(t('admin.genericError'));
    }
  };

  const togglePermission = (permission: UserPermission) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    try {
      console.log('🗑️ Deleting user:', selectedUserId);
      
      // Supprimer d'abord les rôles
      const deleteRolesRes = await supabase.from('user_roles').delete().eq('user_id', selectedUserId);
      if (deleteRolesRes.error) console.warn('⚠️ Delete roles error:', deleteRolesRes.error);
      else console.log('✅ Roles deleted');
      
      // Supprimer les permissions
      const deletePermsRes = await (supabase as any).from('user_permissions').delete().eq('user_id', selectedUserId);
      if (deletePermsRes.error) console.warn('⚠️ Delete permissions error:', deletePermsRes.error);
      else console.log('✅ Permissions deleted');
      
      // Puis supprimer le profil
      const deleteProfileRes = await supabase.from('profiles').delete().eq('id', selectedUserId);
      if (deleteProfileRes.error) {
        console.error('❌ Delete profile error:', deleteProfileRes.error);
        toast.error(t('admin.genericError') + ': ' + deleteProfileRes.error.message);
          return;
        }
      
      toast.success(t('admin.deleted'));
      setDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('❌ Exception:', error);
      toast.error(t('admin.deleteError'));
    }
  };

  if (loading || authLoading) return <AdminLoadingSpinner />;
  // Tous les admins peuvent accéder à cette page
  if (!user || !isAdmin) return null;
  
  const isMainAdmin = adminRole === 'admin_principal';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('admin.back')}
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users className="h-8 w-8" /> {t('admin.usersPage.title')}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Shield className="h-4 w-4" /> 
            {isMainAdmin ? 'Vous êtes Admin Principal' : `Vous êtes ${adminRole === 'moderator' ? 'Modérateur' : 'Admin'}`}
          </p>
          {isMainAdmin && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded ml-2">
              Permissions complètes
            </span>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {profiles.length} utilisateur(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.usersPage.name')}</TableHead>
                  <TableHead>{t('admin.usersPage.email')}</TableHead>
                  <TableHead>{t('admin.usersPage.role')}</TableHead>
                  <TableHead>{t('admin.usersPage.memberSince')}</TableHead>
                  <TableHead>{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => {
                  const role = getUserRole(profile.id);
                  const isCurrentUser = user?.id === profile.id;
                  
                  return (
                    <TableRow key={profile.id} className={isCurrentUser ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">
                        {profile.full_name || 'Non renseigné'}
                        {isCurrentUser && <span className="ml-2 text-xs text-primary">(Vous)</span>}
                      </TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            role === 'admin_principal' ? 'default' :
                            role === 'admin' ? 'secondary' :
                            role === 'moderator' ? 'outline' :
                            'secondary'
                          }
                          className={role === 'admin_principal' ? 'bg-gradient-peace' : ''}
                        >
                          {getRoleLabel(role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString(i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-US' : 'fr-FR') : '-'}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {isMainAdmin && !isCurrentUser && (
                          <>
                            <Select value={role} onValueChange={(newRole: any) => updateUserRole(profile.id, newRole)}>
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">{t('admin.usersPage.user')}</SelectItem>
                                <SelectItem value="moderator">{t('admin.usersPage.moderator')}</SelectItem>
                                <SelectItem value="admin">{t('admin.usersPage.admin')}</SelectItem>
                              </SelectContent>
                            </Select>
                            {role !== 'user' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openPermissionDialog(profile.id)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedUserId(profile.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!isMainAdmin && (
                          <span className="text-xs text-muted-foreground">Lecture seule</span>
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
            <AlertDialogTitle>{t('admin.usersPage.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.usersPage.deleteUserDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={deleteUser} className="bg-destructive">
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md md:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.usersPage.permissions')}</DialogTitle>
            <DialogDescription>
              {t('admin.usersPage.deleteUserConfirm')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.categoryKey))).map(categoryKey => (
              <div key={categoryKey}>
                <h3 className="font-semibold mb-3 text-sm">{t(categoryKey)}</h3>
                <div className="space-y-2 pl-4">
                  {AVAILABLE_PERMISSIONS.filter(p => p.categoryKey === categoryKey).map(permission => (
                    <div key={permission.id} className="flex items-center gap-2">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <label 
                        htmlFor={permission.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {t(permission.labelKey)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={savePermissions}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
