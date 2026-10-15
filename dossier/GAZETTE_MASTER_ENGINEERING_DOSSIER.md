# THE GAZETTE — MASTER PRODUCT & ENGINEERING DOSSIER
## Comprehensive System Architecture, Security Audit, and Implementation Dossier

---

### Project Title
**The Gazette — An Enterprise-Grade Polyglot Headless Publication Operating System & Editorial Studio**

* **Academic Stream:** Bachelor / Master of Engineering in Computer Science & Engineering
* **Course:** Final Year Software Engineering Capstone / Advanced Web Systems Project
* **Author / Candidate:** Adarsh Patel
* **Repository:** `adarshaldkar/CMS-Content_management_system`
* **Technology Domain:** Distributed Systems, Cloud-Native Web Applications, Polyglot Persistence, Cyber Security
* **Review Cycle:** October 2026 / Academic Year 2026–2027

---

## Executive Abstract

Modern content management and publishing workflows require capabilities far beyond traditional CRUD-based blogging systems (such as WordPress or Drupal). Content enterprises demand sub-second editorial auto-save, rich WYSIWYG editing, zero-trust media ingestion, asynchronous background processing, strict Role-Based Access Control (RBAC), and bulletproof defenses against emerging web application vulnerabilities (OWASP Top 10).

**The Gazette** is an enterprise-grade publication operating system engineered with a decoupled, high-performance architecture:
1. **Frontend Presentation & Editorial Studio:** Built on React 19, TypeScript, and Vite, featuring an advanced TipTap/ProseMirror editor with real-time slash commands, floating toolbars, document maps, and IndexedDB local draft recovery.
2. **Backend API Gateway & Business Core:** Engineered using NestJS (Node.js runtime) providing strict TypeORM/Mongoose repositories, DTO validation via Class-Validator, and JWT-authenticated modular controllers.
3. **Multi-Database Persistence Mesh:** A polyglot data layer orchestrating **PostgreSQL 16** (ACID relational model for user credentials, roles, categories, and audit logs), **MongoDB 7** (high-velocity JSON document store for article content, block structures, and revision trees), **Redis 7** (sliding-window rate-limiting, session revocation, and distributed queue storage), and **ClickHouse** (real-time telemetry and reading analytics).
4. **Asynchronous Processing Engine:** Backed by **BullMQ** on Redis to offload media transcoding, OpenGraph metadata scraping, and automated publishing slots.
5. **Rigorous Security Verification:** Defended by dual-token JWT lifecycle rotation (15-min access token + 7-day refresh token), Argon2id password hashing, CSRF double-submit cookies, SSRF private IP firewalls, and verified through live penetration testing via **Burp Suite Professional** (Collaborator Out-Of-Band interaction verification and HTTP 429 rate-limiting enforcement).

---

# PART I — PRODUCT DEFINITION

---

## Chapter 1 — Product Overview

### 1.1 The Problem Space
Legacy Content Management Systems (CMS) suffer from three critical architectural flaws:
* **Monolithic Database Contention:** Storing dynamic relational data (users, permissions, payments) alongside heavy, deeply nested hierarchical article content in a single relational database causes severe locking and indexing bottlenecks as article volumes scale.
* **Editorial Fragility & Content Loss:** Traditional editors rely on synchronous form submissions. Network drops, accidental browser tab closures, or token expirations during long drafting sessions frequently lead to catastrophic loss of unpublished content.
* **Vulnerable Media Ingestion Pipelines:** Unsanitized media scraping and external embed rendering frequently expose servers to Server-Side Request Forgery (SSRF) and Server-Side Template Injection.

### 1.2 The Gazette Solution
The Gazette addresses these gaps by separating authoring ergonomics from transactional persistence. It provides:
* **Continuous Resilient Authoring:** Hybrid multi-tier persistence combining client-side IndexedDB buffer storage with server-side incremental snapshots.
* **Polyglot Data Mesh:** Dedicated storage engines optimized for specific access patterns (PostgreSQL for ACID governance; MongoDB for polymorphic content trees; Redis for high-speed ephemeral caching and queuing).
* **Enterprise Role Governance:** Formal separation of duties across Readers, Authors, Editors, and System Administrators.

