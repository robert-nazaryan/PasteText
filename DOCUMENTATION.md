# PasteText — Project Documentation

## Overview

PasteText is a full-stack pastebin-style platform. It consists of two independent Java Spring Boot microservices and a React TypeScript frontend.

```
PasteText/
├── paste-api/          # Main REST API (auth, paste CRUD, admin)
├── paste-expiration/   # Expiration microservice (Kafka consumer + scheduler)
└── frontend/           # React + TypeScript SPA
```

---

## Architecture

```
Browser (React SPA)
        │  REST (HTTP/JSON)
        ▼
┌─────────────────────┐
│     paste-api        │  Spring Boot 3 · Spring Security · JPA
│  Port: 8080          │  PostgreSQL · JWT · Kafka Producer
└──────┬──────────────┘
       │  Kafka topic: paste.created
       ▼
┌─────────────────────┐
│  paste-expiration    │  Spring Boot 3 · Kafka Consumer · Scheduler
│  Port: 8081          │  PostgreSQL (shared DB)
└─────────────────────┘
```

**Message broker:** Apache Kafka
**Database:** PostgreSQL (both services share the same DB)
**Auth:** JWT Access Token (24 h) + Refresh Token (30 days, stored in DB)

---

## Backend Service 1 — `paste-api`

### Tech Stack

| Concern | Technology |
|---|---|
| Framework | Spring Boot 3 |
| Security | Spring Security + JJWT |
| Persistence | Spring Data JPA + Hibernate |
| Database | PostgreSQL |
| Messaging | Apache Kafka (producer) |
| API docs | SpringDoc OpenAPI (Swagger UI) |
| Build | Maven |

---

### Database Entities

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| username | VARCHAR(50) | Unique, not null |
| email | VARCHAR(100) | Unique, not null |
| password | TEXT | BCrypt hash |
| role | ENUM(USER, ADMIN) | Default: USER |
| created_at | TIMESTAMP | Auto-set on insert |

#### `pastes`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| title | VARCHAR(255) | Optional |
| content | TEXT | Required |
| short_link | VARCHAR(12) | Unique, auto-generated |
| password | TEXT | BCrypt hash, optional |
| is_public | BOOLEAN | Default: true |
| category_id | INT (FK) | Nullable |
| author_id | UUID (FK → users) | Lazy-loaded |
| views | BIGINT | Default: 0 |
| expires_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | JPA auditing |
| updated_at | TIMESTAMP | JPA auditing |

#### `categories`
| Column | Type | Notes |
|---|---|---|
| id | INT (PK) | Auto-increment |
| name | VARCHAR(50) | Unique |

#### `tags`
| Column | Type | Notes |
|---|---|---|
| id | INT (PK) | Auto-increment |
| name | VARCHAR(50) | Unique |

#### `paste_tags` (join table)
| Column | Type |
|---|---|
| paste_id | UUID (FK) |
| tag_id | INT (FK) |

#### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK → users) | Lazy-loaded |
| token | TEXT | UUID string, unique |
| expires_at | TIMESTAMP | 30 days from creation |
| created_at | TIMESTAMP | Auto-set on insert |

---

### REST API

Base path: `/api/v1`

---

#### Auth — `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Login, returns JWT tokens |
| POST | `/refresh` | Public | Exchange refresh token for new tokens |
| POST | `/logout` | Authenticated | Invalidate refresh token |

**POST /register — Request Body**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

**POST /login — Request Body**
```json
{
  "username": "alice",
  "password": "secret123"
}
```

**POST /refresh — Request Body**
```json
{
  "refreshToken": "<uuid-string>"
}
```

