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

// Read the current Supabase session synchronously from localStorage.
// Supabase stores the session under this key — reading it avoids the async
// round-trip that causes a "flash of logged-out" on slow mobile networks.
const SUPABASE_AUTH_KEY = 'sb-kaddsojhnkyfavaulrfc-auth-token';
function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.access_token && data?.user) return data as Session;
    return null;
  } catch { return null; }
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
  // Initialise synchronously from localStorage so mobile users never see a
  // "not logged in" flash while the async getSession() round-trip completes.
  const storedSess = readStoredSession();
  const [user, setUser] = useState<AuthUser | null>(storedSess ? sessionToUser(storedSess) : null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(storedSess?.user ?? null);
  const [session, setSession] = useState<Session | null>(storedSess);
  // If a session was already found in localStorage, skip the loading state entirely.
  const [loading, setLoading] = useState(!storedSess);

  useEffect(() => {
    // 1. Subscribe to future auth changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED …)
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

    // 2. Trigger a token refresh in the background. On mobile this may be slow,
    //    but because we already loaded from localStorage above the UI is unblocked.
    supabase.auth.getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setSupabaseUser(sess?.user ?? null);
        if (sess?.user) {
          setUser(sessionToUser(sess));
          enrichFromProfile(sess, setUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 3. Safety net: unblock after 8 s on extremely slow networks.
    const safetyTimer = setTimeout(() => setLoading(false), 8000);

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