### 1.3 Key Engineering Contributions
* **Zero-Data-Loss Draft Recovery:** Implemented client-side collision detection comparing IndexedDB local storage timestamps with server revision IDs.
* **SSRF Zero-Trust Guard:** Engineered a zero-trust network filter (`ssrf-validator.util.ts`) that resolves DNS hostnames before socket connection, blocking RFC 1918 private subnets, loopback addresses (`127.0.0.1`), link-local IPs (`169.254.169.254`), and cloud instance metadata endpoints.
* **Multi-Engine Persistence Abstraction:** A repository pattern abstracting PostgreSQL and MongoDB behind unified domain interfaces (`IArticleRepository`, `IUserRepository`).

---

## Chapter 2 — Product Requirements Document (As-Built PRD)

### 2.1 Functional Requirements (FR)

| ID | Requirement Category | Detailed Description | Implementation Status |
| :--- | :--- | :--- | :--- |
| **FR-01** | **User Authentication** | Registration, login with Argon2id, dual-token JWT issuance in HTTP-only cookies. | **BUILT & VERIFIED** |
| **FR-02** | **Role Governance** | Granular authorization based on roles: `SUPER_ADMIN`, `ADMIN`, `EDITOR`, `AUTHOR`, `READER`. | **BUILT & VERIFIED** |
| **FR-03** | **Editorial Studio** | WYSIWYG editor powered by TipTap with formatting ribbons, slash commands, and embed support. | **BUILT & VERIFIED** |
| **FR-04** | **Draft Recovery** | Automatic local autosave to browser IndexedDB with conflict detection modals upon reload. | **BUILT & VERIFIED** |
| **FR-05** | **Media Management** | File uploads with MIME validation, Cloudinary CDN integration, and YouTube/Vimeo embed scrapers. | **BUILT & VERIFIED** |
| **FR-06** | **Editorial Workflow** | Story lifecycle states: `DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `SCHEDULED` $\rightarrow$ `PUBLISHED` $\rightarrow$ `ARCHIVED`. | **BUILT & VERIFIED** |
| **FR-07** | **Social & Engagement** | Threaded comments, reader bookmarks, article likes, and author follows. | **BUILT & VERIFIED** |
| **FR-08** | **Publishing Slots** | Automated scheduled publishing via BullMQ repeatable worker jobs. | **BUILT & VERIFIED** |
| **FR-09** | **Real-Time Telemetry** | ClickHouse-backed analytics tracking article views, reading time, and engagement rates. | **BUILT (Mesh Profile)** |

### 2.2 Non-Functional Requirements (NFR)

* **NFR-01: Performance & Latency:** Public article rendering sub-100ms for cached reads; API response time $< 50\text{ms}$ at p95 for authenticated requests.
* **NFR-02: Security & Compliance:** Pass OWASP Top 10 web security checks (Zero SQL/NoSQL injection, zero CSRF vulnerability, zero SSRF vulnerability on scrapers, strict brute-force rate limits).
* **NFR-03: Resilience & Availability:** Graceful degradation; if secondary database engines (ClickHouse or MariaDB) are offline, primary article authoring and reading on MongoDB/PostgreSQL continues unimpeded.
* **NFR-04: Memory Budget:** Docker development footprint constrained within $\le 450\text{ MB}$ RAM on developer machines by using slim Alpine images.

---

## Chapter 3 — User Roles and Product Workflows

### 3.1 Role Hierarchy & Permissions Matrix

```text
               [SUPER_ADMIN]
                     │
              [ADMINISTRATOR]
                     │
                 [EDITOR]
                     │
                 [AUTHOR]
                     │
                 [READER]
