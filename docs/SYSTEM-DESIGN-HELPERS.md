# System Design Helpers & Architectural Integration Specification

> **Engineering Architecture & External Services Integration Blueprint**  
> **Source of Truth:** `docs/ARCHITECTURE.md` · `docs/P0.md` · `STEP-4-SPEC.md`

---

## 1. Architectural Philosophy

External services are integrated **strictly by the hard engineering problem they solve**, never as generic hype or cosmetic additions. Every service is placed behind a **modular provider interface (adapter pattern)** with an offline local fallback so that the core CMS domain remains 100% testable, portable, and operational without mandatory third-party credentials.

---

## 2. System Design Helper Matrix

```text
                                  INTERNET
                                     │
                              ┌──────▼──────┐
                              │ Cloudflare  │
                              │ CDN + WAF   │
                              └──────┬──────┘
                                     │
                                 React App (Vite)
                                     │
                                 REST API
                                     │
                              ┌──────▼──────┐
                              │   NestJS    │
                              └──────┬──────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
            Auth / RBAC         CMS Services       Social Services
                  │                  │                  │
                  └──────────────────┼──────────────────┘
                                     │
                              Repository Layer
                               /             \
                              /               \
                             ▼                 ▼
                       PostgreSQL           MongoDB
                              \               /
                               \             /
                                JIT Continuity
                                     │
                              Redis / Upstash
                                     │
                      ┌──────────────┼──────────────┐
                      │              │              │
                   Cache           Locks          Queues
                                                    │
                                                  BullMQ
                                                    │
                              ┌─────────────┬───────┼────────────┐
                              │             │       │            │
                           Resend       Cloudinary  Notifications  Scheduler
                              │             │
                              │             │
                              └─────────────┴─────────────┘

                           Observability Layer
                                  │
                      OpenTelemetry + Sentry
```

---

## 3. Subsystem Architecture Specifications

### A. Media Storage: `IStorageProvider` Adapter Pattern
* **Problem Solved**: Production platforms (Render, Railway, Vercel, ECS) have ephemeral filesystems where disk uploads get wiped on restart.
* **Architecture**:
  ```text
  MediaService
       │
  IStorageProvider (Interface)
       ├─► LocalDiskStorageProvider (Default offline storage with magic-byte validation)
       └─► CloudinaryStorageProvider (CDN storage & WebP transformation when CLOUDINARY_URL / keys exist)
  ```
* **Storage Schema**:
  ```typescript
  export interface StoredMediaFile {
    id: string;
    url: string;
    publicId?: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    provider: 'local' | 'cloudinary';
  }
  ```

---

## 3. Subsystem Architecture Specifications

### B. Transactional Email: `IEmailProvider` Adapter Pattern
* **Problem Solved**: Decouple email transport (password resets, publication notices, newsletters) from business logic.
* **Architecture**:
  ```text
  EmailService
       │
  IEmailProvider (Interface)
       ├─► DevLoggerEmailProvider (Logs cryptographic tokens to dev console)
       └─► ResendEmailProvider (Sends branded HTML templates via Resend API when RESEND_API_KEY is configured)
  ```

---

### C. Distributed State & Asynchronous Job Pipeline: `Redis` + `BullMQ`
* **Problem Solved**:
  1. **Distributed Mutex / Lock**: Prevents race conditions during live database switching (`SeamlessDatabaseSwitch`) and concurrent JIT replication on cold cache misses.
  2. **Asynchronous Decoupling**: Offloads non-critical work from the synchronous HTTP request loop.
* **BullMQ Queues**:
  * `email-queue`: Asynchronously delivers password resets and editorial notifications.
  * `jit-sync-queue`: Backfills relationship records across PostgreSQL $\leftrightarrow$ MongoDB in the background.
  * `publisher-queue`: Executes cron-scheduled article releases without blocking web requests.
* **Graceful In-Memory Fallback**: When Redis is not running in local test environments, jobs execute immediately in-process.

---

### D. Application-Level Bot Protection: `Cloudflare Turnstile Guard`
* **Problem Solved**: Protect `/register`, `/forgot-password`, and `/comments` from automated spam bots without intrusive CAPTCHAs.
* **Architecture**: `TurnstileGuard` verifies `cf-turnstile-token` against `https://challenges.cloudflare.com/turnstile/v0/siteverify` when `CLOUDFLARE_TURNSTILE_SECRET_KEY` is configured.

---

### E. Observability: `OpenTelemetry` & `Sentry`
* **Problem Solved**: Trace cross-database query latencies (PG vs Mongo vs JIT proxy) and track unhandled exceptions in production.
* **Sentry Exception Filter**: Connects into `GlobalExceptionFilter` with anonymized error tracking reference IDs (`ERR-YYYYMMDD-XXXXXX`).

---

## 4. Environment Configuration Template

```env
# =================================================================
# SYSTEM DESIGN HELPERS (OPTIONAL / PRODUCTION CONFIGURATION)
# =================================================================

# 1. Cloudinary Object Storage & CDN
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=

# 2. Resend Transactional Email
RESEND_API_KEY=
EMAIL_FROM=The Gazette <onboarding@resend.dev>

# 3. Redis / Upstash Distributed Caching & Queues
REDIS_URL=redis://localhost:6379

# 4. Cloudflare Turnstile Bot Defense
CLOUDFLARE_TURNSTILE_SITE_KEY=
CLOUDFLARE_TURNSTILE_SECRET_KEY=

# 5. Sentry Error Telemetry
SENTRY_DSN=
```
