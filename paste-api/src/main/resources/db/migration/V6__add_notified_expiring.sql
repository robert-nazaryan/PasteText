ALTER TABLE pastes
    ADD COLUMN notified_expiring BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_pastes_expiring_notify
    ON pastes(expires_at)
    WHERE expires_at IS NOT NULL AND notified_expiring = FALSE;
