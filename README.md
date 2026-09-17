# 🗞️ The Gazette — Secure Editorial Publishing Platform & 6-Database Mesh CMS

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Multi--DB_Cluster-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![OWASP Top 10:2025](https://img.shields.io/badge/Security-OWASP_Top_10:2025_Compliant-881337)](https://owasp.org/Top10/)

**The Gazette** is a high-assurance, full-featured editorial content management and publishing platform. Built with modern newspaper-grade typography and a multi-engine persistence mesh, it features server-enforced editorial workflows, live trending topic marquee tickers, timed reading paywalls with background blur, and zero mock data.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Complete Technology Stack](#-complete-technology-stack)
- [6-Database Persistence Mesh](#-6-database-persistence-mesh)
- [Key Features & Capabilities](#-key-features--capabilities)
- [OWASP Top 10:2025 Security Invariants](#-owasp-top-102025-security-invariants)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Available Scripts](#-available-scripts)
- [Core API Reference](#-core-api-reference)

---

## 🏛️ Architectural Overview

```text
                               ┌──────────────────────────────────────────────┐
                               │           React 18 / Vite Frontend           │
                               │   (Editorial Design · Ticker · Reader · CMS) │
                               └──────────────────────┬───────────────────────┘
                                                      │ REST / HTTP (Port 5173 -> 3001)
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │               NestJS 11 Server               │
                               │  ┌────────────────────────────────────────┐  │
                               │  │ Rate Limiter · Helmet CSP · Validation │  │
                               │  │ JWT + Token Family Replay Detection    │  │
                               │  │ Role-Based Access Control (RBAC)       │  │
                               │  │ 6-State Editorial Workflow Engine      │  │
                               │  │ Audit Logger · Global Error Masking    │  │
                               │  └───────────────────┬────────────────────┘  │
                               └──────────────────────┼───────────────────────┘
                                                      │
                                    Unified Repository Proxy Layer
                                                      │
         ┌───────────────┬────────────────┬───────────┴────┬────────────────┬──────────────┐
         ▼               ▼                ▼                ▼                ▼              ▼
   ┌───────────┐   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐  ┌────────────┐
   │PostgreSQL │   │  MongoDB  │    │  MariaDB  │    │   MySQL   │    │CockroachDB│  │ ClickHouse │
   │ (Primary) │   │(Document) │    │  (Rel.)   │    │  (SQL)    │    │(Dist. SQL)│  │ (Analytics)│
   └───────────┘   └───────────┘    └───────────┘    └───────────┘    └───────────┘  └────────────┘
```

---

## 💻 Complete Technology Stack

### **Frontend Client (`client/`)**
- **Core:** React 18 · TypeScript · Vite (ESM fast-bundling)
- **Styling & Typography:** Tailwind CSS · Newsreader (Editorial Serif) · Plus Jakarta Sans · JetBrains Mono
- **State & Server Cache:** Zustand (Auth & UI State) · TanStack Query v5 (Optimistic Updates & Caching)
- **Forms & Validation:** React Hook Form · Zod runtime schemas
- **Icons & Visuals:** Lucide React
- **HTTP Client:** Axios (automatic credentials & CSRF interceptors)

### **Backend Server (`server/`)**
- **Framework:** NestJS 11 (TypeScript microservice-ready architecture)
- **Security & Crypto:** `@nestjs/throttler` · `helmet` · `argon2` (Argon2id) · `cookie-parser` · `sanitize-html`
- **Database Clients:** `pg` (PostgreSQL / CockroachDB) · `mongoose` (MongoDB) · `mariadb` · `mysql2` · `@clickhouse/client`
- **Logging & Errors:** `pino` structured logger · Centralized `GlobalExceptionFilter` with sanitized `referenceId`
- **API Documentation:** `@nestjs/swagger` OpenAPI 3.0 specification

---

## 🗄️ 6-Database Persistence Mesh

The Gazette utilizes an enterprise-grade **Multi-Database Persistence Mesh** with runtime atomic switching and zero downtime:

| Database Engine | Type / Role | Default Port | Connection / Driver |
| :--- | :--- | :---: | :--- |
| **PostgreSQL** | Primary ACID Relational Store | `5432` | `pg` Pool (with `pgcrypto` UUIDs) |
| **MongoDB** | Document & Schema-agnostic Store | `27017` | `mongoose` Models |
| **MariaDB** | High-Throughput Relational Store | `3307` | `mariadb` Pool |
| **MySQL** | Standard Enterprise SQL Store | `3306` | `mysql2/promise` Pool |
| **CockroachDB** | Distributed Scale-Out Consensus SQL | `26257` | PostgreSQL wire protocol |
| **ClickHouse** | Columnar Analytical & Metrics Store | `8123` | `@clickhouse/client` HTTP API |

### 🔄 Atomic Fail-Safe Database Switcher
- Administrators can switch the active database on-the-fly via `/admin/database`.
- The engine pre-verifies the target database's connectivity before switching the in-memory proxy pointer.
- If the target database is unreachable, the system automatically cancels the switch and remains on the active database without dropping requests.

---

## ✨ Key Features & Capabilities

### 1. 📈 Live Trending Topics Marquee Ticker (NSE India Style)
- Continuously streams live trending articles from the database.
- **Hover-to-Pause:** Hovering over any topic badge or the ticker immediately stops the marquee (`animation-play-state: paused`) for effortless reading.
- **Manual Toggle:** Right-aligned `⏸` / `▶️` button for manual play/pause control.
- **Category Pills:** Distinct emojis & accent colors (🔥 AI, ⚡ Cybersecurity, 🏛️ Software Architecture, 🔬 Science, 📈 Money, 🖋️ Design, 💻 Tech).

### 2. 🔒 Timed Member Paywall & Background Blur Lock
- **7-Second Free Preview:** Unauthenticated guests receive a complimentary countdown preview with a corner toast badge.
- **Blur Lock:** Upon expiration, the background manuscript is blurred (`filter: blur(12px)` + opacity reduction), and body scrolling is locked.
- **Frictionless Auth:** Unclosable modal with inline **Sign In** and **Create Account** tabs for instant 1-click unblur without losing reading progress.
- **Anti-Bypass Protection:** Text selection, copying, and drag interactions are blocked on the locked preview layer.

### 3. ✍️ Full Editorial Studio & CMS Workspace
- **WYSIWYG Editor:** Rich formatting (Headings, Blockquotes, Code snippets, Lists, Pull quotes).
- **Metadata Management:** Real-time word count, calculated reading time, auto-slug generation, cover image picker.
- **Revision History:** Saves snapshots into `cms_article_revisions` with side-by-side diff inspection and 1-click rollback.
- **6-State Server-Enforced Workflow:** `draft` → `pending_review` → `approved` → `published` → `archived` / `rejected`.

### 4. 👥 Author Workspace & Social Ecosystem
- **Author Dashboard:** Real-time story stats, draft management, and published catalog.
- **Reader Library:** Saved bookmarks and reading history.
- **Social Interactions:** Real-time likes, discussions/comments with moderation, author and topic following, and multi-platform sharing.

### 5. 🛡️ Admin Governance Suite
- **Editorial Review Queue:** Approve, publish, or reject pending submissions with editorial feedback notes.
- **User Management & RBAC:** Instant role adjustments (`Super Admin`, `Admin`, `Editor`, `Author`, `Reader`) and account status controls.
- **Taxonomy Manager:** Create, update, and monitor Categories and Tags with live usage metrics.
- **Media Library:** Upload images with MIME-type sniffing and unique timestamped UUID filenames.
- **Audit Log Explorer:** Searchable security and governance logs with IP and user metadata.

---

## 🛡️ OWASP Top 10:2025 Security Invariants

| Category | Vulnerability Defended | Gazette Security Implementation |
| :--- | :--- | :--- |
| **A01** | Broken Access Control | Deny-by-default RBAC guards, object-level authorization (`author_id = user.id`), IDOR prevention. |
| **A02** | Security Misconfiguration | Helmet CSP headers, `HttpOnly` + `SameSite: Lax` cookies, locked CORS, zero leaked stack traces. |
| **A03** | Supply Chain Failures | Deterministic lockfiles (`package-lock.json`), automated dependency auditing, zero unverified CDNs. |
| **A04** | Cryptographic Failures | `Argon2id` password hashing, SHA-256 password reset token hashing with 1-hour expiration. |
| **A05** | Injection (SQL / XSS) | 100% parameterized SQL queries (`$1..$N` / `?`), strict `sanitize-html` rich-text allowlist. |
| **A06** | Insecure Design | Pre-flight connection testing on database switches, server-side workflow transition validation. |
| **A07** | Authentication Failures | `@nestjs/throttler` rate limiting (10 req/min auth, 300 req/min general), refresh token family replay invalidation. |
| **A08** | Data Integrity Failures | File upload MIME validation, strict image extension whitelist (`jpg`, `jpeg`, `png`, `webp`, `avif`). |
| **A09** | Logging & Monitoring | Immutable `AuditLogService` logging all security-sensitive events (`AUTH_LOGIN`, `PASSWORD_RESET`, `DB_SWITCH`). |
| **A10** | Exception Handling | Centralized `GlobalExceptionFilter` returning sanitized JSON errors with unique `referenceId` tracking codes. |

---

## 📁 Project Directory Structure

```text
CMS Project/
├── client/                              # React 18 Frontend Client
│   ├── src/
│   │   ├── api/                         # Axios REST API services
│   │   ├── components/
│   │   │   ├── articles/                # Paywall gate, topic nav, filter bar
│   │   │   ├── common/                  # Logo, loading spinners, modals
│   │   │   └── layout/                  # PublicHeader, CategoryNav, TrendingTicker, Footer
│   │   ├── pages/
│   │   │   ├── admin/                   # Governance suite (Review, Users, Taxonomy, Media, Audit, DB Switcher)
│   │   │   ├── auth/                    # Login, Register, Forgot Password, Reset Password
│   │   │   ├── user/                    # Dashboard, Stories Manager, Profile, Settings, Library
│   │   │   ├── HomePage.tsx             # Editorial front page
│   │   │   ├── ArticleReaderPage.tsx    # Article reader with paywall blur
│   │   │   ├── ArticleEditorPage.tsx    # Full-screen WYSIWYG studio
│   │   │   └── SearchPage.tsx           # Multi-filter search and discovery
│   │   ├── stores/                      # Zustand state stores (Auth, UI)
│   │   └── types/                       # TypeScript interfaces and domain types
│   ├── index.html
│   └── vite.config.ts                   # Proxy configuration (port 3001)
│
├── server/                              # NestJS 11 Backend Server
│   ├── src/
│   │   ├── common/                      # Guards, decorators, filters, pipes, interceptors
│   │   ├── config/                      # Environment schemas and secrets validation
│   │   ├── database/                    # 6 Database service drivers & mesh manager
│   │   ├── domain/                      # Core models (Article, User, Audit, Category)
│   │   ├── modules/
│   │   │   ├── articles/                # Workflow service, revision history, full-text search
│   │   │   ├── auth/                    # Argon2, JWT token rotation, password reset
│   │   │   ├── audit/                   # Security audit log explorer
│   │   │   ├── categories/ & tags/      # Taxonomy engine
│   │   │   ├── comments/, likes/, etc.  # Social engagement layer
│   │   │   ├── health/                  # Health check & mesh liveness
│   │   │   ├── media/                   # Hardened multipart asset upload
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
├── docker-compose.yml                   # Multi-database container stack
└── package.json                         # Workspace scripts
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher
- **Docker Desktop** (for running PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, ClickHouse)

### 1. Clone the Repository
```bash
git clone https://github.com/adarshaldkar/CMS-Content_management_system.git
cd CMS-Content_management_system
```

### 2. Install Workspace Dependencies
```bash
npm install
```

### 3. Start Database Containers
```bash
npm run docker:up
```

### 4. Configure Environment Variables
Verify or configure `server/.env`:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://cms:your_postgres_password@localhost:5432/cms_platform
MONGO_URI=mongodb://cms:your_mongo_password@localhost:27017/cms_platform?authSource=admin
JWT_ACCESS_SECRET=your_super_secret_access_key_at_least_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_chars
ACTIVE_DATABASE=postgres
```

### 5. Launch Development Servers
```bash
# Run both client and server concurrently
npm run dev
```

- **Frontend Client:** [`http://localhost:5173`](http://localhost:5173)
- **Backend API:** [`http://localhost:3001/api`](http://localhost:3001/api)
- **Swagger Documentation:** [`http://localhost:3001/api/docs`](http://localhost:3001/api/docs)
- **Health Check:** [`http://localhost:3001/api/health`](http://localhost:3001/api/health)

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts both client (Vite) and server (NestJS watch) concurrently |
| `npm run dev:client` | Runs the Vite frontend development server only (port 5173) |
| `npm run dev:server` | Runs the NestJS backend in hot-reload watch mode (port 3001) |
| `npm run build` | Compiles production builds for both client (`dist/`) and server (`dist/`) |
| `npm run docker:up` | Starts all multi-database Docker containers in the background |
| `npm run docker:down` | Stops and tears down active Docker containers |

---

## 📡 Core API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Public | System and active database health check |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Sign in and issue HttpOnly token pair |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token with family protection |
| `POST` | `/api/auth/forgot-password` | Public | Request secure SHA-256 password reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password with token validation |
| `GET` | `/api/articles` | Public | List published articles with multi-parameter filtering |
| `GET` | `/api/articles/slug/:slug` | Public | Retrieve published article manuscript by URL slug |
| `POST` | `/api/articles` | Author+ | Create a new draft article |
| `PATCH` | `/api/articles/:id` | Author+ | Update owned draft article |
| `POST` | `/api/articles/:id/transition` | Editor+ | Transition article workflow status |
| `GET` | `/api/articles/:id/revisions` | Author+ | List snapshot revisions for an article |
| `POST` | `/api/articles/:id/revisions/:revId/restore` | Author+ | Restore manuscript to a prior revision |
| `GET` | `/api/categories` | Public | List active taxonomy categories |
| `POST` | `/api/media/upload` | Author+ | Upload image asset with MIME verification |
| `GET` | `/api/admin/database` | Admin | Get status of all 6 databases in mesh |
| `POST` | `/api/admin/database/switch` | Admin | Atomically switch active database engine |
| `GET` | `/api/admin/audit` | Admin | Query security audit log explorer |

---

## 📄 License
This project is proprietary and maintained for **The Gazette CMS Platform**. All rights reserved.
