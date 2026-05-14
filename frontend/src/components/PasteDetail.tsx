import { Paste } from '../types';
import { formatDate, formatViews } from '../utils/pastes';
import PasswordProtected from './PasswordProtected';
import SyntaxHighlight from './SyntaxHighlight';

interface PasteDetailProps {
  paste: Paste | null;
  passwordError: string;
  canRevealProtectedPaste: boolean;
  onUnlock: (password: string) => void;
  onCopyUrl: () => void;
  onCopyContent: () => void;
  onDelete: () => void;
}

function PasteDetail({
  paste,
  passwordError,
  canRevealProtectedPaste,
  onUnlock,
  onCopyUrl,
  onCopyContent,
  onDelete,
}: PasteDetailProps) {
  if (!paste) {
    return (
      <aside className="panel detail-panel empty-detail">
        <p className="section-label">Paste view</p>
        <h2>Select a paste</h2>
        <p className="muted">Open a result to inspect content, copy the short URL, or manage access.</p>
      </aside>
    );
  }

  if (paste.requiresPassword && !canRevealProtectedPaste) {
    return (
      <aside className="panel detail-panel">
        <PasswordProtected
          title={paste.title}
          errorMessage={passwordError}
          onSubmit={onUnlock}
        />
      </aside>
    );
  }

  return (
    <aside className="panel detail-panel" aria-labelledby="detail-title">
      <div className="detail-header">
        <div>
          <p className="section-label">Paste view</p>
          <h2 id="detail-title">{paste.title}</h2>
          <p className="muted">
            {paste.author} · {formatDate(paste.createdAt)} · {formatViews(paste.views)} views
          </p>
        </div>

        <div className="detail-actions">
          <button className="secondary-button" type="button" onClick={onCopyUrl}>
            Copy URL
          </button>
          <button className="secondary-button" type="button" onClick={onCopyContent}>
            Copy Content
          </button>
          <button className="danger-button" type="button" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-meta">
        <span className="language-badge">{paste.language}</span>
        <span className="status-badge">{paste.visibility}</span>
        {paste.burnAfterRead ? <span className="status-badge">Burn after read</span> : null}
        <span className="status-badge">{paste.expiresIn}</span>
      </div>

      <div className="tag-row">
        {paste.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="detail-url">
        <span>Short URL</span>
        <code>/p/{paste.slug}</code>
      </div>

      <SyntaxHighlight code={paste.content} language={paste.language} />
    </aside>
  );
}

export default PasteDetail;
