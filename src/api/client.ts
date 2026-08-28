import { getBrowserSupabase } from '../lib/supabaseBrowser';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 500, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  try {
    const supabase = getBrowserSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch (err) {
    console.warn('[AUTH] Error fetching session from Supabase browser client:', err);
  }

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('careervoice_supabase_access_token');
    if (stored && stored !== 'undefined' && stored !== 'null') {
      return stored;
    }
  }

  return null;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new ApiClientError('AUTH_SESSION_MISSING', 401, 'AUTH_SESSION_MISSING');
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    const token = await getValidAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText || 'API request failed';
    const code = data?.code || (response.status === 503 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED');
    throw new ApiClientError(message, response.status, code, data?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, headers?: HeadersInit) => request<T>(url, { method: 'GET', headers }),
  post: <T>(url: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),
};

