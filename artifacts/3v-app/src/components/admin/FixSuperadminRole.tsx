import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const FixSuperadminRole = () => {
  const [loading, setLoading] = useState(false);

  const fixSuperadminRole = async () => {
    try {
      setLoading(true);

      // Get the superadmin user
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'ahdybau@gmail.com');

      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        toast.error('Superadmin user not found');
        return;
      }

      const userId = users[0].id;
      console.log('Found superadmin user:', userId);

      // Delete old admin roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['admin', 'moderator'] as any);

      if (deleteError) throw deleteError;
      console.log('Deleted old admin roles');

      // Insert admin_principal role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin_principal' as any
        });

      if (insertError) throw insertError;
      console.log('Inserted admin_principal role');

      toast.success('✅ Rôle admin_principal ajouté avec succès!');
      toast.info('📝 Rafraîchis la page et reconnecte-toi');

    } catch (error) {
      console.error('Error fixing superadmin role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle>🔧 Fix Superadmin Role</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Si tu as actuellement le rôle "admin" simple au lieu de "admin_principal", clique sur le bouton ci-dessous.
        </p>
        <Button 
          onClick={fixSuperadminRole}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'En cours...' : 'Corriger le rôle maintenant'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Après cela, tu dois te déconnecter, actualiser (Ctrl+Shift+R) et te reconnecter.
        </p>
      </CardContent>
    </Card>
  );
};

export default FixSuperadminRole;
