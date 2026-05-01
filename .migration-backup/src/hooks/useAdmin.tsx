import { useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
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

const promiseWithTimeout = <T,>(promise: Promise<T>, ms = 12000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const normalizeRole = (value: unknown): AdminRole => {
  if (value === 'admin_principal' || value === 'admin' || value === 'moderator') {
    return value;
  }

  return null;
};

export const useAdmin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const applyRole = (userId: string, role: AdminRole) => {
      roleCache.set(userId, { role, timestamp: Date.now() });

      if (!mountedRef.current) return;

      setAdminRole(role);
      setIsAdmin(role !== null);
      setLoading(false);
      setChecked(true);
    };

    const clearRoleState = () => {
      if (!mountedRef.current) return;
      setAdminRole(null);
      setIsAdmin(false);
      setLoading(false);
      setChecked(true);
    };

    const fetchAdminRole = async (userId: string) => {
      const cached = roleCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        applyRole(userId, cached.role);
        return;
      }

      try {
        const rpcResult = await promiseWithTimeout(
          supabase.rpc('get_user_admin_role') as unknown as Promise<{ data: AdminRole; error: any }>,
          4000
        );

        if ((rpcResult as any).error) {
          throw (rpcResult as any).error;
        }

        applyRole(userId, normalizeRole((rpcResult as any).data));
      } catch (rpcError) {
        try {
          const fallbackResult = await promiseWithTimeout(
            supabase.from('user_roles').select('role').eq('user_id', userId) as unknown as Promise<any>,
            4000
          );

          if (fallbackResult.error) {
            throw fallbackResult.error;
          }

          const roles = (fallbackResult.data || []) as Array<{ role: string }>;
          const resolvedRole = roles.some((entry) => entry.role === 'admin_principal')
            ? 'admin_principal'
            : roles.some((entry) => entry.role === 'admin')
              ? 'admin'
              : roles.some((entry) => entry.role === 'moderator')
                ? 'moderator'
                : null;

          applyRole(userId, resolvedRole);
        } catch (fallbackError) {
          console.error('[useAdmin] Failed to resolve admin role', rpcError, fallbackError);
          clearRoleState();
        }
      }
    };

    const syncSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          clearRoleState();
          return;
        }

        setLoading(true);
        setChecked(false);
        await fetchAdminRole(currentUser.id);
      } catch (error) {
        console.error('[useAdmin] Failed to sync session', error);
        clearRoleState();
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        clearRoleState();
        return;
      }

      setLoading(true);
      setChecked(false);
      await fetchAdminRole(currentUser.id);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, adminRole, loading, checked };
};
