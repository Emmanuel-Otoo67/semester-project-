import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, apiFetch } from '../api/http';
import { localDevelopmentMode, supabase, supabaseConfigured } from './supabase';

export type StaffSession = { authenticated: true; localDevelopment?: boolean; staffId: string; displayName: string; role: 'ADMIN' | 'LIBRARIAN' };
export type StudentSession = { authenticated: true; studentId: string; libraryNumber: string; displayName: string; programme: string | null; level: string | null; email?: string | null; phone?: string | null; role: 'STUDENT' };
type IdentitySession = StaffSession | StudentSession;
type AuthState = {
  loading: boolean;
  session: Session | null;
  staff: StaffSession | null;
  student: StudentSession | null;
  error: string | null;
  configurationError: boolean;
  localDevelopment: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  createStudentAccount: (indexNumber: string, email: string, password: string) => Promise<'confirmation' | 'ready'>;
  completeStudentAccount: (indexNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const pendingStudentLibraryNumberKey = 'libtrack.pendingStudentLibraryNumber';

async function linkStudentAccount(indexNumber: string, current: Session) {
  try {
    await apiFetch('/api/v1/student-registration', {
      method: 'POST', body: JSON.stringify({ libraryNumber: indexNumber }),
    }, current.access_token);
    window.sessionStorage.removeItem(pendingStudentLibraryNumberKey);
  } catch (error) {
    window.sessionStorage.removeItem(pendingStudentLibraryNumberKey);
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveStaff = useCallback(async (current: Session | null) => {
    if (localDevelopmentMode) {
      try {
        const identity = await apiFetch<StaffSession>('/api/v1/session');
        if (!identity.localDevelopment) {
          throw new Error('The API is not running with the Spring local-dev profile. Start it with SPRING_PROFILES_ACTIVE=local-dev.');
        }
        setStaff(identity);
        setStudent(null);
        setError(null);
        return identity.role;
      } catch (cause) {
        setStaff(null);
        setError(cause instanceof ApiError && (cause.status === 401 || cause.status === 403)
          ? 'The API is not running with the Spring local-dev profile. Start it with SPRING_PROFILES_ACTIVE=local-dev.'
          : cause instanceof Error ? cause.message : 'Could not connect to the local LibTrack API.');
        return null;
      }
    }
    if (!current) { setStaff(null); setStudent(null); setError(null); return null; }
    try {
      const pendingIndexNumber = window.sessionStorage.getItem(pendingStudentLibraryNumberKey);
      if (pendingIndexNumber) await linkStudentAccount(pendingIndexNumber, current);
      const identity = await apiFetch<IdentitySession>('/api/v1/session', {}, current.access_token);
      if (identity.role === 'STUDENT') { setStudent(identity); setStaff(null); }
      else { setStaff(identity); setStudent(null); }
      setError(null);
      return identity.role;
    } catch (cause) {
      setStaff(null); setStudent(null);
      setError(cause instanceof Error ? cause.message : 'Could not verify staff access.');
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (localDevelopmentMode) {
      setLoading(true);
      await resolveStaff(null);
      setLoading(false);
      return;
    }
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) setError('Your sign-in session could not be restored. Sign in again.');
    setSession(data.session);
    await resolveStaff(data.session);
    setLoading(false);
  }, [resolveStaff]);

  useEffect(() => {
    if (localDevelopmentMode) {
      let alive = true;
      void resolveStaff(null).finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }
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
    if (localDevelopmentMode) throw new Error('Sign-in is disabled in local development mode.');
    if (!supabase) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign-in.');
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) throw new Error('Email or password was not accepted.');
    setSession(data.session);
    const pendingIndexNumber = window.sessionStorage.getItem(pendingStudentLibraryNumberKey);
    if (pendingIndexNumber && data.session) await linkStudentAccount(pendingIndexNumber, data.session);
    const role = await resolveStaff(data.session);
    if (!role) throw new Error('You signed in, but this login is not linked to an active LibTrack account. Students can choose “Create an account” to link their library record.');
  }, [resolveStaff]);

  const completeStudentAccount = useCallback(async (indexNumber: string) => {
    if (localDevelopmentMode || !supabase) throw new Error('Student account registration is not available in local demo mode.');
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session) throw new Error('Sign in with the student email first, then complete registration.');
    const normalized = indexNumber.trim();
    window.sessionStorage.setItem(pendingStudentLibraryNumberKey, normalized);
    await linkStudentAccount(normalized, data.session);
    const role = await resolveStaff(data.session);
    if (role !== 'STUDENT') throw new Error('The account is signed in, but LibTrack did not find a matching student record. Check your student index number and registered email.');
  }, [resolveStaff]);

  const createStudentAccount = useCallback(async (indexNumber: string, email: string, password: string) => {
    if (localDevelopmentMode) throw new Error('Student signup is only available when Supabase authentication is enabled.');
    if (!supabase) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable student signup.');
    const normalized = indexNumber.trim();
    window.sessionStorage.setItem(pendingStudentLibraryNumberKey, normalized);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/create-account?confirmed=1` },
    });
    if (signUpError) {
      window.sessionStorage.removeItem(pendingStudentLibraryNumberKey);
      throw new Error(signUpError.message);
    }
    if (!data.session) return 'confirmation';
    setSession(data.session);
    await linkStudentAccount(normalized, data.session);
    const role = await resolveStaff(data.session);
    if (role !== 'STUDENT') throw new Error('The account was created, but LibTrack could not link it to a student record. Check the student index number and registered email, then retry.');
    return 'ready';
  }, [resolveStaff]);

  const signOut = useCallback(async () => {
    if (!localDevelopmentMode && supabase) await supabase.auth.signOut();
    setSession(null); setStaff(null); setStudent(null); setError(null);
  }, []);

  const value = useMemo(() => ({ loading, session, staff, student, error,
    configurationError: !localDevelopmentMode && !supabaseConfigured,
    localDevelopment: localDevelopmentMode, signIn, createStudentAccount, completeStudentAccount, signOut, refresh }),
    [loading, session, staff, student, error, signIn, createStudentAccount, completeStudentAccount, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
