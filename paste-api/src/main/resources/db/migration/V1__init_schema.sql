CREATE TABLE users (
                       id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       username   VARCHAR(50)  NOT NULL UNIQUE,
                       email      VARCHAR(100) NOT NULL UNIQUE,
                       password   VARCHAR(255) NOT NULL,
                       role       VARCHAR(20)  NOT NULL DEFAULT 'USER',
                       created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
                            id   SERIAL PRIMARY KEY,
                            name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tags (
                      id   SERIAL PRIMARY KEY,
                      name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE pastes (
                        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        title       VARCHAR(255),
                        content     TEXT         NOT NULL,
                        short_link  VARCHAR(12)  NOT NULL UNIQUE,
                        password    VARCHAR(255),
                        is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
                        category_id INT REFERENCES categories(id),
                        author_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
                        views       BIGINT       NOT NULL DEFAULT 0,
                        expires_at  TIMESTAMP,
                        created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
                        updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE paste_tags (
                            paste_id UUID REFERENCES pastes(id) ON DELETE CASCADE,
                            tag_id   INT  REFERENCES tags(id)   ON DELETE CASCADE,
                            PRIMARY KEY (paste_id, tag_id)
);

CREATE INDEX idx_pastes_short_link ON pastes(short_link);
CREATE INDEX idx_pastes_author     ON pastes(author_id);
CREATE INDEX idx_pastes_expires    ON pastes(expires_at) WHERE expires_at IS NOT NULL;