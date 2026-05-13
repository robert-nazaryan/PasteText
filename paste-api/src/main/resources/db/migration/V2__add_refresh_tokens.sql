CREATE TABLE refresh_tokens (
                                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                token      VARCHAR(512) NOT NULL UNIQUE,
                                expires_at TIMESTAMP   NOT NULL,
                                created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token ON refresh_tokens(token);