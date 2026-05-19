import { CreatePasteFormValues, Paste } from './types';

const API = '/api/v1';

export interface AuthData {
  accessToken: string;
  email: string;
  role: string;
}

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface BackendErrorBody {
  status?: number;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors | null;
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

function defaultMessageForStatus(status: number): string {
  if (status === 0) return 'Network error - please check your connection';
  if (status === 401) return 'Authentication required';
  if (status === 403) return 'You do not have permission to perform this action';
  if (status === 404) return 'Resource not found';
  if (status === 409) return 'Conflict with current state';
  if (status === 410) return 'Resource is no longer available';
  if (status === 413) return 'Request is too large';
  if (status === 429) return 'Too many requests - please try again later';
  if (status >= 500) return 'Server error - please try again';
  return 'Request failed';
}

async function parseError(res: Response): Promise<ApiError> {
  let body: BackendErrorBody | null = null;
  let raw = '';
  try {
    raw = await res.text();
    if (raw) {
      const parsed = JSON.parse(raw) as BackendErrorBody;
      if (parsed && typeof parsed === 'object') body = parsed;
    }
  } catch {
    // non-JSON body (e.g. HTML error page) - fall through to default message
  }

  const fieldErrors: FieldErrors = body?.fieldErrors && typeof body.fieldErrors === 'object'
    ? body.fieldErrors
    : {};

  const message =
    body?.message ||
    (raw && !body ? raw : '') ||
    defaultMessageForStatus(res.status);

  return new ApiError(message, res.status, fieldErrors);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, options);
  } catch (err) {
    throw new ApiError(defaultMessageForStatus(0), 0);
  }

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as unknown as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('Unexpected response from server', res.status);
  }
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
