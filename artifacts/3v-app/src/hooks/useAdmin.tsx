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

    // Récupérer le rôle via la RPC SECURITY DEFINER (bypasse le RLS)
    // Fallback: lecture directe sur user_roles si la RPC échoue
    const fetchRole = async (): Promise<AdminRole> => {
      // Try the dedicated SECURITY DEFINER function first — not blocked by RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_admin_role');
      if (!rpcError && rpcData) {
        const r = rpcData as string;
        if (r === 'admin_principal') return 'admin_principal';
        if (r === 'admin') return 'admin';
        if (r === 'moderator') return 'moderator';
      }
      // Fallback: direct table read (may fail if RLS is restrictive)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        const r = data.role as string;
        if (r === 'admin_principal') return 'admin_principal';
        if (r === 'admin') return 'admin';
        if (r === 'moderator') return 'moderator';
      }
      return null;
    };

    fetchRole()
      .then((resolvedRole) => {
        // Only cache positive hits — never cache null so a failed/missing role
        // is always re-checked on the next render cycle instead of staying
        // stuck as "not admin" for 30 seconds.
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
  }, [user, supabaseUser, authLoading]);

  return { user, isAdmin, adminRole, loading, checked };
};
