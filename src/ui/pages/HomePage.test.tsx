import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  observed: Element[];
};

const observers: ObserverRecord[] = [];

class TestIntersectionObserver {
  private record: ObserverRecord;

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback, observed: [] };
    observers.push(this.record);
  }

  observe(target: Element) {
    this.record.observed.push(target);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe('LibTrack welcome page', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the brand, public sections, existing workflow areas, and account links', () => {
    renderHome();

    expect(screen.getByRole('heading', { name: 'Welcome to LibTrack' })).toBeTruthy();
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const section of ['Home', 'Features', 'About', 'FAQ', 'Contact']) {
      expect(within(navigation).getByRole('link', { name: section })).toBeTruthy();
    }
    for (const feature of ['Catalog', 'Members', 'Circulation', 'Holds']) {
      expect(screen.getByRole('heading', { name: feature })).toBeTruthy();
    }
    expect(within(navigation).getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/sign-in');
    expect(screen.getAllByRole('link', { name: 'Get started' }).every(link => link.getAttribute('href') === '/create-account')).toBe(true);
    expect(screen.getByRole('link', { name: /Watch demo/i }).getAttribute('href')).toBe('#how-it-works');
  });

  it('keeps the dashboard preview free of fabricated metric values', () => {
    renderHome();

    const preview = screen.getByRole('img', { name: 'LibTrack dashboard preview' });
    expect(preview.textContent).not.toMatch(/\b\d+\b/);
  });

  it('counts the four current feature areas only after the feature strip is revealed', async () => {
    renderHome();

    const count = screen.getByLabelText('Current LibTrack feature areas');
    expect(count.textContent).toBe('0');
    const observer = observers.find(item => item.observed.includes(count));
    expect(observer).toBeTruthy();
    const bounds = count.getBoundingClientRect();
    observer!.callback([{
      time: 0,
      rootBounds: null,
      boundingClientRect: bounds,
      intersectionRect: bounds,
      isIntersecting: true,
      intersectionRatio: 1,
      target: count,
    }], {} as IntersectionObserver);
    await waitFor(() => expect(count.textContent).toBe('4'));
  });

  it('shows the final feature-area count immediately when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    renderHome();

    expect(screen.getByLabelText('Current LibTrack feature areas').textContent).toBe('4');
  });

  it('opens and closes the mobile navigation with its button and link selection', () => {
    renderHome();

    const menu = screen.getByRole('button', { name: 'Open navigation' });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menu);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Features' }));
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });
});
