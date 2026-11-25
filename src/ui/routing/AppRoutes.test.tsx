import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const requests: string[] = [];

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installFetch() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith('/api/v1/session')) {
      return json({ authenticated: true, localDevelopment: true, staffId: 'staff-1',
        displayName: 'Local Development Admin', role: 'ADMIN' });
    }
    if (url.endsWith('/api/v1/dashboard/summary')) {
      return json({ titles: 0, activeMembers: 0, availableCopies: 0, onLoanCopies: 0,
        overdueLoans: 0, dueToday: 0, actionableHolds: 0, registeredStudents: 0, currentlyInside: 0, todayAttendance: 0, recentActivity: [] });
    }
    return json({ items: [], page: 0, size: 50, total: 0 });
  }));
}

async function renderAt(path: string, localMode: boolean) {
  vi.resetModules();
  vi.stubEnv('VITE_LIBTRACK_LOCAL_DEV', String(localMode));
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
  installFetch();
  const { default: AppRoutes } = await import('./AppRoutes');
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
}

describe('LibTrack route shell', () => {
  beforeEach(() => {
    requests.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('renders the public homepage without waiting for an API session', async () => {
    await renderAt('/', true);

    expect(screen.getByRole('heading', { name: 'Welcome to LibTrack' })).toBeTruthy();
    expect(requests).toEqual([]);
  });

  it('loads the local workspace from a direct dashboard URL', async () => {
    await renderAt('/dashboard', true);

    expect(await screen.findByRole('heading', { name: 'Library overview' })).toBeTruthy();
    expect(requests.some(url => url.endsWith('/api/v1/session'))).toBe(true);
  });

  it('sends a non-local visitor without a session to sign in', async () => {
    await renderAt('/dashboard', false);

    expect(await screen.findByRole('heading', { name: 'Sign in to your library' })).toBeTruthy();
  });

  it('shows the local demo sign-in screen without preloading the dashboard session', async () => {
    await renderAt('/sign-in', true);

    expect(await screen.findByRole('heading', { name: 'Sign in to your library' })).toBeTruthy();
    expect(screen.getByText(/local demo/i)).toBeTruthy();
    expect(requests.some(url => url.endsWith('/api/v1/session'))).toBe(false);
  });

  it('renders the forgot-password route directly', async () => {
    await renderAt('/forgot-password', false);

    expect(screen.getByRole('heading', { name: 'Forgot password' })).toBeTruthy();
  });

  it('returns unknown paths to the homepage', async () => {
    await renderAt('/not-a-page', false);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Welcome to LibTrack' })).toBeTruthy());
  });
});
