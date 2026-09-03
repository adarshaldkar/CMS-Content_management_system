# The Gazette — System Architecture Diagrams (`ARCHITECTURE_DIAGRAMS.md`)

This document presents the complete system architecture for **The Gazette CMS**, structured using **Archify** system modeling patterns.

---

## 1. High-Level System Architecture Diagram

```mermaid
graph TD
    %% Clients & Entry Layer
    subgraph Client_Layer["Frontend Layer (React 18 + TypeScript + Vite)"]
        UI["shadcn/ui + Tailwind CSS"]
        State["Zustand (Auth/State) + TanStack Query"]
        Editor["TipTap Rich Text Studio"]
        Tour["Driver.js Onboarding Engine"]
    end

    %% Gateway & API Infrastructure
    subgraph API_Gateway["NestJS API Gateway Layer (Port 3001)"]
        Guard_JWT["JwtAuthGuard (HttpOnly Cookie)"]
        Guard_CSRF["CsrfGuard (X-Requested-With Validation)"]
        Guard_Perm["PermissionsGuard (RBAC Matrix)"]
        Filter["GlobalExceptionFilter (Correlation ID Logging)"]
    end

    %% Core Services Mesh
    subgraph Service_Modules["NestJS Application Modules"]
        AuthMod["AuthModule"]
        ArticleMod["ArticlesModule"]
        MediaMod["MediaModule (Streaming & Uploads)"]
        DocMod["DocumentsModule (Import Engine)"]
        QueueMod["JobsModule & BullMQ Administration"]
        NewsMod["NewsletterModule"]
    end

    %% 6-Database Persistence Mesh
    subgraph DB_Mesh["6-Database Persistence Mesh (MultiDatabaseMeshService)"]
        PG[("PostgreSQL\n(Primary Relational Store)")]
        Mongo[("MongoDB\n(Document Mirror & Sync)")]
        Redis[("Redis DB 0\n(L1 Cache, SSE, PubSub)")]
        ClickHouse[("ClickHouse\n(Analytics & Event Metrics)")]
        Maria[("MariaDB\n(DDL Schema Standby)")]
        Cockroach[("CockroachDB\n(Distributed Multi-Region)")]
    end

    %% Background Processing Infrastructure
    subgraph Queue_Infrastructure["BullMQ Background Workers"]
        PublisherWorker["PublisherWorker\n(Scheduled Story Release)"]
        BroadcastWorker["NewsletterBroadcastWorker\n(Email Dispatch Pipeline)"]
        DLQ["Dead Letter Queue (DLQ)\n(Failed Job Retries)"]
    end

    %% Connections
    UI --> Guard_JWT
    Guard_JWT --> Guard_CSRF --> Guard_Perm --> Filter
    Filter --> Service_Modules

    ArticleMod --> DB_Mesh
    MediaMod --> DB_Mesh
    DocMod --> DB_Mesh
    NewsMod --> Queue_Infrastructure
    ArticleMod --> Queue_Infrastructure
```

---

## 2. 6-Database Persistence Mesh Architecture

```mermaid
graph LR
    subgraph Application_Layer["NestJS Controllers / Services"]
        Service["MultiDatabaseMeshService"]
    end

    subgraph Active_Engines["Active Persistence Layer"]
        PG["PostgreSQL (Active Primary)"]
        Redis["Redis (L1 Cache & Session Invalidation)"]
    end

    subgraph Sync_Mesh["Peer Synchronization Mesh"]
        MongoSync["Seamless Article Sync (MongoDB)"]
        AnalyticsSync["ClickHouse Event Collector"]
        DDLVerifier["MariaDB & CockroachDB Schema Verifier"]
    end

    Service --> PG
    Service --> Redis
    PG -.->|Background Peer Sync| MongoSync
    PG -.->|Audit & Metrics| AnalyticsSync
    PG -.->|Schema Mirror| DDLVerifier
```

### Database Roles & Guarantees
1. **PostgreSQL (Active Primary):** Relational integrity, foreign keys, user credentials, articles, slot assignments.
2. **MongoDB (Document Mirror):** Peer article & revision document sync via `SeamlessArticleRepository`.
3. **Redis (DB 0):** Token blacklists, session storage, category cache with hard staleness eviction, SSE stream pub-sub.
4. **ClickHouse:** High-throughput analytical queries, reading stats, and event tracking.
5. **MariaDB & CockroachDB:** Standby DDL verification and distributed multi-region redundancy.

---

