import { Paste } from '../types';
import { formatDate, formatViews } from '../utils/pastes';

interface PasteCardProps {
  paste: Paste;
  isActive: boolean;
  onOpen: (pasteId: string) => void;
}

function PasteCard({ paste, isActive, onOpen }: PasteCardProps) {
  function handleOpen() {
    onOpen(paste.id);
  }

  return (
    <article className="paste-card">
      <button
        className={`paste-card-button${isActive ? ' is-active' : ''}`}
        type="button"
        onClick={handleOpen}
        aria-pressed={isActive}
      >
        <div className="paste-card-top">
          <div>
            <h3>{paste.title}</h3>
            <p className="muted">
              {paste.author} · {formatDate(paste.createdAt)}
            </p>
          </div>
          <div className="paste-card-badges">
            <span className="language-badge">{paste.language}</span>
            {paste.visibility === 'private' ? <span className="status-badge">Private</span> : null}
            {paste.requiresPassword ? <span className="status-badge">Password</span> : null}
          </div>
        </div>

        <div className="paste-card-meta">
          <span>{formatViews(paste.views)} views</span>
          <span>{paste.role}</span>
          <span>{paste.expiresIn}</span>
        </div>

        <div className="tag-row" aria-label="Paste tags">
          {paste.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>

        {paste.syncStatus === 'syncing' ? <p className="sync-text">Syncing with server</p> : null}
      </button>
    </article>
  );
}

export default PasteCard;
