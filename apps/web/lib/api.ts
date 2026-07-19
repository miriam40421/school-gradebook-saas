import { translateApiError } from './he';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('accessToken');
}

export function setToken(token: string) {
  sessionStorage.setItem('accessToken', token);
}

export function clearToken() {
  sessionStorage.removeItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function setRefreshToken(token: string) {
  localStorage.setItem('refreshToken', token);
}

export function clearRefreshToken() {
  localStorage.removeItem('refreshToken');
}

export function getDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('deviceToken');
}

export function setDeviceToken(token: string) {
  localStorage.setItem('deviceToken', token);
}

export function clearDeviceToken() {
  localStorage.removeItem('deviceToken');
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearToken();
        clearRefreshToken();
        return false;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return true;
    } catch {
      clearToken();
      clearRefreshToken();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function doFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

function parseErrorResponse(res: Response, body: { message?: string | string[]; lockedBy?: { id: string; name: string }; expiresAt?: string }) {
  const raw =
    typeof body.message === 'string'
      ? body.message
      : Array.isArray(body.message)
        ? body.message.join(', ')
        : res.statusText;
  const err = new Error(translateApiError(raw)) as Error & {
    statusCode?: number;
    lockedBy?: { id: string; name: string };
    expiresAt?: string;
  };
  err.statusCode = res.status;
  if (body.lockedBy) err.lockedBy = body.lockedBy;
  if (body.expiresAt) err.expiresAt = body.expiresAt;
  return err;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await doFetch(path, options, getToken());
  } catch {
    throw new Error(translateApiError('Failed to fetch'));
  }

  const isAuthEndpoint = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/platform/login';
  if (res.status === 401 && !isAuthEndpoint) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      try {
        res = await doFetch(path, options, getToken());
      } catch {
        throw new Error(translateApiError('Failed to fetch'));
      }
    } else {
      if (typeof window !== 'undefined') window.location.replace('/login');
      throw new Error(translateApiError('Unauthorized'));
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
      lockedBy?: { id: string; name: string };
      expiresAt?: string;
    };
    throw parseErrorResponse(res, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchAuthenticatedPdfBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const raw =
      typeof body.message === 'string' ? body.message : res.statusText;
    throw new Error(translateApiError(raw));
  }
  const bytes = await res.arrayBuffer();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function fetchPreviewPdfBlob(
  path: string,
  body?: Record<string, unknown>,
): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const raw =
      typeof body.message === 'string' ? body.message : res.statusText;
    throw new Error(translateApiError(raw));
  }
  const bytes = await res.arrayBuffer();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function fetchAuthenticatedAssetBlob(path: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    const raw =
      typeof body.message === 'string' ? body.message : res.statusText;
    throw new Error(translateApiError(raw));
  }
  const bytes = await res.arrayBuffer();
  const mime = res.headers.get('content-type') ?? 'application/octet-stream';
  return new Blob([bytes], { type: mime });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  // Force application/octet-stream so the browser treats it as a download,
  // not a viewable file (Chrome intercepts application/pdf blobs into the PDF viewer).
  const forceDownload = new Blob([blob], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(forceDownload);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** @deprecated Prefer in-app preview via CertificatePdfPreview */
export async function openAuthenticatedPdf(path: string): Promise<void> {
  const blob = await fetchAuthenticatedPdfBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw new Error(translateApiError('Failed to fetch'));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message)
          ? body.message.join(', ')
          : res.statusText;
    throw new Error(translateApiError(raw));
  }
  return res.json() as Promise<T>;
}