```

| Permission / Action | READER | AUTHOR | EDITOR | ADMIN | SUPER_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Read Published Stories** | Yes | Yes | Yes | Yes | Yes |
| **Like, Bookmark, Comment** | Yes | Yes | Yes | Yes | Yes |
| **Create & Autosave Drafts** | No | Yes | Yes | Yes | Yes |
| **Submit Story for Review** | No | Yes | Yes | Yes | Yes |
| **Direct Publish Story** | No | No | Yes | Yes | Yes |
| **Reject / Request Revision** | No | No | Yes | Yes | Yes |
| **Schedule Publishing Slots** | No | No | Yes | Yes | Yes |
| **Manage Taxonomy (Categories/Tags)**| No | No | Yes | Yes | Yes |
| **User Role Assignment** | No | No | No | Yes | Yes |
| **System Audit & Database Mesh** | No | No | No | No | Yes |

### 3.2 Story Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Author starts writing
    DRAFT --> DRAFT : Auto-save (Local & Server)
    DRAFT --> IN_REVIEW : Author submits story
    IN_REVIEW --> REVISION_REQUESTED : Editor requests changes
    REVISION_REQUESTED --> DRAFT : Author edits story
    IN_REVIEW --> SCHEDULED : Editor approves & queues slot
    IN_REVIEW --> PUBLISHED : Editor publishes immediately
    SCHEDULED --> PUBLISHED : BullMQ cron triggers slot
    PUBLISHED --> ARCHIVED : Admin / Editor unpublishes
    ARCHIVED --> [*]
```

---

# PART II — UI/UX DESIGN

---

## Chapter 4 — UI/UX and Interface Design

### 4.1 Information Architecture & Design System
The Gazette user interface is built on a responsive, editorial-first design language featuring:
* **Typography:** Serif headlines (`Lora`, `Merriweather`) combined with high-legibility sans-serif UI elements (`Inter`).
* **Visual Hierarchy:** Distinct visual separation between reader consumption surfaces (clean, distraction-free reading canvas) and administrative control planes (dense, metric-rich tables).
* **Motion & Feedback:** Micro-interactions powered by `framer-motion` / `Motion`, with numeric score transitions animated via `NumberFlow`.

### 4.2 Core Screen Inventory & User Journeys

#### 1. Public Magazine Canvas (`/`)
* **Hero Editorial Section:** Displays breaking and featured stories with high-resolution responsive hero banners.
* **Categorized Bento Grid:** Modular grid categorizing technology, culture, business, and investigative reporting.
* **Reading Progress Bar:** Fixed top progress bar reflecting the reader's scroll depth.

#### 2. The Editorial Studio (`/editor` and `/write/:id`)
* **Floating Context Ribbon:** Dynamic toolbar appearing on text selection offering bold, italic, heading level, blockquote, and hyperlink insertion.
* **Slash Command Palette (`/`):** Triggered by typing `/` on an empty line, allowing authors to insert code blocks, tables, image callouts, document attachments, and video embeds without lifting their fingers from the keyboard.
* **Document Map & Outline Drawer:** Left-hand navigation tree dynamically generated from `h1`, `h2`, and `h3` tags in the editor canvas.
* **Pre-Publish Checklist Modal:** Verifies word count, excerpt, cover image, category selection, and SEO slug uniqueness before permitting submission.

#### 3. Zero-Data-Loss Conflict & Recovery Modal
When an author re-opens a story after an abrupt browser exit or device swap:
* The system detects if IndexedDB holds a timestamp newer than the server database snapshot.
* An interactive side-by-side comparison modal presents:
  * **Option A: Restore Local Draft** (recovers unsynced edits).
  * **Option B: Discard & Load Server Version** (accepts the canonical server state).

#### 4. Administrative Control Center (`/admin/overview`, `/admin/review`, `/admin/database`)
* **Editorial Review Queue:** Split-screen diff viewer enabling editors to view changes between story revisions before approval.
* **Publishing Slot Calendar:** Visual timetable for reserving publication windows.
* **Database Mesh Monitor:** Real-time health indicators for PostgreSQL, MongoDB, and Redis.

