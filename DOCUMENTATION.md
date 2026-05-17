# PasteText — Project Documentation

## Overview

PasteText is a full-stack pastebin-style platform. It consists of two independent Spring Boot 3 microservices and a React TypeScript frontend.

```
PasteText/
├── paste-api/             # Main REST API (auth, paste CRUD, admin, expiration)
├── notification-service/  # Kafka consumer — async email delivery
└── frontend/              # React + TypeScript SPA
```

---

## Architecture

```
Browser (React SPA)
        │  REST (HTTP/JSON)
        ▼
┌─────────────────────────────┐
│         paste-api            │  Spring Boot 3 · Spring Security · JPA
│  Port: 8080                  │  PostgreSQL · Redis · JWT
│  Auth · CRUD · Admin         │  Kafka Producer (3 topics)
│  Expiration · Scheduling     │  @Scheduled tasks
└──────┬──────────────────────┘
       │  Kafka topics
       │  paste.created · user.registered · paste.expiring
       ▼
┌─────────────────────────────┐
│    notification-service      │  Spring Boot 3 · Kafka Consumer
│  Port: 8082                  │  JavaMailSender · Thymeleaf
│  NO database                 │  Manual ack · DLT on failure
└─────────────────────────────┘
```

**Message broker:** Apache Kafka
**Database:** PostgreSQL (paste-api only — notification-service has no DB)
**Auth:** JWT Access Token (24 h) + Refresh Token (30 days, stored in DB)

---

## Backend Service 1 — `paste-api`

### Tech Stack

| Concern    | Technology                     |
|------------|--------------------------------|
| Framework  | Spring Boot 3                  |
| Security   | Spring Security + JJWT         |
| Persistence| Spring Data JPA + Hibernate    |
| Database   | PostgreSQL                     |
| Messaging  | Apache Kafka (producer)        |
| API docs   | SpringDoc OpenAPI (Swagger UI) |
| Scheduling | Spring `@Scheduled`            |
| Build      | Maven                          |

---

### Database Entities

#### `users`
| Column     | Type        | Notes               |
|------------|-------------|---------------------|
| id         | UUID (PK)   | Auto-generated      |
| username   | VARCHAR(50) | Unique, not null    |
| email      | VARCHAR(100)| Unique, not null    |
| password   | TEXT        | BCrypt hash         |
| role       | ENUM        | USER or ADMIN       |
| created_at | TIMESTAMP   | Auto-set on insert  |

#### `pastes`
| Column            | Type        | Notes                    |
|-------------------|-------------|--------------------------|
| id                | UUID (PK)   | Auto-generated           |
| title             | VARCHAR(255)| Optional                 |
| content           | TEXT        | Required                 |
| short_link        | VARCHAR(12) | Unique, auto-generated   |
| password          | TEXT        | BCrypt hash, optional    |
| is_public         | BOOLEAN     | Default: true            |
| category_id       | INT (FK)    | Nullable                 |
| author_id         | UUID (FK)   | Lazy-loaded              |
| views             | BIGINT      | Default: 0               |
| expires_at        | TIMESTAMP   | Nullable                 |
| notified_expiring | BOOLEAN     | Default: false (V6)      |
| created_at        | TIMESTAMP   | JPA auditing             |
| updated_at        | TIMESTAMP   | JPA auditing             |

#### `paste_expirations` (expiration tracking)
| Column     | Type        | Notes                              |
|------------|-------------|------------------------------------|
| id         | UUID (PK)   | Auto-generated                     |
| paste_id   | UUID        | Reference to pastes.id (unique)    |
| short_link | VARCHAR(12) | For logging                        |
| expires_at | TIMESTAMP   | When to delete                     |
| status     | ENUM        | PENDING, DELETED, CANCELLED        |
| created_at | TIMESTAMP   | Auto-set on insert                 |
| deleted_at | TIMESTAMP   | Set when paste is deleted          |

#### `refresh_tokens`
| Column     | Type   | Notes                     |
|------------|--------|---------------------------|
| id         | UUID   | Auto-generated            |
| user_id    | UUID   | FK → users                |
| token      | TEXT   | UUID string, unique       |
| expires_at | TIMESTAMP | 30 days from creation  |
| created_at | TIMESTAMP | Auto-set on insert     |

