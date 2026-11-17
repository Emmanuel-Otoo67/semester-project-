import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { apiFetch } from '../api/http';
import { supabase, supabaseConfigured } from './supabase';

export type StaffSession = { authenticated: true; staffId: string; displayName: string; role: 'ADMIN' | 'LIBRARIAN' };
type AuthState = {
  loading: boolean;
  session: Session | null;
  staff: StaffSession | null;
  error: string | null;
  configurationError: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveStaff = useCallback(async (current: Session | null) => {
    if (!current) { setStaff(null); setError(null); return; }
    try {
      const identity = await apiFetch<StaffSession>('/api/v1/session', {}, current.access_token);
      setStaff(identity);
      setError(null);
    } catch (cause) {
      setStaff(null);
      setError(cause instanceof Error ? cause.message : 'Could not verify staff access.');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) setError('Your sign-in session could not be restored. Sign in again.');
    setSession(data.session);
    await resolveStaff(data.session);
    setLoading(false);
  }, [resolveStaff]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    void supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError('Your sign-in session could not be restored. Sign in again.');
      setSession(data.session);
      await resolveStaff(data.session);
      if (alive) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      window.setTimeout(() => { if (alive) void resolveStaff(nextSession); }, 0);
    });
    const handleUnauthorized = () => { void supabase?.auth.signOut(); };
    window.addEventListener('libtrack:unauthorized', handleUnauthorized);
    return () => { alive = false; listener.subscription.unsubscribe(); window.removeEventListener('libtrack:unauthorized', handleUnauthorized); };
  }, [resolveStaff]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign-in.');
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) throw new Error('Email or password was not accepted.');
    setSession(data.session);
    await resolveStaff(data.session);
  }, [resolveStaff]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null); setStaff(null); setError(null);
  }, []);

  const value = useMemo(() => ({ loading, session, staff, error, configurationError: !supabaseConfigured, signIn, signOut, refresh }),
    [loading, session, staff, error, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
