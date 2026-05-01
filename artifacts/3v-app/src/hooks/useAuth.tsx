import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugService } from '@/services/debug-service';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      debugService.log('useAuth: initializing auth listener', 'info', 'useAuth');
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        try {
          debugService.log(`useAuth: auth state changed to ${event}`, 'info', 'useAuth');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } catch (error) {
          debugService.logError(error, 'useAuth-onAuthStateChange');
        }
      });

      supabase.auth.getSession().then(({ data: { session } }) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          debugService.log('useAuth: initial session loaded', 'info', 'useAuth');
        } catch (error) {
          debugService.logError(error, 'useAuth-getSession');
        }
      }).catch(error => {
        debugService.logError(error, 'useAuth-getSession-promise');
        setLoading(false);
      });

      return () => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          debugService.logError(error, 'useAuth-unsubscribe');
        }
      };
    } catch (error) {
      debugService.logError(error, 'useAuth-effect');
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) debugService.logError(error, 'useAuth-signIn');
      return { error };
    } catch (error) {
      debugService.logError(error, 'useAuth-signIn-catch');
      return { error: error as any };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phoneCountryCode?: string,
    phoneNumber?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone_country_code: phoneCountryCode || null,
            phone_number: phoneNumber || null,
          }
        }
      });

      if (error) {
        debugService.logError(error, 'useAuth-signUp');
        return { error };
      }

      // Ensure user is logged in immediately after signup when email confirmation is disabled
      if (!error && !data.session) {
        const signInResult = await supabase.auth.signInWithPassword({ email, password });
        if (signInResult.error) {
          debugService.logError(signInResult.error, 'useAuth-signUp-autoSignIn');
        }
      }
      return { error };
    } catch (error) {
      debugService.logError(error, 'useAuth-signUp-catch');
      return { error: error as any };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) debugService.logError(error, 'useAuth-signOut');
      return { error };
    } catch (error) {
      debugService.logError(error, 'useAuth-signOut-catch');
      return { error: error as any };
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};