import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Workspace } from './Workspace';
import { MemoryRouter } from 'react-router-dom';

function renderWorkspace() { return render(<MemoryRouter><Workspace staff={{ displayName: 'Library Staff', role: 'LIBRARIAN' }} localDevelopment signOut={vi.fn()} /></MemoryRouter>); }

describe('LibTrack librarian attendance and student setup', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/api/v1/dashboard/summary')) {
        return Response.json({ titles: 0, activeMembers: 0, availableCopies: 0, onLoanCopies: 0, overdueLoans: 0, dueToday: 0, actionableHolds: 0, registeredStudents: 0, currentlyInside: 0, todayAttendance: 0, recentActivity: [] });
      }
      if (path.endsWith('/api/v1/members') && init?.method === 'POST') return Response.json({ id: 'new-member' }, { status: 201 });
      if (path.includes('/api/v1/members')) {
        return Response.json({ items: [], page: 0, size: 50, total: 0 });
      }
      if (path === '/api/v1/attendance/current') return Response.json([]);
      if (path.includes('/api/v1/attendance/history')) return Response.json({ items: [], page: 0, size: 25, total: 0 });
      if (init?.method === 'POST') return Response.json({ id: 'new-member' }, { status: 201 });
      return Response.json({});
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('collects programme and level when registering a student', async () => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Library members' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add member' }));

    fireEvent.change(screen.getByLabelText('Library number'), { target: { value: 'S-101' } });
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Programme / department'), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText('Level / year'), { target: { value: 'Level 300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save member' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/api/v1/members')
      && init?.method === 'POST' && String(init.body).includes('"programme":"Computer Science"'))).toBe(true));
    const createCall = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/api/v1/members') && init?.method === 'POST');
    expect(JSON.parse(String(createCall?.[1]?.body)).level).toBe('Level 300');
  });

  it('opens the attendance page with current presence and visit history sections', async () => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Library attendance' }));
    expect(await screen.findByRole('heading', { name: 'Library attendance' })).toBeTruthy();
    expect(await screen.findByText('No students are currently checked in.')).toBeTruthy();
    expect(await screen.findByText('No attendance records match this search.')).toBeTruthy();
  });

  it('sends check-in and check-out actions to the attendance API', async () => {
    const visit = { id: 'visit-1', memberId: 'student-1', libraryNumber: 'S-101', studentName: 'Ama Mensah',
      programme: 'Computer Science', level: 'Level 300', checkedInAt: '2026-11-24T08:00:00Z', checkedOutAt: null };
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/api/v1/dashboard/summary')) return Response.json({ titles: 0, activeMembers: 0, availableCopies: 0, onLoanCopies: 0, overdueLoans: 0, dueToday: 0, actionableHolds: 0, registeredStudents: 0, currentlyInside: 0, todayAttendance: 0, recentActivity: [] });
      if (path.includes('/api/v1/members')) return Response.json({ items: [{ id: 'student-1', libraryNumber: 'S-101', firstName: 'Ama', lastName: 'Mensah', memberType: 'STUDENT', email: null, phone: null, status: 'ACTIVE', programme: 'Computer Science', level: 'Level 300' }], page: 0, size: 50, total: 1 });
      if (path.endsWith('/api/v1/attendance/current')) return Response.json([visit]);
      if (path.includes('/api/v1/attendance/history')) return Response.json({ items: [visit], page: 0, size: 25, total: 1 });
      return Response.json(visit, { status: init?.method === 'POST' ? 201 : 200 });
    });

    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Library attendance' }));
    await screen.findAllByText('Ama Mensah');
    fireEvent.change(screen.getByRole('combobox', { name: 'Student to check in' }), { target: { value: 'student-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record arrival' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/api/v1/attendance/check-in')
      && init?.method === 'POST' && String(init.body).includes('"memberId":"student-1"'))).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Record departure' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/api/v1/attendance/visit-1/check-out')
      && init?.method === 'POST')).toBe(true));
  });

  it('keeps the attendance filters mounted while search results refresh', async () => {
    renderWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Library attendance' }));
    const search = await screen.findByLabelText('Search student or programme');
    fireEvent.change(search, { target: { value: 'Computer Science' } });
    expect(screen.getByLabelText('Search student or programme')).toBeTruthy();
  });
});
