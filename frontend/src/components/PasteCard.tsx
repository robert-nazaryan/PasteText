import { Link } from 'react-router-dom';
import { Paste } from '../types';
import { formatDate, formatViews } from '../utils/pastes';

interface PasteCardProps {
  paste: Paste;
}

function PasteCard({ paste }: PasteCardProps) {
  return (
    <article className="paste-card">
      <Link to={`/p/${paste.slug}`} className="paste-card-button" aria-label={paste.title}>
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
          <span>{paste.expiresIn}</span>
        </div>

        {paste.tags.length > 0 && (
          <div className="tag-row" aria-label="Paste tags">
            {paste.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}

export default PasteCard;
