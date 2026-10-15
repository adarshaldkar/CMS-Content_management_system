# 🗞️ The Gazette — Enterprise Editorial Publishing Platform & Multi-Database Mesh CMS

<div align="center">

  [![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-v18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Redis & BullMQ](https://img.shields.io/badge/BullMQ-Redis_Queues-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)
  [![Docker](https://img.shields.io/badge/Docker-Multi--DB_Mesh-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Security](https://img.shields.io/badge/OWASP_Top_10:2025-Hardened-881337?style=for-the-badge&logo=owasp&logoColor=white)](https://owasp.org/Top10/)
  [![Pentested](https://img.shields.io/badge/Security_Tested-Burp_Suite_%26_ZAP-FF6600?style=for-the-badge)](https://portswigger.net/burp)

  <p align="center">
    <strong>A high-assurance, production-grade editorial publishing platform engineered with zero-trust security, a polyglot 4+ database mesh, a 3-tier offline manuscript auto-save engine, BullMQ async job queues, and real-time Server-Sent Events.</strong>
  </p>

</div>

---

## 📑 Table of Contents

- [Architectural Overview & Data Mesh](#-architectural-overview--data-mesh)
- [Complete Technology Stack](#-complete-technology-stack)
- [Multi-Database Persistence Mesh](#-multi-database-persistence-mesh)
- [Core Architectural Pillars](#-core-architectural-pillars)
  - [1. 3-Tier Editorial Persistence & Crash Recovery (`accident.md`)](#1-3-tier-editorial-persistence--crash-recovery-accidentmd)
  - [2. Asynchronous Job Queues & BullMQ Worker Mesh](#2-asynchronous-job-queues--bullmq-worker-mesh)
  - [3. Real-Time Server-Sent Events (SSE) & Notification Engine](#3-real-time-server-sent-events-sse--notification-engine)
  - [4. Document Ingestion & AST Normalization Pipeline](#4-document-ingestion--ast-normalization-pipeline)
  - [5. Smart Video, oEmbed & SSRF Defense Layer](#5-smart-video-oembed--ssrf-defense-layer)
- [Key Features & User Experiences](#-key-features--user-experiences)
- [Defense-in-Depth Security (OWASP Top 10:2025 Hardened)](#-defense-in-depth-security-owasp-top-102025-hardened)
- [Empirical Security Testing: Burp Suite & OWASP ZAP](#-empirical-security-testing-burp-suite--owasp-zap)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Database Infrastructure Setup](#1-database-infrastructure-setup)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Running the Project](#3-running-the-project)
- [Available Workspace Scripts](#-available-workspace-scripts)
- [Core API Reference](#-core-api-reference)
- [License](#-license)

---

## 🏛️ Architectural Overview & Data Mesh

The Gazette is architected around a strict **Separation of Operational and Analytical Concerns**. Rather than forcing a single database to handle relational transactions, nested JSON document trees, real-time message brokering, and high-volume analytical aggregations, four specialized data stores were deployed:

```text
                                  [ Client Browser ]
                                          │
                            [ Express / NestJS API Gateway ]
                   (Argon2id, JWT Guards, CSRF, Helmet, Throttler)
                                          │
     ┌──────────────────┬─────────────────┴────────────────┬──────────────────┐
     ▼                  ▼                                  ▼                  ▼
[ PostgreSQL ]     [ MongoDB ]                        [ Redis ]         [ ClickHouse ]
 Relational Core    Manuscript Storage               In-Memory Mesh      Columnar Analytics
 • Users & Auth     • Block-tree JSON (TipTap)       • Token Blacklist   • Reading Telemetry
 • RBAC Matrix      • Comment Threads                • Session Store     • Scroll Depth & Reads
 • Editorial State  • Messaging & Conversations      • BullMQ Queues     • Impression Heatmaps
 • Version History  • Unstructured Metadata          • SSE Pub/Sub       • Audit Trail Log
```

---

## 💻 Complete Technology Stack

### **Frontend Client (`client/`)**
* **Core:** React 18 · TypeScript · Vite v8 (ESM fast-bundling)
* **Styling & Typography:** Tailwind CSS · Newsreader (Editorial Serif) · Plus Jakarta Sans · JetBrains Mono
* **Rich Text Editing:** TipTap Headless Editor · Custom Prosemirror Extensions · Markdown / HTML Parsers
* **State & Server Cache:** Zustand (Auth, Local Persistence & UI State) · TanStack Query v5 (Optimistic Updates & Query Caching)
* **Forms & Validation:** React Hook Form · Zod runtime schemas
* **Icons & Visuals:** Lucide React · Radix UI Primitives · Number Flow
* **HTTP & Realtime:** Axios (Automatic credentials & CSRF interceptors) · EventSource (Native SSE stream)

### **Backend Server (`server/`)**
* **Framework:** NestJS 11 · Express (Microservice-ready modular architecture)
* **Security & Crypto:** `@nestjs/throttler` · `helmet` · `argon2` (Argon2id) · `cookie-parser` · `sanitize-html` · `DOMPurify`
* **Queue & Realtime:** BullMQ 12 · Redis 7 (`ioredis`) · Server-Sent Events (SSE) Pub/Sub
* **Database Drivers:** `pg` (PostgreSQL / CockroachDB) · `mongoose` (MongoDB) · `mariadb` · `mysql2` · `@clickhouse/client`
* **Document & Media:** `mammoth` (DOCX parsing) · `pdf-parse` (PDF ingestion) · `sharp` (WebP transcoding & EXIF stripping) · `cloudinary`
* **Logging & Errors:** `pino` structured logger · Centralized `GlobalExceptionFilter` with sanitized `referenceId`
* **API Documentation:** `@nestjs/swagger` OpenAPI 3.0 specification

---

## 🗄️ Multi-Database Persistence Mesh

The Gazette features an enterprise-grade **Multi-Database Persistence Mesh** with runtime atomic switching and zero downtime:

| Database Engine | Type / Role | Port | Connection Driver | Technical Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **PostgreSQL** | Primary ACID Relational Core | `5432` | `pg` Pool (with `pgcrypto`) | Users, RBAC permissions, article metadata, revision snapshots, publishing slots. |
| **MongoDB** | Document & Manuscript Store | `27017` | `mongoose` Models | Rich TipTap JSON block trees, discussions, conversations, unread counters. |
| **Redis** | In-Memory Ephemeral Store | `6379` | `ioredis` Client | BullMQ job queues, token revocation blacklists, rate-limiting counters, SSE fanout. |
| **ClickHouse** | Columnar Analytical Store | `8123` | `@clickhouse/client` HTTP | High-velocity telemetry (scroll depth, 25%/50%/75%/100% read milestones, impressions). |
| **MariaDB** | Alternate SQL Engine | `3307` | `mariadb` Pool | High-throughput relational testing and database switching demonstration. |
| **MySQL** | Alternate SQL Engine | `3308` | `mysql2/promise` Pool | Enterprise SQL adapter validation. |
| **CockroachDB**| Distributed Consensus SQL | `26257`| PostgreSQL wire protocol | Distributed multi-region consensus validation. |

### 🔄 Atomic Fail-Safe Database Switcher (`/api/database`)
* Administrators can switch the active relational engine on-the-fly via `/api/database/switch`.
* The service executes a **pre-flight connection handshake** against the target engine before switching the in-memory proxy pointer.
* If the target database is unreachable, the system automatically aborts the switch, maintaining uptime without dropping active client connections.

---

## 🏛️ Core Architectural Pillars

### 1. 3-Tier Editorial Persistence & Crash Recovery (`accident.md`)
In professional newsrooms, an accidental browser navigation, browser crash, or network dropout must never result in manuscript data loss.

```text
                              AUTHOR TYPES IN EDITOR
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
  Tier 1: In-Memory DOM          Tier 2: Local Recovery        Tier 3: Cloud Database
  (React + TipTap JSON)               (IndexedDB)                 (PostgreSQL / API)
  • Latency: < 1ms               • Latency: ~5-15ms            • Latency: ~200-500ms
  • Immediate keystroke          • Continuous local auto-save  • Debounced (10s) cloud sync
  • Ephemeral                    • Persists across crashes     • Conflict & version check
```

1. **Tier 1 (In-Memory DOM):** Immediate zero-latency keystroke rendering via React 18, Zustand, and TipTap.
2. **Tier 2 (Client Local Recovery via IndexedDB):** 
   - Non-blocking snapshot written to browser IndexedDB every **3 seconds**.
   - Coordinated across tabs via the browser `BroadcastChannel` API to prevent multi-tab draft overwrite collisions.
   - If a crash occurs, a differential modal presents local vs. server timestamp diffs for 1-click recovery.
3. **Tier 3 (Cloud Sync via REST API):** 
   - Debounced network persistence (10 seconds) with optimistic concurrency control using document revision numbers (`version_id`). Stale revision saves are rejected with `409 Conflict`.

---

### 2. Asynchronous Job Queues & BullMQ Worker Mesh
Heavy computations and deferred tasks run off the main Express/NestJS event loop via Redis-backed BullMQ workers:
* **Scheduled Publisher Worker:** Cron worker polling for embargoed articles, promoting states from `SCHEDULED` to `PUBLISHED` at the exact second.
* **Newsletter Broadcast Engine:** Batched email delivery with exponential retry backoff and Dead Letter Queue (DLQ) triage.
* **Document Import Processing:** Asynchronous DOCX/PDF text extraction and AST conversion.
* **Queue Admin Console (`/api/admin/queues`):** Real-time monitoring, job retry, pausing, resuming, and dead-letter cleanup.

---

### 3. Real-Time Server-Sent Events (SSE) & Notification Engine
* Powered by Redis Pub/Sub channels connected to NestJS `@Sse` streams (`/api/notifications/stream`).
* **Tenant-Isolated Channels:** Subscribers only listen to their dedicated channel (`notifications:user:{userId}`).
* Pushes real-time editorial state updates, peer review review comments, mentions, and broadcast announcements without REST polling overhead.

---

### 4. Document Ingestion & AST Normalization Pipeline
* **Native Ingestion:** Upload `.docx` files (parsed via `mammoth`) or `.pdf` files (parsed via `pdf-parse`).
* **Schema Normalization:** Converts incoming documents into semantic TipTap JSON blocks, stripping malicious inline scripts, style tags, and tracking pixels.
* **WordPress / Gutenberg Compatibility:** Dedicated serialization and deserialization endpoints (`/api/documents/gutenberg/parse` and `/api/documents/gutenberg/serialize`).

---

### 5. Smart Video, oEmbed & SSRF Defense Layer
* **Video & Media Resolvers:** Seamless embeds for YouTube, Vimeo, Loom, Spotify, and Twitter/X with automated YouTube transcript extraction (`youtube-transcript`).
* **SSRF Shielding:** Media URL fetchers enforce strict private IP blocklists (blocking RFC 1918 subnets, loopback `127.0.0.1`, and cloud metadata IP `169.254.169.254`), preventing Server-Side Request Forgery against internal infrastructure.
* **Image Sanitization:** Uploaded images are validated via MIME-type magic bytes, stripped of privacy-compromising EXIF/GPS metadata via `sharp`, and converted to modern `.webp`.

---

## ✨ Key Features & User Experiences

### 1. 📈 Live Trending Topics Marquee Ticker (NSE India Style)
* Continuously streams trending articles from the database.
* **Hover-to-Pause:** Hovering over any topic badge pauses the ticker (`animation-play-state: paused`).
* **Manual Toggle:** Right-aligned `⏸` / `▶️` button for play/pause control.
* **Category Pills:** Distinct emojis & accent colors (🔥 AI, ⚡ Cybersecurity, 🏛️ Software Architecture, 🔬 Science, 📈 Money).

### 2. 🔒 Timed Member Paywall & Background Blur Lock
* **7-Second Free Preview:** Unauthenticated guests receive a complimentary countdown preview with a corner toast badge.
* **Blur Lock:** Upon expiration, the manuscript blurs (`filter: blur(12px)` + opacity reduction), and body scrolling locks.
* **Frictionless Auth:** Unclosable modal with inline **Sign In** and **Create Account** tabs for instant 1-click unblur without losing reading progress.
* **Anti-Bypass Protection:** Text selection, copying, and drag interactions are blocked on the locked preview layer.

### 3. ✍️ Full Editorial Studio & CMS Workspace
* **WYSIWYG Editor:** Rich formatting (Headings, Blockquotes, Code snippets, Lists, Pull quotes, Images, Video Embeds).
* **Metadata Management:** Real-time word count, calculated reading time, auto-slug generation, cover image picker.
* **Revision History:** Saves snapshots into `cms_article_revisions` with side-by-side diff inspection and 1-click rollback.
* **Server-Enforced Workflow:** `draft` → `in_review` → `scheduled` → `published` → `archived`.

### 4. 👥 Author Workspace & Social Ecosystem
* **Author Dashboard:** Real-time story stats, draft management, and published catalog.
* **Reader Library:** Saved bookmarks and reading history.
* **Social Interactions:** Real-time likes, discussions/comments with moderation, author and topic following, and multi-platform sharing.

### 5. 🛡️ Admin Governance Suite
* **Editorial Review Queue:** Approve, publish, or reject pending submissions with editorial feedback notes.
* **User Management & RBAC:** Instant role adjustments (`Super Admin`, `Admin`, `Editor`, `Author`, `Reader`).
* **Taxonomy Manager:** Create, update, and monitor Categories and Tags with live usage metrics.
* **Media Library:** Upload images with MIME-type sniffing and unique timestamped UUID filenames.
* **Audit Log Explorer:** Searchable security and governance logs with IP and user metadata.

---

## 🛡️ Defense-in-Depth Security (OWASP Top 10:2025 Hardened)

| OWASP (2025) | Vulnerability Vector | Technical Defense in Gazette |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Privilege Escalation & IDOR | Deny-by-default RBAC/ABAC guards, object-level authorization (`authorId = user.id`), server-enforced state machine transitions. |
| **A02: Security Misconfiguration** | Leaked Headers & Open Ports | Helmet CSP headers, `HttpOnly` + `SameSite=Strict` cookies, locked CORS whitelist, zero leaked stack traces in production. |
| **A03: Supply Chain Failures** | Compromised Dependencies | Deterministic lockfiles, zero unverified CDNs, validated third-party libraries. |
| **A04: Cryptographic Failures** | Weak Password Hashes & Leaks | `Argon2id` password hashing (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`), SHA-256 password reset tokens with 1-hour expiration. |
| **A05: Injection (SQL / XSS)** | Malicious SQL & Script Ingestion | 100% parameterized SQL queries, strict backend `sanitize-html` stripping, frontend `DOMPurify` HTML escaping. |
| **A06: Insecure Design** | Architectural Vulnerabilities | 3-tier persistence against data loss, pre-flight connection checks on DB switches, SSRF-shielded URL resolvers. |
| **A07: Authentication Failures** | Brute Force & Session Replay | Dual JWT token rotation: 15m access token + sliding refresh token with family reuse revocation. Instant Redis JTI token blacklisting on logout. Tiered Redis rate limiting (`@nestjs/throttler`). |
| **A08: Data Integrity Failures** | Malicious File Uploads | Magic-byte MIME sniffing, EXIF/GPS metadata stripping via Sharp, re-encoding uploads to WebP. |
| **A09: Logging Failures** | Untracked Security Breaches | Immutable `AuditLogService` logging all security-sensitive events (`AUTH_LOGIN`, `PASSWORD_RESET`, `ROLE_CHANGE`, `DB_SWITCH`) with IP and User Agent. |
| **A10: Exception Handling** | Info Leakage via Exceptions | Centralized `GlobalExceptionFilter` masking database errors and returning sanitized JSON with unique `referenceId` tracking codes. |

---

## 🔬 Empirical Security Testing: Burp Suite & OWASP ZAP

Gazette's security posture was validated through rigorous manual and automated penetration testing:

```text
                          SECURITY AUDITING METHODOLOGY
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
        [ OWASP ZAP Automation ]                     [ Burp Suite Pro Manual ]
        • OpenAPI Schema Crawling                    • Proxy Interception & Tampering
        • Passive Rule Inspection                    • Repeater IDOR / BOLA Validation
        • Active Scan (SQLi, Traversal, XSS)         • Intruder Rate-Limit Fuzzing
        • Forced Browsing (51+ paths fuzzed)         • Post-Logout Token Replay Testing
```

### 1. Hands-on Penetration Testing with Burp Suite Professional
* **Horizontal IDOR / BOLA Validation (Burp Repeater):** Captured Author A's manuscript update request (`PATCH /api/articles/{articleIdA}`). Tampered target UUID to an article owned by Author B (`articleIdB`) while retaining Author A's Bearer token. Verified that the service returned `403 Forbidden` / `404 Not Found`.
* **Session Revocation Verification:** Captured an active JWT access token, triggered `/api/auth/logout`, and replayed the token against protected endpoints. Verified immediate rejection (`401 Unauthorized`) via the Redis JTI blacklist.
* **Rate-Limit Fuzzing (Burp Intruder):** Fuzzed `/api/auth/login` with 100 rapid requests. Verified that after 5 failed attempts, the backend enforced `429 Too Many Requests` with a valid `Retry-After` header.

### 2. Automated Scanning with OWASP ZAP
* **OpenAPI Specification Ingestion:** Imported the 80KB Swagger schema (`openapi-zap.json`) to guarantee 100% route coverage across all API endpoints.
* **Forced Browsing / Sensitive File Discovery:** Fuzzed 51 common exposed sensitive file paths (`.env`, `.git/config`, `backup.sql`, `docker-compose.yml`, `server.key`). All endpoints correctly returned `404 Not Found` without leaking system stack traces.
* **Active Vulnerability Scanning:** Fuzzed all query parameters, request bodies, and headers against SQL Injection, NoSQL Injection, Path Traversal, and Command Injection payloads. Verified parameterized queries and schema type casting neutralized all injection vectors.

---

## 📁 Project Directory Structure

```text
CMS Project/
├── client/                              # React 18 / Vite Frontend Client
│   ├── src/
│   │   ├── api/                         # Axios REST API services with CSRF headers
│   │   ├── components/
│   │   │   ├── articles/                # Paywall gate, topic nav, filter bar
│   │   │   ├── common/                  # Logo, loading spinners, modals
│   │   │   ├── editor/                  # TipTap WYSIWYG studio & recovery modal
│   │   │   ├── inbox/                   # Messaging & broadcast notification drawer
│   │   │   └── layout/                  # PublicHeader, CategoryNav, TrendingTicker, Footer
│   │   ├── pages/
│   │   │   ├── admin/                   # Governance suite (Review, Users, Taxonomy, Media, Audit, DB Switcher)
│   │   │   ├── auth/                    # Login, Register, Forgot Password, Reset Password
│   │   │   ├── user/                    # Dashboard, Stories Manager, Profile, Settings, Library
│   │   │   ├── HomePage.tsx             # Editorial front page with ticker
│   │   │   ├── ArticleReaderPage.tsx    # Article reader with paywall blur
│   │   │   ├── ArticleEditorPage.tsx    # Full-screen WYSIWYG studio
│   │   │   └── SearchPage.tsx           # Multi-filter search and discovery
│   │   ├── stores/                      # Zustand state stores (Auth, Draft Recovery, UI)
│   │   └── types/                       # TypeScript interfaces and domain types
│   ├── index.html
│   └── vite.config.ts                   # Proxy configuration (Port 3001)
│
├── server/                              # NestJS 11 Backend Server
│   ├── src/
│   │   ├── common/                      # Guards, decorators, filters, pipes, interceptors
│   │   ├── config/                      # Environment schemas and secrets validation
│   │   ├── database/                    # 6 Database service drivers & mesh manager
│   │   ├── domain/                      # Core models (Article, User, Audit, Category)
│   │   ├── modules/
│   │   │   ├── articles/                # Workflow service, revision history, full-text search
│   │   │   ├── auth/                    # Argon2id, JWT token rotation, password reset
│   │   │   ├── audit/                   # Security audit log explorer
│   │   │   ├── categories/ & tags/      # Taxonomy engine
│   │   │   ├── comments/, likes/, etc.  # Social engagement layer
│   │   │   ├── documents/               # DOCX / PDF import & Gutenberg parser
│   │   │   ├── embeds/                  # Smart video & oEmbed resolver with SSRF defense
│   │   │   ├── health/                  # Health check & mesh liveness
│   │   │   ├── jobs/                    # BullMQ queue management & DLQ administration
│   │   │   ├── media/                   # Hardened multipart asset upload (Sharp WebP)
│   │   │   ├── messages/                # Real-time direct messaging & broadcasts
│   │   │   ├── newsletter/              # Batched campaign delivery & subscriber management
│   │   │   ├── notifications/           # Redis Pub/Sub Server-Sent Events (SSE)
│   │   │   ├── privacy/ & legal/        # GDPR compliance, data export, consent tracking
│   │   │   └── users/                   # RBAC directory & user management
│   │   ├── repositories/                # Concrete repositories for 6 DBs + Seamless Proxy
│   │   └── main.ts                      # Hardened bootstrap (Port 3001)
│   └── .env                             # Server environment variables
│
├── docs/                                # Technical specifications & audit reports
│   ├── MASTER-SPEC.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY-AND-CMS.md
│   └── FULL_AUDIT_REPORT.md
├── docker-compose.yml                   # Tuned multi-database container stack
└── package.json                         # Workspace scripts
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Node.js:** v20.x or higher
* **Docker Desktop:** With WSL2 enabled
* **npm:** v10.x or higher

---

### 1. Database Infrastructure Setup

The Gazette's Docker stack is tuned with strict CPU & memory limits to keep local machine resource consumption under ~350 MB RAM:

```bash
# Start the 3 essential core databases (PostgreSQL, MongoDB, Redis):
npm run docker:up

# Alternatively, start the complete 7-database mesh (including MariaDB, MySQL, CockroachDB, ClickHouse):
npm run docker:mesh
```

---

### 2. Environment Configuration

Copy the example environment file in `server/`:

```bash
cp server/.env.example server/.env
```

Ensure the default local database URIs are configured in `server/.env`:
```env
PORT=3001
NODE_ENV=development
CLIENT_URL="http://localhost:5173"

# Core Databases
DATABASE_URL="postgresql://cms:cms_dev_password@localhost:5432/cms_platform?schema=public"
MONGO_URI="mongodb://cms:cms_dev_password@localhost:27017/cms_platform?authSource=admin"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="cms_dev_password"

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
```

---

### 3. Running the Project

Start both the client and server concurrently with one command from the project root:

```bash
npm run dev
```

* **Frontend Client:** [http://localhost:5173](http://localhost:5173)
* **Backend API Gateway:** [http://localhost:3001/api](http://localhost:3001/api)
* **Interactive Swagger Docs:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## 📜 Available Workspace Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts client (Vite) and server (NestJS) concurrently. |
| `npm run dev:client` | Runs only the React frontend on port `5173`. |
| `npm run dev:server` | Runs only the NestJS backend on port `3001`. |
| `npm run build` | Builds production bundles for both client and server. |
| `npm run lint` | Runs TypeScript typechecks and ESLint across both workspaces. |
| `npm run format` | Auto-formats all code files with Prettier. |
| `npm run docker:up` | Boots the 3 essential databases (`postgres`, `mongodb`, `redis`). |
| `npm run docker:mesh` | Boots the full 7-database persistence mesh. |
| `npm run docker:down` | Stops all active Docker containers. |
| `npm run docker:zap` | Launches the OWASP ZAP Webswing container on port `8081`. |
| `npm run docker:prune` | Reclaims dangling Docker containers and image layers. |

---

## 🔌 Core API Reference

### Authentication & Sessions (`/api/auth`)
* `POST /api/auth/register` — Create a new reader or author account.
* `POST /api/auth/login` — Authenticate and receive access token + HttpOnly refresh cookie.
* `POST /api/auth/refresh` — Rotate refresh token family and obtain new access token.
* `POST /api/auth/logout` — Invalidate refresh token and blacklist access token JTI in Redis.
* `GET  /api/auth/me` — Retrieve current authenticated session profile.

### Editorial Articles (`/api/articles`)
* `GET  /api/articles` — Paginated article feed with category, tag, author, and search filters.
* `GET  /api/articles/slug/:slug` — Retrieve published manuscript for reading.
* `POST /api/articles` — Create a new manuscript draft (Author/Editor).
* `PATCH /api/articles/:id` — Update draft content, title, tags, or cover image.
* `POST /api/articles/:id/transition` — Server-enforced editorial state machine transition.
* `GET  /api/articles/:id/revisions` — Retrieve revision history snapshots.

### Asynchronous Queues & Jobs (`/api/admin/queues`)
* `GET  /api/admin/queues` — Overview of all BullMQ queues (active, waiting, completed, failed).
* `GET  /api/admin/queues/:queueName/jobs` — Inspect job list with state filtering.
* `POST /api/admin/queues/:queueName/jobs/:jobId/retry` — Retry a failed Dead Letter Queue (DLQ) job.
* `POST /api/admin/queues/:queueName/pause` — Pause queue processing.

### Real-Time Notifications (`/api/notifications`)
* `GET  /api/notifications/stream` — Connect to authenticated Server-Sent Events (SSE) stream.
* `GET  /api/notifications` — Fetch paginated notification history.
* `PATCH /api/notifications/:id/read` — Mark a notification as read.

### Multi-Database Governance (`/api/database`)
* `GET  /api/database/status` — Inspect status and latency of all 6 connected database engines.
* `POST /api/database/switch` — Execute atomic in-memory runtime switch of the active engine.

---

## 📜 License
This project is licensed under the **MIT License**.
