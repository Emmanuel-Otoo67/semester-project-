import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock('./supabase', () => ({
  localDevelopmentMode: false,
  supabaseConfigured: true,
  supabase: { auth },
}));

import { AuthProvider, useAuth } from './AuthProvider';

const details = {
  indexNumber: 'S-101',
  firstName: 'Ama',
  lastName: 'Mensah',
  programme: 'Computer Science',
  level: 'Level 300',
};

function SignupProbe() {
  const { createStudentAccount, student } = useAuth();
  return <>
    <button onClick={() => void createStudentAccount(details, 'ama@example.edu', 'password8').catch(() => undefined)}>Create account</button>
    {student && <p>{student.displayName}</p>}
  </>;
}

describe('single-step student signup', () => {
  beforeEach(() => {
    auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    auth.signOut.mockReset().mockResolvedValue({ error: null });
    auth.signUp.mockReset().mockResolvedValue({ data: { session: null, user: null }, error: { message: 'User already registered' } });
    auth.signInWithPassword.mockReset().mockResolvedValue({
      data: { session: { access_token: 'student-token', user: { email: 'ama@example.edu' } }, user: { email: 'ama@example.edu' } },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/api/v1/student-registration')) return Response.json({ status: 'created' });
      if (String(input).endsWith('/api/v1/session')) return Response.json({
        authenticated: true, studentId: 'student-1', libraryNumber: 'S-101', displayName: 'Ama Mensah',
        programme: 'Computer Science', level: 'Level 300', role: 'STUDENT',
      });
      throw new Error(`Unexpected API request: ${String(input)} ${init?.method ?? 'GET'}`);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('signs in an existing email, creates the member profile, and resolves the student dashboard', async () => {
    render(<AuthProvider><SignupProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Ama Mensah')).toBeTruthy();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ama@example.edu', password: 'password8' });
    const calls = vi.mocked(fetch).mock.calls;
    const registration = calls.find(([url]) => String(url).endsWith('/api/v1/student-registration'));
    expect(JSON.parse(String(registration?.[1]?.body))).toEqual({
      libraryNumber: 'S-101', firstName: 'Ama', lastName: 'Mensah',
      programme: 'Computer Science', level: 'Level 300',
    });
    await waitFor(() => expect(calls.some(([url]) => String(url).endsWith('/api/v1/session'))).toBe(true));
  });
});
