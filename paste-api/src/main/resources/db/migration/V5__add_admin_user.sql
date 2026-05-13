-- Пароль: Admin1234! (BCrypt)
INSERT INTO users (id, username, email, password, role, created_at)
VALUES (
           gen_random_uuid(),
           'admin',
           'admin@pastebin.local',
           '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
           'ADMIN',
           NOW()
       ) ON CONFLICT (username) DO NOTHING;