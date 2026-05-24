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

function sessionToUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    name: session.user.user_metadata?.full_name || null,
    email: session.user.email || null,
    profileImage: session.user.user_metadata?.avatar_url || null,
    roles: [],
  };
}

// Fetch profile in the background and enrich the user object — never blocks loading.
function enrichFromProfile(session: Session, setUser: (u: AuthUser) => void) {
  void (async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      if (!data) return;
      setUser({
        id: session.user.id,
        name: data.full_name || session.user.user_metadata?.full_name || null,
        email: session.user.email || null,
        profileImage: data.avatar_url || session.user.user_metadata?.avatar_url || null,
        roles: [],
      });
    } catch {
      // ignore — profile enrichment is best-effort
    }
  })();
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe to future auth changes — set loading=false immediately, enrich profile in background.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setSupabaseUser(sess?.user ?? null);
      if (sess?.user) {
        setUser(sessionToUser(sess));
        enrichFromProfile(sess, setUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Read the current session immediately (from localStorage — no network call).
    //    This resolves quickly and unblocks the UI.
    supabase.auth.getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setSupabaseUser(sess?.user ?? null);
        if (sess?.user) {
          setUser(sessionToUser(sess));
          enrichFromProfile(sess, setUser);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 3. Safety net: if nothing resolves in 6 s (e.g. auth server unreachable), unblock the UI.
    const safetyTimer = setTimeout(() => setLoading(false), 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
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
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess);
      setSupabaseUser(sess?.user ?? null);
      if (sess?.user) {
        setUser(sessionToUser(sess));
        enrichFromProfile(sess, setUser);
      } else {
        setUser(null);
      }
    } catch {
      // ignore
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