## 3. Multi-Format Document Import & Native Video Pipeline Architecture

```mermaid
graph TD
    subgraph Input_Payloads["Writer Upload / Import"]
        Docx["DOCX File (Mammoth.js)"]
        Pdf["PDF File (pdf-parse)"]
        Md["Markdown File (markdown-it)"]
        Txt["Plain Text File"]
        VideoFile["Video File (.mp4, .webm, .mov)"]
    end

    subgraph Processing_Engine["Document & Video Processing Engine"]
        DocService["DocumentImportService"]
        Sanitizer["Sanitizer Utility (allowedTags: h1..h6, p, blockquote, table, img)"]
        VideoService["MediaService Stream Utility"]
    end

    subgraph Output_Target["TipTap Editor & Video Player"]
        TipTapEditor["TipTap HTML Content Injector"]
        HTTP206["HTTP 206 Byte-Range Streaming Controller"]
    end

    Docx --> DocService
    Pdf --> DocService
    Md --> DocService
    Txt --> DocService
    VideoFile --> VideoService

    DocService --> Sanitizer --> TipTapEditor
    VideoService --> HTTP206
```

---

## 4. BullMQ Background Worker & Queue Architecture

```mermaid
sequenceDiagram
    autonumber
    participant Editor as Article Editor / Admin
    participant Controller as JobsAdminController
    participant Queue as BullMQ Queue (Redis)
    participant Worker as Publisher / Broadcast Worker
    participant DLQ as Dead Letter Queue (DLQ)
    participant DB as PostgreSQL / Mongo Mesh

    Editor->>Controller: POST /api/articles (schedule date)
    Controller->>Queue: Add delayed job { articleId, publishAt }
    Note over Queue: Job waits in delayed state in Redis

    Queue->>Worker: Delayed timer fires (due time)
    Worker->>DB: Execute article state transition (DRAFT -> PUBLISHED)

    alt Success
        Worker->>Queue: Mark job completed
        Worker->>DB: Log Audit Event (ARTICLE_PUBLISHED)
    else Failure (e.g. DB connection dropped)
        Worker->>Queue: Retry with exponential backoff (attempt 1..3)
        alt All Retries Exhausted
            Queue->>DLQ: Move to Dead Letter Queue (DLQ)
            DLQ-->>Controller: Alert via Jobs Manager UI
        end
    end
```

---

## 5. Security & RBAC Enforcement Flow

```mermaid
graph TD
    Request["Incoming HTTP Request"] --> JwtGuard{"JwtAuthGuard\nValid JWT Cookie?"}
    
    JwtGuard -- No --> 401["401 Unauthorized"]
    JwtGuard -- Yes --> CsrfGuard{"CsrfGuard\nX-Requested-With Header & Origin match?"}
    
    CsrfGuard -- No --> 403_CSRF["403 Forbidden (CSRF Failed)"]
    CsrfGuard -- Yes --> PermGuard{"PermissionsGuard\nUser Role & Scope Check"}
    
    PermGuard -- No --> 403_PERM["403 Forbidden (Insufficient Scope)"]
    PermGuard -- Scope Check --> ScopeFilter{"Is Endpoint Scoped?\n(e.g., GET /media?scope=own)"}

    ScopeFilter -- Scope=own --> OwnMedia["Force uploadedBy = currentUser.id"]
    ScopeFilter -- Scope=all (Admin/Editor) --> AllMedia["Return All Media Assets"]

    OwnMedia --> ControllerAction["Execute Controller Method"]
    AllMedia --> ControllerAction
```

---

## 6. Document File Structure & Diagram Mapping

| Archify Diagram | Primary Code File(s) | Description |
|---|---|---|
| **System Architecture** | [`server/src/app.module.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/app.module.ts) | Complete NestJS application graph & dependencies |
| **6-DB Mesh** | [`multi-database-mesh.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/database/multi-database-mesh.service.ts) | Multi-DB orchestrator & active engine switcher |
| **Document Import** | [`document-import.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/documents/document-import.service.ts) | Mammoth, pdf-parse, markdown-it parser |
| **Video Streaming** | [`media.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/media/media.service.ts) | HTTP 206 Partial Content byte-range video streamer |
| **BullMQ Queue** | [`jobs-admin.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/jobs/jobs-admin.service.ts) | Queue monitoring, DLQ management, retries |
| **Security & RBAC** | [`media.controller.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/media/media.controller.ts) | `scope=own` media isolation & CSRF/JWT guards |
