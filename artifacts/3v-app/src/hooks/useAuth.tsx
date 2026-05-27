import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImage: string | null;
  gender: 'homme' | 'femme' | null;
  /** true uniquement après que enrichFromProfile a confirmé le genre depuis la DB */
  profileComplete: boolean;
  roles?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * Devient true une fois que enrichFromProfile a résolu (succès ou échec).
   * Le garde de complétion de profil DOIT attendre ce flag avant de rediriger.
   */
  profileEnriched: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, gender: 'homme' | 'femme') => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── sessionToUser : lecture rapide depuis user_metadata (peut être incomplet) ──
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
    // Optimiste : si le metadata a le genre → complet. Sinon enrichFromProfile tranchera.
    profileComplete: !!session.user.user_metadata?.gender,
    roles: [],
  };
}

// ── Lecture synchrone depuis localStorage ───────────────────────────────────
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

// ── enrichFromProfile : lecture réelle depuis la table profiles ──────────────
// onDone() est appelé en finally → le garde sait que la vraie valeur est disponible.
function enrichFromProfile(
  session: Session,
  setUser: (u: AuthUser) => void,
  onDone?: () => void,
) {
  void (async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, avatar_url, gender')
        .eq('id', session.user.id)
        .single();
      if (!data) return;
      const d = data as {
        full_name: string | null; first_name: string | null;
        last_name: string | null; avatar_url: string | null;
        gender: string | null;
      };
      const firstName   = d.first_name || d.full_name?.trim().split(' ')[0] || null;
      const lastName    = d.last_name  || (d.full_name?.trim().split(' ').slice(1).join(' ') || null);
      const displayName = [firstName, lastName].filter(Boolean).join(' ') || d.full_name;
      setUser({
        id: session.user.id,
        name: displayName || null,
        firstName,
        lastName,
        email: session.user.email || null,
        profileImage: d.avatar_url || session.user.user_metadata?.avatar_url || null,
        gender: (d.gender as 'homme' | 'femme') || null,
        profileComplete: !!d.gender, // ← vérité définitive
        roles: [],
      });
    } catch {
      // Enrichissement best-effort — en cas d'erreur on signale quand même onDone
      // pour ne pas bloquer le garde indéfiniment.
    } finally {
      onDone?.();
    }
  })();
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storedSess = readStoredSession();

  const [user,            setUser]           = useState<AuthUser | null>(storedSess ? sessionToUser(storedSess) : null);
  const [supabaseUser,    setSupabaseUser]   = useState<User | null>(storedSess?.user ?? null);
  const [session,         setSession]        = useState<Session | null>(storedSess);
  const [loading,         setLoading]        = useState(!storedSess);
  // Si pas de session stockée → pas d'utilisateur connecté → pas besoin d'enrichissement → true
  // Si session stockée → on doit lire la DB pour savoir si le profil est complet → false
  const [profileEnriched, setProfileEnriched] = useState(!storedSess);

  useEffect(() => {
    // markEnriched est idempotent : le premier appel passe, les suivants sont ignorés
    let enriched = false;
    const markEnriched = () => {
      if (!enriched) {
        enriched = true;
        setProfileEnriched(true);
      }
    };

    // 1. Écouter les futurs changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setSupabaseUser(sess?.user ?? null);
      if (sess?.user) {
        setUser(sessionToUser(sess));
        enrichFromProfile(sess, setUser, markEnriched);
      } else {
        setUser(null);
        markEnriched(); // déconnecté = pas d'enrichissement = prêt
      }
      setLoading(false);
    });

    // 2. Rafraîchir le token en arrière-plan
    supabase.auth.getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setSupabaseUser(sess?.user ?? null);
        if (sess?.user) {
          setUser(sessionToUser(sess));
          enrichFromProfile(sess, setUser, markEnriched);
        } else {
          setUser(null);
          markEnriched();
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); markEnriched(); });

    // 3. Filet de sécurité : débloquer après 8 s si le réseau est très lent
    const safetyTimer = setTimeout(() => { setLoading(false); markEnriched(); }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string, password: string,
    firstName: string, lastName: string,
    gender: 'homme' | 'femme',
  ) => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const { error, data } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, first_name: firstName, last_name: lastName, gender } },
    });
    if (!error && data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email,
        full_name: fullName, first_name: firstName,
        last_name: lastName || null, gender,
      }, { onConflict: 'id' });
    }
    if (!error && !data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }
    return { error };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const refetch = async () => {
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      setSession(sess);
      setSupabaseUser(sess?.user ?? null);
      if (sess?.user) {
        setUser(sessionToUser(sess));
        // Pas besoin de rappeler markEnriched ici : profileEnriched est déjà true
        enrichFromProfile(sess, setUser);
      } else {
        setUser(null);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user, supabaseUser, session, loading, profileEnriched,
      refetch, signOut, signIn, signUp,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
