export type PasteLanguage =
  | 'auto'
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'bash'
  | 'yaml'
  | 'nginx'
  | 'markdown'
  | 'plaintext';

export type PasteVisibility = 'public' | 'private';

export type SortOption = 'newest' | 'oldest' | 'most-viewed';

export interface Paste {
  id: string;
  slug: string;
  title: string;
  author: string;
  role: 'USER' | 'ADMIN';
  language: PasteLanguage;
  tags: string[];
  content: string;
  createdAt: string;
  views: number;
  visibility: PasteVisibility;
  burnAfterRead: boolean;
  requiresPassword: boolean;
  password?: string;
  expiresIn: string;
  syncStatus?: 'idle' | 'syncing';
}

export interface CreatePasteFormValues {
  title: string;
  content: string;
  language: PasteLanguage;
  tags: string;
  visibility: PasteVisibility;
  expiresIn: string;
  password: string;
  burnAfterRead: boolean;
}
