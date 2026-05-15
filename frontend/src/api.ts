import { CreatePasteFormValues, Paste } from './types';

const API = '/api/v1';

export interface AuthData {
  accessToken: string;
  email: string;
  role: string;
}

interface BackendPaste {
  id: string;
  title: string | null;
  content: string | null;
  shortLink: string;
  isPublic: boolean;
  passwordProtected: boolean;
  tags: string[];
  views: number;
  authorEmail: string;
  expiresAt: string | null;
  createdAt: string;
}

interface BackendPage<T> {
  content: T[];
}

function expiresAtParam(expiresIn: string): string | undefined {
  const d = new Date();
  switch (expiresIn) {
    case '10 minutes': d.setMinutes(d.getMinutes() + 10); break;
    case '1 hour':     d.setHours(d.getHours() + 1);     break;
    case '1 day':      d.setDate(d.getDate() + 1);        break;
    case '7 days':     d.setDate(d.getDate() + 7);        break;
    case '30 days':    d.setDate(d.getDate() + 30);       break;
    default:           return undefined;
  }
  return d.toISOString().slice(0, 19);
}

function mapExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return 'Never';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(diff / 3600000);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.round(diff / 86400000);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function mapPaste(bp: BackendPaste): Paste {
  return {
    id: bp.id,
    slug: bp.shortLink,
    title: bp.title || 'Untitled paste',
    author: bp.authorEmail,
    role: 'USER',
    language: 'auto',
    tags: bp.tags ?? [],
    content: bp.content ?? '',
    createdAt: bp.createdAt,
    views: bp.views,
    visibility: bp.isPublic ? 'public' : 'private',
    burnAfterRead: false,
    requiresPassword: bp.passwordProtected,
    expiresIn: mapExpiresAt(bp.expiresAt),
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthData> {
  return apiFetch<AuthData>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string): Promise<AuthData> {
  return apiFetch<AuthData>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchPastes(token?: string | null): Promise<Paste[]> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = token ? '/pastes?size=50&publicOnly=false' : '/pastes?size=50';
  const data = await apiFetch<BackendPage<BackendPaste>>(url, { headers });
  return data.content.map(mapPaste);
}

export async function createPaste(values: CreatePasteFormValues, token: string): Promise<Paste> {
  const body: Record<string, unknown> = {
    content: values.content,
    isPublic: values.visibility === 'public',
    tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
  };
  if (values.title.trim()) body.title = values.title.trim();
  if (values.password) body.password = values.password;
  const expiresAt = expiresAtParam(values.expiresIn);
  if (expiresAt) body.expiresAt = expiresAt;

  const bp = await apiFetch<BackendPaste>('/pastes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return mapPaste(bp);
}

export async function deletePaste(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/pastes/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}

export async function getPasteBySlug(slug: string, password?: string): Promise<Paste> {
  const headers: Record<string, string> = {};
  if (password) headers['X-Paste-Password'] = password;
  const bp = await apiFetch<BackendPaste>(`/pastes/${slug}`, { headers });
  return mapPaste(bp);
}