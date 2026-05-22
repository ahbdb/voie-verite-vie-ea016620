// Supabase has been replaced with the Replit-native stack.
// This file is kept for import compatibility during migration.
// All data access is now handled via /api/* endpoints.

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use Replit Auth') }),
    signUp: async () => ({ data: null, error: new Error('Use Replit Auth') }),
    signOut: async () => {
      window.location.href = '/api/auth/logout';
      return { error: null };
    },
  },
  from: (_table: string) => ({
    select: (..._args: any[]) => ({ data: null, error: new Error('Use API endpoints') }),
    insert: (_data: any) => ({ data: null, error: new Error('Use API endpoints') }),
    update: (_data: any) => ({ data: null, error: new Error('Use API endpoints') }),
    delete: () => ({ data: null, error: new Error('Use API endpoints') }),
    eq: function(..._args: any[]) { return this; },
    single: function() { return this; },
  }),
  functions: {
    invoke: async (_name: string, _opts: any) => ({ data: null, error: new Error('Use API endpoints') }),
  },
  rpc: async (_fn: string, _args?: any) => ({ data: null, error: new Error('Use API endpoints') }),
  channel: (_name: string) => ({
    on: function(_event: string, _opts: any, _cb: any) { return this; },
    subscribe: function() { return this; },
  }),
  removeChannel: (_ch: any) => {},
};
