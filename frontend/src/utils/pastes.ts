import { CreatePasteFormValues, Paste, PasteLanguage } from '../types';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const languageOptions: Array<{ value: PasteLanguage; label: string }> = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'yaml', label: 'YAML' },
  { value: 'nginx', label: 'nginx' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: 'Plain text' },
];

export const expiryOptions = [
  'Never',
  '10 minutes',
  '1 hour',
  '1 day',
  '7 days',
  '30 days',
];

export function generateBase62Slug(length = 8): string {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * BASE62.length);
    return BASE62[index];
  }).join('');
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatViews(views: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(views);
}

export function parseTags(tags: string): string[] {
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function buildPaste(values: CreatePasteFormValues, author: string): Paste {
  return {
    id: crypto.randomUUID(),
    slug: generateBase62Slug(),
    title: values.title.trim() || 'Untitled paste',
    author,
    role: 'USER',
    language: values.language,
    tags: parseTags(values.tags),
    content: values.content,
    createdAt: new Date().toISOString(),
    views: 0,
    visibility: values.visibility,
    burnAfterRead: values.burnAfterRead,
    requiresPassword: Boolean(values.password),
    password: values.password || undefined,
    expiresIn: values.expiresIn,
    syncStatus: 'syncing',
  };
}
