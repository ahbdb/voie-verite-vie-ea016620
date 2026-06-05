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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Shield, Trash2, AlertCircle, UserPlus, Settings,
  Mail, UserCircle,
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

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin_principal' | 'admin' | 'moderator';
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

type UserPermission =
  | 'manage_readings' | 'manage_prayers' | 'manage_gallery' | 'manage_users'
  | 'manage_contacts' | 'view_contacts' | 'create_notifications' | 'moderate_content'
  | 'manage_activities' | 'manage_faq' | 'manage_about' | 'view_analytics';

const AVAILABLE_PERMISSIONS: { id: UserPermission; label: string; category: string }[] = [
  { id: 'manage_readings',      label: 'Gérer les lectures',       category: 'Contenu' },
  { id: 'manage_prayers',       label: 'Gérer les prières',        category: 'Contenu' },
  { id: 'manage_gallery',       label: 'Gérer la galerie',         category: 'Contenu' },
  { id: 'manage_activities',    label: 'Gérer les activités',      category: 'Contenu' },
  { id: 'manage_faq',           label: 'Gérer la FAQ',             category: 'Contenu' },
  { id: 'manage_about',         label: 'Gérer À propos',           category: 'Contenu' },
  { id: 'moderate_content',     label: 'Modérer le contenu',       category: 'Contenu' },
  { id: 'manage_users',         label: 'Gérer les utilisateurs',   category: 'Utilisateurs' },
  { id: 'manage_contacts',      label: 'Gérer les contacts',       category: 'Communications' },
  { id: 'view_contacts',        label: 'Voir les contacts',        category: 'Communications' },
  { id: 'create_notifications', label: 'Créer des notifications',  category: 'Communications' },
  { id: 'view_analytics',       label: 'Voir les statistiques',    category: 'Analytique' },
];

const PRINCIPAL_EMAIL = 'ahdybau@gmail.com';

