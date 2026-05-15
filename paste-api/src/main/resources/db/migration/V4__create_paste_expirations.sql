CREATE TABLE paste_expirations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    paste_id    UUID        NOT NULL UNIQUE,
    short_link  VARCHAR(12) NOT NULL,
    expires_at  TIMESTAMP   NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

CREATE INDEX idx_exp_expires_status
    ON paste_expirations(expires_at, status)
    WHERE status = 'PENDING';
