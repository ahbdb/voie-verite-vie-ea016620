import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  name: string | null;       // firstName + lastName (ou full_name en fallback)
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImage: string | null;
  gender: 'homme' | 'femme' | null;
  profileComplete: boolean;  // false tant que gender est null
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
  signUp: (email: string, password: string, firstName: string, lastName: string, gender: 'homme' | 'femme') => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function sessionToUser(session: Session): AuthUser {
  const fullName: string | null = session.user.user_metadata?.full_name || null;
  const parts = fullName?.trim().split(' ') ?? [];
  const firstName = session.user.user_metadata?.first_name || (parts[0] ?? null);
  const lastName  = session.user.user_metadata?.last_name  || (parts.slice(1).join(' ') || null);
  return {
    id: session.user.id,
    name: fullName,
    firstName,
    lastName,
    email: session.user.email || null,
    profileImage: session.user.user_metadata?.avatar_url || null,
    gender: (session.user.user_metadata?.gender as 'homme' | 'femme') || null,
    profileComplete: !!session.user.user_metadata?.gender,
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
        .select('full_name, first_name, last_name, avatar_url, gender')
        .eq('id', session.user.id)
        .single();
      if (!data) return;
      const d = data as {
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        gender: string | null;
      };
      const firstName = d.first_name || d.full_name?.trim().split(' ')[0] || null;
      const lastName  = d.last_name  || (d.full_name?.trim().split(' ').slice(1).join(' ') || null);
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || d.full_name;
      setUser({
        id: session.user.id,
        name: displayName || null,
        firstName,
        lastName,
        email: session.user.email || null,
        profileImage: d.avatar_url || session.user.user_metadata?.avatar_url || null,
        gender: (d.gender as 'homme' | 'femme') || null,
        profileComplete: !!d.gender,
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string, gender: 'homme' | 'femme') => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, gender } },
    });
    if (!error && data.user) {
      // Upsert profile with all identity fields
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName || null,
        gender,
      }, { onConflict: 'id' });
    }
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
