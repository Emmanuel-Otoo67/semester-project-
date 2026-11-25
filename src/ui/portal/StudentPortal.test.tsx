import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StudentPortal } from './StudentPortal';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('student portal', () => {
  it('shows only the signed-in student workspace with their personal library data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/catalog')) return Response.json({ items: [], page: 0, size: 25, total: 0 });
      if (url.includes('/loans')) return Response.json([{ id: 'loan-1', title: 'Discrete Mathematics', barcode: 'BK-01', checkedOutAt: '2026-11-01T10:00:00Z', dueAt: '2026-12-01T00:00:00Z', returnedAt: null }]);
      if (url.includes('/attendance')) return Response.json([]);
      return Response.json({});
    }));

    render(<StudentPortal student={{ authenticated: true, studentId: 'student-1', libraryNumber: 'S-101',
      displayName: 'Ama Mensah', programme: 'Computer Science', level: 'Level 300', role: 'STUDENT' }}
      token="jwt" signOut={vi.fn(async () => undefined)} />);

    expect(await screen.findByRole('heading', { name: 'Welcome, Ama' })).toBeTruthy();
    expect(screen.getAllByText('S-101').length).toBeGreaterThan(0);
    expect(screen.getByText('Discrete Mathematics')).toBeTruthy();
    expect(screen.getByText('Computer Science · Level 300')).toBeTruthy();
  });
});
