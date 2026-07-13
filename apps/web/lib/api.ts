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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(translateApiError('Failed to fetch'));
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
      lockedBy?: { id: string; name: string };
      expiresAt?: string;
    };
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
    throw err;
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
