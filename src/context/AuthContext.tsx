import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../database/supabaseClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isSupabaseReady: boolean;
  authLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    if (!supabaseReady || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch(() => {
        if (mounted) setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseReady]);

  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!supabaseReady || !supabase) {
      return {
        error:
          'Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured. Configure them in your environment or continue in Guest Mode.',
      };
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { error: 'Please provide both email and password.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    return { error: error ? error.message : null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
    if (!supabaseReady || !supabase) {
      return {
        error:
          'Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured. Configure them in your environment or continue in Guest Mode.',
      };
    }
    const cleanEmail = email.trim();
    const cleanName = displayName.trim();
    if (!cleanEmail || !password) {
      return { error: 'Email and password are required.' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: cleanName || cleanEmail.split('@')[0],
        },
      },
    });

    if (error) {
      return { error: error.message };
    }
    const needsEmailConfirmation = Boolean(data.user && !data.session);
    return { error: null, needsEmailConfirmation };
  };

  const sendPasswordReset = async (email: string): Promise<{ error: string | null }> => {
    if (!supabaseReady || !supabase) {
      return {
        error:
          'Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not configured.',
      };
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { error: 'Please enter your account email address.' };
    }
    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    return { error: error ? error.message : null };
  };

  const signOut = async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: Boolean(user),
        isGuest: !user,
        isSupabaseReady: supabaseReady,
        authLoading,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