---

### REST API

Base path: `/api/v1`

#### Auth — `/api/v1/auth`

| Method | Path       | Auth          | Description                    |
|--------|------------|---------------|--------------------------------|
| POST   | `/register`| Public        | Register + sends welcome email |
| POST   | `/login`   | Public        | Login, returns JWT tokens      |
| POST   | `/refresh` | Public        | Exchange refresh token         |
| POST   | `/logout`  | Authenticated | Invalidate refresh token       |

#### Pastes — `/api/v1/pastes`

| Method | Path              | Auth                    | Description              |
|--------|-------------------|-------------------------|--------------------------|
| POST   | `/`               | Authenticated           | Create a new paste       |
| GET    | `/{shortLink}`    | Public                  | Get paste by short link  |
| PUT    | `/{id}`           | Authenticated (owner)   | Update paste             |
| DELETE | `/{id}`           | Authenticated (owner or ADMIN) | Delete paste      |
| GET    | `/`               | Public / Authenticated  | Search & filter pastes   |

#### Admin — `/api/v1/admin/users` and `/api/v1/admin/pastes`

All admin endpoints require `ROLE_ADMIN`.

---

### Expiration Logic

Expiration is handled entirely inside `paste-api`:

1. **Kafka consumer** (`PasteCreatedConsumer`) listens to `paste.created`.
   When a paste with `expiresAt != null` is created, a `PasteExpiration` record (status = `PENDING`) is created in `paste_expirations`.

2. **`ExpirationSchedulerService`** runs three `@Scheduled` jobs:
   - `runExpirationScan` every **5 minutes** — queries `paste_expirations` for `PENDING` records past their `expires_at`, deletes the pastes in batches of 500, marks records as `DELETED`.
   - `runOrphanCleanup` every **1 hour** — safety net deletes any expired paste not tracked by the expiration table.
   - `logMetrics` every **15 minutes** — logs pending deletion count.

3. **`ExpiringNotificationScheduler`** runs every **1 hour**:
   Finds pastes where `expiresAt BETWEEN now AND now+24h AND notified_expiring = false`,
   publishes `paste.expiring` Kafka event for each, then sets `notified_expiring = true`.

4. **Flyway V4** (`V4__create_paste_expirations.sql`) creates the `paste_expirations` table.
   **Flyway V6** (`V6__add_notified_expiring.sql`) adds the `notified_expiring` column.

---

### Kafka Events Published

| Topic           | Trigger                     | Payload                                              |
|-----------------|-----------------------------|------------------------------------------------------|
| paste.created   | Paste created               | pasteId, shortLink, expiresAt                        |
| user.registered | User registered             | userId, username, email, registeredAt                |
| paste.expiring  | 24h before expiry scheduler | pasteId, shortLink, title, authorEmail, authorUsername, expiresAt |

---

### Exception Handling

| Exception               | HTTP Status     |
|-------------------------|-----------------|
| ResourceNotFoundException | 404 Not Found |
| ConflictException         | 409 Conflict  |
| InvalidPasswordException  | 401 Unauthorized |
| InvalidTokenException     | 401 Unauthorized |
| PasteExpiredException     | 410 Gone      |
| AccessDeniedException     | 403 Forbidden |
| Bean validation errors    | 400 Bad Request |

---

### Configuration Properties

```yaml
jwt:
  secret: <base64-encoded-secret>
  expiration-ms: 86400000

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pastetext
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: ...StringSerializer
      value-serializer: ...JsonSerializer
    consumer:
      group-id: paste-api-expiration-group

expiration:
  scan-interval-ms: 300000   # 5 minutes
  batch-size: 500
```

---

## Backend Service 2 — `notification-service`

### Tech Stack

| Concern    | Technology               |
|------------|--------------------------|
| Framework  | Spring Boot 3            |
| Messaging  | Apache Kafka (consumer)  |
| Email      | Spring Mail + Thymeleaf  |
| Scheduling | None (event-driven only) |
| Database   | **None**                 |
| Build      | Maven                    |

---

### How It Works