**Auth Response (register / login / refresh)**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<uuid>",
  "username": "alice",
  "role": "USER",
  "expiresIn": 86400
}
```

---

#### Pastes — `/api/v1/pastes`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Authenticated | Create a new paste |
| GET | `/{shortLink}` | Public | Get paste by short link |
| PUT | `/{id}` | Authenticated (owner) | Update paste |
| DELETE | `/{id}` | Authenticated (owner or ADMIN) | Delete paste |
| GET | `/` | Public / Authenticated | Search & filter pastes |

**POST / — Request Body**
```json
{
  "title": "My snippet",
  "content": "console.log('hello')",
  "isPublic": true,
  "password": "optional-password",
  "categoryId": 1,
  "tags": ["javascript", "node"],
  "expiresAt": "2026-12-31T23:59:59"
}
```

**GET /{shortLink}**
- If paste is password-protected, pass the password via header: `X-Paste-Password: <raw-password>`
- Increments the `views` counter on each successful read.
- Returns `410 Gone` (via `PasteExpiredException`) if expired.

**GET / — Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| keyword | String | — | Full-text search in title and content |
| categoryId | Integer | — | Filter by category |
| tag | String | — | Filter by tag name |
| authorUsername | String | — | Filter by author |
| publicOnly | Boolean | true | Show only public pastes |
| createdFrom | DateTime | — | Lower bound (yyyy-MM-dd'T'HH:mm:ss) |
| createdTo | DateTime | — | Upper bound |
| sortBy | String | createdAt | One of: `createdAt`, `views`, `title` |
| sortDir | String | desc | `asc` or `desc` |
| page | Integer | 0 | Page number (0-based) |
| size | Integer | 20 | Page size |

**Paste Response**
```json
{
  "id": "uuid",
  "title": "My snippet",
  "content": "console.log('hello')",
  "shortLink": "abc123xyz",
  "isPublic": true,
  "passwordProtected": false,
  "category": "JavaScript",
  "tags": ["javascript", "node"],
  "views": 42,
  "authorUsername": "alice",
  "expiresAt": "2026-12-31T23:59:59",
  "createdAt": "2026-01-01T10:00:00"
}
```

> Note: The search endpoint (`GET /`) returns a preview (no `content` field). The `GET /{shortLink}` returns the full paste with content.

---

#### Admin — Users `/api/v1/admin/users`

All endpoints require `ROLE_ADMIN`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List users with filters (keyword, page, size) |
| GET | `/{id}` | Get user by UUID |
| PUT | `/{id}` | Update username / email / role |
| DELETE | `/{id}` | Delete user and all their pastes |
| GET | `/stats` | Platform-wide statistics |

**PUT /{id} — Request Body**
```json
{
  "username": "new-name",
  "email": "new@example.com",
  "role": "ADMIN"
}
```

**GET /stats — Response**
```json
{
  "totalUsers": 120,
  "totalPastes": 3400,
  "publicPastes": 2800,
  "privatePastes": 600
}
```

---

#### Admin — Pastes `/api/v1/admin/pastes`

All endpoints require `ROLE_ADMIN`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all pastes (including private), optional `keyword` and `authorId` filters |
| GET | `/{id}` | Get paste by UUID with full content |
| DELETE | `/{id}` | Force-delete a paste |
| DELETE | `/bulk` | Bulk-delete up to 100 pastes by ID |

**DELETE /bulk — Request Body**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### Security

- JWT is validated on every request via `JwtAuthFilter` (Spring Security `OncePerRequestFilter`).
- Token is expected in the `Authorization: Bearer <token>` header.
- Access token lifetime: **24 hours** (`jwt.expiration-ms`).
- Refresh token lifetime: **30 days** (hard-coded constant in `AuthService`).
- Passwords (user and paste) are hashed with **BCrypt**.
- Roles: `USER` and `ADMIN` (stored as `ROLE_USER` / `ROLE_ADMIN` in Spring Security context).

---

### Kafka — Producer

- **Topic:** `paste.created`
- **Trigger:** Fired by `PasteKafkaProducer` immediately after a paste is saved.
- **Key:** Paste UUID string.
- **Payload (`PasteEventDto`):**
  ```json
  {
    "pasteId": "uuid",
    "shortLink": "abc123xyz",
    "expiresAt": "2026-12-31T23:59:59"
  }
  ```
- Only pastes with a non-null `expiresAt` trigger expiration scheduling in the consumer.

---

### Exception Handling

All exceptions are handled globally by `GlobalExceptionHandler`.

| Exception | HTTP Status |
|---|---|
| `ResourceNotFoundException` | 404 Not Found |
| `ConflictException` | 409 Conflict |
| `InvalidPasswordException` | 401 Unauthorized |
| `InvalidTokenException` | 401 Unauthorized |
| `PasteExpiredException` | 410 Gone |
| `AccessDeniedException` | 403 Forbidden |
| Bean validation errors | 400 Bad Request |

---

### Configuration Properties (`application.properties`)

```properties
# JWT
jwt.secret=<base64-encoded-secret>
jwt.expiration-ms=86400000

# PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/pastetext
spring.datasource.username=...
spring.datasource.password=...

