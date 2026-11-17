const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export type ApiProblem = { title?: string; detail?: string; message?: string; fieldErrors?: Record<string, string> };

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly problem?: ApiProblem) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'The LibTrack API could not be reached. Check your connection and try again.');
  }
  if (response.status === 401) window.dispatchEvent(new CustomEvent('libtrack:unauthorized'));
  if (!response.ok) {
    const problem = await response.json().catch(() => undefined) as ApiProblem | undefined;
    const message = problem?.detail ?? problem?.message ?? (response.status === 403
      ? 'This account does not have access to that LibTrack workspace.'
      : `The request failed (${response.status}). Try again.`);
    throw new ApiError(response.status, message, problem);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
