import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'admin_principal' | 'admin' | 'moderator' | null;

const roleCache = new Map<string, { role: AdminRole; timestamp: number }>();
const CACHE_DURATION = 30 * 1000;

export const resetAdminCache = () => {
  roleCache.clear();
};

if (typeof window !== 'undefined') {
  (window as any).__DEBUG_resetAdminCache = resetAdminCache;
}

export const useAdmin = () => {
  const { user, supabaseUser, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !supabaseUser) {
      setAdminRole(null);
      setIsAdmin(false);
      setLoading(false);
      setChecked(true);
      return;
    }

    const cached = roleCache.get(user.id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setAdminRole(cached.role);
      setIsAdmin(cached.role !== null);
      setLoading(false);
      setChecked(true);
      return;
    }

    setLoading(true);

    // Récupérer le rôle depuis la table user_roles de Supabase
    Promise.resolve(
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
    )
      .then(({ data, error }) => {
        let adminRole: AdminRole = null;

        if (!error && data) {
          const role = data.role;
          if (role === 'admin_principal') adminRole = 'admin_principal';
          else if (role === 'admin') adminRole = 'admin';
          else if (role === 'moderator') adminRole = 'moderator';
        }

        roleCache.set(user.id, { role: adminRole, timestamp: Date.now() });
        setAdminRole(adminRole);
        setIsAdmin(adminRole !== null);
      })
      .catch(() => {
        setAdminRole(null);
        setIsAdmin(false);
      })
      .finally(() => {
        setLoading(false);
        setChecked(true);
      });
  }, [user, supabaseUser, authLoading]);

  return { user, isAdmin, adminRole, loading, checked };
};
