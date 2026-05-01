import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  ArrowLeft,
  Users,
  Shield,
  Trash2,
  AlertCircle,
  Settings,
  Mail,
  CalendarDays,
  UserCircle,
} from 'lucide-react';
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
  { id: 'manage_readings',        labelKey: 'admin.usersPage.perms.manageReadings',    categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_prayers',         labelKey: 'admin.usersPage.perms.managePrayers',     categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_gallery',         labelKey: 'admin.usersPage.perms.manageGallery',     categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_activities',      labelKey: 'admin.usersPage.perms.manageActivities',  categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_faq',             labelKey: 'admin.usersPage.perms.manageFAQ',         categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_about',           labelKey: 'admin.usersPage.perms.manageAbout',       categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'moderate_content',       labelKey: 'admin.usersPage.perms.moderateContent',   categoryKey: 'admin.usersPage.permCategories.content' },
  { id: 'manage_users',           labelKey: 'admin.usersPage.perms.manageUsers',       categoryKey: 'admin.usersPage.permCategories.users' },
  { id: 'manage_contacts',        labelKey: 'admin.usersPage.perms.manageContacts',    categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'view_contacts',          labelKey: 'admin.usersPage.perms.viewContacts',      categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'create_notifications',   labelKey: 'admin.usersPage.perms.createNotifications', categoryKey: 'admin.usersPage.permCategories.communications' },
  { id: 'view_analytics',         labelKey: 'admin.usersPage.perms.viewAnalytics',     categoryKey: 'admin.usersPage.permCategories.analytics' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes, permissionsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        (supabase as any).from('user_permissions').select('*'),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (permissionsRes.data) setPermissions(permissionsRes.data as UserPermissionData[]);
    } finally {
      setLoading(false);
    }
  };

  const getUserPermissions = (userId: string): UserPermission[] =>
    permissions.filter((p) => p.user_id === userId).map((p) => p.permission);

  const getUserRole = (userId: string): UserRole['role'] =>
    roles.find((r) => r.user_id === userId)?.role || 'user';

  const getRoleLabel = (role: UserRole['role']) => {
    switch (role) {
      case 'admin_principal': return t('admin.usersPage.adminPrincipal');
      case 'admin':           return t('admin.usersPage.admin');
      case 'moderator':       return t('admin.usersPage.moderator');
      default:                return t('admin.usersPage.user');
    }
  };

  const getRoleBadgeVariant = (role: UserRole['role']) => {
    switch (role) {
      case 'admin_principal': return 'default';
      case 'admin':           return 'secondary';
      case 'moderator':       return 'outline';
      default:                return 'secondary';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const locale = i18n.language === 'it' ? 'it-IT' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateStr).toLocaleDateString(locale);
  };

  const updateUserRole = async (userId: string, newRole: UserRole['role']) => {
    try {
      const currentRole = getUserRole(userId);
      if (currentRole !== 'user') {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
        if (error) { toast.error(t('admin.genericError') + ': ' + error.message); return; }
      }
      if (newRole !== 'user') {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
        if (error) { toast.error(t('admin.genericError') + ': ' + error.message); return; }
      }
      toast.success(t('admin.usersPage.roleUpdated'));
      loadData();
    } catch {
      toast.error(t('admin.usersPage.roleUpdateError'));
    }
  };

  const openPermissionDialog = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedPermissions(new Set(getUserPermissions(userId)));
    setPermissionDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!selectedUserId) return;
    try {
      await (supabase as any).from('user_permissions').delete().eq('user_id', selectedUserId);
      if (selectedPermissions.size > 0) {
        const payload = Array.from(selectedPermissions).map((permission) => ({
          user_id: selectedUserId,
          permission,
          granted_by: user?.id,
        }));
        const { error } = await (supabase as any).from('user_permissions').insert(payload);
        if (error) { toast.error(t('admin.genericError') + ': ' + error.message); return; }
      }
      toast.success(t('admin.updated'));
      setPermissionDialogOpen(false);
      loadData();
    } catch {
      toast.error(t('admin.genericError'));
    }
  };

  const togglePermission = (permission: UserPermission) => {
    const next = new Set(selectedPermissions);
    next.has(permission) ? next.delete(permission) : next.add(permission);
    setSelectedPermissions(next);
  };

  const deleteUser = async () => {
    if (!selectedUserId) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', selectedUserId);
      await (supabase as any).from('user_permissions').delete().eq('user_id', selectedUserId);
      const { error } = await supabase.from('profiles').delete().eq('id', selectedUserId);
      if (error) { toast.error(t('admin.genericError') + ': ' + error.message); return; }
      toast.success(t('admin.deleted'));
      setDeleteDialogOpen(false);
      loadData();
    } catch {
      toast.error(t('admin.deleteError'));
    }
  };

  if (loading || authLoading) return <AdminLoadingSpinner />;
  if (!user || !isAdmin) return null;

  const isMainAdmin = adminRole === 'admin_principal';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 truncate">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              {t('admin.usersPage.title')}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3 shrink-0" />
              {isMainAdmin
                ? 'Admin Principal — permissions complètes'
                : `${adminRole === 'moderator' ? 'Modérateur' : 'Admin'}`}
            </p>
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {profiles.length} utilisateur{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Mobile card list ── (hidden on sm+) */}
        <div className="flex flex-col gap-3 sm:hidden">
          {profiles.map((profile) => {
            const role = getUserRole(profile.id);
            const isCurrentUser = user?.id === profile.id;
            return (
              <Card key={profile.id} className={isCurrentUser ? 'border-primary/40' : ''}>
                <CardContent className="p-4 space-y-3">
                  {/* Name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {profile.full_name || 'Non renseigné'}
                        {isCurrentUser && <span className="ml-1 text-xs text-primary">(Vous)</span>}
                      </span>
                    </div>
                    <Badge variant={getRoleBadgeVariant(role)} className="shrink-0 text-xs">
                      {getRoleLabel(role)}
                    </Badge>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(profile.created_at)}</span>
                  </div>

                  {/* Actions */}
                  {isMainAdmin && !isCurrentUser && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Select value={role} onValueChange={(v: any) => updateUserRole(profile.id, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">{t('admin.usersPage.user')}</SelectItem>
                          <SelectItem value="moderator">{t('admin.usersPage.moderator')}</SelectItem>
                          <SelectItem value="admin">{t('admin.usersPage.admin')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {role !== 'user' && (
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openPermissionDialog(profile.id)}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => { setSelectedUserId(profile.id); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {!isMainAdmin && (
                    <p className="text-xs text-muted-foreground pt-1">Lecture seule</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Desktop table ── (hidden on mobile) */}
        <Card className="hidden sm:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{profiles.length} utilisateur{profiles.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.usersPage.name')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.usersPage.email')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.usersPage.role')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">{t('admin.usersPage.memberSince')}</th>
                  {isMainAdmin && <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {profiles.map((profile) => {
                  const role = getUserRole(profile.id);
                  const isCurrentUser = user?.id === profile.id;
                  return (
                    <tr key={profile.id} className={isCurrentUser ? 'bg-muted/40' : 'hover:bg-muted/20'}>
                      <td className="px-4 py-3 font-medium max-w-[160px]">
                        <span className="truncate block">
                          {profile.full_name || 'Non renseigné'}
                          {isCurrentUser && <span className="ml-1.5 text-xs text-primary">(Vous)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                        <span className="truncate block">{profile.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(role)}>
                          {getRoleLabel(role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {formatDate(profile.created_at)}
                      </td>
                      {isMainAdmin && (
                        <td className="px-4 py-3">
                          {!isCurrentUser ? (
                            <div className="flex items-center gap-2">
                              <Select value={role} onValueChange={(v: any) => updateUserRole(profile.id, v)}>
                                <SelectTrigger className="h-8 w-[120px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">{t('admin.usersPage.user')}</SelectItem>
                                  <SelectItem value="moderator">{t('admin.usersPage.moderator')}</SelectItem>
                                  <SelectItem value="admin">{t('admin.usersPage.admin')}</SelectItem>
                                </SelectContent>
                              </Select>
                              {role !== 'user' && (
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openPermissionDialog(profile.id)}>
                                  <Settings className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                onClick={() => { setSelectedUserId(profile.id); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm mx-3 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.usersPage.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.usersPage.deleteUserDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('admin.usersPage.permissions')}</DialogTitle>
            <DialogDescription>
              Cochez les permissions à accorder à cet utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {Array.from(new Set(AVAILABLE_PERMISSIONS.map((p) => p.categoryKey))).map((categoryKey) => (
              <div key={categoryKey}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {t(categoryKey)}
                </p>
                <div className="space-y-2 pl-1">
                  {AVAILABLE_PERMISSIONS.filter((p) => p.categoryKey === categoryKey).map((permission) => (
                    <label
                      key={permission.id}
                      htmlFor={permission.id}
                      className="flex items-center gap-3 py-1 cursor-pointer"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <span className="text-sm">{t(permission.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={savePermissions}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
