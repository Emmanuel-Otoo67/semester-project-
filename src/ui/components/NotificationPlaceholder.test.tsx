import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/http', () => ({ apiFetch: vi.fn() }));
import { apiFetch } from '../api/http';
import { WorkspaceNotifications } from './NotificationPlaceholder';

describe('WorkspaceNotifications', () => {
  it('loads real loan and hold alerts and opens the matching workspace tab', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce([
        { id: 'loan-1', title: 'Library systems', memberName: 'Ama Mensah', dueAt: '2026-01-01T09:00:00Z' },
      ] as never)
      .mockResolvedValueOnce([
        { id: 'hold-1', title: 'Data structures', memberName: 'Kojo Boateng', status: 'READY' },
      ] as never);
    const onNavigate = vi.fn();
    render(<WorkspaceNotifications token="staff-token" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText(/overdue loan/i)).toBeTruthy();
    expect(await screen.findByText(/ready for pickup/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /hold is ready for pickup/i }));
    expect(onNavigate).toHaveBeenCalledWith('holds');
  });
});
