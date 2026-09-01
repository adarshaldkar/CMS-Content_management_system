# The Gazette CMS Platform — Pending Features, Infrastructure & Production Roadmap

**Document Status**: Engineering Implementation Backlog  
**Date**: September 1, 2026  
**Audience**: Engineering Leadership, Product Management, DevOps & System Architects  
**Purpose**: Comprehensive catalog of all unbuilt roadmap items, missing cloud integrations, distributed mesh enhancements, and production-hardening requirements.

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Category 1: High-Concurrency & Multi-Instance Infrastructure](#2-category-1-high-concurrency--multi-instance-infrastructure)
3. [Category 2: 6-Database Mesh Durability & Consistency](#3-category-2-6-database-mesh-durability--consistency)
4. [Category 3: Cloud Integrations & External Services](#4-category-3-cloud-integrations--external-services)
5. [Category 4: Product & Community Features](#5-category-4-product--community-features)
6. [Category 5: Observability, Security & Edge Protection](#6-category-5-observability-security--edge-protection)
7. [Prioritized Implementation Matrix](#7-prioritized-implementation-matrix)

---

## 1. Executive Overview

The core application logic, editorial workflows, authentication, role-based access control, and base database persistence are fully functional on a single node. 

The items documented in this backlog represent what is required to transition the platform from a **single-node prototype** to an **enterprise-grade, multi-instance, highly available publishing system capable of sustaining 2,000+ concurrent users without data loss or downtime**.

---

## 2. Category 1: High-Concurrency & Multi-Instance Infrastructure

### 2.1 Redis Caching Layer (High-Traffic Read Buffer)
- **Problem**: When a trending article is published, 2,000 concurrent readers hitting PostgreSQL directly will exhaust the database connection pool (default 10–50 connections) and cause latency spikes or timeout crashes.
- **Pending Work**:
  - Deploy `redis:7-alpine` container in `docker-compose.yml`.
  - Install `ioredis` and integrate NestJS `CacheModule`.
  - Attach cache interceptors to `GET /api/articles/slug/:slug`, `GET /api/categories`, and `GET /api/articles` (TTL: 30–60s with automatic cache invalidation on article update or unpublish).

### 2.2 Redis Pub/Sub for Live Database Switching
- **Problem**: `activeEngine` and `switchLock` currently reside in Node.js process memory. In a multi-replica cluster (Server A + Server B behind a load balancer), switching the database on Server A leaves Server B pointing to the old database (Split-Brain state).
- **Pending Work**:
  - Implement Redis Pub/Sub channel (`db_mesh:switch_events`).
  - Broadcast engine switch events so all cluster nodes synchronize active pointers in under 2ms.

### 2.3 Distributed Lock Engine (Redlock)
- **Problem**: `switchLock = false` is currently a single-process boolean. Two concurrent administrative requests hitting different server replicas could initiate simultaneous conflicting database switches.
- **Pending Work**:
  - Implement Redlock distributed mutex (`lock:db_switch`) across Redis instances.

### 2.4 BullMQ Distributed Job Worker Queue
- **Problem**: `PublisherWorker` currently uses an in-memory `setInterval` check every 60 seconds. Running multiple server replicas causes race conditions where multiple instances attempt to publish the same scheduled manuscript.
- **Pending Work**:
  - Replace `setInterval` with BullMQ scheduled jobs backed by Redis.
  - Ensure single-worker job lease acquisition for scheduled promotions.

### 2.5 Automated Load Testing (k6 / Artillery)
- **Problem**: No automated stress-testing scripts exist to measure p50/p95/p99 response times and connection pool saturation under 2,000 concurrent virtual users.
- **Pending Work**:
  - Build `test/load/k6-read-spike.js` simulating stepped concurrency: 50 → 250 → 500 → 1,000 → 2,000 virtual users.
  - Build `test/load/k6-editorial-write.js` measuring write throughput and revision snapshot locks.

---

## 3. Category 2: 6-Database Mesh Durability & Consistency

### 3.1 Transactional Outbox Pattern & Reconciliation Worker
- **Problem**: Secondary database write errors (e.g. MariaDB or ClickHouse offline) currently catch errors with `.catch(() => {})` or log warnings to prevent blocking the user's primary request. The central `MultiDatabaseMeshService.dispatchWrite()` abstraction is defined but has no active callers in seamless repositories.
- **Pending Work**:
  - Refactor all seamless repositories to route secondary writes through a unified Transactional Outbox table (`cms_mesh_outbox`).
  - Implement a background Outbox Processor that automatically replays failed secondary writes with exponential backoff.

### 3.2 SQL Dialect & Primary Key Normalization
- **Problem**: Secondary write replication to MySQL and MariaDB occasionally fails with `Column 'id' cannot be null` due to differing UUID generation strategies across SQL dialects.
- **Pending Work**:
  - Implement normalized dialect transformers ensuring UUID strings and auto-increment types are correctly mapped for PostgreSQL, MariaDB, MySQL, and CockroachDB.

### 3.3 Explicit Architectural Asymmetry for ClickHouse
- **Problem**: ClickHouse is a columnar OLAP (analytics) store, not a general-purpose transactional OLTP store.
- **Pending Work**:
  - Update environment validation and architecture documentation to formally lock ClickHouse as a dedicated telemetry/analytics destination, rather than an interchangeable application store.

### 3.4 Multi-Database Schema Migration Pipeline
- **Problem**: Database tables are currently initialized via hand-written `CREATE TABLE IF NOT EXISTS` queries in each repository.
- **Pending Work**:
  - Implement a formal migration framework (e.g. Knex/Umzug) with versioned migration scripts (`001_initial_schema.sql`, `002_add_indexes.sql`) across all 4 SQL engines to prevent schema drift over time.

---

## 4. Category 3: Cloud Integrations & External Services

### 4.1 Production Transactional Email Transport (Resend / AWS SES / SendGrid)
- **Problem**: Password reset tokens and account notifications are currently generated, hashed with SHA-256, and logged to stdout/logger for local development.
- **Pending Work**:
  - Integrate an SMTP or API-based transactional email provider (`@nestjs-modules/mailer` or `@resend/node`).
  - Build HTML email templates for Password Reset, Email Verification, and Editorial Review Notifications.

### 4.2 Cloud Media Storage (AWS S3 / Cloudinary CDN)
- **Problem**: Uploaded images are stored on the local host filesystem (`server/uploads/`) and served via `express.static()`. In a multi-container deployment, images uploaded on Container A will be missing on Container B.
- **Pending Work**:
  - Implement an S3-compatible cloud storage adapter (`@aws-sdk/client-s3`) supporting AWS S3, Cloudflare R2, or Cloudinary.
  - Implement image resizing and WebP conversion pipeline (using `sharp`).

### 4.3 Automated Database Backup & Disaster Recovery (DR)
- **Problem**: No automated backup or restoration scripts exist for PostgreSQL (`pg_dump`) or MongoDB (`mongodump`).
- **Pending Work**:
  - Create daily automated backup scripts with retention policies.
  - Document and verify the disaster recovery restore runbook.

---

## 5. Category 4: Product & Community Features

### 5.1 In-App Notification System
- **Status**: Types defined (`NotificationItem`), but no backend module or database table exists.
- **Pending Work**:
  - Build `NotificationsModule`, `NotificationSchema`, and `NotificationController`.
  - Trigger in-app notifications on: Article Published, Comment Reply, New Follower, Editorial Review Feedback.
  - Build the frontend notification bell icon and sliding notification drawer.

### 5.2 Real Newsletter Subscription Engine
- **Status**: Homepage newsletter input currently triggers a frontend `alert()`.
- **Pending Work**:
  - Create `newsletter_subscribers` database table with double opt-in verification tokens.
  - Create `POST /api/newsletter/subscribe` and `GET /api/newsletter/unsubscribe/:token` endpoints.

### 5.3 Full Reading History Tracking
- **Status**: Library page currently displays a "Coming soon" placeholder.
- **Pending Work**:
  - Create `cms_reading_history` table tracking user reading sessions, scroll depth, and completed articles.
  - Expose `GET /api/me/history` and populate the Library History tab.

### 5.4 Social Reposts & Quote-Shares
- **Status**: Likes, Bookmarks, Threaded Comments, and Author Follows are functional. Reposts are missing.
- **Pending Work**:
  - Create `cms_article_reposts` table.
  - Add "Repost" action button on article cards and inject reposted stories into the personalized user feed.

### 5.5 Editorial Series & Collections
- **Status**: Planned roadmap item.
- **Pending Work**:
  - Create `cms_article_series` table allowing authors and editors to bundle multi-part articles into an organized collection.

### 5.7 In-Article Text Highlights & Annotations
- **Status**: Planned reader engagement feature.
- **Pending Work**:
  - Create `cms_article_highlights` table storing character offsets, quote texts, and user IDs.
  - Add text selection popover toolbar in `ArticleReaderPage` for highlighting and sharing snippets.

### 5.8 Publications & Multi-Author Organization Model
- **Status**: Planned enterprise publishing feature.
- **Pending Work**:
  - Create `cms_publications` and `cms_publication_members` tables allowing multiple authors and editors to manage a shared branded desk/magazine.

### 5.9 Advanced Author & Editorial Analytics
- **Status**: ClickHouse analytics driver connected, but full UI charts are not yet built.
- **Pending Work**:
  - Create author analytics dashboard aggregating real-time pageviews, reading completion rates, referral sources, and reader demographic charts from ClickHouse.

---

## 6. Category 5: Observability, Security & Edge Protection

### 6.1 Cloudflare Turnstile / reCAPTCHA Integration
- **Pending Work**:
  - Add Turnstile captcha validation guard on high-risk public endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`) to block automated bot attacks.

### 6.2 Centralized Error Monitoring (Sentry)
- **Pending Work**:
  - Integrate `@sentry/nestjs` and `@sentry/react` to capture unhandled client and server exceptions with sourcemap support.

### 6.3 Distributed Telemetry & Tracing (OpenTelemetry / Prometheus)
- **Pending Work**:
  - Export OpenTelemetry traces and Prometheus metrics (`/metrics`) to monitor request latencies, active database connection counts, and memory consumption.

---

## 6. Category 6: Frontend Refactoring, Design System Alignment & Code Cleanup

### 6.1 Strict Editorial Design System Token Pass
- **Problem**: Despite the transition toward newspaper typography (Newsreader serif, crisp borders), several components still retain generic rounded pill/bubble styles (`rounded-xl`, `rounded-2xl`, `rounded-full`), gradients (e.g. `ReadingPaywallGate`), and badge clutter.
- **Pending Work**:
  - Global audit replacing `rounded-xl`/`rounded-2xl` with strict editorial tokens (`rounded-none`, `rounded-xs`, `rounded-sm`).
  - Strip unnecessary CSS gradients and replace with high-contrast rules (`border-t-2 border-ink-primary`).
  - Standardize badge and tag pills to journalistic metadata labels.

### 6.2 Dead Code & Legacy Component Cleanup
- **Problem**: The frontend repository contains parallel prototype files accumulated across development cycles:
  - `UserPanelPage.tsx` vs `UserDashboardPage.tsx` / `UserProfilePage.tsx`.
  - `PublicHeader.tsx` vs `SiteHeader.tsx`.
- **Pending Work**:
  - Prune deprecated prototype pages and consolidate layout headers into single authoritative components.

### 6.3 TypeScript Strictness & Elimination of `any` Casts
- **Problem**: Several client components use loose `any` casts (e.g. `(hero as any).author?.name`, `(followedTopicsData as any)?.items`) rather than fully typed DTO interfaces.
- **Pending Work**:
  - Enrich `client/src/types/index.ts` to strictly mirror all backend DTO responses and replace all remaining `any` assertions with compile-time verified types.

---

## 7. Prioritized Implementation Matrix

| Priority | Feature / Component | Complexity | Primary Benefit |
| :---: | :--- | :---: | :--- |
| **P1** | **Redis Caching & Pub/Sub Mesh Sync** | Medium | Enables 2,000+ concurrent readers without database crashes; synchronizes multi-node DB switches. |
| **P1** | **Cloud Media Storage (S3 / Cloudinary)** | Low | Eliminates local disk dependency for multi-container deployments. |
| **P1** | **Production Email Transport (Resend / SES)** | Low | Replaces console-logged password reset links with real email delivery. |
| **P1** | **Load Testing Suite (k6 / Artillery)** | Low | Validates performance benchmarks and pool capacities under peak load. |
| **P2** | **BullMQ Background Publishing Queue** | Medium | Prevents duplicate publishing race conditions across server replicas. |
| **P2** | **Transactional Outbox for Secondary DBs** | High | Guarantees eventual consistency and eliminates secondary engine write drift. |
| **P2** | **SQL Dialect Normalization** | Medium | Resolves `Column 'id' cannot be null` write errors on MySQL/MariaDB. |
| **P2** | **Editorial Design Token & Cleanup Pass** | Low | Strips remaining `rounded-xl` and gradients to enforce 100% strict newspaper aesthetic. |
| **P2** | **TypeScript Zero-`any` Refactor** | Low | Enforces strict end-to-end type safety across all frontend API queries. |
| **P3** | **In-App Notification Engine** | Medium | Provides real-time user feedback on editorial approvals, comments, and followers. |
| **P3** | **Real Newsletter Subscription Backend** | Low | Replaces alert placeholder with database subscriber capture and unsubscribe workflow. |
| **P3** | **Full Reading History Tracking** | Medium | Replaces coming-soon placeholder in user library with scroll-depth tracking. |
| **P3** | **Community Moderation & Reporting** | Medium | Enables flagging, blocking, and editorial content moderation. |
| **P3** | **Sentry & OpenTelemetry Observability** | Medium | Real-time production crash alerting and latency tracing. |

---
*Catalog maintained for The Gazette CMS Platform.*