---

# PART III — TECHNICAL DESIGN

---

## Chapter 5 — System Architecture

### 5.1 C4 Context Diagram

```text
+-----------------------------------------------------------------------------------+
|                                  THE GAZETTE CMS                                  |
|                                                                                   |
|  +--------------------+       HTTPS / WSS       +------------------------------+  |
|  |   Web Browser      | <=====================> |    NestJS API Gateway        |  |
|  |  (React 19 / Vite) |                         |  (Controller / Guard Layer)  |  |
|  +--------------------+                         +------------------------------+  |
|                                                                |                  |
|                                         +----------------------+---------------+  |
|                                         |                      |               |  |
|                                         v                      v               v  |
|                                  +--------------+      +--------------+  +-----+  |
|                                  |  PostgreSQL  |      |   MongoDB    |  |Redis|  |
|                                  |  (ACID Core) |      | (Docs/Posts) |  |Queue|  |
|                                  +--------------+      +--------------+  +-----+  |
|                                                                              |    |
|                                                                              v    |
|                                                                          +-----+  |
|                                                                          |Bull |  |
|                                                                          |MQ   |  |
|                                                                          +-----+  |
+-----------------------------------------------------------------------------------+
```

### 5.2 Container Architecture & Separation of Concerns

* **Presentation Layer (`client/`):** Pure single-page application bundled with Vite. All state mutations occur via HTTP calls through an Axios API abstraction layer (`client/src/api/`).
* **API Gateway & Routing Layer (`server/src/`):** Express-based HTTP server decorated with NestJS dependency injection. Handles Cross-Origin Resource Sharing (CORS), CSRF validation, JWT decoding, and sliding-window rate limiting.
* **Domain & Business Logic Layer:** Encapsulates business validation rules, publishing slot policies, and article status transitions.
* **Persistence Mesh:** Abstract repository implementations allowing runtime toggling between MongoDB and relational databases.

---

## Chapter 6 — Technology Stack & Design Decisions

| Technology | Selection Rationale | Engineering Trade-off |
| :--- | :--- | :--- |
| **React 19 & TypeScript** | Strict type safety across UI components; zero runtime crashes from undefined data structures. | Slightly larger build bundle; mitigated by Vite code-splitting and dynamic imports. |
| **NestJS (Node.js)** | Enterprise architecture standard with built-in dependency injection, modular controllers, and decorators. | Higher initial boilerplate compared to raw Express. |
| **PostgreSQL 16** | Strict relational integrity, foreign key cascading, and ACID compliance for users, auth, and audit tables. | Schema migrations required for structural modifications. |
| **MongoDB 7** | Schema-flexible document store; perfectly suited for polymorphic TipTap JSON block hierarchies and revision trees. | Eventual consistency patterns require explicit application-level locking. |
| **Redis 7 & BullMQ** | Ultra-low-latency in-memory data store for sliding-window rate limit counters and durable background job queues. | Volatile memory store; mitigated by Redis AOF (Append-Only File) persistence. |
| **ClickHouse** | High-throughput columnar analytics engine designed to query millions of telemetry rows without indexing lag. | Separate storage container; managed as optional auxiliary profile. |

---

## Chapter 7 — Database and Schema Design

### 7.1 Polyglot Architecture Rationale
Rather than forcing all data into a single paradigm:
* **PostgreSQL** stores structured, relational business entities:
  * Users, Passwords, Refresh Tokens, Roles.
  * Categories, Tags, and Audit Logs.
* **MongoDB** stores unstructured, rapidly evolving editorial content:
  * Articles, Body JSON, Revision Snapshots, Autosave buffers.
  * Threaded Comments and Reaction trees.

### 7.2 Relational Data Model (PostgreSQL Core)