`notification-service` has **no database**. It is purely event-driven:

1. Consumes `user.registered` → sends welcome email
2. Consumes `paste.expiring` → sends "your paste expires in 24h" email
3. Consumes `paste.shared` → logs only (placeholder for future use)

All listeners use **manual acknowledgment** (`MANUAL_IMMEDIATE`).

**On success:** `ack.acknowledge()` is called — message is committed.
**On failure:** exception is re-thrown — Kafka retries with exponential backoff (1s, 2s, 4s).
**After 3 retries:** message is forwarded to the Dead Letter Topic (DLT).
  - `user.registered.DLT`
  - `paste.expiring.DLT`

---

### Mail Configuration

If `MAIL_USERNAME` is empty or not set:
- Service starts successfully.
- `EmailService` logs a warning and skips sending.
- Kafka messages are still acknowledged (no retry storm for unconfigured mail).

Set in `.env`:
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_app_password
```

---

### Email Templates (Thymeleaf)

| Template             | Subject                              | Variables                                          |
|----------------------|--------------------------------------|----------------------------------------------------|
| `welcome.html`       | Welcome to PasteBin, {username}!     | `username`, `loginUrl`                             |
| `paste-expiring.html`| Your paste expires soon              | `username`, `pasteTitle`, `pasteUrl`, `expiresAt`  |

---

### Configuration Properties

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: notification-group
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}

notification:
  from-email: noreply@pastebin.local
  base-url: http://localhost:3000

server:
  port: 8082
```

---

## Frontend — `frontend/`

### Tech Stack

| Concern  | Technology                |
|----------|---------------------------|
| Framework| React 18                  |
| Language | TypeScript                |
| Syntax   | highlight.js              |
| Build    | Create React App          |
| Serving  | Nginx                     |

### Project Structure

```
frontend/src/
├── App.tsx                    # Root component, all application state
├── types.ts                   # Shared TypeScript types
├── data/pastes.ts             # Static seed data
├── utils/pastes.ts            # Helper functions
└── components/
    ├── Hero.tsx
    ├── SearchBar.tsx
    ├── PasteCard.tsx
    ├── PasteDetail.tsx
    ├── SyntaxHighlight.tsx
    ├── CreatePasteModal.tsx
    └── PasswordProtected.tsx
```

---

## Running Locally

### Prerequisites
- Java 21+, Maven 3.9+
- Node.js 20+ (for frontend only)
- Docker + Docker Compose

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

### Option B — Manual

**paste-api**
```bash
cd paste-api
./mvnw spring-boot:run
# Swagger UI: http://localhost:8080/swagger-ui.html
```

**notification-service**
```bash
cd notification-service
# Set MAIL_USERNAME and MAIL_PASSWORD, or leave empty to skip emails
./mvnw spring-boot:run
```

**frontend**
```bash
cd frontend
npm install && npm start
# Dev server: http://localhost:3000
```

---

## Roles & Authorization Matrix

| Action               | Anonymous | USER | ADMIN |
|----------------------|-----------|------|-------|
| Browse public pastes | Yes       | Yes  | Yes   |
| Read paste           | Yes       | Yes  | Yes   |
| Create paste         | No        | Yes  | Yes   |
| Update own paste     | No        | Yes  | Yes   |
| Delete own paste     | No        | Yes  | Yes   |
| Delete any paste     | No        | No   | Yes   |
| Admin user list      | No        | No   | Yes   |
| Update user role     | No        | No   | Yes   |
| Delete any user      | No        | No   | Yes   |
| View platform stats  | No        | No   | Yes   |
| Bulk delete pastes   | No        | No   | Yes   |

---

## CI/CD

Pipeline: `test-api` → `test-notification` → `build-and-push` → `deploy`

| Job               | Trigger       | Description                              |
|-------------------|---------------|------------------------------------------|
| test-api          | Every push/PR | `mvn verify` on paste-api               |
| test-notification | Every push/PR | `mvn verify` on notification-service    |
| test-frontend     | Every push/PR | `npm test` on frontend                  |
| build-and-push    | Push to main  | Build + push 3 Docker images to GHCR   |
| deploy            | Push to main  | SSH deploy to production server         |
