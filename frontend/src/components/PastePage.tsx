import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deletePaste, getPasteBySlug } from '../api';
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
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    getPasteBySlug(slug)
      .then(setPaste)
      .catch((err) => setError(err instanceof Error ? err.message : 'Paste not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleUnlock(password: string) {
    if (!slug) return;
    try {
      const p = await getPasteBySlug(slug, password);
      setPaste(p);
      setUnlocked(true);
      setPasswordError('');
    } catch {
      setPasswordError('Incorrect password');
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(window.location.href);
    onToast('Copied to clipboard');
  }

  async function handleCopyContent() {
    if (!paste) return;
    await navigator.clipboard.writeText(paste.content);
    onToast('Copied to clipboard');
  }

  async function handleDelete() {
    if (!paste || !token) return;
    try {
      await deletePaste(paste.id, token);
      onToast('Paste deleted');
      navigate('/');
    } catch {
      onToast('Failed to delete paste');
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
            <button className="danger-button" type="button" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      {needsPassword ? (
        <div className="panel paste-password-wrap">
          <PasswordProtected
            title={paste.title}
            errorMessage={passwordError}
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
