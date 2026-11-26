import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { apiFetch } from '../api/http';
import { localDevelopmentMode, supabase } from './supabase';
import type { StudentSignupDetails } from './StudentSignupDetails';

type StudentSignupState = {
  createStudentAccount: (details: StudentSignupDetails, email: string, password: string) => Promise<'confirmation' | 'ready'>;
};

const StudentSignupContext = createContext<StudentSignupState | null>(null);

async function createMemberProfile(details: StudentSignupDetails, session: Session) {
  await apiFetch('/api/v1/student-registration', {
    method: 'POST',
    body: JSON.stringify({
      libraryNumber: details.indexNumber,
      firstName: details.firstName,
      lastName: details.lastName,
      programme: details.programme,
      level: details.level,
      ...(details.phone?.trim() ? { phone: details.phone.trim() } : {}),
    }),
  }, session.access_token);
}

export function StudentSignupProvider({ children }: { children: ReactNode }) {
  const createStudentAccount = useCallback(async (details: StudentSignupDetails, email: string, password: string) => {
    if (localDevelopmentMode) throw new Error('Student signup is available when Supabase authentication is enabled.');
    if (!supabase) throw new Error('Student signup is not configured for this site.');

    // Clear a previous browser login locally. This provider never restores a
    // session or asks the API to resolve a staff/student role.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) throw new Error('Could not clear the previous sign-in. Refresh the page and try again.');

    const normalizedEmail = email.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
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

    await createMemberProfile(details, current);
    return 'ready';
  }, []);

  const value = useMemo(() => ({ createStudentAccount }), [createStudentAccount]);
  return <StudentSignupContext.Provider value={value}>{children}</StudentSignupContext.Provider>;
}

export function useStudentSignup() {
  const value = useContext(StudentSignupContext);
  if (!value) throw new Error('useStudentSignup must be used inside StudentSignupProvider.');
  return value;
}
