import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  profileImage: string | null;
  roles?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/user', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const u = await fetchCurrentUser();
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(safetyTimer);
  }, []);

  const signIn = async (_email: string, _password: string) => {
    // Replit Auth uses the browser-redirect flow; direct email/password is not supported.
    window.location.href = '/api/auth/login';
    return { error: null };
  };

  const signUp = async (_email: string, _password: string, _fullName: string) => {
    window.location.href = '/api/auth/login';
    return { error: null };
  };

  const signOut = async () => {
    window.location.href = '/api/auth/logout';
  };

  const refetch = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, refetch, signOut, signIn, signUp }}>
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
