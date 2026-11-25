import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ApiError, apiFetch } from '../api/http';
import { localDevelopmentMode, supabase, supabaseConfigured } from './supabase';
import type { StudentSignupDetails } from './StudentSignupDetails';

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
  createStudentAccount: (details: StudentSignupDetails, email: string, password: string) => Promise<'confirmation' | 'ready'>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
async function createStudentProfile(details: StudentSignupDetails, current: Session) {
  await apiFetch('/api/v1/student-registration', {
    method: 'POST', body: JSON.stringify({
      libraryNumber: details.indexNumber,
      firstName: details.firstName,
      lastName: details.lastName,
      programme: details.programme,
      level: details.level,
    }),
  }, current.access_token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const studentSignupInProgress = useRef(false);

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
      // signUp emits SIGNED_IN before the student row is inserted. Resolving
      // /session here races registration and briefly treats a new student as staff.
      if (studentSignupInProgress.current) return;
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
    const role = await resolveStaff(data.session);
    if (!role) throw new Error('This login is not linked to a student profile yet. Students can complete the signup form to open their dashboard.');
  }, [resolveStaff]);

  const createStudentAccount = useCallback(async (details: StudentSignupDetails, email: string, password: string) => {
    if (localDevelopmentMode) throw new Error('Student signup is only available when Supabase authentication is enabled.');
    if (!supabase) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable student signup.');
    const normalizedEmail = email.trim();
    const { data: existing, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error('Your current sign-in could not be checked. Refresh the page and try again.');
    if (existing.session) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw new Error('Could not reset the earlier sign-in. Refresh the page and try again.');
      setSession(null); setStaff(null); setStudent(null);
    }

    studentSignupInProgress.current = true;
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail, password,
        options: { emailRedirectTo: `${window.location.origin}/create-account?confirmed=1` },
      });
      let current = data.session;
      if (signUpError && /already registered|already exists/i.test(signUpError.message)) {
        const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw new Error('This email already has an account. The password entered could not sign in to it.');
        current = signedIn.session;
      } else if (signUpError) {
        throw new Error(signUpError.message);
      }
      if (!current) {
        const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError || !signedIn.session) return 'confirmation';
        current = signedIn.session;
      }

      setSession(current);
      await createStudentProfile(details, current);
      const role = await resolveStaff(current);
      if (role !== 'STUDENT') throw new Error('Your profile could not be saved. Check the index number and try again.');
      return 'ready';
    } finally {
      studentSignupInProgress.current = false;
    }
  }, [resolveStaff]);

  const signOut = useCallback(async () => {
    if (!localDevelopmentMode && supabase) await supabase.auth.signOut();
    setSession(null); setStaff(null); setStudent(null); setError(null);
  }, []);

  const value = useMemo(() => ({ loading, session, staff, student, error,
    configurationError: !localDevelopmentMode && !supabaseConfigured,
    localDevelopment: localDevelopmentMode, signIn, createStudentAccount, signOut, refresh }),
    [loading, session, staff, student, error, signIn, createStudentAccount, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