# Kafka
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
```

---

## Backend Service 2 — `paste-expiration`

### Tech Stack

| Concern | Technology |
|---|---|
| Framework | Spring Boot 3 |
| Messaging | Apache Kafka (consumer) |
| Persistence | Spring Data JPA |
| Database | PostgreSQL (shared with paste-api) |
| Scheduling | Spring `@Scheduled` |
| Build | Maven |

---

### Database Entities

#### `paste_expirations` (own tracking table)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| paste_id | UUID | Reference to pastes.id |
| short_link | VARCHAR | For logging |
| expires_at | TIMESTAMP | When to delete |
| status | ENUM(PENDING, DELETED) | Tracks deletion state |

---

### Kafka — Consumer

- **Topic:** `paste.created`
- **Consumer group:** `paste-expiration-group`
- **Dead Letter Topic (DLT):** `paste.created.DLT`
- **Acknowledgment:** Manual (only ACKs on success).
- **Behavior:** If the incoming event has a non-null `expiresAt`, the service creates or updates a `PasteExpiration` record with status `PENDING`.
- **DLT handler:** Logs a warning and acknowledges. Requires manual intervention.

---

### Scheduled Jobs

All jobs are defined in `ExpirationSchedulerService`.

| Job | Interval | Description |
|---|---|---|
| `runExpirationScan` | Configurable (default 5 min) | Deletes expired pastes in batches |
| `runOrphanCleanup` | 60 min | Deletes expired pastes NOT tracked by the expiration table (safety net) |
| `logMetrics` | 15 min | Logs the count of pending expirations |

**Expiration scan logic:**
1. Queries `paste_expirations` for records where `expires_at <= now` and `status = PENDING`.
2. Deletes the matching rows from the `pastes` table (via `PasteDeleteRepository`).
3. Marks the expiration records as `DELETED`.
4. Repeats in batches (default batch size: 500) until no more records are due.

---

### Configuration Properties

```properties
# Batch size for expiration scan
expiration.batch-size=500

# Scan interval in ms (default 5 minutes)
expiration.scan-interval-ms=300000

# Kafka
spring.kafka.bootstrap-servers=localhost:9092
spring.kafka.consumer.group-id=paste-expiration-group
spring.kafka.consumer.auto-offset-reset=earliest
```

---

## Frontend — `frontend/`

### Tech Stack

| Concern | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript |
| Syntax highlighting | highlight.js |
| Build | Create React App |
| State | `useState` / `useMemo` (no external state library) |

---

### Project Structure

```
frontend/src/
├── App.tsx                    # Root component, all application state
├── types.ts                   # Shared TypeScript types
├── data/pastes.ts             # Static seed data (mock pastes)
├── utils/pastes.ts            # Helper functions (buildPaste, language/expiry options)
└── components/
    ├── Hero.tsx               # Page header / hero banner
    ├── SearchBar.tsx          # Filters: keyword, language, tag, author, sort
    ├── PasteCard.tsx          # Compact paste summary card
    ├── PasteDetail.tsx        # Full paste viewer (lazy-loaded)
    ├── SyntaxHighlight.tsx    # highlight.js code renderer
    ├── CreatePasteModal.tsx   # Modal form to create a new paste
    └── PasswordProtected.tsx  # Password prompt for locked pastes
