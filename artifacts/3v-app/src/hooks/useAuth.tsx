import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  session: Session | null;
  loading: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function buildAuthUser(session: Session): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', session.user.id)
    .single();

  return {
    id: session.user.id,
    name: profile?.full_name || session.user.user_metadata?.full_name || null,
    email: session.user.email || null,
    profileImage: profile?.avatar_url || session.user.user_metadata?.avatar_url || null,
    roles: [],
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);

        if (session?.user) {
          const authUser = await buildAuthUser(session);
          setUser(authUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const authUser = await buildAuthUser(session);
        setUser(authUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error && !data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setSupabaseUser(session?.user ?? null);
    if (session?.user) {
      const authUser = await buildAuthUser(session);
      setUser(authUser);
    } else {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, refetch, signOut, signIn, signUp }}>
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
