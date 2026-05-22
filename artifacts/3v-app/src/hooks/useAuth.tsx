import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
  roles?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const mapUser = (u: User | null): AuthUser | null => {
    if (!u) return null;
    return {
      id: u.id,
      name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? null,
      email: u.email ?? null,
      profileImage: u.user_metadata?.avatar_url ?? null,
    };
  };

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSupabaseUser(session?.user ?? null);
    setUser(mapUser(session?.user ?? null));
    setLoading(false);
  };

  useEffect(() => {
    void fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      setUser(mapUser(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, refetch: fetchUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
