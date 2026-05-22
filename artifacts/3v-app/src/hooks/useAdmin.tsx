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
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
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

    // Use the dedicated RPC function that bypasses RLS and returns the
    // current authenticated user's role directly.
    supabase
      .rpc('get_user_admin_role')
      .then(({ data, error }) => {
        let role: AdminRole = null;
        if (!error && data) {
          const r = data as string;
          if (r === 'admin_principal') role = 'admin_principal';
          else if (r === 'admin') role = 'admin';
          else if (r === 'moderator') role = 'moderator';
        }
        roleCache.set(user.id, { role, timestamp: Date.now() });
        setAdminRole(role);
        setIsAdmin(role !== null);
      })
      .catch(() => {
        setAdminRole(null);
        setIsAdmin(false);
      })
      .finally(() => {
        setLoading(false);
        setChecked(true);
      });
  }, [user, authLoading]);

  return { user, isAdmin, adminRole, loading, checked };
};
