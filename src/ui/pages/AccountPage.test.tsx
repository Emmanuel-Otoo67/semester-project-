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
      expect(screen.getByLabelText('Your name')).toBeTruthy();
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

  it('rejects malformed email and short account passwords inline', () => {
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } });

    submitForm('Create your account');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Library overview' })).toBeNull();
  });

  it('requires matching passwords when creating an account', () => {
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different8' } });

    submitForm('Create your account');

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('opens the local workspace after a valid demo account form without saving credentials', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderAccount('create-account');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jordan Lee' } });
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

  it('does not let non-local account creation enter the dashboard', () => {
    renderAccount('create-account', false);
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password8' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password8' } });

    submitForm('Create your account');

    expect(screen.getByRole('alert').textContent).toMatch(/not enabled/i);
    expect(screen.queryByRole('heading', { name: 'Library overview' })).toBeNull();
  });

  it('uses the existing sign-in callback for non-local authentication', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    renderAccount('sign-in', false, signIn);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'jordan@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'existing-password' } });

    submitForm('Sign in to your library');

    expect(signIn).toHaveBeenCalledWith('jordan@example.test', 'existing-password');
    await waitFor(() => expect(screen.getByTestId('current-route').textContent).toBe('/dashboard'));
    expect(await screen.findByRole('heading', { name: 'Library overview' })).toBeTruthy();
  });
});
