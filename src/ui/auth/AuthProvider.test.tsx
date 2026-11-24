import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const requests: Array<{ url: string; authorization: string | null }> = [];
let sessionAttempts = 0;
let mismatchFirst = false;

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
    if (url.endsWith('/api/v1/session')) {
      sessionAttempts += 1;
      if (mismatchFirst && sessionAttempts === 1) {
        return new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }
      return json({
        authenticated: true,
        localDevelopment: true,
        staffId: 'staff-1',
        displayName: 'Local Development Admin',
        role: 'ADMIN',
      });
    }
    if (url.endsWith('/api/v1/dashboard/summary')) {
      return json({ titles: 0, activeMembers: 0, availableCopies: 0, onLoanCopies: 0,
        overdueLoans: 0, dueToday: 0, actionableHolds: 0, recentActivity: [] });
    }
    if (url.endsWith('/api/v1/staff')) return json([]);
    return json({ items: [], page: 0, size: 50, total: 0 });
  }));
}

async function renderApp(localMode: boolean) {
  vi.stubEnv('VITE_LIBTRACK_LOCAL_DEV', String(localMode));
  vi.stubEnv('VITE_SUPABASE_URL', localMode ? '' : 'https://test-project.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', localMode ? '' : 'test-publishable-key');
  const { default: App } = await import('../App');
  return render(React.createElement(App));
}

describe('AuthProvider workspace entry', () => {
  beforeEach(() => {
    vi.resetModules();
    requests.length = 0;
    sessionAttempts = 0;
    mismatchFirst = false;
    installFetch();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('opens the local workspace without a sign-in form or bearer token', async () => {
    await renderApp(true);

    expect(await screen.findByRole('heading', { name: 'Library overview' })).toBeTruthy();
    expect(screen.getByText('LOCAL DEVELOPMENT', { exact: true })).toBeTruthy();
    expect(screen.queryByLabelText('Email address')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
    await waitFor(() => expect(requests.some(request => request.url.endsWith('/api/v1/dashboard/summary'))).toBe(true));
    expect(requests.filter(request => request.url.includes('/api/v1/')).every(request => request.authorization === null)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Staff access' }));
    expect(await screen.findByText(/Staff account linking requires Supabase Auth/)).toBeTruthy();
    expect(screen.queryByLabelText('Supabase Auth user UUID')).toBeNull();
  });

  it('keeps the Supabase sign-in gate when local mode is off', async () => {
    await renderApp(false);

    expect(await screen.findByRole('heading', { name: 'Sign in to your library' })).toBeTruthy();
    expect(requests).toHaveLength(0);
  });

  it('shows a profile mismatch and retries the local session request', async () => {
    mismatchFirst = true;
    await renderApp(true);

    expect(await screen.findByText(/API.*local-dev profile/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Library overview' })).toBeTruthy();
    expect(sessionAttempts).toBe(2);
  });
});
