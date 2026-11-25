import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AccountPage, { type AccountMode } from './AccountPage';

function renderAccount(mode: AccountMode, localDemo = true, onSignIn?: (email: string, password: string) => Promise<void>) {
  const path = `/${mode}`;
  function CurrentPath() { return <span data-testid="current-route">{useLocation().pathname}</span>; }
  return render(<MemoryRouter initialEntries={[path]}><CurrentPath /><Routes>
    <Route path={path} element={<AccountPage mode={mode} localDemo={localDemo} onSignIn={onSignIn} />} />
    <Route path="/dashboard" element={<h1>Library overview</h1>} />
  </Routes></MemoryRouter>);
}

function submitForm(name: string) {
  fireEvent.submit(screen.getByRole('form', { name }));
}

function CurrentPath() { return <span data-testid="current-route">{useLocation().pathname}</span>; }

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LibTrack account screens', () => {
  it.each([
    ['sign-in', 'Sign in to your library'],
    ['create-account', 'Create your account'],
    ['forgot-password', 'Forgot password'],
    ['reset-password', 'Reset password'],
  ] as const)('renders the %s screen with its specific fields', (mode, heading) => {
    renderAccount(mode);

    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    expect(screen.getByText(/local demo/i)).toBeTruthy();
    if (mode !== 'reset-password') expect(screen.getByLabelText('Email address')).toBeTruthy();
    if (mode === 'create-account') {
      expect(screen.getByLabelText('Student index number')).toBeTruthy();
      expect(screen.getByLabelText('Confirm password')).toBeTruthy();
    }
    if (mode === 'reset-password') expect(screen.getByLabelText('Confirm password')).toBeTruthy();
  });

  it('links related sign-in and recovery pages together', () => {
    renderAccount('sign-in');
    expect(screen.getByRole('link', { name: 'Forgot password?' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe('/create-account');

    cleanup();
    renderAccount('forgot-password');
    expect(screen.getByRole('link', { name: 'Back to sign in' }).getAttribute('href')).toBe('/sign-in');
  });

  it('offers a direct way to finish student setup after an unlinked sign-in', () => {
    render(<MemoryRouter initialEntries={['/sign-in']}><AccountPage mode="sign-in" localDemo={false} sessionPresent authError="This login is not linked to an active LibTrack account." onSignOut={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /complete student signup/i }).getAttribute('href')).toBe('/create-account');
  });

  it('clearly explains that signup creates the student profile automatically', () => {
    render(<MemoryRouter initialEntries={['/create-account']}><AccountPage mode="create-account" localDemo={false} onCreateStudent={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/creates your account and student profile together/i)).toBeTruthy();
    expect(screen.getByLabelText('First name')).toBeTruthy();
    expect(screen.getByLabelText('Last name')).toBeTruthy();
    expect(screen.getByLabelText('Programme / department')).toBeTruthy();
    expect(screen.getByLabelText('Level / year')).toBeTruthy();
    expect(screen.getByLabelText('Student index number')).toBeTruthy();
  });

  it('rejects malformed email, missing student index number and short passwords inline', () => {
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } });

    submitForm('Create your account');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Enter your student index number.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Library overview' })).toBeNull();
  });

  it('requires matching passwords when creating an account', () => {
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Student index number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different8' } });

    submitForm('Create your account');

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('opens the local workspace after a valid demo account form without saving credentials', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Student index number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jordan' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });

    submitForm('Create your account');

    expect(screen.getByRole('heading', { name: 'Library overview' })).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('shows demo-only recovery feedback without sending or saving anything', () => {
    renderAccount('forgot-password');
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    submitForm('Forgot password');
    expect(screen.getByRole('status').textContent).toMatch(/no reset email was sent/i);

    cleanup();
    renderAccount('reset-password');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });
    submitForm('Reset password');
    expect(screen.getByRole('status').textContent).toMatch(/password was not changed/i);
  });

  it('does not let non-local account creation proceed without a connected signup handler', () => {
    renderAccount('create-account', false);
    fireEvent.change(screen.getByLabelText('Student index number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jordan' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });

    submitForm('Create your account');

    expect(screen.getByRole('alert').textContent).toMatch(/not configured/i);
    expect(screen.queryByRole('heading', { name: 'Library overview' })).toBeNull();
  });

  it('creates account and student profile through the single signup form', async () => {
    const createStudent = vi.fn().mockResolvedValue('confirmation');
    render(<MemoryRouter initialEntries={['/create-account']}><AccountPage mode="create-account" localDemo={false} onCreateStudent={createStudent} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Student index number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jordan' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });
    submitForm('Create your account');
    await waitFor(() => expect(createStudent).toHaveBeenCalledWith({ indexNumber: 'S-101', firstName: 'Jordan', lastName: 'Mensah', programme: 'Computer Science', level: 'Level 300' }, 'jordan@example.test', 'password8'));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringMatching(/check your email, then sign in to continue/i));
  });

  it('uses the complete signup form for an account that needs a student profile', async () => {
    const createStudent = vi.fn().mockResolvedValue('ready');
    render(<MemoryRouter initialEntries={['/create-account']}><CurrentPath /><AccountPage mode="create-account" localDemo={false} onCreateStudent={createStudent} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Student index number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ama@example.edu' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });
    submitForm('Create your account');
    await waitFor(() => expect(createStudent).toHaveBeenCalledWith({ indexNumber: 'S-101', firstName: 'Ama', lastName: 'Mensah', programme: 'Computer Science', level: 'Level 300' }, 'ama@example.edu', 'password8'));
    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('current-route').textContent).toBe('/student'));
  });

  it('uses the existing sign-in callback for non-local authentication', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    renderAccount('sign-in', false, signIn);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'existing-password' } });

    submitForm('Sign in to your library');

    expect(signIn).toHaveBeenCalledWith('jordan@example.test', 'existing-password', 'STUDENT');
    await waitFor(() => expect(screen.getByTestId('current-route').textContent).toBe('/dashboard'));
    expect(await screen.findByRole('heading', { name: 'Library overview' })).toBeTruthy();
  });
});
