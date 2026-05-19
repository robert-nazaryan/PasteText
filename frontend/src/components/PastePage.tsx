import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, deletePaste, getPasteBySlug } from '../api';
import { Paste } from '../types';
import { formatDate, formatViews } from '../utils/pastes';
import PasswordProtected from './PasswordProtected';
import SyntaxHighlight from './SyntaxHighlight';

interface PastePageProps {
  token: string | null;
  authEmail: string | null;
  onToast: (message: string) => void;
}

function PastePage({ token, authEmail, onToast }: PastePageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setUnlocked(false);
    setPasswordError('');
    getPasteBySlug(slug)
      .then((p) => {
        if (!cancelled) setPaste(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          // Password-protected paste: backend returns 403, but we still need to render the form.
          setPaste({
            id: '',
            slug,
            title: 'Protected paste',
            author: '',
            role: 'USER',
            language: 'auto',
            tags: [],
            content: '',
            createdAt: new Date().toISOString(),
            views: 0,
            visibility: 'private',
            burnAfterRead: false,
            requiresPassword: true,
            expiresIn: 'Never',
          });
          return;
        }
        setError(err instanceof Error ? err.message : 'Paste not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleUnlock(password: string) {
    if (!slug) return;
    setUnlocking(true);
    setPasswordError('');
    try {
      const p = await getPasteBySlug(slug, password);
      setPaste(p);
      setUnlocked(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPasswordError('Incorrect password');
      } else {
        setPasswordError(err instanceof Error ? err.message : 'Failed to unlock paste');
      }
    } finally {
      setUnlocking(false);
    }
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onToast('Copied to clipboard');
    } catch {
      onToast('Failed to copy URL');
    }
  }

  async function handleCopyContent() {
    if (!paste) return;
    try {
      await navigator.clipboard.writeText(paste.content);
      onToast('Copied to clipboard');
    } catch {
      onToast('Failed to copy content');
    }
  }

  async function handleDelete() {
    if (!paste || !token) return;
    setDeleting(true);
    try {
      await deletePaste(paste.id, token);
      onToast('Paste deleted');
      navigate('/');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to delete paste');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="paste-page">
        <div className="paste-page-skeleton">
          <div className="skeleton-card" style={{ height: 56 }} aria-hidden="true" />
          <div className="skeleton-card" style={{ height: 420 }} aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="paste-page">
        <Link to="/" className="back-link">← All pastes</Link>
        <div className="panel paste-not-found">
          <h2>Paste not found</h2>
          <p className="muted">{error || 'This paste may have been deleted or expired.'}</p>
          <Link to="/" className="primary-button">Go home</Link>
        </div>
      </div>
    );
  }

  const needsPassword = paste.requiresPassword && !unlocked;
  const isOwner = !!authEmail && paste.author === authEmail;

  return (
    <div className="paste-page">
      <div className="paste-page-nav">
        <Link to="/" className="back-link">← All pastes</Link>
        <div className="paste-page-actions">
          <button className="secondary-button" type="button" onClick={handleCopyUrl}>
            Copy URL
          </button>
          {!needsPassword && (
            <button className="secondary-button" type="button" onClick={handleCopyContent}>
              Copy content
            </button>
          )}
          {isOwner && !needsPassword && (
            <button
              className="danger-button"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {needsPassword ? (
        <div className="panel paste-password-wrap">
          <PasswordProtected
            title={paste.title}
            errorMessage={passwordError}
            isSubmitting={unlocking}
            onSubmit={handleUnlock}
          />
        </div>
      ) : (
        <article className="paste-article">
          <header className="paste-article-header">
            <div>
              <h1 className="paste-title">{paste.title}</h1>
              <p className="muted">
                {paste.author} · {formatDate(paste.createdAt)} · {formatViews(paste.views)} views
              </p>
            </div>
            <div className="paste-article-badges">
              <span className="language-badge">{paste.language}</span>
              <span className="status-badge">{paste.visibility}</span>
              {paste.expiresIn !== 'Never' && (
                <span className="status-badge">Expires: {paste.expiresIn}</span>
              )}
            </div>
          </header>

          {paste.tags.length > 0 && (
            <div className="tag-row">
              {paste.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="paste-url-bar">
            <code>/p/{paste.slug}</code>
          </div>

          <SyntaxHighlight code={paste.content} language={paste.language} />
        </article>
      )}
    </div>
  );
}

export default PastePage;
