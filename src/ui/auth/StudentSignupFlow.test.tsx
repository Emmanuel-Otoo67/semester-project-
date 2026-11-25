import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

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

import { StudentSignupProvider, useStudentSignup } from './StudentSignupProvider';

const details = {
  indexNumber: 'S-101',
  firstName: 'Ama',
  lastName: 'Mensah',
  programme: 'Computer Science',
  level: 'Level 300',
};

function SignupProbe() {
  const { createStudentAccount } = useStudentSignup();
  const [created, setCreated] = useState(false);
  return <>
    <button onClick={() => void createStudentAccount(details, 'ama@example.edu', 'password8').then(() => setCreated(true)).catch(() => undefined)}>Create account</button>
    {created && <p>created</p>}
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
      throw new Error(`Unexpected API request: ${String(input)} ${init?.method ?? 'GET'}`);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('creates the member profile without resolving staff or student session first', async () => {
    render(<StudentSignupProvider><SignupProbe /></StudentSignupProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('created')).toBeTruthy();
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ama@example.edu', password: 'password8' });
    const calls = vi.mocked(fetch).mock.calls;
    const registration = calls.find(([url]) => String(url).endsWith('/api/v1/student-registration'));
    expect(JSON.parse(String(registration?.[1]?.body))).toEqual({
      libraryNumber: 'S-101', firstName: 'Ama', lastName: 'Mensah',
      programme: 'Computer Science', level: 'Level 300',
    });
    await waitFor(() => expect(calls.some(([url]) => String(url).endsWith('/api/v1/session'))).toBe(false));
  });
});