```

---

### Types

#### `Paste`
```ts
interface Paste {
  id: string;
  slug: string;
  title: string;
  author: string;
  role: 'USER' | 'ADMIN';
  language: PasteLanguage;
  tags: string[];
  content: string;
  createdAt: string;
  views: number;
  visibility: 'public' | 'private';
  burnAfterRead: boolean;
  requiresPassword: boolean;
  password?: string;
  expiresIn: string;
  syncStatus?: 'idle' | 'syncing';
}
```

#### `CreatePasteFormValues`
```ts
interface CreatePasteFormValues {
  title: string;
  content: string;
  language: PasteLanguage;
  tags: string;          // comma-separated
  visibility: 'public' | 'private';
  expiresIn: string;     // e.g. "Never", "1 hour", "1 day"
  password: string;
  burnAfterRead: boolean;
}
```

#### `PasteLanguage`
`'auto' | 'typescript' | 'javascript' | 'json' | 'bash' | 'yaml' | 'nginx' | 'markdown' | 'plaintext'`

---

### Application State (`App.tsx`)

| State | Type | Description |
|---|---|---|
| `pastes` | `Paste[]` | All loaded pastes |
| `selectedPasteId` | `string \| null` | ID of the currently viewed paste |
| `searchQuery` | `string` | Keyword search input |
| `selectedLanguage` | `PasteLanguage \| 'all'` | Language filter |
| `selectedTag` | `string` | Tag filter |
| `selectedAuthor` | `string` | Author filter |
| `sortOption` | `SortOption` | `newest`, `oldest`, `most-viewed` |
| `currentPage` | `number` | Pagination (1-based, 6 items/page) |
| `isCreateOpen` | `boolean` | Controls the create-paste modal |
| `unlockedPasteIds` | `string[]` | IDs of password-unlocked pastes in this session |
| `toastMessage` | `string` | Brief notification (auto-clears after 2.2 s) |

---

### Features

| Feature | Description |
|---|---|
| Create paste | Modal form with title, content, language, tags, visibility, expiry, optional password, burn-after-read |
| View paste | Click a card to open the detail panel; view count increments locally |
| Password protection | Pastes with a password show a lock prompt; correct password adds ID to `unlockedPasteIds` |
| Burn after read | Paste is removed from state immediately on first open |
| Search & filter | Real-time filtering by keyword (title, tags, content), language, tag, author |
| Sort | By newest, oldest, or most-viewed |
| Pagination | 6 pastes per page, resets to page 1 on any filter change |
| Delete | Owner can delete their paste from the detail panel |
| Copy URL / content | Clipboard buttons in the detail panel |
| Sync indicator | `syncStatus: 'syncing'` briefly shown after create (simulated) |
| Toast notifications | Short-lived messages for create, delete, copy, forbidden access, burn-after-read |

---

### Component Reference

#### `SearchBar`
Props: `searchQuery`, `selectedLanguage`, `selectedTag`, `selectedAuthor`, `sortOption`, `authors[]`, `tags[]`, and their corresponding `onChange` callbacks.

#### `PasteCard`
Props: `paste`, `isActive`, `onOpen(pasteId)`.
Shows: title, author, language tag, view count, creation date, tag badges.

#### `PasteDetail` *(lazy-loaded)*
Props: `paste`, `passwordError`, `canRevealProtectedPaste`, `onUnlock(password)`, `onCopyUrl()`, `onCopyContent()`, `onDelete()`.
Shows full paste content inside `SyntaxHighlight`, or `PasswordProtected` if locked.

#### `CreatePasteModal`
Props: `isOpen`, `values`, `errorMessage`, `isSubmitting`, `onClose()`, `onSubmit()`, `onChange(values)`.
Validates: content must not be blank; password, if set, must be >= 12 characters.

#### `SyntaxHighlight`
Wraps highlight.js to render code blocks with automatic or explicit language detection.

#### `PasswordProtected`
Renders a password input form; calls `onUnlock(password)` on submit; shows `passwordError` if incorrect.

---

## Data Flow

### Creating a Paste (end-to-end)

```
1. User fills CreatePasteModal → clicks Share
2. App.tsx: buildPaste() constructs a Paste object, adds to state
3. [Future integration] POST /api/v1/pastes with JWT in Authorization header
4. paste-api: PasteService.create() saves to DB, calls PasteKafkaProducer
5. Kafka: "paste.created" event published to topic
6. paste-expiration: PasteCreatedConsumer.onPasteCreated() receives event
7. If expiresAt != null → PasteExpirationService.scheduleExpiration() saves PENDING record
8. ExpirationSchedulerService.runExpirationScan() (every 5 min) deletes due pastes
```

### Reading a Password-Protected Paste

```
1. User clicks paste card → handleOpenPaste()
2. If requiresPassword and not in unlockedPasteIds → PasswordProtected shown
3. User enters password → handleUnlock()
4. [Backend] GET /api/v1/pastes/{shortLink} with X-Paste-Password header
5. PasteService.getByShortLink() verifies BCrypt hash
6. On match → content returned, views incremented
```

---

## Roles & Authorization Matrix

| Action | Anonymous | USER | ADMIN |
|---|---|---|---|
| Browse public pastes | Yes | Yes | Yes |
| Read paste by short link | Yes | Yes | Yes |
| Create paste | No | Yes | Yes |
| Update own paste | No | Yes | Yes |
| Delete own paste | No | Yes | Yes |
| Delete any paste | No | No | Yes |
| View admin user list | No | No | Yes |
| Update user role/email | No | No | Yes |
| Delete any user | No | No | Yes |
| View platform stats | No | No | Yes |
| Bulk delete pastes | No | No | Yes |

---

## Running Locally

### Prerequisites
- Java 21+
- Maven 3.9+
- PostgreSQL 15+
- Apache Kafka (with Zookeeper or KRaft)
- Node.js 18+ (for frontend)

### paste-api
```bash
cd paste-api
# Set env vars or edit application.properties:
# DB URL, Kafka bootstrap, JWT secret
./mvnw spring-boot:run
# Swagger UI available at http://localhost:8080/swagger-ui.html
```

### paste-expiration
```bash
cd paste-expiration
./mvnw spring-boot:run
# Listens on Kafka; no HTTP endpoints
```

### frontend
```bash
cd frontend
npm install
npm start
# Dev server at http://localhost:3000
```