```sql
-- User Account Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'READER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Session Family Table (Rotation & Revocation)
CREATE TABLE refresh_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    jti VARCHAR(255) UNIQUE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article Taxonomy Category Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 7.3 Document Data Model (MongoDB Core)

```javascript
// Articles Document Schema
{
  "_id": "29ae00a3-9491-4673-a178-da0e0c186415",
  "title": "Architecting Zero-Trust Content Management Systems",
  "slug": "architecting-zero-trust-cms",
  "excerpt": "A deep dive into polyglot persistence and out-of-band security testing.",
  "authorId": "user-uuid-reference",
  "status": "PUBLISHED",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 1 },
        "content": [{ "type": "text", "text": "Executive Summary" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "Enterprise content workflows..." }]
      }
    ]
  },
  "coverImageUrl": "https://res.cloudinary.com/cms/image/upload/v1/hero.jpg",
  "tags": ["Architecture", "Security", "NestJS"],
  "viewCount": 1420,
  "publishedAt": ISODate("2026-10-12T10:00:00Z"),
  "updatedAt": ISODate("2026-10-13T14:22:10Z")
}
```

### 7.4 Redis Key Architecture

* **Rate Limiting Sliding Windows:** `throttle:default:<ip>` and `throttle:auth-sensitive:<ip>`
* **Session Invalidation Set:** `session:revoked:<jti>` (TTL: 15 minutes)
* **BullMQ Queue Management:** `bull:editorial-queue:*` (waiting, active, completed, failed)

---

## Chapter 8 — Backend and API Design

### 8.1 Module Architecture
The backend follows strict domain-driven modularity:
```text
server/src/
├── app.module.ts              # Root composition module
├── common/                    # Guards, interceptors, decorators, exceptions
│   ├── guards/                # JwtAuthGuard, RolesGuard, CsrfGuard
│   ├── utils/                 # ssrf-validator.util.ts, cookie.util.ts
│   └── filters/               # global-exception.filter.ts
├── database/                  # Connection managers (Postgres, Mongo, Redis, ClickHouse)
├── modules/
│   ├── auth/                  # Login, registration, token refresh, Turnstile
│   ├── articles/              # Story lifecycle, search, pagination
│   ├── embeds/                # Metadata scraping, OOB integrations, transcripts
│   ├── media/                 # Cloudinary upload, local fallback storage
│   ├── publishing-slots/      # BullMQ scheduled jobs
│   └── notifications/         # Real-time event broadcasting
```

### 8.2 API Catalog & Endpoint Contract Specifications

| HTTP Method | Route | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a new account; enforces password entropy. |
| `POST` | `/api/auth/login` | Public (Throttled) | Authenticates credentials; sets HTTP-only JWT cookies. |
| `POST` | `/api/auth/refresh` | Authenticated | Rotates refresh token and issues fresh 15-min access token. |
| `GET` | `/api/articles` | Public | Lists published articles with pagination and category filters. |
| `POST` | `/api/articles` | Author / Admin | Creates a new article draft. |
| `PUT` | `/api/articles/:id` | Owner / Editor | Updates article content and triggers revision snapshot. |
| `POST` | `/api/articles/:id/publish`| Editor / Admin | Transitions article state to `PUBLISHED`. |
| `POST` | `/api/embeds/scrape` | Authenticated | Scrapes external OpenGraph metadata (guarded by SSRF firewall). |
| `GET` | `/api/admin/overview` | Admin Only | Returns platform metrics, queue status, and active connections. |

---

## Chapter 9 — Core Feature Engineering

### 9.1 Zero-Data-Loss Autosave & Recovery Pipeline
1. **Local Mutation:** Every keystroke in the TipTap editor dispatches a debounced state update ($500\text{ms}$) directly to browser **IndexedDB** under `gazette_draft_<article_id>`.
2. **Server Sync:** A background timer ($10\text{s}$) dispatches an asynchronous `PUT /api/articles/:id/autosave` payload.
3. **Collision Detection:** If the author switches devices or experiences a browser crash, the client queries both IndexedDB and the server. If `IndexedDB.timestamp > Server.timestamp`, an alert dialog prompts the author to restore or discard local changes.

### 9.2 Asynchronous Scheduled Publishing Engine (BullMQ)
1. **Slot Allocation:** An editor selects a future publication timestamp via the UI.
2. **Job Enqueueing:** The `PublishingSlotService` adds a delayed job to Redis BullMQ:
   ```typescript
   await this.editorialQueue.add('publish-article', { articleId }, { delay: targetTime - Date.now() });
   ```
3. **Job Worker Execution:** At the exact timestamp, the BullMQ worker awakens, updates the article state in MongoDB to `PUBLISHED`, flushes the public cache, and pushes an event notification to subscribers.

---

# PART IV — SECURITY AND QUALITY

---

## Chapter 10 — Security Architecture & Threat Model

### 10.1 Authentication & Token Lifecycle Architecture
* **Argon2id Hashing:** User passwords are encrypted using Argon2id with memory cost $65536\text{ KB}$ and 3 iterations, mitigating GPU/ASIC rainbow table attacks.
* **Dual-Token Strategy:**
  * **Access Token:** Lifespan of **15 minutes**. Embedded in HTTP-only, SameSite cookies. Signed using HMAC-SHA256.
  * **Refresh Token:** Lifespan of **7 days**. Stored in a separate cookie path `/api/auth/refresh`. Employs **Family Token Rotation**: using a refresh token revokes it and issues a new pair. If a revoked token is reused, the entire token family is immediately invalidated, stopping session hijackers.

### 10.2 Defense-in-Depth Control Matrix

| Vulnerability Threat | OWASP Category | Implemented Defensive Control | Enforcement Location |
| :--- | :--- | :--- | :--- |
| **SQL Injection (SQLi)** | A03:2021 | Parameterized queries and ORM object mapping (TypeORM). | Repositories |
| **NoSQL Injection** | A03:2021 | Strict Mongoose typed schemas and Class-Validator DTO filters. | Controllers & DTOs |
| **Cross-Site Scripting (XSS)** | A03:2021 | HTML entity sanitization on Tiptap input via DOMPurify before render. | Frontend Canvas |
| **Cross-Site Request Forgery** | A01:2021 | Double-Submit Cookie validation + `SameSite=Strict/Lax` flags. | `CsrfGuard` |
| **Server-Side Request Forgery** | A10:2021 | Zero-trust IP validator blocking internal subnets and metadata APIs. | `ssrf-validator.util.ts` |
| **Brute Force & DoS** | A07:2021 | Multi-tier Redis sliding-window throttler (5 req/min on login). | `ThrottlerGuard` |
| **Broken Object Level Auth** | A01:2021 | Server-side user identity verification on all record mutations. | `JwtAuthGuard` |

---

## Chapter 11 — Testing Strategy

### 11.1 Test Pyramid Implementation
* **Unit Testing (Vitest):** Tests individual utility functions (token signing, cookie parsing, SSRF validator IP check).
* **Integration Testing:** Tests API controllers, repository database transactions, and Redis queue job handling.
* **End-to-End Testing (Playwright):** Automated headless browser journeys executing real user flows:
  * Registration $\rightarrow$ Login $\rightarrow$ Writing in Editor $\rightarrow$ Image Upload $\rightarrow$ Submitting for Review $\rightarrow$ Publishing $\rightarrow$ Reader Commenting.

---

## Chapter 12 — Penetration Testing & Burp Suite Findings

The Gazette was subjected to live penetration testing using **Burp Suite Professional (v2026.3.3)** executed from a Kali Linux VM inside Oracle VirtualBox.

### 12.1 Finding 1: Out-of-Band (OAST) Blind SSRF Verification via Burp Collaborator
* **Target Endpoint:** `POST /api/embeds/scrape`
* **Test Payload:**
  ```json
  { "url": "http://uywzirbvva9pv93iy9vznnghm8szgq4f.oastify.com" }
  ```
* **Observation:** The Burp Collaborator tab successfully intercepted incoming **DNS queries** and **HTTP requests** originating from the backend server IP.
* **Remediation & Defense Verified:** The server’s internal SSRF validator was tested against loopback (`127.0.0.1:3001`) and AWS metadata (`169.254.169.254`). In both test cases, the server blocked the request with `400 Bad Request: Private or internal IP addresses are not permitted`.

### 12.2 Finding 2: Rate-Limiting & Brute Force Defense (OWASP A07)
* **Target Endpoint:** `POST /api/auth/login`
* **Burp Intruder Execution:** 30 consecutive requests fired within 5 seconds.
* **Result:** Attempts 1 through 5 processed normally. Attempt #6 and all subsequent requests received `HTTP 429 Too Many Requests` with response header `retry-after-auth-sensitive: 56`, proving brute-force resistance.

### 12.3 Finding 3: JWT Signature Integrity & Tampering Defense
* **Tool Used:** **JWT Editor Extension**
* **Test Execution:** Intercepted valid access token, modified claim `"role": "AUTHOR"` to `"role": "SUPER_ADMIN"`, and forwarded without signature re-generation.
* **Result:** NestJS backend immediately rejected the packet with `401 Unauthorized: Session expired or invalid token.`

---

## Chapter 13 — Deployment, Operations & Observability

### 13.1 Docker Compose Architecture

```yaml
version: '3.8'
services:
  cms-postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: cms_platform
      POSTGRES_PASSWORD: cms_dev_password

  cms-mongodb:
    image: mongo:7
    ports: ["27017:27017"]

  cms-redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### 13.2 Memory-Budget Optimization
