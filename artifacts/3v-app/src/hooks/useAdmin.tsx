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

    const fetchRole = async (): Promise<AdminRole> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error || !data) return null;
      if (data.some((r) => r.role === 'admin_principal')) return 'admin_principal';
      if (data.some((r) => r.role === 'admin')) return 'admin';
      if (data.some((r) => r.role === 'moderator')) return 'moderator';
      return null;
    };

    fetchRole()
      .then((resolvedRole) => {
        if (resolvedRole !== null) {
          roleCache.set(user.id, { role: resolvedRole, timestamp: Date.now() });
        }
        setAdminRole(resolvedRole);
        setIsAdmin(resolvedRole !== null);
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
