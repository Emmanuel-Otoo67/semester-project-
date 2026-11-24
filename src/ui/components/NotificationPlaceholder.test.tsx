import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api/http', () => ({ apiFetch: vi.fn() }));
import { apiFetch } from '../api/http';
import { NotificationPlaceholder } from './NotificationPlaceholder';

describe('NotificationPlaceholder', () => {
  it('opens an accessible empty state without calling the API', () => {
    render(<NotificationPlaceholder />);

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.getByRole('region', { name: /notifications/i })).toBeTruthy();
    expect(screen.getByText(/no notifications to show yet/i)).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