const AdminManagementContent = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Add admin dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Permissions dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [selectedPerms, setSelectedPerms] = useState<Set<UserPermission>>(new Set());

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

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      setAllProfiles(profiles || []);

      if (!adminRoles || adminRoles.length === 0) { setAdmins([]); return; }

      const adminIds = adminRoles.map((r: any) => r.user_id);
      const adminUsers: AdminUser[] = (profiles || [])
        .filter(p => adminIds.includes(p.id))
        .map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          role: (adminRoles.find((r: any) => r.user_id === p.id) as any)?.role,
        }));

      setAdmins(adminUsers);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async (userId: string) => {
    const { data } = await (supabase as any).from('user_permissions').select('permission').eq('user_id', userId);
    const perms: UserPermission[] = (data || []).map((d: any) => d.permission);
    setPermissions(perms);
    setSelectedPerms(new Set(perms));
  };

  const openPermDialog = async (adminId: string) => {
    setPermUserId(adminId);
    await loadPermissions(adminId);
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!permUserId) return;
    setSaving(true);
    try {
      await (supabase as any).from('user_permissions').delete().eq('user_id', permUserId);
      if (selectedPerms.size > 0) {
        const payload = Array.from(selectedPerms).map(p => ({ user_id: permUserId, permission: p, granted_by: user?.id }));
        const { error } = await (supabase as any).from('user_permissions').insert(payload);
        if (error) throw error;
      }
      toast.success('Responsabilités mises à jour');
      setPermDialogOpen(false);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const updateAdminRole = async (userId: string, newRole: 'admin' | 'moderator') => {
    try {
      const adminToUpdate = admins.find(a => a.id === userId);
      if (adminToUpdate?.email === PRINCIPAL_EMAIL) { toast.error(t('admin.cannotModifyCreator')); return; }
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
      toast.success(t('admin.roleUpdated'));
      loadAdmins();
    } catch { toast.error(t('admin.updateError')); }
  };

  const deleteAdmin = async () => {
    if (!selectedAdminId) return;
    try {
      const adminToDelete = admins.find(a => a.id === selectedAdminId);
      if (adminToDelete?.email === PRINCIPAL_EMAIL) { toast.error(t('admin.cannotRemoveCreator')); setDeleteDialogOpen(false); return; }
      await supabase.from('user_roles').delete().eq('user_id', selectedAdminId);
      toast.success(t('admin.adminDeleted'));
      setDeleteDialogOpen(false);
      loadAdmins();
    } catch { toast.error(t('admin.deleteError2')); }
  };

  const designateAdmin = async () => {
    if (!selectedUserId) { toast.error('Sélectionnez un utilisateur'); return; }
    setSaving(true);
    try {
      await supabase.from('user_roles').delete().eq('user_id', selectedUserId);
      await supabase.from('user_roles').insert({ user_id: selectedUserId, role: newAdminRole as any });
      toast.success('Admin désigné avec succès');
      setAddDialogOpen(false);
      setSelectedUserId(null);
      setSearchQuery('');
      loadAdmins();
    } catch { toast.error('Erreur lors de la désignation'); } finally { setSaving(false); }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_principal': return `👑 ${t('admin.adminPrincipal')}`;
      case 'admin': return `🔐 Admin`;
      case 'moderator': return `📋 ${t('admin.moderatorLabel')}`;
      default: return 'Utilisateur';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'admin_principal') return 'default';
    if (role === 'admin') return 'secondary';
    return 'outline';
  };

  // Non-admin profiles for the "add admin" dialog
  const adminIds = new Set(admins.map(a => a.id));
  const nonAdminProfiles = allProfiles
    .filter(p => !adminIds.has(p.id))
    .filter(p =>
      !searchQuery ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

  if (loading) return <AdminLoadingSpinner />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-20 sm:pt-24">

        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4 px-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('admin.back')}
        </Button>

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" /> {t('admin.manageTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('admin.principalOnlyPage')}</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Désigner un admin</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{admins.length} administrateur{admins.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Mobile card list ── */}
        <div className="flex flex-col gap-3 sm:hidden">
          {admins.map((admin) => {
            const isCurrentUser = user?.id === admin.id;
            return (
              <Card key={admin.id} className={isCurrentUser ? 'border-primary/40' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {admin.full_name || t('admin.notSpecified')}
                        {isCurrentUser && <span className="ml-1 text-xs text-primary">(Vous)</span>}
                      </span>
                    </div>
                    <Badge variant={getRoleBadgeVariant(admin.role) as any} className="shrink-0 text-xs">
                      {getRoleLabel(admin.role)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{admin.email}</span>
                  </div>

                  {!isCurrentUser && admin.role !== 'admin_principal' && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Select value={admin.role} onValueChange={(v: any) => updateAdminRole(admin.id, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">{t('admin.moderatorLabel')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openPermDialog(admin.id)} title="Responsabilités">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                        onClick={() => { setSelectedAdminId(admin.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Desktop table ── */}
        <Card className="hidden sm:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{admins.length} administrateur{admins.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.nameCol')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.emailCol')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.roleCol')}</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">{t('admin.actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {admins.map((admin) => {
                  const isCurrentUser = user?.id === admin.id;
                  return (
                    <tr key={admin.id} className={isCurrentUser ? 'bg-muted/50' : 'hover:bg-muted/20'}>
                      <td className="px-4 py-3 font-medium max-w-[160px]">
                        <span className="truncate block">
                          {admin.full_name || t('admin.notSpecified')}
                          {isCurrentUser && <span className="ml-1.5 text-xs text-primary">{t('admin.you')}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                        <span className="truncate block">{admin.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(admin.role) as any}>
                          {getRoleLabel(admin.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!isCurrentUser && admin.role !== 'admin_principal' ? (
                          <div className="flex items-center gap-2">
                            <Select value={admin.role} onValueChange={(v: any) => updateAdminRole(admin.id, v)}>
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">{t('admin.moderatorLabel')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openPermDialog(admin.id)} title="Responsabilités">
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => { if (admin.email === PRINCIPAL_EMAIL) { toast.error(t('admin.cannotRemoveCreator')); return; } setSelectedAdminId(admin.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm mx-3 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.removeAdminRights')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.removeAdminConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={deleteAdmin} className="bg-destructive">{t('admin.remove')}</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Désigner un admin ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Désigner un administrateur
            </DialogTitle>
            <DialogDescription>
              Choisissez un utilisateur et attribuez-lui un rôle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher par nom ou email…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedUserId(null); }}
                className="flex-1"
              />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {nonAdminProfiles.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 text-center">Aucun utilisateur trouvé</p>
              ) : nonAdminProfiles.map(p => (
                <button
                  key={p.id}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors ${selectedUserId === p.id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                  onClick={() => setSelectedUserId(p.id)}
                >
                  <p className="text-sm font-medium">{p.full_name || 'Sans nom'}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle à attribuer</label>
              <Select value={newAdminRole} onValueChange={(v: any) => setNewAdminRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🔐 Admin — accès complet</SelectItem>
                  <SelectItem value="moderator">📋 Modérateur — accès limité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={designateAdmin} disabled={!selectedUserId || saving}>
              {saving ? 'En cours…' : 'Désigner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Responsabilités / Permissions ── */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Responsabilités
            </DialogTitle>
            <DialogDescription>
              Cochez les responsabilités à accorder à cet administrateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {categories.map(category => (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{category}</p>
                <div className="space-y-2 pl-1">
                  {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(perm => (
                    <label key={perm.id} className="flex items-center gap-3 py-1 cursor-pointer">
                      <Checkbox
                        id={perm.id}
                        checked={selectedPerms.has(perm.id)}
                        onCheckedChange={() => {
                          const next = new Set(selectedPerms);
                          next.has(perm.id) ? next.delete(perm.id) : next.add(perm.id);
                          setSelectedPerms(next);
                        }}
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={savePermissions} disabled={saving}>{saving ? 'Sauvegarde…' : t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminManagement = () => (
  <AdminPageWrapper requiresPrincipal>
    <AdminManagementContent />
  </AdminPageWrapper>
);

export default AdminManagement;