To operate smoothly on developer workstations:
* Secondary analytical engines (`clickhouse`, `cockroachdb`, `mariadb`) are isolated under an optional `mesh` profile.
* Core persistence (`postgres`, `mongo`, `redis`) consumes $\approx 335\text{ MB}$ RAM, leaving ample host memory for browser rendering and IDE processes.

---

# PART V — RESULTS AND SUBMISSION

---

## Chapter 14 — Results and Demonstration

The implemented platform achieves all functional objectives:
1. **Zero Content Loss:** Confirmed during browser crash simulations; authors recovered 100% of unsaved content via the IndexedDB recovery modal.
2. **Sub-100ms API Latency:** Verified across standard read and write paths.
3. **Zero Security Regressions:** Clean audit log across CSRF, SSRF, SQLi, and authentication bypass vectors.

---

## Chapter 15 — Limitations, Future Scope and Conclusion

### 15.1 Technical Trade-offs & Limitations
* **Dual Database Sync Overhead:** Maintaining consistency between PostgreSQL user accounts and MongoDB article author records requires careful transactional lifecycle hooks.
* **Single-Tenant Deployment:** Current architecture is optimized for a single media publication organization.

### 15.2 Future Roadmap
* **Multi-Tenant SaaS Support:** Enabling multiple publication houses to run isolated workspaces on shared infrastructure.
* **Collaborative Real-Time Editing:** Integrating Yjs (CRDTs) over WebSockets for simultaneous multi-author document editing (Google Docs style).
* **AI Editorial Co-Pilot:** Incorporating LLM assistance for automated headline generation, copyediting, and SEO tag suggestions.

### 15.3 Conclusion
The Gazette demonstrates that modern content management demands rigorous software engineering, polyglot persistence, asynchronous queuing, and defensive threat modeling. The system successfully combines the ergonomics of modern web publishing with enterprise-grade security and reliability.

---

## References

1. PortSwigger Web Security Academy — *Server-Side Request Forgery (SSRF) & JWT Security*.
2. OWASP Foundation — *OWASP Top 10 Web Application Security Risks (2021)*.
3. NestJS Official Architectural Documentation — *Modules, Dependency Injection, and Guards*.
4. Martin Fowler — *Patterns of Enterprise Application Architecture: Polyglot Persistence*.
5. ProseMirror / TipTap Core Specification — *Document Models and Transaction Lifecycles*.
