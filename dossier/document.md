# The Gazette — Master Markdown Files Inventory & Architectural Analysis

> **Generated Date:** October 14, 2026
> **Total Markdown (.md) Files Analyzed:** 237
> **Total Documentation Volume:** 54,432 lines across 2847.1 KB
> **Scope:** Complete analysis of every single markdown file in `CMS Project` without omission.

---

## Executive Summary of Documentation Architecture

The Gazette CMS repository contains an extensive, multi-layered collection of engineering documentation, technical specifications, security audit reports, phased UI roadmaps, and testing guides. This document provides a consolidated, exhaustive catalog that indexes every single `.md` file, explains its architectural significance, and details its technical contents.

### Distribution by Functional Category

| Category | File Count | Total Lines | Total Size (KB) |
| :--- | :---: | :---: | :---: |
| **Diagramming & Visualization (Archify)** | 115 | 21,333 | 1376.8 KB |
| **Historical & Duplicate Specification Archive (document_2)** | 45 | 11,757 | 506.0 KB |
| **Core Documentation & Security Audits (docs/)** | 34 | 7,105 | 335.3 KB |
| **Implemented Feature Specs** | 12 | 2,072 | 118.6 KB |
| **Root Architecture & System Maps** | 9 | 2,818 | 125.4 KB |
| **UI/UX & Implementation Roadmaps** | 7 | 3,757 | 117.3 KB |
| **Background Processing & Redis Queues** | 4 | 2,557 | 89.7 KB |
| **Media Ingestion & Document Pipelines** | 4 | 855 | 47.6 KB |
| **Editorial Studio & WYSIWYG Architecture** | 3 | 817 | 58.4 KB |
| **Submission Dossier & Capstone Deliverables** | 2 | 551 | 33.4 KB |
| **Testing & Quality Assurance** | 1 | 20 | 2.3 KB |
| **Security, Governance & Permissions** | 1 | 790 | 36.3 KB |

---

## Background Processing & Redis Queues
Total files in this section: **4**

### 1. `bullMQ.md`
* **Document Title:** The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture
* **File Size:** 16.3 KB | **Line Count:** 316 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Specification (v2.0) **Date**: September 2, 2026 **Target Systems**: NestJS Backend, BullMQ v5, Redis 7 (Isolated Queue Database), PostgreSQL / MongoDB, React Admin Governance Console
* **Key Headings / Subsections:**
  - `The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture`
  - `1. Executive Summary & Architecture Rationale`
  - `Problems Solved by BullMQ`
  - `2. Queue Topology & Workload Isolation`
  - `2.1 Architectural Asymmetry Note (ClickHouse vs Relational Replicas)`
  - `3. Queue Details & Job Payloads`

### 2. `Gazette_Image_Notification_Legal_Spec.md`
* **Document Title:** The Gazette — Feature Specification
* **File Size:** 24.3 KB | **Line Count:** 1,235 lines
* **Summary & Architectural Role:** Production-oriented specification for three feature areas: 1. Image Intelligence & Media Optimization 2. Notification Center + Admin-to-User Messaging
* **Key Headings / Subsections:**
  - `The Gazette — Feature Specification`
  - `Scope`
  - `1. Image Intelligence & Media Optimization`
  - `Objective`
  - `Architecture`
  - `Upload Requirements`

### 3. `notification.md`
* **Document Title:** Hardened v3.0 In-App Notifications Engine & Social Feedback Architecture
* **File Size:** 23.7 KB | **Line Count:** 579 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Architecture & Distributed Systems Blueprint **System Milestone**: Phase 6 Enterprise Social, Real-Time Signaling & Editorial Feedback Loop **Target Scale**: 2,000+ Concurrent Readers, Multi-Replica NestJS Mesh, Real-Time SSE/WebSocket De...
* **Key Headings / Subsections:**
  - `Hardened v3.0 In-App Notifications Engine & Social Feedback Architecture`
  - `Table of Contents`
  - `1. Executive Summary & Core Architectural Tenets`
  - `Core Architectural Principles`
  - `2. End-to-End Notification Topology & Durability Split`
  - `3. Expanded Notification Event Taxonomy`

### 4. `redis_implementation.md`
* **Document Title:** Redis Architecture & Distributed Systems Blueprint: The Gazette CMS Platform
* **File Size:** 25.4 KB | **Line Count:** 427 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Architectural Specification & Distributed Systems Blueprint (v3.2 Final Master) **Target Milestone**: Phase 6 Enterprise Scalability & High-Concurrency Resilience **Target Workload**: 2,000+ Concurrent Readers / Multi-Replica NestJS Cluster
* **Key Headings / Subsections:**
  - `Redis Architecture & Distributed Systems Blueprint: The Gazette CMS Platform`
  - `Table of Contents`
  - `1. Executive Summary & 6-Database System Topology`
  - `Authoritative Sources of Truth & 6-Database Roles`
  - `2. Root Problem Statement: Production Bottlenecks & Distributed Failure Modes`
  - `3. The 8-Pillar Redis Architecture Blueprint`

---

## Core Documentation & Security Audits (docs/)
Total files in this section: **34**

### 1. `docs\ARCHITECTURE.md`
* **Document Title:** Technical Architecture & Locked Technology Stack
* **File Size:** 11.7 KB | **Line Count:** 330 lines
* **Summary & Architectural Role:** No ambiguous "Option A or Option B". All choices below are locked for frontend, backend, database, auth, security, testing, and infrastructure. **Source of truth for:** stack · auth · DB switch concurrency · error contract · NestJS module layout | Layer | Final Choice | Why |
* **Key Headings / Subsections:**
  - `Technical Architecture & Locked Technology Stack`
  - `CMS-Driven Editorial Content Platform`
  - `⚠️ Policy: Final Technology Decisions`
  - `1. Complete Locked Stack`
  - `Frontend (Locked)`
  - `Backend (Locked)`

### 2. `docs\ARCHITECTURE_DIAGRAMS.md`
* **Document Title:** The Gazette — System Architecture Diagrams (`ARCHITECTURE_DIAGRAMS.md`)
* **File Size:** 7.7 KB | **Line Count:** 204 lines
* **Summary & Architectural Role:** This document presents the complete system architecture for **The Gazette CMS**, structured using **Archify** system modeling patterns. graph TD %% Clients & Entry Layer
* **Key Headings / Subsections:**
  - `The Gazette — System Architecture Diagrams (`ARCHITECTURE_DIAGRAMS.md`)`
  - `1. High-Level System Architecture Diagram`
  - `2. 6-Database Persistence Mesh Architecture`
  - `Database Roles & Guarantees`
  - `3. Multi-Format Document Import & Native Video Pipeline Architecture`
  - `4. BullMQ Background Worker & Queue Architecture`

### 3. `docs\AUDIT-FIXES.md`
* **Document Title:** CMS Platform — Audit Fix Pack
* **File Size:** 2.6 KB | **Line Count:** 59 lines
* **Summary & Architectural Role:** This archive contains a targeted hardening pass over the supplied CMS project. 1. **Immediate account-status and role enforcement** - `JwtAuthGuard` now resolves the current user from the server-side repository for protected requests.
* **Key Headings / Subsections:**
  - `CMS Platform — Audit Fix Pack`
  - `Fixed in this pack`
  - `Verification limitation`
  - `Important remaining engineering work`

### 4. `docs\Author_privacy.md`
* **Document Title:** Author Byline Visibility Toggle (Show/Hide Author Name by Admin)
* **File Size:** 2.4 KB | **Line Count:** 43 lines
* **Summary & Architectural Role:** Allow administrators and editors to configure whether an article displays the specific author's name or publishes under "Editorial Staff" / Anonymous Newsroom Byline. - Add `showAuthorName?: boolean` to `Article`, `CreateArticleDto`, and `UpdateArticleDto`. - Add `ALTER TABLE ...
* **Key Headings / Subsections:**
  - `Author Byline Visibility Toggle (Show/Hide Author Name by Admin)`
  - `Proposed Changes`
  - `Database & Domain Models`
  - `Frontend Client`
  - `Verification Plan`
  - `Automated & Manual Verification`

### 5. `docs\AUTHOR_PUBLISHING_SLOTS_RFC.md`
* **Document Title:** 🕒 RFC: Author Publishing Slots & Automated Dispatch Engine
* **File Size:** 6.5 KB | **Line Count:** 138 lines
* **Summary & Architectural Role:** **Document Version:** 1.0.0 **Status:** Discussion & Architecture Proposal **Target Module:** Editorial Workflow & Admin Governance Engine
* **Key Headings / Subsections:**
  - `🕒 RFC: Author Publishing Slots & Automated Dispatch Engine`
  - `💡 1. Executive Summary & Problem Understanding`
  - `🔴 The Problem`
  - `🟢 The Proposed Solution: Author Publishing Slots`
  - `🏗️ 2. Architectural Blueprint`
  - `🗄️ 3. Proposed Data Architecture`

### 6. `docs\deep_analysis_report.md`
* **Document Title:** The Gazette — Deep Codebase Analysis Report
* **File Size:** 10.6 KB | **Line Count:** 217 lines
* **Summary & Architectural Role:** **Date:** 24 Aug 2026 | **Analyst:** Senior Engineering Review (Antigravity) ┌──────────────────────────────────────────────────────────────────┐ │  Client (Vite + React 18 + TypeScript)   :5173                  │
* **Key Headings / Subsections:**
  - `The Gazette — Deep Codebase Analysis Report`
  - `1. Architecture Overview`
  - `2. OWASP Top 10 (2021) Compliance Audit`
  - `A01 — Broken Access Control ✅ STRONG`
  - `A02 — Cryptographic Failures ✅ OUTSTANDING`
  - `A03 — Injection ✅ VERY STRONG`

### 7. `docs\DESIGN-SYSTEM.md`
* **Document Title:** THE GAZETTE — Editorial Visual & Surface Composition System
* **File Size:** 3.5 KB | **Line Count:** 51 lines
* **Summary & Architectural Role:** The platform consists of **4 distinct visual surfaces**, each tailored to its exact purpose: PLATFORM SURFACES │
* **Key Headings / Subsections:**
  - `THE GAZETTE — Editorial Visual & Surface Composition System`
  - `1. Surface Identity Architecture`
  - `2. Specific Page Surface Composition Rules`
  - `Surface A: Onboarding (`/onboarding`)`
  - `Surface B: User Dashboard & Desk (`/dashboard`, `/stories`)`
  - `Surface C: Public Editorial Homepage (`/`)`

### 8. `docs\EDITORIAL_NAVIGATION_AND_SEARCH_REDESIGN.md`
* **Document Title:** Technical Design: Editorial Navigation & Advanced Faceted Search Redesign
* **File Size:** 9.8 KB | **Line Count:** 118 lines
* **Summary & Architectural Role:** This design document outlines the complete architectural refactoring of two primary user-facing interfaces in The Gazette digital publication platform: 1. **Front Page & Master Desk Navigation (`CategoryNav.tsx` & `TrendingTicker.tsx`)**: Replacing horizontal single-line overf...
* **Key Headings / Subsections:**
  - `Technical Design: Editorial Navigation & Advanced Faceted Search Redesign`
  - `1. Executive Summary`
  - `2. Problem Analysis & Current UI Deficiencies`
  - `A. Front Page Navigation Flaws (Reference: User Screenshot 1)`
  - `B. Search & Discovery Flaws (Reference: User Screenshot 2)`
  - `3. Proposed Architectural Solution`

### 9. `docs\filter.md`
* **Document Title:** Editorial Navigation & Advanced Faceted Search Redesign
* **File Size:** 3.3 KB | **Line Count:** 58 lines
* **Summary & Architectural Role:** Redesigning the front page category navigation bar and the search & discovery suite to eliminate horizontal single-line scrollbars, remove all emojis, and implement a professional two-column faceted filter suite. - Restructure to render 5-6 primary curated desks with fixed wid...
* **Key Headings / Subsections:**
  - `Editorial Navigation & Advanced Faceted Search Redesign`
  - `User Review Required`
  - `Proposed Changes`
  - `Component: Navigation & Header`
  - `Component: Search & Discovery Studio`
  - `Verification Plan`

### 10. `docs\FULL_AUDIT_REPORT.md`
* **Document Title:** Full Codebase & Architecture Audit Report
* **File Size:** 6.1 KB | **Line Count:** 85 lines
* **Summary & Architectural Role:** **The Gazette CMS — Secure Editorial Publishing Platform** *Audit Date: August 25, 2026* A comprehensive audit of all frontend and backend source files, repository implementations, security configurations, and documentation specifications was conducted. The codebase strictly a...
* **Key Headings / Subsections:**
  - `Full Codebase & Architecture Audit Report`
  - `Executive Summary`
  - `1. Specification & Architecture Compliance Matrix`
  - `2. OWASP Top 10:2025 Security Controls Audit`
  - `A01: Broken Access Control`
  - `A02: Security Misconfiguration`

### 11. `docs\FULL_CODEBASE_ANALYSIS.md`
* **Document Title:** The Gazette CMS — Full Codebase Analysis
* **File Size:** 25.7 KB | **Line Count:** 474 lines
* **Summary & Architectural Role:** **Date:** 24 Aug 2026 | **Analyst:** Antigravity (Senior Engineering Review) **Scope:** Every file in `/server/src/` + `/client/src/` + scripts + docs examined line-by-line | File | Size | Status |
* **Key Headings / Subsections:**
  - `The Gazette CMS — Full Codebase Analysis`
  - `1. Complete File Inventory`
  - `ROOT LEVEL`
  - `SERVER — Configuration`
  - `SERVER — Domain Models (`server/src/domain/`)`
  - `SERVER — Authentication Module (`server/src/modules/auth/`)`

### 12. `docs\IMAGE_OPTIMIZATION_AND_ENHANCEMENT_SPEC.md`
* **Document Title:** Gazette — Image Optimization & Adaptive Enhancement Specification
* **File Size:** 8.9 KB | **Line Count:** 224 lines
* **Summary & Architectural Role:** In a publication operating system, users upload images of vastly different quality and size: 1. **Massive / Heavy Files (e.g., 20 MB – 80 MB DSLR RAW/PNG/JPEG):** Cause severe bandwidth bloat, slow page loads, poor SEO scores, and high storage costs. 2. **Low-Quality / Low-Res...
* **Key Headings / Subsections:**
  - `Gazette — Image Optimization & Adaptive Enhancement Specification`
  - `1. Executive Summary & Core Objective`
  - `2. Processing Decision Matrix`
  - `3. Detailed Processing Modes`
  - `Tier 1: Heavy / Massive Images (80MB $\rightarrow$ < 800KB)`
  - `Tier 2: Standard Production Web Images`

### 13. `docs\implementation_plan.md`
* **Document Title:** Transparent JIT Fallback & Auto-Replication Architecture Plan
* **File Size:** 3.0 KB | **Line Count:** 54 lines
* **Summary & Architectural Role:** This plan introduces **Transparent On-Demand Fallback & JIT (Just-In-Time) Auto-Replication** between PostgreSQL and MongoDB. When the active database is switched (e.g. from PostgreSQL to MongoDB or vice-versa), any registered user or content that was created in the previous d...
* **Key Headings / Subsections:**
  - `Transparent JIT Fallback & Auto-Replication Architecture Plan`
  - `User Review Required`
  - `Proposed Changes`
  - `Database & Repository Layer`
  - `Verification Plan`
  - `Automated Tests`

### 14. `docs\LINKAGE-ANALYSIS.md`
* **Document Title:** Linkage Analysis
* **File Size:** 6.1 KB | **Line Count:** 98 lines
* **Summary & Architectural Role:** Audit of every file, folder, and asset in the CMS workspace — what exists, what was linked, and how the persistence mesh is wired end-to-end. No files were deleted. | Check | Result | | --- | --- |
* **Key Headings / Subsections:**
  - `Linkage Analysis`
  - `Summary`
  - `Port unification (3000 → 3001)`
  - `Orphan UI pages linked`
  - `Orphan assets linked`
  - `Persistence mesh — end to end`

### 15. `docs\MASTER-SPEC.md`
* **Document Title:** Master Specification — Secure CMS-Driven Content Platform
* **File Size:** 19.4 KB | **Line Count:** 565 lines
* **Summary & Architectural Role:** 1. [Project Overview](#1-project-overview) 2. [Tech Stack](#2-tech-stack) 3. [Core Security Principle](#3-core-security-principle)
* **Key Headings / Subsections:**
  - `Master Specification — Secure CMS-Driven Content Platform`
  - `Table of Contents`
  - `1. Project Overview`
  - `Required Components`
  - `2. Tech Stack (Locked)`
  - `3. Core Security Principle`

### 16. `docs\multi_database_issues_and_solutions.md`
* **Document Title:** 📑 Comprehensive Analysis: 6-Database Persistence Mesh Issues & Solutions
* **File Size:** 5.3 KB | **Line Count:** 65 lines
* **Summary & Architectural Role:** This report documents all architectural, infrastructural, operational, and user-interface problems identified during the migration from a 2-database platform to a **fault-tolerant 6-Database Persistence Mesh** (PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, ClickHouse), alo...
* **Key Headings / Subsections:**
  - `📑 Comprehensive Analysis: 6-Database Persistence Mesh Issues & Solutions`
  - `🎯 Executive Summary`
  - `🛑 Problem Matrix & Resolution Log`
  - `🔍 Deep-Dive Technical Breakdowns`
  - `1. The Active-Active Multi-Write Replication Problem`
  - `2. High-Availability & Zero-Downtime Failover`

### 17. `docs\P0.md`
* **Document Title:** P0 — Master Editorial Platform Specification & UI Blueprint
* **File Size:** 11.7 KB | **Line Count:** 178 lines
* **Summary & Architectural Role:** * **Headlines & Editorial Titles**: *Newsreader* (Serif) — journalistic weight, optical sizing, elegant line flow. * **Body Text & UI Elements**: *Plus Jakarta Sans* / *Inter* (Sans-serif) — crisp, high legibility, clean letter spacing. * **Metadata & Numerical Data**: *JetBra...
* **Key Headings / Subsections:**
  - `P0 — Master Editorial Platform Specification & UI Blueprint`
  - `1. Locked Visual Identity & Design Philosophy`
  - `Core Typography & Token Architecture`
  - `2. Complete Screen Universe & Product Hierarchy`
  - `3. Comprehensive JIT Database Continuity (Pull-on-Miss)`
  - `Overarching Invariant:`

### 18. `docs\PERMISSIONS-MATRIX.md`
* **Document Title:** Granular Role-Based Access Control (RBAC) Matrix
* **File Size:** 5.4 KB | **Line Count:** 110 lines
* **Summary & Architectural Role:** The application enforces a hierarchical 5-tier role system: 1. **SUPER_ADMIN**: Full system control, database switching, audit log purging, global permissions. 2. **ADMIN**: User management, taxonomy management, editorial overrides, system settings.
* **Key Headings / Subsections:**
  - `Granular Role-Based Access Control (RBAC) Matrix`
  - `Permission & Capability Specification`
  - `1. System Roles`
  - `2. Granular Capabilities Matrix`
  - `3. Server-Side Guard Implementation Pattern (NestJS)`

### 19. `docs\PHASE-4-IMPLEMENTATION.md`
* **Document Title:** Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)
* **File Size:** 14.1 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** Phase 4 establishes the core editorial engine of the CMS platform. It bridges our Phase 3 security architecture (Argon2id, HttpOnly cookies, RBAC capability tokens, ownership checks, and audit logging) with an enterprise editorial workflow, immutable article revisions, server-...
* **Key Headings / Subsections:**
  - `Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)`
  - `1. Executive Summary`
  - `2. Architecture & Components`
  - `3. Detailed Component Breakdown`
  - `A. Publishing Workflow State Machine & Revisions (`server/src/modules/articles/`)`
  - `B. Secure Media Asset Pipeline (OWASP A08 Defense)`

### 20. `docs\PHASE-5-6-IMPLEMENTATION-PLAN.md`
* **Document Title:** Phase 5–6 Master Implementation Plan
* **File Size:** 20.8 KB | **Line Count:** 444 lines
* **Summary & Architectural Role:** | Phase | Focus | # Tasks | Priority | Est. Build | |:--|:--|:--|:--|:--| | **Phase 0** | Fix 4 Critical Security Blockers | 4 | 🔴 CRITICAL | 1 session |
* **Key Headings / Subsections:**
  - `Phase 5–6 Master Implementation Plan`
  - `EditorialHub — Full Product Realization Roadmap`
  - `0. EXECUTIVE SUMMARY`
  - `1. PHASE 0 — CRITICAL SECURITY BLOCKERS`
  - `0.1 Enable Global ValidationPipe (OWASP A03 input validation)`
  - `0.2 Install + Wire @nestjs/throttler (OWASP A07 brute force)`

### 21. `docs\phase_4_implementation.md`
* **Document Title:** Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)
* **File Size:** 14.1 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** Phase 4 establishes the core editorial engine of the CMS platform. It bridges our Phase 3 security architecture (Argon2id, HttpOnly cookies, RBAC capability tokens, ownership checks, and audit logging) with an enterprise editorial workflow, immutable article revisions, server-...
* **Key Headings / Subsections:**
  - `Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)`
  - `1. Executive Summary`
  - `2. Architecture & Components`
  - `3. Detailed Component Breakdown`
  - `A. Publishing Workflow State Machine & Revisions (`server/src/modules/articles/`)`
  - `B. Secure Media Asset Pipeline (OWASP A08 Defense)`

### 22. `docs\PRODUCTION-READINESS-CHECKLIST.md`
* **Document Title:** Production Readiness Checklist
* **File Size:** 2.1 KB | **Line Count:** 54 lines
* **Summary & Architectural Role:** - [x] Server-side account status checked on protected requests. - [x] Current server-side role used for authorization. - [x] 5xx errors redacted at the global boundary.
* **Key Headings / Subsections:**
  - `Production Readiness Checklist`
  - `Security — must pass before production`
  - `Availability / scalability`
  - `Six-database architecture`
  - `Product completeness`
  - `UI/UX`

### 23. `docs\profile.md`
* **Document Title:** Editorial Journalist Dossier & Author Hub Architecture (`profile.md`)
* **File Size:** 6.6 KB | **Line Count:** 112 lines
* **Summary & Architectural Role:** The **Author Profile & Journalist Dossier** (`/profile`) is the central editorial identity and portfolio workstation for authors, editors, and newsroom contributors across **The Gazette**. It bridges real-time community engagement, portfolio curation, draft lifecycle tracking,...
* **Key Headings / Subsections:**
  - `Editorial Journalist Dossier & Author Hub Architecture (`profile.md`)`
  - `1. Overview`
  - `2. Multi-Database Architecture & Persistence Mesh`
  - `Persistence Guarantees`
  - `3. UI/UX Component Specifications`
  - `A. Editorial Dossier Masthead`

### 24. `docs\PROJECT-EXPLANATION-AND-SUMMARY.md`
* **Document Title:** Comprehensive Project Guide & Detailed Architecture Breakdown
* **File Size:** 22.0 KB | **Line Count:** 338 lines
* **Summary & Architectural Role:** This document provides an exhaustive, structured explanation of the entire system architecture, features, security requirements, and development principles defined across `docs/MASTER-SPEC.md`, `docs/PROJECT.md`, and `docs/SECURITY-AND-CMS.md`. A **production-quality, security...
* **Key Headings / Subsections:**
  - `Comprehensive Project Guide & Detailed Architecture Breakdown`
  - `Secure CMS-Driven Content Platform`
  - `Executive Summary`
  - `1. Project Vision & Identity`
  - `What This Project IS:`
  - `What This Project is NOT:`

### 25. `docs\PROJECT.md`
* **Document Title:** CMS-Driven Content Platform — Project Specification
* **File Size:** 16.7 KB | **Line Count:** 676 lines
* **Summary & Architectural Role:** Build a **production-quality, secure, CMS-driven content publishing platform**. This is **NOT**: - A Medium clone
* **Key Headings / Subsections:**
  - `CMS-Driven Content Platform — Project Specification`
  - `1. Project Overview`
  - `Required Components`
  - `2. Tech Stack`
  - `3. UI Design Requirements`
  - `DO NOT Make the UI Look AI-Generated`

### 26. `docs\RBAC-PERMISSIONS.md`
* **Document Title:** RBAC Permission Matrix
* **File Size:** 8.0 KB | **Line Count:** 226 lines
* **Summary & Architectural Role:** | Role | Code | Description | |------|------|-------------| | Super Admin | `SUPER_ADMIN` | Full system access including database switching and security config |
* **Key Headings / Subsections:**
  - `RBAC Permission Matrix`
  - `CMS-Driven Editorial Content Platform`
  - `1. Roles`
  - `2. Permission Naming Convention`
  - `3. Full Permission Matrix`
  - `Users & Access`

### 27. `docs\README.md`
* **Document Title:** Documentation Index
* **File Size:** 3.7 KB | **Line Count:** 94 lines
* **Summary & Architectural Role:** docs/README.md  (you are here) │ ┌──────────────────┼──────────────────┐
* **Key Headings / Subsections:**
  - `Documentation Index`
  - `Document Authority`
  - `Which Document to Use When`
  - `Rule for AI Coding Agents`
  - `Development Order (Corrected)`
  - `File List`

### 28. `docs\SECURITY-AND-CMS.md`
* **Document Title:** Security & CMS Architecture Specification
* **File Size:** 20.3 KB | **Line Count:** 618 lines
* **Summary & Architectural Role:** Browser ↓ ATTACKER CONTROLS EVERYTHING HERE
* **Key Headings / Subsections:**
  - `Security & CMS Architecture Specification`
  - `Part 1 — Core Security Principle`
  - `Never Trust the Frontend`
  - `Browser-Side Security Check`
  - `Expected Secure Flow`
  - `Part 2 — Security Architecture`

### 29. `docs\security_assessment_report.md`
* **Document Title:** Enterprise Security Assessment & Penetration Testing Report
* **File Size:** 13.2 KB | **Line Count:** 173 lines
* **Summary & Architectural Role:** **Target Application:** Gazette Content Management System (Multi-Database Persistence Mesh) **Testing Framework:** OWASP ZAP (v2.17.0 by Checkmarx) & Automated Verification Suites **Date of Audit:** October 7, 2026
* **Key Headings / Subsections:**
  - `Enterprise Security Assessment & Penetration Testing Report`
  - `Executive Summary`
  - `1. Security Testing Status Ledger`
  - `2. Comprehensive 17-Point Pentesting Checklist Matrix`
  - `3. In-Depth Triage of ZAP Active Scan Findings`
  - `High Risk Findings Triage`

### 30. `docs\STEP-2-SPEC.md`
* **Document Title:** STEP 2 — Authentication, Onboarding & User Workspace Specification
* **File Size:** 11.6 KB | **Line Count:** 207 lines
* **Summary & Architectural Role:** **Step 2** builds the complete end-to-end **Identity, Onboarding, and Author Content Workspace** for the CMS platform. It bridges secure HttpOnly cookie authentication, personalized topic onboarding, story lifecycle management, and profile governance. 1. **Authentication Suite...
* **Key Headings / Subsections:**
  - `STEP 2 — Authentication, Onboarding & User Workspace Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 2:`
  - `2. Screen & Component Architecture`
  - `3. Detailed Specifications per Screen`
  - `A. Authentication Suite`

### 31. `docs\STEP-3-SPEC.md`
* **Document Title:** STEP 3 — Public Editorial Web Experience Specification
* **File Size:** 8.9 KB | **Line Count:** 123 lines
* **Summary & Architectural Role:** **Step 3** builds the flagship **Public Editorial Web Experience** for *The Gazette*. It brings the publication to life with high-impact editorial typography (*Newsreader* serif headlines, *Plus Jakarta Sans* body), an authoritative homepage layout inspired by world-class publ...
* **Key Headings / Subsections:**
  - `STEP 3 — Public Editorial Web Experience Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 3:`
  - `2. Page & Component Architecture`
  - `3. Technical Decisions & Invariants`
  - `1. Trending Stories Ranking`

### 32. `docs\STEP-4-SPEC.md`
* **Document Title:** STEP 4 — Admin Governance Suite & Live Database Switcher Specification
* **File Size:** 9.8 KB | **Line Count:** 157 lines
* **Summary & Architectural Role:** **Step 4** delivers the mission-critical **Admin Governance Suite & Live Database Switcher**. It provides editorial staff and administrators with complete oversight over content moderation, user roles, taxonomy, media assets, security audit trails, and the crown jewel of the p...
* **Key Headings / Subsections:**
  - `STEP 4 — Admin Governance Suite & Live Database Switcher Specification`
  - `1. Objective & Scope`
  - `2. Hardened Architecture & Security Invariants`
  - `1. Database Switcher State Machine`
  - `2. Atomic Concurrency-Safe Database Switch`
  - `3. Strict Privilege Boundaries on Role Governance`

### 33. `docs\SYSTEM-DESIGN-HELPERS.md`
* **Document Title:** System Design Helpers & Architectural Integration Specification
* **File Size:** 7.1 KB | **Line Count:** 160 lines
* **Summary & Architectural Role:** External services are integrated **strictly by the hard engineering problem they solve**, never as generic hype or cosmetic additions. Every service is placed behind a **modular provider interface (adapter pattern)** with an offline local fallback so that the core CMS domain r...
* **Key Headings / Subsections:**
  - `System Design Helpers & Architectural Integration Specification`
  - `1. Architectural Philosophy`
  - `2. System Design Helper Matrix`
  - `3. Subsystem Architecture Specifications`
  - `A. Media Storage: `IStorageProvider` Adapter Pattern`
  - `B. Transactional Email: `IEmailProvider` Adapter Pattern`

### 34. `docs\TESTING.md`
* **Document Title:** Testing Specification
* **File Size:** 6.6 KB | **Line Count:** 212 lines
* **Summary & Architectural Role:** Build secure code → Test as attacker → Verify block + safe error + audit log Do **not** build deliberately vulnerable endpoints for demonstration. Test environments only for injection payloads. Never leave SQLi/XSS holes in production code paths.
* **Key Headings / Subsections:**
  - `Testing Specification`
  - `Functional + Security Test Requirements`
  - `1. Testing Philosophy`
  - `2. Test Layers`
  - `3. OWASP Security Test Checklist`
  - `A01 — Broken Access Control`

---

## Diagramming & Visualization (Archify)
Total files in this section: **115**

### 1. `.agents\skills\archify\brand-marks\README.md`
* **Document Title:** Built-in brand marks
* **File Size:** 1.4 KB | **Line Count:** 31 lines
* **Summary & Architectural Role:** Archify ships a bounded catalogue of 107 commonly used brands for architecture, workflow, sequence, data-flow, and lifecycle nodes. The mark is optional authored identity: it never replaces the node's semantic `type`, color, label, or
* **Key Headings / Subsections:**
  - `Built-in brand marks`

### 2. `.agents\skills\archify\references\authoring-contract.md`
* **Document Title:** Authoring contract
* **File Size:** 11.0 KB | **Line Count:** 191 lines
* **Summary & Architectural Role:** Read this reference only after the Fast authoring path calls for more detail. The schemas and examples remain authoritative. Read both the mode schema and `schemas/common.schema.json`. The mode schemas use `$ref`, so the common file is where shared enums live. - `componentType...
* **Key Headings / Subsections:**
  - `Authoring contract`
  - `Schema lookup`
  - `Workflow layout contracts`
  - `Legend contract`
  - `Language consistency`
  - `Visual preset default`

### 3. `.agents\skills\archify\references\brand-marks.md`
* **Document Title:** Brand marks
* **File Size:** 2.1 KB | **Line Count:** 65 lines
* **Summary & Architectural Role:** Use a brand mark only when a real product, provider, model family, channel, or service identity helps the reader. Semantic `type` still explains what the node does; `brand` explains whose product it is.
* **Key Headings / Subsections:**
  - `Brand marks`
  - `Agent decision path`

### 4. `.agents\skills\archify\references\delivery-contract.md`
* **Document Title:** Delivery contract
* **File Size:** 7.9 KB | **Line Count:** 112 lines
* **Summary & Architectural Role:** Use `validate` after every candidate edit. Use final atomic delivery only after the candidate is frozen: node bin/archify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json Deliver reads the specification once, writes those exact bytes to a private sam...
* **Key Headings / Subsections:**
  - `Delivery contract`
  - `Validate and deliver`
  - `Automated browser evidence`
  - `Optional opening`
  - `Last-Good Live Preview`
  - `Perceptual delivery gate`

### 5. `.agents\skills\archify\references\viewer-runtime.md`
* **Document Title:** Viewer Runtime reference
* **File Size:** 4.1 KB | **Line Count:** 45 lines
* **Summary & Architectural Role:** Read this only when the user asks for a reader-facing capability. Ordinary generation does not require implementing or re-documenting these features; they are already in the generated HTML. - Diagram Guide lists current actions and shortcuts. - Reading Depth starts at READ at ...
* **Key Headings / Subsections:**
  - `Viewer Runtime reference`
  - `Exploration`
  - `Guided views and story`
  - `Motion and presentation`
  - `Canonical exports`
  - `Share Card`

### 6. `.agents\skills\archify\renderers\dataflow\README.md`
* **Document Title:** Data Flow Renderer
* **File Size:** 4.1 KB | **Line Count:** 104 lines
* **Summary & Architectural Role:** Render `diagram_type: "dataflow"` JSON files into the standard Archify HTML template. node archify/renderers/dataflow/render-dataflow.mjs input.dataflow.json output.html
* **Key Headings / Subsections:**
  - `Data Flow Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Design Rules`

### 7. `.agents\skills\archify\renderers\lifecycle\README.md`
* **Document Title:** Lifecycle Renderer
* **File Size:** 5.1 KB | **Line Count:** 115 lines
* **Summary & Architectural Role:** Render `diagram_type: "lifecycle"` JSON files into the standard Archify HTML template. node archify/renderers/lifecycle/render-lifecycle.mjs input.lifecycle.json output.html
* **Key Headings / Subsections:**
  - `Lifecycle Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Design Rules`

### 8. `.agents\skills\archify\renderers\sequence\README.md`
* **Document Title:** Sequence Renderer
* **File Size:** 4.7 KB | **Line Count:** 114 lines
* **Summary & Architectural Role:** Render `diagram_type: "sequence"` JSON files into the standard Archify HTML template. node archify/renderers/sequence/render-sequence.mjs input.sequence.json output.html
* **Key Headings / Subsections:**
  - `Sequence Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Column fit`
  - `Design Rules`

### 9. `.agents\skills\archify\renderers\workflow\README.md`
* **Document Title:** Workflow Renderer
* **File Size:** 10.1 KB | **Line Count:** 223 lines
* **Summary & Architectural Role:** Render `diagram_type: "workflow"` JSON files into the standard Archify HTML template. node archify/renderers/workflow/render-workflow.mjs input.workflow.json output.html
* **Key Headings / Subsections:**
  - `Workflow Renderer`
  - `Input`
  - `Migration and layout receipt`
  - `Legend`
  - `Layout contracts`
  - `Fixed v1`

### 10. `.agents\skills\archify\schemas\README.md`
* **Document Title:** Archify JSON IR Schemas
* **File Size:** 11.2 KB | **Line Count:** 211 lines
* **Summary & Architectural Role:** Each typed renderer consumes a JSON intermediate representation (IR) validated against one of the schemas in this folder before any layout work happens. | Schema | Governs | Structural arrays |
* **Key Headings / Subsections:**
  - `Archify JSON IR Schemas`
  - `Files`
  - `Legend presentation contract`
  - `schema_version policy`
  - `Shared definitions (common.schema.json)`
  - `Runtime validation`

### 11. `.agents\skills\archify\SKILL.md`
* **Document Title:** Archify
* **File Size:** 16.0 KB | **Line Count:** 137 lines
* **Summary & Architectural Role:** name: archify description: Create polished, validated architecture, workflow, sequence, data-flow, and lifecycle/state diagrams as explorable standalone HTML with inline SVG, dark/light themes, optional trace motion, and PNG/JPEG/WebP/SVG/WebM export. Accept plain-language req...
* **Key Headings / Subsections:**
  - `Archify`
  - `Fast authoring path`
  - `Update awareness`
  - `Type router`
  - `Mermaid input`
  - `Authoring invariants`

### 12. `.agents\skills\archify\THIRD_PARTY_NOTICES.md`
* **Document Title:** Third-party notices
* **File Size:** 4.4 KB | **Line Count:** 56 lines
* **Summary & Architectural Role:** Archify includes optional vector data for third-party brand marks. These marks are provided only to identify technologies and services in user-authored diagrams. Their inclusion does not imply sponsorship, endorsement, partnership,
* **Key Headings / Subsections:**
  - `Third-party notices`
  - `Simple Icons`
  - `OpenAI mark`
  - `No additional rights granted`

### 13. `archify\archify\brand-marks\README.md`
* **Document Title:** Built-in brand marks
* **File Size:** 1.4 KB | **Line Count:** 31 lines
* **Summary & Architectural Role:** Archify ships a bounded catalogue of 107 commonly used brands for architecture, workflow, sequence, data-flow, and lifecycle nodes. The mark is optional authored identity: it never replaces the node's semantic `type`, color, label, or
* **Key Headings / Subsections:**
  - `Built-in brand marks`

### 14. `archify\archify\references\authoring-contract.md`
* **Document Title:** Authoring contract
* **File Size:** 11.0 KB | **Line Count:** 191 lines
* **Summary & Architectural Role:** Read this reference only after the Fast authoring path calls for more detail. The schemas and examples remain authoritative. Read both the mode schema and `schemas/common.schema.json`. The mode schemas use `$ref`, so the common file is where shared enums live. - `componentType...
* **Key Headings / Subsections:**
  - `Authoring contract`
  - `Schema lookup`
  - `Workflow layout contracts`
  - `Legend contract`
  - `Language consistency`
  - `Visual preset default`

### 15. `archify\archify\references\brand-marks.md`
* **Document Title:** Brand marks
* **File Size:** 2.1 KB | **Line Count:** 65 lines
* **Summary & Architectural Role:** Use a brand mark only when a real product, provider, model family, channel, or service identity helps the reader. Semantic `type` still explains what the node does; `brand` explains whose product it is.
* **Key Headings / Subsections:**
  - `Brand marks`
  - `Agent decision path`

### 16. `archify\archify\references\delivery-contract.md`
* **Document Title:** Delivery contract
* **File Size:** 7.9 KB | **Line Count:** 112 lines
* **Summary & Architectural Role:** Use `validate` after every candidate edit. Use final atomic delivery only after the candidate is frozen: node bin/archify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json Deliver reads the specification once, writes those exact bytes to a private sam...
* **Key Headings / Subsections:**
  - `Delivery contract`
  - `Validate and deliver`
  - `Automated browser evidence`
  - `Optional opening`
  - `Last-Good Live Preview`
  - `Perceptual delivery gate`

### 17. `archify\archify\references\viewer-runtime.md`
* **Document Title:** Viewer Runtime reference
* **File Size:** 4.1 KB | **Line Count:** 45 lines
* **Summary & Architectural Role:** Read this only when the user asks for a reader-facing capability. Ordinary generation does not require implementing or re-documenting these features; they are already in the generated HTML. - Diagram Guide lists current actions and shortcuts. - Reading Depth starts at READ at ...
* **Key Headings / Subsections:**
  - `Viewer Runtime reference`
  - `Exploration`
  - `Guided views and story`
  - `Motion and presentation`
  - `Canonical exports`
  - `Share Card`

### 18. `archify\archify\renderers\dataflow\README.md`
* **Document Title:** Data Flow Renderer
* **File Size:** 4.1 KB | **Line Count:** 104 lines
* **Summary & Architectural Role:** Render `diagram_type: "dataflow"` JSON files into the standard Archify HTML template. node archify/renderers/dataflow/render-dataflow.mjs input.dataflow.json output.html
* **Key Headings / Subsections:**
  - `Data Flow Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Design Rules`

### 19. `archify\archify\renderers\lifecycle\README.md`
* **Document Title:** Lifecycle Renderer
* **File Size:** 5.1 KB | **Line Count:** 115 lines
* **Summary & Architectural Role:** Render `diagram_type: "lifecycle"` JSON files into the standard Archify HTML template. node archify/renderers/lifecycle/render-lifecycle.mjs input.lifecycle.json output.html
* **Key Headings / Subsections:**
  - `Lifecycle Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Design Rules`

### 20. `archify\archify\renderers\sequence\README.md`
* **Document Title:** Sequence Renderer
* **File Size:** 4.7 KB | **Line Count:** 114 lines
* **Summary & Architectural Role:** Render `diagram_type: "sequence"` JSON files into the standard Archify HTML template. node archify/renderers/sequence/render-sequence.mjs input.sequence.json output.html
* **Key Headings / Subsections:**
  - `Sequence Renderer`
  - `Input`
  - `Legend`
  - `Layout budget`
  - `Column fit`
  - `Design Rules`

### 21. `archify\archify\renderers\workflow\README.md`
* **Document Title:** Workflow Renderer
* **File Size:** 10.1 KB | **Line Count:** 223 lines
* **Summary & Architectural Role:** Render `diagram_type: "workflow"` JSON files into the standard Archify HTML template. node archify/renderers/workflow/render-workflow.mjs input.workflow.json output.html
* **Key Headings / Subsections:**
  - `Workflow Renderer`
  - `Input`
  - `Migration and layout receipt`
  - `Legend`
  - `Layout contracts`
  - `Fixed v1`

### 22. `archify\archify\schemas\README.md`
* **Document Title:** Archify JSON IR Schemas
* **File Size:** 11.2 KB | **Line Count:** 211 lines
* **Summary & Architectural Role:** Each typed renderer consumes a JSON intermediate representation (IR) validated against one of the schemas in this folder before any layout work happens. | Schema | Governs | Structural arrays |
* **Key Headings / Subsections:**
  - `Archify JSON IR Schemas`
  - `Files`
  - `Legend presentation contract`
  - `schema_version policy`
  - `Shared definitions (common.schema.json)`
  - `Runtime validation`

### 23. `archify\archify\SKILL.md`
* **Document Title:** Archify
* **File Size:** 16.0 KB | **Line Count:** 137 lines
* **Summary & Architectural Role:** name: archify description: Create polished, validated architecture, workflow, sequence, data-flow, and lifecycle/state diagrams as explorable standalone HTML with inline SVG, dark/light themes, optional trace motion, and PNG/JPEG/WebP/SVG/WebM export. Accept plain-language req...
* **Key Headings / Subsections:**
  - `Archify`
  - `Fast authoring path`
  - `Update awareness`
  - `Type router`
  - `Mermaid input`
  - `Authoring invariants`

### 24. `archify\archify\THIRD_PARTY_NOTICES.md`
* **Document Title:** Third-party notices
* **File Size:** 4.4 KB | **Line Count:** 56 lines
* **Summary & Architectural Role:** Archify includes optional vector data for third-party brand marks. These marks are provided only to identify technologies and services in user-authored diagrams. Their inclusion does not imply sponsorship, endorsement, partnership,
* **Key Headings / Subsections:**
  - `Third-party notices`
  - `Simple Icons`
  - `OpenAI mark`
  - `No additional rights granted`

### 25. `archify\benchmarks\ordinary-model-floor\prompts\agent-run.lifecycle.md`
* **Document Title:** Agent-run lifecycle
* **File Size:** 1.1 KB | **Line Count:** 7 lines
* **Summary & Architectural Role:** Use the Archify skill in this repository to create a lifecycle diagram for an agent run. Show the main ordered phases from queued through planning, execution, review, and completion. Execution may pause for human approval or fail recoverably. Review may block while waiting for...
* **Key Headings / Subsections:**
  - `Agent-run lifecycle`

### 26. `archify\benchmarks\ordinary-model-floor\prompts\agent-tool-call.workflow.md`
* **Document Title:** Agent tool-call workflow
* **File Size:** 1.1 KB | **Line Count:** 7 lines
* **Summary & Architectural Role:** Use the Archify skill in this repository to create a workflow diagram for an AI agent tool call. A user request reaches a chat surface and planner. A router decides whether human approval is required. Approval permits tool execution against an external provider; denial enters ...
* **Key Headings / Subsections:**
  - `Agent tool-call workflow`

### 27. `archify\benchmarks\ordinary-model-floor\prompts\cache-miss.sequence.md`
* **Document Title:** Cache-miss request sequence
* **File Size:** 1.0 KB | **Line Count:** 7 lines
* **Summary & Architectural Role:** Use the Archify skill in this repository to create a sequence diagram for a dashboard request. A browser calls an API, the API validates the JWT, then reads Redis. Redis returns a cache miss, so the API queries PostgreSQL for profile and metric data, stores the result back in ...
* **Key Headings / Subsections:**
  - `Cache-miss request sequence`

### 28. `archify\benchmarks\ordinary-model-floor\prompts\product-analytics.dataflow.md`
* **Document Title:** Product analytics data flow
* **File Size:** 1.1 KB | **Line Count:** 7 lines
* **Summary & Architectural Role:** Use the Archify skill in this repository to create a data-flow diagram for product analytics. Web and mobile clients send events to an edge ingestion API. Consent is checked before identity data enters a protected PII vault. Accepted events enter a stream, become normalized wa...
* **Key Headings / Subsections:**
  - `Product analytics data flow`

### 29. `archify\benchmarks\ordinary-model-floor\prompts\web-runtime.architecture.md`
* **Document Title:** Web runtime architecture
* **File Size:** 1.1 KB | **Line Count:** 7 lines
* **Summary & Architectural Role:** Use the Archify skill in this repository to create an architecture diagram for a production web application. Browser users enter through a CDN over HTTPS, then traffic reaches a load balancer and an application API. The API verifies identity with an auth provider, reads throug...
* **Key Headings / Subsections:**
  - `Web runtime architecture`

### 30. `archify\benchmarks\ordinary-model-floor\README.md`
* **Document Title:** Ordinary-Model Floor v1
* **File Size:** 8.3 KB | **Line Count:** 125 lines
* **Summary & Architectural Role:** This benchmark measures a narrow product question: can an ordinary coding agent produce an Archify diagram that is usable on attempt 1, without a human repairing the JSON? It is a delivery gate, not a model leaderboard. A run is `firstPassUsable` only when all three gates pass...
* **Key Headings / Subsections:**
  - `Ordinary-Model Floor v1`
  - `Suite`
  - `Fair-run protocol`
  - `Verify one run`
  - `Visual review`
  - `Report a complete matrix`

### 31. `archify\CHANGELOG.md`
* **Document Title:** Changelog
* **File Size:** 92.3 KB | **Line Count:** 386 lines
* **Summary & Architectural Role:** All notable changes are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). - **License provenance in distributions.** Source and packaged Skill distributions retain Cocoon AI's exact MIT copyright notice, package staging and smoke tests fa...
* **Key Headings / Subsections:**
  - `Changelog`
  - `[Unreleased]`
  - `Fixed`
  - `[2.16.0] — 2026-08-30`
  - `Added`
  - `Changed`

### 32. `archify\CONTRIBUTING.md`
* **Document Title:** Contributing to Archify
* **File Size:** 10.2 KB | **Line Count:** 151 lines
* **Summary & Architectural Role:** Thank you for helping Archify make engineering diagrams more trustworthy and useful. Archify is Agent-first: people describe the system they want to explain, while the Skill, typed JSON contract, renderers, validators, and delivery receipts make the result reproducible. Stabil...
* **Key Headings / Subsections:**
  - `Contributing to Archify`
  - `Choose the right path`
  - `Before writing code`
  - `Product and compatibility contracts`
  - `Local setup`
  - `Evidence by change type`

### 33. `archify\DESIGN.md`
* **Document Title:** Design System: Archify
* **File Size:** 12.0 KB | **Line Count:** 245 lines
* **Summary & Architectural Role:** name: Archify description: A precise, vivid technical instrument for trustworthy interactive architecture maps. colors:
* **Key Headings / Subsections:**
  - `Design System: Archify`
  - `Overview`
  - `Colors`
  - `Primary`
  - `Secondary`
  - `Tertiary`

### 34. `archify\docs\article-archify.md`
* **Document Title:** 让 AI 画架构图不难。难的是决定不画什么。
* **File Size:** 12.2 KB | **Line Count:** 174 lines
* **Summary & Architectural Role:** ![Archify cover — 左边自动布局死路，右边手动布局活路](article-cover.jpg) 一条命令： node renderers/architecture/render-architecture.mjs web-app.json web-app.html
* **Key Headings / Subsections:**
  - `让 AI 画架构图不难。难的是决定不画什么。`
  - `一个实验：换 CSS 不换布局，能差多远？`
  - `不是"人类在环"，是"判断在环"`
  - `决心不做什么，比做了什么更难`
  - `什么情况下它会失效`
  - `那么，Archify 真正值得学习的是什么？`

### 35. `archify\docs\artifact-install-v2-measurement.md`
* **Document Title:** Artifact → Install v2 measurement contract
* **File Size:** 3.4 KB | **Line Count:** 50 lines
* **Summary & Architectural Role:** Artifact → Install v2 is a bounded change to the existing journey. Proof Lab cards link to `start.html?type=<type>&source=gallery`, and the Start page selects the matching typed recipe and can copy the selected agent's install command plus the bounded prompt in one action. Gen...
* **Key Headings / Subsections:**
  - `Artifact → Install v2 measurement contract`
  - `Privacy boundary`
  - `Observable metrics`
  - `What this does not prove`
  - `Evaluation window`

### 36. `archify\docs\authoring-cookbook.md`
* **Document Title:** Authoring Cookbook
* **File Size:** 5.1 KB | **Line Count:** 108 lines
* **Summary & Architectural Role:** Archify is primarily an Agent-facing Skill. Normal users can ask a Skill-capable Agent to generate the diagram; they do not need to learn the schema or run `validate`, `inspect`, or `deliver` themselves. The manual workflow below is a reference for integration, contribution, a...
* **Key Headings / Subsections:**
  - `Authoring Cookbook`
  - `1. Check the installation`
  - `2. Choose a diagram type`
  - `3. Author one bounded source file`
  - `4. Validate before rendering a handoff`
  - `5. Deliver the trusted artifact`

### 37. `archify\docs\authoring-cookbook.zh-CN.md`
* **Document Title:** Archify 编图实践手册
* **File Size:** 4.7 KB | **Line Count:** 108 lines
* **Summary & Architectural Role:** Archify 首先是面向 Agent 的 Skill。普通用户只需向支持 Skill 的 Agent 描述想要的图；不必学习 Schema，也不必自己运行 `validate`、`inspect` 或 `deliver`。 下面的手工流程面向集成、贡献和排错。命令假设你位于仓库的 `archify/` 目录，或已经安装好的 Archify Skill 根目录。 Archify 要求 Node.js 18 或更高版本。开始编图前先运行 doctor：
* **Key Headings / Subsections:**
  - `Archify 编图实践手册`
  - `1. 检查安装`
  - `2. 选择图表类型`
  - `3. 编写边界清楚的源文件`
  - `4. 先校验，再交付`
  - `5. 交付可信成品`

### 38. `archify\docs\cursor-acceptance-2026-07.md`
* **Document Title:** Cursor acceptance record
* **File Size:** 3.5 KB | **Line Count:** 73 lines
* **Summary & Architectural Role:** - Cursor Agent CLI: `2026.07.20-8cc9c0b` - Model selection: `auto` (Cursor CLI default) - OS: macOS 26.5.2 (`25F84`)
* **Key Headings / Subsections:**
  - `Cursor acceptance record`
  - `Environment`
  - `Installation and discovery`
  - `End-to-end task`
  - `Browser review`
  - `Boundaries retained`

### 39. `archify\docs\deployment-ownership-profile-acceptance-2026-07-23.md`
* **Document Title:** Deployment Ownership Profile Acceptance
* **File Size:** 5.1 KB | **Line Count:** 92 lines
* **Summary & Architectural Role:** Date: 2026-07-23 (Asia/Shanghai) Branch: `codex/deployment-ownership-profile` Research: `docs/research-next-stability-delight-slice-2026-07-23.md`
* **Key Headings / Subsections:**
  - `Deployment Ownership Profile Acceptance`
  - `Outcome`
  - `Contract proven`
  - `Deterministic and failure evidence`
  - `Built-in browser acceptance`
  - `Release gates`

### 40. `archify\docs\issue-52-visual-evidence\README.md`
* **Document Title:** Issue #52 visual acceptance
* **File Size:** 2.2 KB | **Line Count:** 36 lines
* **Summary & Architectural Role:** Browser review status: **passed** on 2026-08-02 with Google Chrome headless at 1280px width. The source fixtures are the two reproductions from Issue #52. “Before” was rendered from `origin/main@a097c2d63eceeff9603a911a9075f0694d381f83`;
* **Key Headings / Subsections:**
  - `Issue #52 visual acceptance`

### 41. `archify\docs\research-architecture-delta-pr-proof-2026-07-23.md`
* **Document Title:** Architecture Delta / PR Proof：研究结论与实现合同
* **File Size:** 25.7 KB | **Line Count:** 248 lines
* **Summary & Architectural Role:** 日期：2026-07-23（Asia/Shanghai） Archify 基线：`codex/architecture-delta-proof@5302d2251ff2aaca56f7c08818ebe8421f41a6f3` 下一项值得做的用户可见切片是一个 **Architecture Delta**：给它两份已经存在、已经通过 Archify 校验的 `architecture` JSON，它生成一个离线、自包含、可验证的 HTML，默认回答“架构事实改了什么”，并可切换 Before / Delta / After。**PR Proof 是...
* **Key Headings / Subsections:**
  - `Architecture Delta / PR Proof：研究结论与实现合同`
  - `结论`
  - `一手证据`
  - `Agents365 drawio-skill：证明评审入口有价值，也暴露了不能照抄的边界`
  - `GitNexus：事实变化与推断影响必须分层`
  - `GitDiagram：路径化诊断、有限审计值得吸收，模型重试不属于 Delta`

### 42. `archify\docs\research-authored-reachability-2026-07-23.md`
* **Document Title:** Authored Reachability — competitor learning and product boundary
* **File Size:** 2.8 KB | **Line Count:** 48 lines
* **Summary & Architectural Role:** Date: 2026-07-23 - [GitNexus at `cdbdf21`](https://github.com/abhigyanpatwari/GitNexus/blob/cdbdf219dce797e51cdeb8cfa386e77ab2d35628/README.md#L145-L146) makes graph exploration useful by turning a selected symbol into upstream impact groups and a shortest directed path. The i...
* **Key Headings / Subsections:**
  - `Authored Reachability — competitor learning and product boundary`
  - `What the adjacent tools teach`
  - `Archify's bounded response`
  - `Truth boundary`
  - `Rejected scope`
  - `Acceptance`

### 43. `archify\docs\research-cursor-onboarding-2026-07.md`
* **Document Title:** Archify first-class Cursor onboarding research
* **File Size:** 16.1 KB | **Line Count:** 133 lines
* **Summary & Architectural Role:** **Recommendation:** add Cursor as a first-class installation surface for the existing `archify` Skill. Do not fork `SKILL.md`, add a Cursor-only runtime, or call the work complete until one real Cursor Editor/CLI session discovers the Skill and produces a verified artifact. Us...
* **Key Headings / Subsections:**
  - `Archify first-class Cursor onboarding research`
  - `Decision`
  - `Individual use: available in every Cursor project`
  - `Team/repository use: installed only in the current project`
  - `Post-research acceptance`
  - `Verified facts`

### 44. `archify\docs\research-editorial-preset-2026-07-23.md`
* **Document Title:** Editorial Preset Research
* **File Size:** 4.6 KB | **Line Count:** 101 lines
* **Summary & Architectural Role:** Date: 2026-07-23 Status: implementation decision for `codex/visual-proof-evolution` Archify already has the deeper reading product: exact semantic identity, search,
* **Key Headings / Subsections:**
  - `Editorial Preset Research`
  - `Why this slice`
  - `Primary-source comparison`
  - `Fireworks Tech Graph`
  - `D2`
  - `AntV G6`

### 45. `archify\docs\research-evidence-beacons-2026-07-23.md`
* **Document Title:** Verified Source Beacons — focused follow-up
* **File Size:** 2.6 KB | **Line Count:** 27 lines
* **Summary & Architectural Role:** Date: 2026-07-23 Decision: make already-verified repository evidence visible on the canvas; add no parser, panel, or inferred graph data. - Understand Anything makes each file/function/class node clickable and pairs selection with code, relationships, and explanation. Its own ...
* **Key Headings / Subsections:**
  - `Verified Source Beacons — focused follow-up`
  - `Current signal from adjacent projects`
  - `The gap after Repository Evidence Passport`
  - `Bounded product contract`
  - `Why this is the next slice`

### 46. `archify\docs\research-fireworks-tech-graph.md`
* **Document Title:** fireworks-tech-graph research note
* **File Size:** 10.5 KB | **Line Count:** 218 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Primary repository: <https://github.com/yizhiyanhua-ai/fireworks-tech-graph> `fireworks-tech-graph` is an Agent Skill for Codex and Claude Code that turns a
* **Key Headings / Subsections:**
  - `fireworks-tech-graph research note`
  - `Executive summary`
  - `Current snapshot`
  - `Product and runtime model`
  - `What is genuinely implemented`
  - `Local verification`

### 47. `archify\docs\research-next-delight-slice-2026-07-22.md`
* **Document Title:** Archify 下一增长切片研究：Last-Good Live Preview
* **File Size:** 17.1 KB | **Line Count:** 139 lines
* **Summary & Architectural Role:** 日期：2026-07-22（Asia/Shanghai） Archify 基线：`main@440e16d`；开放中的 [PR #44](https://github.com/tt-a1i/archify/pull/44) `@212639b` 已加入 opt-in Editable Source Capsule，五项远端检查全绿。**本建议只依赖 `main` 已有的 Atomic Delivery 与 Verified Open，可从 `main@440e16d` 独立落地，不以 PR #44 合并为前置。** 上游快照：Fireworks `...
* **Key Headings / Subsections:**
  - `Archify 下一增长切片研究：Last-Good Live Preview`
  - `结论`
  - `一手事实，不按 Star 数抄功能`
  - `Fireworks：视觉宽度必须被共同质量合同约束`
  - `D2 与 Mermaid Live Editor：即时反馈是作者体验，但监听和重渲并不简单`
  - `GitDiagram：代码图的高价值后续是可核验来源，不是 Mermaid 本身`

### 48. `archify\docs\research-next-stability-delight-2026-07-23.md`
* **Document Title:** Architecture Delta 之后的下一刀：Exact-ID Delta Review Navigator
* **File Size:** 16.6 KB | **Line Count:** 194 lines
* **Summary & Architectural Role:** 研究日期：2026-07-23 Archify 基线：[`4aeb07b`](https://github.com/tt-a1i/archify/tree/4aeb07b379f09a8fc026df33e2402ad50ef9821e) 下一项只做 **Exact-ID Delta Review Navigator（逐项架构变更审阅器）**：在现有 Architecture Delta HTML 内，把已经生成的确定性 change rows 变成可选择的审阅步骤，并加入 `Previous / Review / Next / Overview`...
* **Key Headings / Subsections:**
  - `Architecture Delta 之后的下一刀：Exact-ID Delta Review Navigator`
  - `唯一推荐`
  - `为什么这是一个真实缺口`
  - `一手资料结论`
  - `Fireworks Tech Graph：借语义顺序和固定场景，不借循环特效`
  - `GitDiagram：交互必须落回已经校验的结构`

### 49. `archify\docs\research-next-stability-delight-slice-2026-07-23.md`
* **Document Title:** Archify 下一轮稳定与惊喜切片：Deployment Ownership Contract
* **File Size:** 24.8 KB | **Line Count:** 289 lines
* **Summary & Architectural Role:** 研究日期：2026-07-23（Asia/Shanghai） Archify 已提交基线：[`codex/cursor-onboarding@a73047b`](https://github.com/tt-a1i/archify/tree/a73047b27e3b423fc8ab6ebd1ac84fd4ecb2e782) 上游固定快照：Fireworks [`50c819d`](https://github.com/yizhiyanhua-ai/fireworks-tech-graph/tree/50c819d68fd4fee330b3010988...
* **Key Headings / Subsections:**
  - `Archify 下一轮稳定与惊喜切片：Deployment Ownership Contract`
  - `结论`
  - `1. Archify 真实基线：视觉证明已经有，语义合同还没有`
  - `2. 四个一手同类项目：值得吸收、已经具备、不要复制`
  - `2.1 Fireworks Tech Graph：真正领先的是工程 profile，不是“12 套皮肤”`
  - `2.2 GitDiagram：把一眼入口和真实路径校验学过来，不把 SaaS 搬过来`

### 50. `archify\docs\research-next-stability-growth-slice-2026-07.md`
* **Document Title:** Archify 下一轮“稳定优先、用户可见、利于增长”切片研究
* **File Size:** 15.7 KB | **Line Count:** 186 lines
* **Summary & Architectural Role:** 下一轮唯一推荐：**Structured Repair Receipt（结构化修复回执）**。 它不是再加一种图、再加一个动画或再加一个 Viewer 面板，而是让 `validate --json` 和 `deliver --json` 在失败时也输出稳定、可解析、带精确证据与受支持修复旋钮的 JSON。Agent 不必从 Node 堆栈和多行英文错误中猜“应该改哪个对象、哪条线、哪个字段”，因此弱模型和不同客户端也更容易在最多两轮内完成准确修复。 这是当前最符合三项约束的交集：
* **Key Headings / Subsections:**
  - `Archify 下一轮“稳定优先、用户可见、利于增长”切片研究`
  - `结论先行`
  - `1. 先排除已经完成的能力`
  - `2. 当前公开反馈揭示的真实痛点`
  - `2.1 弱模型/不同 Agent 的首轮构图质量仍不稳定`
  - `2.2 多轮调整的成本对用户真实可感`

### 51. `archify\docs\research-reach-share-card-2026-07-23.md`
* **Document Title:** Reach Share Card — competitor learning and bounded export contract
* **File Size:** 3.5 KB | **Line Count:** 50 lines
* **Summary & Architectural Role:** Date: 2026-07-23 - [GitNexus architecture at current `main`](https://github.com/abhigyanpatwari/GitNexus/blob/main/ARCHITECTURE.md#L265-L285) treats upstream/downstream impact and shortest directed traces as first-class graph questions, and now extends them across repository c...
* **Key Headings / Subsections:**
  - `Reach Share Card — competitor learning and bounded export contract`
  - `Evidence`
  - `Product decision`
  - `Fail-closed rules`
  - `Explicit boundaries`
  - `Acceptance`

### 52. `archify\docs\research-repo-evidence-passport-2026-07-23.md`
* **Document Title:** Repository Evidence Passport — focused research note
* **File Size:** 4.0 KB | **Line Count:** 46 lines
* **Summary & Architectural Role:** Date: 2026-07-23 Decision: build one bounded Architecture-only slice; do not widen Archify into a code indexer. - GitNexus treats a code map as useful when it carries real execution flows, impact, staleness, and local/private operation—not merely more node styles ([README at `...
* **Key Headings / Subsections:**
  - `Repository Evidence Passport — focused research note`
  - `Signal from adjacent projects`
  - `Borrow / skip`
  - `Product contract`
  - `Why this slice`

### 53. `archify\docs\research-trustworthy-first-diagram-slice.md`
* **Document Title:** Archify：可信首次交付的最小实现切片
* **File Size:** 20.8 KB | **Line Count:** 204 lines
* **Summary & Architectural Role:** **建议只做一个纵向切片：`Trustworthy First Delivery v1`。** 它包含同一条交付链上的两个不可拆开的门： 1. **无条件语义安全门**：任何 renderer-owned relationship 穿过无关的、不透明语义节点时，都必须 hard fail；不能再因为输入没有 `meta.quality_profile` 或 CLI `--quality` 而静默放行。更严格的 X 交叉、短段、节奏等审美预算仍保持 profile-aware。
* **Key Headings / Subsections:**
  - `Archify：可信首次交付的最小实现切片`
  - `结论`
  - `为什么是这一刀`
  - `Archify 当前事实基线`
  - `main 与已有能力`
  - `issues 与 PR 的当前状态`

### 54. `archify\docs\research-visual-evolution-round-10.md`
* **Document Title:** Visual evolution round 10: Relationship Lens
* **File Size:** 2.4 KB | **Line Count:** 27 lines
* **Summary & Architectural Role:** Archify could already focus a node and highlight its one-hop neighborhood, but the reader still had to decode arrow direction and small edge labels directly from the canvas. Focus answered “what is near this node?” without answering “what comes in, what leaves, what is the rel...
* **Key Headings / Subsections:**
  - `Visual evolution round 10: Relationship Lens`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify boundary`
  - `What we deliberately did not borrow`

### 55. `archify\docs\research-visual-evolution-round-11.md`
* **Document Title:** Visual evolution round 11: Relationship Preview
* **File Size:** 2.9 KB | **Line Count:** 31 lines
* **Summary & Architectural Role:** Relationship Lens made edge names and directions readable, but it still left a high-degree-node reader to visually match a text row with one of several nearby paths. The panel answered “what is this relationship called?” without instantly answering “which exact line is it?” - ...
* **Key Headings / Subsections:**
  - `Visual evolution round 11: Relationship Preview`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify boundary`
  - `What we deliberately did not borrow`

### 56. `archify\docs\research-visual-evolution-round-12.md`
* **Document Title:** Visual evolution round 12: Semantic Camera
* **File Size:** 3.4 KB | **Line Count:** 40 lines
* **Summary & Architectural Role:** Archify could select nodes, name relationships, and play guided views, but desktop `reveal()` returned without changing the viewport. In Presentation Stage, tall or dense diagrams could remain centered at overview scale even when only four nodes mattered. The system knew the r...
* **Key Headings / Subsections:**
  - `Visual evolution round 12: Semantic Camera`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify boundary`
  - `Browser-led corrections`
  - `What we deliberately did not borrow`

### 57. `archify\docs\research-visual-evolution-round-13.md`
* **Document Title:** Visual evolution round 13: Path-aware Story Trail
* **File Size:** 4.5 KB | **Line Count:** 44 lines
* **Summary & Architectural Role:** Archify could play named guided views and let Semantic Camera frame each selection, but the transition still read like a sequence of static screenshots. The viewer named the chapter without showing the ordered semantic stops or making the relationships inside that chapter visi...
* **Key Headings / Subsections:**
  - `Visual evolution round 13: Path-aware Story Trail`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify decision`
  - `Browser-led corrections`
  - `What we deliberately did not borrow`

### 58. `archify\docs\research-visual-evolution-round-14.md`
* **Document Title:** Visual evolution round 14: Share-ready one-shot chapters
* **File Size:** 3.4 KB | **Line Count:** 34 lines
* **Summary & Architectural Role:** Archify could deep-link a named view and manually play a complete guided story, but a shared `#view=` URL opened on a still frame. The landing-page proof selector had a more serious mismatch: its link named a guided view while the embedded artifact loaded only the generic diag...
* **Key Headings / Subsections:**
  - `Visual evolution round 14: Share-ready one-shot chapters`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify decision`
  - `What we deliberately did not borrow`

### 59. `archify\docs\research-visual-evolution-round-15.md`
* **Document Title:** Visual evolution round 15: Share Chapter Cue
* **File Size:** 3.8 KB | **Line Count:** 41 lines
* **Summary & Architectural Role:** Round 14 made a shared chapter play exactly once, but embed mode deliberately hides the full Guided Views controls. A reader could see motion without knowing the chapter title, the authored route, whether playback was still running, or why a reduced-motion device stayed still....
* **Key Headings / Subsections:**
  - `Visual evolution round 15: Share Chapter Cue`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify decision`
  - `Browser receipts`
  - `What we deliberately did not borrow`

### 60. `archify\docs\research-visual-evolution-round-16.md`
* **Document Title:** Visual evolution round 16: Semantic Story Beats
* **File Size:** 4.6 KB | **Line Count:** 45 lines
* **Summary & Architectural Role:** Story Trail already knew the author's ordered semantic stops, but playback treated the selected subgraph as one simultaneous animation. Every selected node pulsed and every internal edge flowed at once. The text described an order that the diagram itself did not perform. Round...
* **Key Headings / Subsections:**
  - `Visual evolution round 16: Semantic Story Beats`
  - `Reader problem`
  - `Patterns worth borrowing`
  - `Archify decision`
  - `Browser receipts`
  - `What we deliberately did not borrow`

### 61. `archify\docs\research-visual-evolution-round-17.md`
* **Document Title:** Visual evolution round 17: Semantic Passport
* **File Size:** 4.3 KB | **Line Count:** 95 lines
* **Summary & Architectural Role:** Archify can already find a node, frame its neighborhood, name incoming and outgoing relationships, preview the exact edge, and play authored story paths. The selected node itself is still under-explained. A reader sees a label and a
* **Key Headings / Subsections:**
  - `Visual evolution round 17: Semantic Passport`
  - `Reader problem`
  - `Primary-source patterns reviewed`
  - `Product decision`
  - `Borrow / skip boundary`
  - `Borrow`

### 62. `archify\docs\research-visual-evolution-round-18.md`
* **Document Title:** Visual Evolution Round 18 — Semantic Radar
* **File Size:** 3.9 KB | **Line Count:** 86 lines
* **Summary & Architectural Role:** Date: 2026-07-19 What should Archify add after Node Finder, Semantic Camera, Relationship Lens, Story Trail, and Semantic Passport so that large diagrams remain pleasant to
* **Key Headings / Subsections:**
  - `Visual Evolution Round 18 — Semantic Radar`
  - `Question`
  - `Primary-source findings`
  - `React Flow treats the minimap as a live model of the viewport`
  - `GoJS uses an Overview as both orientation and navigation`
  - `Structurizr keeps navigation redundant and keyboard-addressable`

### 63. `archify\docs\research-visual-evolution-round-19.md`
* **Document Title:** Visual Evolution Round 19 — Intent Trace
* **File Size:** 5.3 KB | **Line Count:** 122 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Archify has strong committed exploration after a reader clicks a node: Semantic Camera frames its neighborhood, Semantic Passport explains it, Relationship Lens
* **Key Headings / Subsections:**
  - `Visual Evolution Round 19 — Intent Trace`
  - `Product question`
  - `Primary-source findings`
  - `AntV G6: hover is a bounded graph behavior`
  - `Sigma.js: preview and commitment are distinct events`
  - `Cytoscape.js: pointer and touch have different contracts`

### 64. `archify\docs\research-visual-evolution-round-2.md`
* **Document Title:** Archify visual evolution research — round 2
* **File Size:** 27.1 KB | **Line Count:** 564 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Archify should absorb **viewer intelligence**, **stable semantic identity**, and **proof-first presentation** from adjacent projects. It should not absorb their
* **Key Headings / Subsections:**
  - `Archify visual evolution research — round 2`
  - `Executive decision`
  - `Round 2 implementation status`
  - `Scope and evidence rules`
  - `Repository findings`
  - `1. fireworks-tech-graph`

### 65. `archify\docs\research-visual-evolution-round-20.md`
* **Document Title:** Visual Evolution Round 20 — Route Probe
* **File Size:** 4.0 KB | **Line Count:** 76 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Archify already supports authored Story Trails, one-hop Intent Trace, durable node focus, relationship inspection, search, and overview navigation. Those
* **Key Headings / Subsections:**
  - `Visual Evolution Round 20 — Route Probe`
  - `Reader gap`
  - `Primary-source lessons`
  - `Borrow / skip decision`
  - `Borrow`
  - `Skip`

### 66. `archify\docs\research-visual-evolution-round-21.md`
* **Document Title:** Visual Evolution Round 21 — Searchable Route Endpoints
* **File Size:** 3.9 KB | **Line Count:** 78 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Route Probe can already trace the shortest authored directed route between two semantic nodes. Direct canvas picking works well when both endpoints are in
* **Key Headings / Subsections:**
  - `Visual Evolution Round 21 — Searchable Route Endpoints`
  - `Reader gap`
  - `Primary-source lessons`
  - `Borrow / skip decision`
  - `Borrow`
  - `Skip`

### 67. `archify\docs\research-visual-evolution-round-22.md`
* **Document Title:** Visual Evolution Round 22 — Diagram Guide
* **File Size:** 3.9 KB | **Line Count:** 78 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Archify artifacts now support focus, relationship inspection, search, route analysis, overview navigation, guided stories, presentation, motion, and export.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 22 — Diagram Guide`
  - `Reader gap`
  - `Primary-source lessons`
  - `Borrow / skip decision`
  - `Borrow`
  - `Skip`

### 68. `archify\docs\research-visual-evolution-round-23.md`
* **Document Title:** Visual Evolution Round 23 — Reading Depth
* **File Size:** 6.4 KB | **Line Count:** 125 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Round 22 made Archify's rich viewer actions discoverable. The next problem is not another missing action: it is **simultaneous information density**. At the
* **Key Headings / Subsections:**
  - `Visual Evolution Round 23 — Reading Depth`
  - `Reader gap`
  - `Primary-source lessons`
  - `Competing candidate: Semantic Lens`
  - `Borrow / skip decision`
  - `Borrow now`

### 69. `archify\docs\research-visual-evolution-round-24.md`
* **Document Title:** Visual Evolution Round 24 — Semantic Lens
* **File Size:** 11.1 KB | **Line Count:** 202 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Reading Depth now answers “how much detail should I see at this zoom?” The next unanswered reader question is categorical rather than spatial:
* **Key Headings / Subsections:**
  - `Visual Evolution Round 24 — Semantic Lens`
  - `Product question`
  - `Current Archify evidence`
  - `Primary-source findings`
  - `G6: a legend is an interaction surface, not merely a color key`
  - `Sigma.js: visual reduction can be derived without mutating graph data`

### 70. `archify\docs\research-visual-evolution-round-25.md`
* **Document Title:** Visual Evolution Round 25 — Directional Flow Pulse
* **File Size:** 17.8 KB | **Line Count:** 276 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) Archify already has optional trace animation, one-hop Intent Trace, directed Route Probe, Story Trail, and exact Relationship Preview. The next motion change
* **Key Headings / Subsections:**
  - `Visual Evolution Round 25 — Directional Flow Pulse`
  - `Product question`
  - `Current Archify evidence`
  - `Primary-source findings`
  - `fireworks-tech-graph: the life comes from fixed geometry plus semantic traffic`
  - `G6: useful motion is attached to a graph event or lifecycle stage`

### 71. `archify\docs\research-visual-evolution-round-26.md`
* **Document Title:** Visual Evolution Round 26 — Exact-edge Directional Flow Pulse
* **File Size:** 23.0 KB | **Line Count:** 401 lines
* **Summary & Architectural Role:** Research date: 2026-07-20 (Asia/Shanghai) Archify should add one **finite, source-to-target Directional Flow Pulse** to the relationship row that Relationship Preview already owns.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 26 — Exact-edge Directional Flow Pulse`
  - `Executive decision`
  - `Current Archify evidence`
  - `Primary-source findings`
  - `1. fireworks-tech-graph: borrow the packet head and ownership discipline, not the loop`
  - `2. G6: animation belongs to an interaction or lifecycle stage`

### 72. `archify\docs\research-visual-evolution-round-27.md`
* **Document Title:** Visual Evolution Round 27 — Semantic Legend Bridge
* **File Size:** 24.9 KB | **Line Count:** 439 lines
* **Summary & Architectural Role:** Research date: 2026-07-20 (Asia/Shanghai) Archify already has two category surfaces: 1. each renderer draws a compact in-diagram legend; and
* **Key Headings / Subsections:**
  - `Visual Evolution Round 27 — Semantic Legend Bridge`
  - `Product question`
  - `Current Archify evidence`
  - `The Lens already owns the authoritative category model`
  - `Renderer legends do not all mean the same thing`
  - `Primary-source findings`

### 73. `archify\docs\research-visual-evolution-round-28.md`
* **Document Title:** Visual Evolution Round 28 — Named Chapter Rail
* **File Size:** 21.6 KB | **Line Count:** 412 lines
* **Summary & Architectural Role:** Research date: 2026-07-20 (Asia/Shanghai) Archify already compiles authored `guidedViews`, renders the active chapter's label and note, supports Previous / Next / Play / Show all, exposes `[` and `]`
* **Key Headings / Subsections:**
  - `Visual Evolution Round 28 — Named Chapter Rail`
  - `Product question`
  - `Current Archify evidence`
  - `The authored model already contains everything the rail needs`
  - ``activeIndex` is already the sole chapter owner`
  - `The active node trail and the proposed chapter rail are different levels`

### 74. `archify\docs\research-visual-evolution-round-29.md`
* **Document Title:** Visual Evolution Round 29 — Motion Governor
* **File Size:** 35.9 KB | **Line Count:** 728 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: research recommendation for the next bounded viewer slice Build a **Motion Governor** before adding another chapter transition effect.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 29 — Motion Governor`
  - `Executive decision`
  - `Scope and method`
  - `What Rounds 1–28 already cover`
  - `Current Archify evidence`
  - `The viewer has several independent animation clocks`

### 75. `archify\docs\research-visual-evolution-round-3.md`
* **Document Title:** Archify visual evolution research — round 3
* **File Size:** 2.7 KB | **Line Count:** 57 lines
* **Summary & Architectural Role:** Research date: 2026-07-19 (Asia/Shanghai) The next viewer improvement is **bounded guided-story playback**, not a canvas editor, arbitrary animation timeline, or GIF scene engine.
* **Key Headings / Subsections:**
  - `Archify visual evolution research — round 3`
  - `Decision`
  - `Bounded contract`
  - `Why this belongs in Archify`
  - `Verification`

### 76. `archify\docs\research-visual-evolution-round-30.md`
* **Document Title:** Visual Evolution Round 30 — Shared Anchor Chapter Handoff
* **File Size:** 10.9 KB | **Line Count:** 156 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **Shared Anchor Chapter Handoff** as the next bounded viewer slice.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 30 — Shared Anchor Chapter Handoff`
  - `Executive decision`
  - `Evidence and scope`
  - `Borrow / adapt / skip`
  - `Exact runtime contract`
  - `Acceptance checklist`

### 77. `archify\docs\research-visual-evolution-round-31.md`
* **Document Title:** Visual Evolution Round 31 — Chapter Delta Preview
* **File Size:** 23.5 KB | **Line Count:** 370 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **Chapter Delta Preview** as the next bounded viewer slice, but define it
* **Key Headings / Subsections:**
  - `Visual Evolution Round 31 — Chapter Delta Preview`
  - `Executive decision`
  - `Current Archify evidence`
  - `Primary-source findings`
  - `LikeC4: transient hover state is not selection or navigation`
  - `reveal.js: stable matching and unmatched content are explicit`

### 78. `archify\docs\research-visual-evolution-round-32.md`
* **Document Title:** Visual Evolution Round 32 — Story Beat Navigator
* **File Size:** 28.1 KB | **Line Count:** 488 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **Story Beat Navigator** as the next bounded viewer slice.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 32 — Story Beat Navigator`
  - `Executive decision`
  - `Why this slice is real in current Archify`
  - `Primary-source findings`
  - `fireworks-tech-graph: motion works when geometry stays still`
  - `LikeC4: a walkthrough is directly controllable state`

### 79. `archify\docs\research-visual-evolution-round-33.md`
* **Document Title:** Visual Evolution Round 33 — Shareable Story Moment
* **File Size:** 34.8 KB | **Line Count:** 655 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **Shareable Story Moment** as the next bounded viewer slice.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 33 — Shareable Story Moment`
  - `Executive decision`
  - `Focused research question`
  - `Current Archify baseline`
  - `What already has stable URL identity`
  - `What is intentionally not recoverable yet`

### 80. `archify\docs\research-visual-evolution-round-34.md`
* **Document Title:** Visual Evolution Round 34 — Direct Relationship Pin
* **File Size:** 43.4 KB | **Line Count:** 746 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Accept the hypothesis and build **Direct Relationship Pin** as the next bounded
* **Key Headings / Subsections:**
  - `Visual Evolution Round 34 — Direct Relationship Pin`
  - `Executive decision`
  - `Focused research question`
  - `Current Archify baseline`
  - `Relationships already have compiled semantic identity`
  - `The explanation surface already exists`

### 81. `archify\docs\research-visual-evolution-round-35.md`
* **Document Title:** Visual Evolution Round 35 — Stable Relationship Links and Route Journey Research
* **File Size:** 45.8 KB | **Line Count:** 648 lines
* **Summary & Architectural Role:** Research date: 2026-07-20 (Asia/Shanghai) Status: stable relationship links selected; Route Journey retained as the next research candidate Archify should **not** add another minimap, another semantic-zoom layer, or another standalone search panel in Round 35. Those capabiliti...
* **Key Headings / Subsections:**
  - `Visual Evolution Round 35 — Stable Relationship Links and Route Journey Research`
  - `Executive verdict`
  - `Implementation decision after the research review`
  - `Research question`
  - `Method and evidence boundary`
  - `Current Archify audit: do not solve an already-solved problem`

### 82. `archify\docs\research-visual-evolution-round-36.md`
* **Document Title:** Visual Evolution Research — Round 36
* **File Size:** 5.1 KB | **Line Count:** 77 lines
* **Summary & Architectural Role:** Date: 2026-07-20 How can Archify borrow the appeal of richer animated diagram products without weakening its strongest boundary: one offline, inspectable, deterministic HTML artifact built from authored semantics? The current repository presents twelve visual styles, semantic ...
* **Key Headings / Subsections:**
  - `Visual Evolution Research — Round 36`
  - `Question`
  - `Primary-source read`
  - `fireworks-tech-graph`
  - `Cytoscape.js animation API`
  - `W3C WCAG 2.2 — Pause, Stop, Hide`

### 83. `archify\docs\research-visual-evolution-round-37.md`
* **Document Title:** Visual Evolution Round 37 — Story Follow Camera
* **File Size:** 25.1 KB | **Line Count:** 510 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build a **Story Follow Camera** as the next bounded visual-comprehension slice.
* **Key Headings / Subsections:**
  - `Visual Evolution Round 37 — Story Follow Camera`
  - `Executive decision`
  - `Research question and evidence boundary`
  - `Current Archify baseline: do not rebuild solved layers`
  - `Overview and orientation already exist`
  - `Progressive disclosure already exists`

### 84. `archify\docs\research-visual-evolution-round-38.md`
* **Document Title:** Visual Evolution Round 38 — Story Director Strip
* **File Size:** 20.1 KB | **Line Count:** 401 lines
* **Summary & Architectural Role:** Status: implementation-ready research recommendation Research snapshot: 2026-07-20 Competitive source snapshot: `fireworks-tech-graph` commit [`50c819d`](https://github.com/yizhiyanhua-ai/fireworks-tech-graph/tree/50c819d68fd4fee330b3010988cd13e98b678d44)
* **Key Headings / Subsections:**
  - `Visual Evolution Round 38 — Story Director Strip`
  - `Executive decision`
  - `Why this is the next gap`
  - `Primary-source findings`
  - `1. fireworks-tech-graph: richness comes from semantic identity and timing, not arbitrary effects`
  - `2. Structurizr: a story is stepped, reader-controlled, and quieter in presentation`

### 85. `archify\docs\research-visual-evolution-round-39.md`
* **Document Title:** Visual Evolution Round 39 — Story Horizon
* **File Size:** 17.0 KB | **Line Count:** 342 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **Story Horizon**: a restrained, static preview of the one immediate
* **Key Headings / Subsections:**
  - `Visual Evolution Round 39 — Story Horizon`
  - `Executive decision`
  - `Why this is the highest-leverage next slice`
  - `Current worktree evidence`
  - `Product consequence`
  - `Primary-source comparison`

### 86. `archify\docs\research-visual-evolution-round-4.md`
* **Document Title:** Visual Evolution Round 4 — Question-first scenario recipes
* **File Size:** 3.7 KB | **Line Count:** 64 lines
* **Summary & Architectural Role:** Date: 2026-07-19 Status: implemented on `codex/archify-visual-evolution` Five renderer modes are useful only when a user can choose the right one. A type list makes users translate their real question into diagram jargon, and a large all-purpose canvas encourages clutter. This...
* **Key Headings / Subsections:**
  - `Visual Evolution Round 4 — Question-first scenario recipes`
  - `Problem`
  - `What we learned`
  - `Fireworks Tech Graph: visual styles need semantic contracts`
  - `Structurizr: scope before notation`
  - `Product decision`

### 87. `archify\docs\research-visual-evolution-round-40.md`
* **Document Title:** Visual Evolution Round 40 — First-fold Proof Aperture
* **File Size:** 20.7 KB | **Line Count:** 412 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research recommendation Build **First-fold Proof Aperture**: make a meaningful slice of Archify's
* **Key Headings / Subsections:**
  - `Visual Evolution Round 40 — First-fold Proof Aperture`
  - `Executive decision`
  - `Decision question: Proof Aperture or another viewer feature?`
  - `Candidate A — First-fold Proof Aperture (**choose now**)`
  - `Candidate B — Settled Flow choreography (**defer**)`
  - `Why A wins`

### 88. `archify\docs\research-visual-evolution-round-41.md`
* **Document Title:** Visual Evolution Round 41 — Settled Flow
* **File Size:** 14.0 KB | **Line Count:** 322 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Build **Settled Flow**: an ordinary trace-enabled Archify artifact should run
* **Key Headings / Subsections:**
  - `Visual Evolution Round 41 — Settled Flow`
  - `Executive decision`
  - `Candidate decision`
  - `Candidate A — Settled Flow (**build now**)`
  - `Candidate B — another Story or visual-preset feature (**skip**)`
  - `Why A wins`

### 89. `archify\docs\research-visual-evolution-round-42.md`
* **Document Title:** Visual Evolution Round 42 — Story Shelf
* **File Size:** 18.2 KB | **Line Count:** 357 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Build **Story Shelf**: when a generated artifact opens in its truthful
* **Key Headings / Subsections:**
  - `Visual Evolution Round 42 — Story Shelf`
  - `Executive decision`
  - `Current-worktree evidence`
  - `The cold state spends space on actions that cannot yet work`
  - `Fresh browser readback`
  - `Round 35–41 capabilities must not be rebuilt`

### 90. `archify\docs\research-visual-evolution-round-43.md`
* **Document Title:** Visual Evolution Round 43 — Clean Flow Gate
* **File Size:** 19.8 KB | **Line Count:** 404 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Build a shared **Clean Flow Gate** that rejects one mechanically unambiguous
* **Key Headings / Subsections:**
  - `Visual Evolution Round 43 — Clean Flow Gate`
  - `Executive decision`
  - `Current-worktree audit`
  - `The five renderers do not yet share the same relationship guarantee`
  - `The existing test suite proves the asymmetry`
  - `Primary-source comparison`

### 91. `archify\docs\research-visual-evolution-round-44.md`
* **Document Title:** Visual Evolution Round 44 — Composition Receipt
* **File Size:** 28.8 KB | **Line Count:** 561 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Build a deterministic **Composition Receipt**, backed by one shared visible-path
* **Key Headings / Subsections:**
  - `Visual Evolution Round 44 — Composition Receipt`
  - `Executive decision`
  - `Current-worktree audit`
  - `What the existing receipts prove — and what they do not`
  - `The live crossing experiment proves why a profile is required`
  - `Corpus composition baseline`

### 92. `archify\docs\research-visual-evolution-round-45.md`
* **Document Title:** Visual Evolution Round 45 — Clear Container Corridors
* **File Size:** 22.3 KB | **Line Count:** 508 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Add one universal, deterministic **Clear Container Corridor** invariant:
* **Key Headings / Subsections:**
  - `Visual Evolution Round 45 — Clear Container Corridors`
  - `Executive decision`
  - `Current-worktree and corpus audit`
  - `Existing quality surface`
  - `Two relationship defects, three overlapping skeleton pieces`
  - `Route-budget baseline`

### 93. `archify\docs\research-visual-evolution-round-46.md`
* **Document Title:** Visual Evolution Round 46 — Role-aware Route Composition Contract
* **File Size:** 33.3 KB | **Line Count:** 690 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Status: implementation-ready research decision Replace the three neutral global route suggestions introduced in Round 45 with
* **Key Headings / Subsections:**
  - `Visual Evolution Round 46 — Role-aware Route Composition Contract`
  - `Executive decision`
  - `Current-worktree audit`
  - `Corpus baseline`
  - `Current schema gap`
  - `Primary-source findings`

### 94. `archify\docs\research-visual-evolution-round-47.md`
* **Document Title:** Visual Evolution Research — Round 47
* **File Size:** 6.7 KB | **Line Count:** 137 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Scope: desktop-first visual richness without adding an editor, vendor asset pack, new schema field, or another interaction owner.
* **Key Headings / Subsections:**
  - `Visual Evolution Research — Round 47`
  - `Question`
  - `Primary-source findings`
  - `Current Archify evidence`
  - `Decision: Archify Semantic Sigils`
  - `Component sigils`

### 95. `archify\docs\research-visual-evolution-round-48.md`
* **Document Title:** Visual Evolution Research — Round 48
* **File Size:** 4.6 KB | **Line Count:** 101 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Scope: desktop-first, finite semantic motion on one exact authored relationship. Round 47 made node roles recognizable before the reader reaches their labels.
* **Key Headings / Subsections:**
  - `Visual Evolution Research — Round 48`
  - `Question`
  - `Evidence`
  - `Upstream lesson`
  - `Current Archify contract`
  - `Decision: Semantic Flow Tokens`

### 96. `archify\docs\research-visual-evolution-round-49.md`
* **Document Title:** Visual Evolution Research — Round 49
* **File Size:** 14.3 KB | **Line Count:** 230 lines
* **Summary & Architectural Role:** Date: 2026-07-20 Scope: desktop-first, exact Story Beat semantics in full artifacts and explicitly requested share playback.
* **Key Headings / Subsections:**
  - `Visual Evolution Research — Round 49`
  - `Decision: Semantic Story Carrier`
  - `Current evidence and gap`
  - `Primary-source comparison`
  - `Fireworks Tech Graph: semantic carriers are route-owned and fail closed`
  - `React Flow: the moving object and visible edge share one computed path`

### 97. `archify\docs\research-visual-evolution-round-5.md`
* **Document Title:** Visual Evolution Round 5 — Every recipe earns a proof
* **File Size:** 3.0 KB | **Line Count:** 48 lines
* **Summary & Architectural Role:** Date: 2026-07-19 Status: implemented on `codex/archify-visual-evolution` The question-first guide defined 11 useful scenario recipes, but only five had a matching live artifact. That weakened the promise: users could receive good advice without seeing whether Archify could act...
* **Key Headings / Subsections:**
  - `Visual Evolution Round 5 — Every recipe earns a proof`
  - `Problem`
  - `What we learned`
  - `LikeC4: views are named, shareable product surfaces`
  - `D2: presentation value comes from inherited steps`
  - `Product decision`

### 98. `archify\docs\research-visual-evolution-round-6.md`
* **Document Title:** Visual evolution round 6 — contract-backed style variety
* **File Size:** 2.1 KB | **Line Count:** 30 lines
* **Summary & Architectural Role:** Date: 2026-07-19 - [`fireworks-tech-graph`](https://github.com/yizhiyanhua-ai/fireworks-tech-graph) now treats visual styles as executable profiles over shared geometry and validation contracts. Its public showcase makes one topology feel materially different without relaxing ...
* **Key Headings / Subsections:**
  - `Visual evolution round 6 — contract-backed style variety`
  - `Evidence reviewed`
  - `Decision`
  - `Product invariant`
  - `Result`

### 99. `archify\docs\research-visual-evolution-round-7.md`
* **Document Title:** Visual evolution round 7: live presentation without a slide DSL
* **File Size:** 2.4 KB | **Line Count:** 38 lines
* **Summary & Architectural Role:** How can Archify become more useful in meetings and shared reviews without turning a diagram schema into a presentation-authoring system? - [Structurizr presentation mode](https://docs.structurizr.com/ui/diagrams/presentation) removes surrounding application chrome so the diagr...
* **Key Headings / Subsections:**
  - `Visual evolution round 7: live presentation without a slide DSL`
  - `Question`
  - `External patterns reviewed`
  - `Product decision`
  - `Why this boundary matters`
  - `Validation contract`

### 100. `archify\docs\research-visual-evolution-round-8.md`
* **Document Title:** Visual evolution round 8: semantic Node Finder
* **File Size:** 2.5 KB | **Line Count:** 41 lines
* **Summary & Architectural Role:** Date: 2026-07-19 Status: implemented on `codex/archify-visual-evolution` Archify can focus a node after the reader sees it, and guided views can lead a reader through authored paths. A reader opening an unfamiliar or wide diagram still has no direct answer to “where is Redis?”...
* **Key Headings / Subsections:**
  - `Visual evolution round 8: semantic Node Finder`
  - `Problem`
  - `External patterns reviewed`
  - `Product decision`
  - `Invariants`

### 101. `archify\docs\research-visual-evolution-round-9.md`
* **Document Title:** Visual Evolution Round 9 — Proof before promises
* **File Size:** 2.6 KB | **Line Count:** 47 lines
* **Summary & Architectural Role:** Date: 2026-07-19 Archify already has motion, three visual presets, guided views, semantic focus, presentation mode, Node Finder, and a generated Proof Lab. Why does the project landing page still feel less alive than fast-growing peers? - `fireworks-tech-graph` puts a verified...
* **Key Headings / Subsections:**
  - `Visual Evolution Round 9 — Proof before promises`
  - `Question`
  - `Evidence`
  - `Decision`
  - `Product boundary`
  - `Success criteria`

### 102. `archify\docs\research-visual-style-picker-2026-07-23.md`
* **Document Title:** Visual Style Picker Research
* **File Size:** 3.1 KB | **Line Count:** 68 lines
* **Summary & Architectural Role:** Date: 2026-07-23 Status: implementation decision for `codex/visual-style-picker` Turn the existing Style cycle button into a direct, accessible picker for the
* **Key Headings / Subsections:**
  - `Visual Style Picker Research`
  - `Decision`
  - `Evidence`
  - `Interaction contract`
  - `Stability boundaries`
  - `Acceptance evidence`

### 103. `archify\docs\research\skill-plugin-update-reminder-market-design.md`
* **Document Title:** AI Agent Skills 频繁更新提醒：市场机制与统一方案
* **File Size:** 39.0 KB | **Line Count:** 478 lines
* **Summary & Architectural Role:** 市场上还没有一套同时覆盖“跨 Agent 安装、可靠版本识别、权限差异、低打扰提醒、自动更新、回滚”的完整 Skills 更新系统。现有成熟能力分散在不同产品中： - Claude Code 的插件自动更新最完整：按 marketplace 区分默认策略，启动后延迟检查，更新写盘但不热替换当前会话，并用一次 reload 提醒完成激活。 - GitHub `gh skill` 是目前最接近“跨 Agent Skill 更新控制面”的官方工具：覆盖多种宿主，具备来源追踪、目录树 SHA、固定版本、安装前 preview、dry-run 和交互确认。
* **Key Headings / Subsections:**
  - `AI Agent Skills 频繁更新提醒：市场机制与统一方案`
  - `结论先行`
  - `1. 先定义对象：Skill 不是“无代码的小插件”`
  - `2. 市场对比矩阵`
  - `3. 从现有产品中可复用的成熟模式`
  - `3.1 检查、下载、安装、激活、提醒必须解耦`

### 104. `archify\docs\skill-embedded-optional-update-notifier-design.md`
* **Document Title:** Skill 内置可选更新提醒器：技术设计提案
* **File Size:** 43.0 KB | **Line Count:** 637 lines
* **Summary & Architectural Role:** 本提案设计一个嵌入 Skill 发布包的跨 Agent 更新提醒器。它在用户再次使用 Skill 时低频检查远端发布信息，仅在发现新版本时显示非阻断提醒；提醒成功确认后不再展示同一候选。是否查看变更、何时更新以及是否继续使用旧版本，均由用户决定。 v0.1 的唯一职责是： 该方案用于补足 Codex、Claude Code、Cursor、OpenCode 等宿主中“独立 Skill 已安装，但用户长期不主动检查更新”的场景。它不是自动更新器，也不替代宿主 Plugin/Extension、`gh skill` 或其他安装管理器。
* **Key Headings / Subsections:**
  - `Skill 内置可选更新提醒器：技术设计提案`
  - `1. 摘要`
  - `2. 背景与问题`
  - `3. 目标与非目标`
  - `3.1 目标`
  - `3.2 非目标`

### 105. `archify\experiments\v3-mermaid-validation\INDEX.md`
* **Document Title:** v3.0 Mermaid → Archify Validation — Source Diagrams
* **File Size:** 2.7 KB | **Line Count:** 34 lines
* **Summary & Architectural Role:** 3 real-world Mermaid `flowchart` diagrams retained from the v3.0 visual-quality validation experiment described in `../../ROADMAP.md` (section: Validation experiment). The original experiment used five inputs; two inputs and their derivatives were removed on 2026-09-01 because...
* **Key Headings / Subsections:**
  - `v3.0 Mermaid → Archify Validation — Source Diagrams`
  - `Diversity self-check`
  - `Output structure`
  - `Caveats flagged for transparency`

### 106. `archify\experiments\v3-mermaid-validation\RESULT.md`
* **Document Title:** v3.0 Mermaid Validation — Results
* **File Size:** 3.8 KB | **Line Count:** 92 lines
* **Summary & Architectural Role:** | Code | What it is | |---|---| | **A** | Stock Mermaid via `mmdc` — default theme, dagre layout, no customization |
* **Key Headings / Subsections:**
  - `v3.0 Mermaid Validation — Results`
  - `Versions`
  - `How to blind-rate`
  - `Self-evaluation (project owner)`
  - `De-anonymized summary (fill after rating)`
  - `Pass criterion (from ROADMAP.md)`

### 107. `archify\experiments\visual-evolution\DECISION-MAP.md`
* **Document Title:** Archify visual evolution decision map
* **File Size:** 2.6 KB | **Line Count:** 75 lines
* **Summary & Architectural Role:** Goal: make Archify visibly richer, stable, and more shareable while preserving typed IR, deterministic validation, zero-install use, and self-contained output. Blocked by: none
* **Key Headings / Subsections:**
  - `Archify visual evolution decision map`
  - `#1: Which visual direction should become the first production preset?`
  - `Question`
  - `Answer`
  - `#2: What is the smallest reliable shareable motion format?`
  - `Question`

### 108. `archify\integrations\deepseek-harness\README.md`
* **Document Title:** `@tt-a1i/archify-dsh`
* **File Size:** 2.4 KB | **Line Count:** 49 lines
* **Summary & Architectural Role:** Community DeepSeek Harness integration for [Archify](https://github.com/tt-a1i/archify). This is **not** an official DeepSeek product and does not imply DeepSeek endorsement. v0.1.0 is experimental compatibility with developer-preview **`@deepseek-ai/dsh@0.1.0-rc.6`** on Node....
* **Key Headings / Subsections:**
  - ``@tt-a1i/archify-dsh``
  - `Install`
  - `Invoke`
  - `Produced Files limitation`
  - `Uninstall`
  - `Security posture`

### 109. `archify\PRODUCT.md`
* **Document Title:** Product
* **File Size:** 3.0 KB | **Line Count:** 38 lines
* **Summary & Architectural Role:** product Software engineers, architects, technical leads, reviewers, and AI coding agents who need to understand or explain a codebase, system, workflow, request path, data pipeline, or lifecycle. They usually work from a desktop in an engineering or review context and need a t...
* **Key Headings / Subsections:**
  - `Product`
  - `Register`
  - `Users`
  - `Product Purpose`
  - `Brand Personality`
  - `Anti-references`

### 110. `archify\README.md`
* **Document Title:** Archify
* **File Size:** 18.3 KB | **Line Count:** 286 lines
* **Summary & Architectural Role:** <p align="center"> <strong>English</strong> · <a href="./README_ZH.md">简体中文</a> </p>
* **Key Headings / Subsections:**
  - `Archify`
  - `❤️ Sponsors`
  - `See Archify in action`
  - `A real repository, mapped from source`
  - `Preview`
  - `Quick start`

### 111. `archify\README_EN.md`
* **Document Title:** Archify
* **File Size:** 18.3 KB | **Line Count:** 286 lines
* **Summary & Architectural Role:** <p align="center"> <strong>English</strong> · <a href="./README_ZH.md">简体中文</a> </p>
* **Key Headings / Subsections:**
  - `Archify`
  - `❤️ Sponsors`
  - `See Archify in action`
  - `A real repository, mapped from source`
  - `Preview`
  - `Quick start`

### 112. `archify\README_ZH.md`
* **Document Title:** Archify
* **File Size:** 19.8 KB | **Line Count:** 291 lines
* **Summary & Architectural Role:** <p align="center"> <a href="./README.md">English</a> · <strong>简体中文</strong> </p>
* **Key Headings / Subsections:**
  - `Archify`
  - `❤️ 赞助伙伴`
  - `看看 Archify 能做什么`
  - `从真实仓库读出来，不是只靠 Prompt 画出来`
  - `预览`
  - `快速开始`

### 113. `archify\ROADMAP.md`
* **Document Title:** Archify Roadmap
* **File Size:** 47.3 KB | **Line Count:** 231 lines
* **Summary & Architectural Role:** The current development line is `v2.17.0-dev.1`; it contains the work under Changelog Unreleased and is not a stable release. [CHANGELOG.md](CHANGELOG.md) is the single owner for delivered feature history. This file owns architectural direction, retained rationale, and explici...
* **Key Headings / Subsections:**
  - `Archify Roadmap`
  - `JSON IR for coordinate stability`
  - `What`
  - `Why this shape (and not the original "diagram.yaml" plan)`
  - `Architecture`
  - `IR shape`

### 114. `archify\SECURITY.md`
* **Document Title:** Security Policy
* **File Size:** 2.1 KB | **Line Count:** 54 lines
* **Summary & Architectural Role:** Archify welcomes responsible security reports. Please report suspected vulnerabilities privately so maintainers can investigate and coordinate remediation before public disclosure.
* **Key Headings / Subsections:**
  - `Security Policy`
  - `Supported versions`
  - `Reporting a vulnerability`
  - `Coordinated disclosure`
  - `Non-security bugs`

### 115. `archify\THIRD_PARTY_NOTICES.md`
* **Document Title:** Third-party notices
* **File Size:** 4.4 KB | **Line Count:** 56 lines
* **Summary & Architectural Role:** Archify includes optional vector data for third-party brand marks. These marks are provided only to identify technologies and services in user-authored diagrams. Their inclusion does not imply sponsorship, endorsement, partnership,
* **Key Headings / Subsections:**
  - `Third-party notices`
  - `Simple Icons`
  - `OpenAI mark`
  - `No additional rights granted`

---

## Editorial Studio & WYSIWYG Architecture
Total files in this section: **3**

### 1. `EDITORIAL_REDIS_BULLMQ_AUDIT.md`
* **Document Title:** Editorial Studio + Redis / BullMQ / Notifications — Deep Code Audit Report
* **File Size:** 22.3 KB | **Line Count:** 245 lines
* **Summary & Architectural Role:** **Date:** 2026-09-09 **Status:** Read-only audit + fix worklog **Verification baseline:**
* **Key Headings / Subsections:**
  - `Editorial Studio + Redis / BullMQ / Notifications — Deep Code Audit Report`
  - `Executive Summary`
  - `1. Redis Layer (`server/src/redis`)`
  - `What's real & working`
  - `Bugs / gaps`
  - `2. BullMQ (`server/src/bull`)`

### 2. `GAZETTE_ADVANCED_EDITOR_ARCHITECTURE_SPEC.md`
* **Document Title:** Gazette Editorial Studio — Advanced Editor Architecture v4.0
* **File Size:** 16.5 KB | **Line Count:** 229 lines
* **Summary & Architectural Role:** **Comprehensive Technical Specification & Implementation Guide** The Gazette Editorial Studio v4.0 establishes a unified, newsroom-grade authoring platform. Rather than building a multi-engine hybrid, Gazette operates on a **Single Unified Editorial Architecture** inspired by ...
* **Key Headings / Subsections:**
  - `Gazette Editorial Studio — Advanced Editor Architecture v4.0`
  - `🏛️ Executive Summary`
  - `📐 System Architecture Diagram`
  - `🧱 1. Semantic Editorial Nodes Specification`
  - `1.1 Pull Quote (`pullQuote`)`
  - `1.2 Themed Callout Aside (`callout`)`

### 3. `GAZETTE_EDITORIAL_STUDIO_ARCHITECTURE_SPEC.md`
* **Document Title:** Gazette Editorial Studio Architecture & Specification (v3.0 Frozen Master)
* **File Size:** 19.6 KB | **Line Count:** 343 lines
* **Summary & Architectural Role:** GAZETTE EDITORIAL STUDIO ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │ [← Stories]   Untitled Manuscript        [Draft · Auto-saved]       [ WRITE | REVIEW | PREVIEW ]│
* **Key Headings / Subsections:**
  - `Gazette Editorial Studio Architecture & Specification (v3.0 Frozen Master)`
  - `1. System Architecture Overview`
  - `2. Core Architectural Invariants`
  - `2.1 Unified Command & Action Registry`
  - `2.2 Intelligent Word & Google Docs Paste Parser`
  - `3. The 7-Category Sticky Ribbon Specification`

---

## Historical & Duplicate Specification Archive (document_2)
Total files in this section: **45**

### 1. `document_2\ARCHITECTURE.md`
* **Document Title:** Technical Architecture & Locked Technology Stack
* **File Size:** 11.7 KB | **Line Count:** 330 lines
* **Summary & Architectural Role:** No ambiguous "Option A or Option B". All choices below are locked for frontend, backend, database, auth, security, testing, and infrastructure. **Source of truth for:** stack · auth · DB switch concurrency · error contract · NestJS module layout | Layer | Final Choice | Why |
* **Key Headings / Subsections:**
  - `Technical Architecture & Locked Technology Stack`
  - `CMS-Driven Editorial Content Platform`
  - `⚠️ Policy: Final Technology Decisions`
  - `1. Complete Locked Stack`
  - `Frontend (Locked)`
  - `Backend (Locked)`

### 2. `document_2\ARCHITECTURE_DIAGRAMS.md`
* **Document Title:** The Gazette — System Architecture Diagrams (`ARCHITECTURE_DIAGRAMS.md`)
* **File Size:** 7.7 KB | **Line Count:** 204 lines
* **Summary & Architectural Role:** This document presents the complete system architecture for **The Gazette CMS**, structured using **Archify** system modeling patterns. graph TD %% Clients & Entry Layer
* **Key Headings / Subsections:**
  - `The Gazette — System Architecture Diagrams (`ARCHITECTURE_DIAGRAMS.md`)`
  - `1. High-Level System Architecture Diagram`
  - `2. 6-Database Persistence Mesh Architecture`
  - `Database Roles & Guarantees`
  - `3. Multi-Format Document Import & Native Video Pipeline Architecture`
  - `4. BullMQ Background Worker & Queue Architecture`

### 3. `document_2\AUDIT-FIXES.md`
* **Document Title:** CMS Platform — Audit Fix Pack
* **File Size:** 2.6 KB | **Line Count:** 59 lines
* **Summary & Architectural Role:** This archive contains a targeted hardening pass over the supplied CMS project. 1. **Immediate account-status and role enforcement** - `JwtAuthGuard` now resolves the current user from the server-side repository for protected requests.
* **Key Headings / Subsections:**
  - `CMS Platform — Audit Fix Pack`
  - `Fixed in this pack`
  - `Verification limitation`
  - `Important remaining engineering work`

### 4. `document_2\Author_privacy.md`
* **Document Title:** Author Byline Visibility Toggle (Show/Hide Author Name by Admin)
* **File Size:** 2.4 KB | **Line Count:** 43 lines
* **Summary & Architectural Role:** Allow administrators and editors to configure whether an article displays the specific author's name or publishes under "Editorial Staff" / Anonymous Newsroom Byline. - Add `showAuthorName?: boolean` to `Article`, `CreateArticleDto`, and `UpdateArticleDto`. - Add `ALTER TABLE ...
* **Key Headings / Subsections:**
  - `Author Byline Visibility Toggle (Show/Hide Author Name by Admin)`
  - `Proposed Changes`
  - `Database & Domain Models`
  - `Frontend Client`
  - `Verification Plan`
  - `Automated & Manual Verification`

### 5. `document_2\AUTHOR_PUBLISHING_SLOTS_RFC.md`
* **Document Title:** 🕒 RFC: Author Publishing Slots & Automated Dispatch Engine
* **File Size:** 6.5 KB | **Line Count:** 138 lines
* **Summary & Architectural Role:** **Document Version:** 1.0.0 **Status:** Discussion & Architecture Proposal **Target Module:** Editorial Workflow & Admin Governance Engine
* **Key Headings / Subsections:**
  - `🕒 RFC: Author Publishing Slots & Automated Dispatch Engine`
  - `💡 1. Executive Summary & Problem Understanding`
  - `🔴 The Problem`
  - `🟢 The Proposed Solution: Author Publishing Slots`
  - `🏗️ 2. Architectural Blueprint`
  - `🗄️ 3. Proposed Data Architecture`

### 6. `document_2\bullMQ.md`
* **Document Title:** The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture
* **File Size:** 16.3 KB | **Line Count:** 316 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Specification (v2.0) **Date**: September 2, 2026 **Target Systems**: NestJS Backend, BullMQ v5, Redis 7 (Isolated Queue Database), PostgreSQL / MongoDB, React Admin Governance Console
* **Key Headings / Subsections:**
  - `The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture`
  - `1. Executive Summary & Architecture Rationale`
  - `Problems Solved by BullMQ`
  - `2. Queue Topology & Workload Isolation`
  - `2.1 Architectural Asymmetry Note (ClickHouse vs Relational Replicas)`
  - `3. Queue Details & Job Payloads`

### 7. `document_2\bullmq_implementation.md`
* **Document Title:** BullMQ Distributed Queues & Dead-Letter Queue (DLQ) Implementation Report
* **File Size:** 5.8 KB | **Line Count:** 84 lines
* **Summary & Architectural Role:** **Platform**: The Gazette Editorial Platform **Subsystem**: Asynchronous Distributed Processing & Queue Governance **Status**: Production Ready & Verified (16/16 Test Suites, 103/103 Unit Tests Passing)
* **Key Headings / Subsections:**
  - `BullMQ Distributed Queues & Dead-Letter Queue (DLQ) Implementation Report`
  - `1. Architectural Architecture Overview`
  - `2. Implemented Queues & Worker Isolation`
  - `3. Worker Idempotency & Crash Recovery Invariants`
  - `4. Admin DLQ Governance & Security Redaction`
  - `5. Test Suite Verification`

### 8. `document_2\CMS_PROJECT_DEEP_ANALYSIS.md`
* **Document Title:** The Gazette CMS Platform — Senior Software Engineering Comprehensive Analysis
* **File Size:** 18.6 KB | **Line Count:** 274 lines
* **Summary & Architectural Role:** **Document Status**: Final Architectural Review **Date**: September 1, 2026 **Audience**: Engineering Leadership, Product Architects, Security & Operations
* **Key Headings / Subsections:**
  - `The Gazette CMS Platform — Senior Software Engineering Comprehensive Analysis`
  - `Table of Contents`
  - `1. Executive Summary`
  - `Key Architectural Strengths`
  - `2. Codebase & Architecture Overview`
  - `Repository Topology`

### 9. `document_2\deep_analysis_report.md`
* **Document Title:** The Gazette — Deep Codebase Analysis Report
* **File Size:** 10.6 KB | **Line Count:** 217 lines
* **Summary & Architectural Role:** **Date:** 24 Aug 2026 | **Analyst:** Senior Engineering Review (Antigravity) ┌──────────────────────────────────────────────────────────────────┐ │  Client (Vite + React 18 + TypeScript)   :5173                  │
* **Key Headings / Subsections:**
  - `The Gazette — Deep Codebase Analysis Report`
  - `1. Architecture Overview`
  - `2. OWASP Top 10 (2021) Compliance Audit`
  - `A01 — Broken Access Control ✅ STRONG`
  - `A02 — Cryptographic Failures ✅ OUTSTANDING`
  - `A03 — Injection ✅ VERY STRONG`

### 10. `document_2\DESIGN-SYSTEM.md`
* **Document Title:** THE GAZETTE — Editorial Visual & Surface Composition System
* **File Size:** 3.5 KB | **Line Count:** 51 lines
* **Summary & Architectural Role:** The platform consists of **4 distinct visual surfaces**, each tailored to its exact purpose: PLATFORM SURFACES │
* **Key Headings / Subsections:**
  - `THE GAZETTE — Editorial Visual & Surface Composition System`
  - `1. Surface Identity Architecture`
  - `2. Specific Page Surface Composition Rules`
  - `Surface A: Onboarding (`/onboarding`)`
  - `Surface B: User Dashboard & Desk (`/dashboard`, `/stories`)`
  - `Surface C: Public Editorial Homepage (`/`)`

### 11. `document_2\DOCUMENT_IMPORT_PIPELINE_SPEC.md`
* **Document Title:** The Gazette — Multi-Format Document Import Pipeline Specification (Production v2.0)
* **File Size:** 12.9 KB | **Line Count:** 213 lines
* **Summary & Architectural Role:** This specification defines the complete, production-grade architectural blueprint for the **Multi-Format Document Import Pipeline** across The Gazette platform. Journalists and editorial desks frequently draft manuscripts in external tools (Microsoft Word, Google Docs, Markdow...
* **Key Headings / Subsections:**
  - `The Gazette — Multi-Format Document Import Pipeline Specification (Production v2.0)`
  - `1. Executive Summary`
  - `2. End-to-End Import & Extraction Architecture`
  - `3. Supported Formats & Parsing Strategies`
  - `4. Parser Engine Specifications`
  - `4.1 `.docx` Microsoft Word Parsing (`Mammoth.js`)`

### 12. `document_2\EDITORIAL_NAVIGATION_AND_SEARCH_REDESIGN.md`
* **Document Title:** Technical Design: Editorial Navigation & Advanced Faceted Search Redesign
* **File Size:** 9.8 KB | **Line Count:** 118 lines
* **Summary & Architectural Role:** This design document outlines the complete architectural refactoring of two primary user-facing interfaces in The Gazette digital publication platform: 1. **Front Page & Master Desk Navigation (`CategoryNav.tsx` & `TrendingTicker.tsx`)**: Replacing horizontal single-line overf...
* **Key Headings / Subsections:**
  - `Technical Design: Editorial Navigation & Advanced Faceted Search Redesign`
  - `1. Executive Summary`
  - `2. Problem Analysis & Current UI Deficiencies`
  - `A. Front Page Navigation Flaws (Reference: User Screenshot 1)`
  - `B. Search & Discovery Flaws (Reference: User Screenshot 2)`
  - `3. Proposed Architectural Solution`

### 13. `document_2\filter.md`
* **Document Title:** Editorial Navigation & Advanced Faceted Search Redesign
* **File Size:** 3.3 KB | **Line Count:** 58 lines
* **Summary & Architectural Role:** Redesigning the front page category navigation bar and the search & discovery suite to eliminate horizontal single-line scrollbars, remove all emojis, and implement a professional two-column faceted filter suite. - Restructure to render 5-6 primary curated desks with fixed wid...
* **Key Headings / Subsections:**
  - `Editorial Navigation & Advanced Faceted Search Redesign`
  - `User Review Required`
  - `Proposed Changes`
  - `Component: Navigation & Header`
  - `Component: Search & Discovery Studio`
  - `Verification Plan`

### 14. `document_2\FULL_AUDIT_REPORT.md`
* **Document Title:** Full Codebase & Architecture Audit Report
* **File Size:** 6.1 KB | **Line Count:** 85 lines
* **Summary & Architectural Role:** **The Gazette CMS — Secure Editorial Publishing Platform** *Audit Date: August 25, 2026* A comprehensive audit of all frontend and backend source files, repository implementations, security configurations, and documentation specifications was conducted. The codebase strictly a...
* **Key Headings / Subsections:**
  - `Full Codebase & Architecture Audit Report`
  - `Executive Summary`
  - `1. Specification & Architecture Compliance Matrix`
  - `2. OWASP Top 10:2025 Security Controls Audit`
  - `A01: Broken Access Control`
  - `A02: Security Misconfiguration`

### 15. `document_2\FULL_CODEBASE_ANALYSIS.md`
* **Document Title:** The Gazette CMS — Full Codebase Analysis
* **File Size:** 25.7 KB | **Line Count:** 474 lines
* **Summary & Architectural Role:** **Date:** 24 Aug 2026 | **Analyst:** Antigravity (Senior Engineering Review) **Scope:** Every file in `/server/src/` + `/client/src/` + scripts + docs examined line-by-line | File | Size | Status |
* **Key Headings / Subsections:**
  - `The Gazette CMS — Full Codebase Analysis`
  - `1. Complete File Inventory`
  - `ROOT LEVEL`
  - `SERVER — Configuration`
  - `SERVER — Domain Models (`server/src/domain/`)`
  - `SERVER — Authentication Module (`server/src/modules/auth/`)`

### 16. `document_2\implementation_plan.md`
* **Document Title:** Transparent JIT Fallback & Auto-Replication Architecture Plan
* **File Size:** 3.0 KB | **Line Count:** 54 lines
* **Summary & Architectural Role:** This plan introduces **Transparent On-Demand Fallback & JIT (Just-In-Time) Auto-Replication** between PostgreSQL and MongoDB. When the active database is switched (e.g. from PostgreSQL to MongoDB or vice-versa), any registered user or content that was created in the previous d...
* **Key Headings / Subsections:**
  - `Transparent JIT Fallback & Auto-Replication Architecture Plan`
  - `User Review Required`
  - `Proposed Changes`
  - `Database & Repository Layer`
  - `Verification Plan`
  - `Automated Tests`

### 17. `document_2\LINKAGE-ANALYSIS.md`
* **Document Title:** Linkage Analysis
* **File Size:** 6.1 KB | **Line Count:** 98 lines
* **Summary & Architectural Role:** Audit of every file, folder, and asset in the CMS workspace — what exists, what was linked, and how the persistence mesh is wired end-to-end. No files were deleted. | Check | Result | | --- | --- |
* **Key Headings / Subsections:**
  - `Linkage Analysis`
  - `Summary`
  - `Port unification (3000 → 3001)`
  - `Orphan UI pages linked`
  - `Orphan assets linked`
  - `Persistence mesh — end to end`

### 18. `document_2\MASTER-SPEC.md`
* **Document Title:** Master Specification — Secure CMS-Driven Content Platform
* **File Size:** 19.4 KB | **Line Count:** 565 lines
* **Summary & Architectural Role:** 1. [Project Overview](#1-project-overview) 2. [Tech Stack](#2-tech-stack) 3. [Core Security Principle](#3-core-security-principle)
* **Key Headings / Subsections:**
  - `Master Specification — Secure CMS-Driven Content Platform`
  - `Table of Contents`
  - `1. Project Overview`
  - `Required Components`
  - `2. Tech Stack (Locked)`
  - `3. Core Security Principle`

### 19. `document_2\MEDIA_EMBEDS_AND_DOCUMENT_IMPORT_SPEC.md`
* **Document Title:** The Gazette — Rich Media Embeds & Manuscript Import Pipeline Specification
* **File Size:** 10.4 KB | **Line Count:** 203 lines
* **Summary & Architectural Role:** This document establishes the comprehensive engineering architecture, data formats, security controls, and step-by-step implementation plan for three major authoring and reader enhancements requested for The Gazette: 1. **Feature 1: Native Video Upload & HTML5 Streaming Player...
* **Key Headings / Subsections:**
  - `The Gazette — Rich Media Embeds & Manuscript Import Pipeline Specification`
  - `1. Executive Summary`
  - `2. Feature 1: Native Video Upload & HTML5 Player Support`
  - `2.1 Storage, Streaming & Backend Architecture`
  - `2.2 Author Experience in Article Editor Studio`
  - `2.3 Reader Experience in `ArticleReaderPage``

### 20. `document_2\multi_database_issues_and_solutions.md`
* **Document Title:** 📑 Comprehensive Analysis: 6-Database Persistence Mesh Issues & Solutions
* **File Size:** 5.3 KB | **Line Count:** 65 lines
* **Summary & Architectural Role:** This report documents all architectural, infrastructural, operational, and user-interface problems identified during the migration from a 2-database platform to a **fault-tolerant 6-Database Persistence Mesh** (PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, ClickHouse), alo...
* **Key Headings / Subsections:**
  - `📑 Comprehensive Analysis: 6-Database Persistence Mesh Issues & Solutions`
  - `🎯 Executive Summary`
  - `🛑 Problem Matrix & Resolution Log`
  - `🔍 Deep-Dive Technical Breakdowns`
  - `1. The Active-Active Multi-Write Replication Problem`
  - `2. High-Availability & Zero-Downtime Failover`

### 21. `document_2\NATIVE_VIDEO_STREAMING_SPEC.md`
* **Document Title:** The Gazette — Native Video Processing Pipeline & HTML5 Streaming Engine Specification (Production v2.0)
* **File Size:** 12.9 KB | **Line Count:** 257 lines
* **Summary & Architectural Role:** This specification defines the complete, production-grade architectural blueprint for **Native Video Upload, Processing Pipeline & HTML5 Streaming Engine** across The Gazette platform. In contrast to external third-party embeds (YouTube, Vimeo, Loom, Spotify), this engine empo...
* **Key Headings / Subsections:**
  - `The Gazette — Native Video Processing Pipeline & HTML5 Streaming Engine Specification (Production v2.0)`
  - `1. Executive Summary`
  - `2. End-to-End Media Ingestion & Processing Architecture`
  - `3. Media Processing Lifecycle State Machine`
  - `4. Binary Signature, Container & Codec Validation Policy`
  - `4.1 Supported Delivery & Ingest Matrix`

### 22. `document_2\NEWSLETTER_AND_BROADCAST_ENGINE.md`
* **Document Title:** Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine
* **File Size:** 3.7 KB | **Line Count:** 83 lines
* **Summary & Architectural Role:** The Gazette Newsletter & Broadcast subsystem provides an enterprise-grade subscription, verification, audience segmentation, and asynchronous broadcast distribution engine. Key Highlights: - **Double Opt-In Verification**: 48-hour expiring tokens with SHA-256 token hashing at ...
* **Key Headings / Subsections:**
  - `Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine`
  - `1. Executive Summary`
  - `2. Architecture & Data Flow`
  - `3. Campaign Broadcasting Flow`
  - `4. Endpoints Reference`
  - `Public Endpoints`

### 23. `document_2\notification.md`
* **Document Title:** Hardened v3.0 In-App Notifications Engine & Social Feedback Architecture
* **File Size:** 23.7 KB | **Line Count:** 579 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Architecture & Distributed Systems Blueprint **System Milestone**: Phase 6 Enterprise Social, Real-Time Signaling & Editorial Feedback Loop **Target Scale**: 2,000+ Concurrent Readers, Multi-Replica NestJS Mesh, Real-Time SSE/WebSocket De...
* **Key Headings / Subsections:**
  - `Hardened v3.0 In-App Notifications Engine & Social Feedback Architecture`
  - `Table of Contents`
  - `1. Executive Summary & Core Architectural Tenets`
  - `Core Architectural Principles`
  - `2. End-to-End Notification Topology & Durability Split`
  - `3. Expanded Notification Event Taxonomy`

### 24. `document_2\P0.md`
* **Document Title:** P0 — Master Editorial Platform Specification & UI Blueprint
* **File Size:** 11.7 KB | **Line Count:** 178 lines
* **Summary & Architectural Role:** * **Headlines & Editorial Titles**: *Newsreader* (Serif) — journalistic weight, optical sizing, elegant line flow. * **Body Text & UI Elements**: *Plus Jakarta Sans* / *Inter* (Sans-serif) — crisp, high legibility, clean letter spacing. * **Metadata & Numerical Data**: *JetBra...
* **Key Headings / Subsections:**
  - `P0 — Master Editorial Platform Specification & UI Blueprint`
  - `1. Locked Visual Identity & Design Philosophy`
  - `Core Typography & Token Architecture`
  - `2. Complete Screen Universe & Product Hierarchy`
  - `3. Comprehensive JIT Database Continuity (Pull-on-Miss)`
  - `Overarching Invariant:`

### 25. `document_2\PENDING_FEATURES_AND_ROADMAP.md`
* **Document Title:** The Gazette CMS Platform — Pending Features, Infrastructure & Production Roadmap
* **File Size:** 14.0 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** **Document Status**: Engineering Implementation Backlog **Date**: September 1, 2026 **Audience**: Engineering Leadership, Product Management, DevOps & System Architects
* **Key Headings / Subsections:**
  - `The Gazette CMS Platform — Pending Features, Infrastructure & Production Roadmap`
  - `Table of Contents`
  - `1. Executive Overview`
  - `2. Category 1: High-Concurrency & Multi-Instance Infrastructure`
  - `2.1 Redis Caching Layer (High-Traffic Read Buffer)`
  - `2.2 Redis Pub/Sub for Live Database Switching`

### 26. `document_2\PERMISSIONS-MATRIX.md`
* **Document Title:** Granular Role-Based Access Control (RBAC) Matrix
* **File Size:** 5.4 KB | **Line Count:** 110 lines
* **Summary & Architectural Role:** The application enforces a hierarchical 5-tier role system: 1. **SUPER_ADMIN**: Full system control, database switching, audit log purging, global permissions. 2. **ADMIN**: User management, taxonomy management, editorial overrides, system settings.
* **Key Headings / Subsections:**
  - `Granular Role-Based Access Control (RBAC) Matrix`
  - `Permission & Capability Specification`
  - `1. System Roles`
  - `2. Granular Capabilities Matrix`
  - `3. Server-Side Guard Implementation Pattern (NestJS)`

### 27. `document_2\PHASE-4-IMPLEMENTATION.md`
* **Document Title:** Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)
* **File Size:** 14.1 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** Phase 4 establishes the core editorial engine of the CMS platform. It bridges our Phase 3 security architecture (Argon2id, HttpOnly cookies, RBAC capability tokens, ownership checks, and audit logging) with an enterprise editorial workflow, immutable article revisions, server-...
* **Key Headings / Subsections:**
  - `Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)`
  - `1. Executive Summary`
  - `2. Architecture & Components`
  - `3. Detailed Component Breakdown`
  - `A. Publishing Workflow State Machine & Revisions (`server/src/modules/articles/`)`
  - `B. Secure Media Asset Pipeline (OWASP A08 Defense)`

### 28. `document_2\PHASE-5-6-IMPLEMENTATION-PLAN.md`
* **Document Title:** Phase 5–6 Master Implementation Plan
* **File Size:** 20.8 KB | **Line Count:** 444 lines
* **Summary & Architectural Role:** | Phase | Focus | # Tasks | Priority | Est. Build | |:--|:--|:--|:--|:--| | **Phase 0** | Fix 4 Critical Security Blockers | 4 | 🔴 CRITICAL | 1 session |
* **Key Headings / Subsections:**
  - `Phase 5–6 Master Implementation Plan`
  - `EditorialHub — Full Product Realization Roadmap`
  - `0. EXECUTIVE SUMMARY`
  - `1. PHASE 0 — CRITICAL SECURITY BLOCKERS`
  - `0.1 Enable Global ValidationPipe (OWASP A03 input validation)`
  - `0.2 Install + Wire @nestjs/throttler (OWASP A07 brute force)`

### 29. `document_2\PHASE-5-FRONTEND-PRODUCT-EXPERIENCE.md`
* **Document Title:** Phase 5 — Frontend Product Experience & Social Publishing Specification
* **File Size:** 34.5 KB | **Line Count:** 2,159 lines
* **Summary & Architectural Role:** **Discussion / Product Definition — no implementation instructions should override the locked architecture.** This document consolidates: - Current implementation progress after Phase 4.
* **Key Headings / Subsections:**
  - `Phase 5 — Frontend Product Experience & Social Publishing Specification`
  - `Status`
  - `1. Product Vision`
  - `2. Important Product Rule`
  - `3. Current Implementation Status`
  - `Completed`

### 30. `document_2\phase_4_implementation.md`
* **Document Title:** Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)
* **File Size:** 14.1 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** Phase 4 establishes the core editorial engine of the CMS platform. It bridges our Phase 3 security architecture (Argon2id, HttpOnly cookies, RBAC capability tokens, ownership checks, and audit logging) with an enterprise editorial workflow, immutable article revisions, server-...
* **Key Headings / Subsections:**
  - `Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)`
  - `1. Executive Summary`
  - `2. Architecture & Components`
  - `3. Detailed Component Breakdown`
  - `A. Publishing Workflow State Machine & Revisions (`server/src/modules/articles/`)`
  - `B. Secure Media Asset Pipeline (OWASP A08 Defense)`

### 31. `document_2\PRODUCTION-READINESS-CHECKLIST.md`
* **Document Title:** Production Readiness Checklist
* **File Size:** 2.1 KB | **Line Count:** 54 lines
* **Summary & Architectural Role:** - [x] Server-side account status checked on protected requests. - [x] Current server-side role used for authorization. - [x] 5xx errors redacted at the global boundary.
* **Key Headings / Subsections:**
  - `Production Readiness Checklist`
  - `Security — must pass before production`
  - `Availability / scalability`
  - `Six-database architecture`
  - `Product completeness`
  - `UI/UX`

### 32. `document_2\profile.md`
* **Document Title:** Editorial Journalist Dossier & Author Hub Architecture (`profile.md`)
* **File Size:** 6.6 KB | **Line Count:** 112 lines
* **Summary & Architectural Role:** The **Author Profile & Journalist Dossier** (`/profile`) is the central editorial identity and portfolio workstation for authors, editors, and newsroom contributors across **The Gazette**. It bridges real-time community engagement, portfolio curation, draft lifecycle tracking,...
* **Key Headings / Subsections:**
  - `Editorial Journalist Dossier & Author Hub Architecture (`profile.md`)`
  - `1. Overview`
  - `2. Multi-Database Architecture & Persistence Mesh`
  - `Persistence Guarantees`
  - `3. UI/UX Component Specifications`
  - `A. Editorial Dossier Masthead`

### 33. `document_2\PROJECT-EXPLANATION-AND-SUMMARY.md`
* **Document Title:** Comprehensive Project Guide & Detailed Architecture Breakdown
* **File Size:** 22.0 KB | **Line Count:** 338 lines
* **Summary & Architectural Role:** This document provides an exhaustive, structured explanation of the entire system architecture, features, security requirements, and development principles defined across `docs/MASTER-SPEC.md`, `docs/PROJECT.md`, and `docs/SECURITY-AND-CMS.md`. A **production-quality, security...
* **Key Headings / Subsections:**
  - `Comprehensive Project Guide & Detailed Architecture Breakdown`
  - `Secure CMS-Driven Content Platform`
  - `Executive Summary`
  - `1. Project Vision & Identity`
  - `What This Project IS:`
  - `What This Project is NOT:`

### 34. `document_2\PROJECT.md`
* **Document Title:** CMS-Driven Content Platform — Project Specification
* **File Size:** 16.7 KB | **Line Count:** 676 lines
* **Summary & Architectural Role:** Build a **production-quality, secure, CMS-driven content publishing platform**. This is **NOT**: - A Medium clone
* **Key Headings / Subsections:**
  - `CMS-Driven Content Platform — Project Specification`
  - `1. Project Overview`
  - `Required Components`
  - `2. Tech Stack`
  - `3. UI Design Requirements`
  - `DO NOT Make the UI Look AI-Generated`

### 35. `document_2\RBAC-PERMISSIONS.md`
* **Document Title:** RBAC Permission Matrix
* **File Size:** 8.0 KB | **Line Count:** 226 lines
* **Summary & Architectural Role:** | Role | Code | Description | |------|------|-------------| | Super Admin | `SUPER_ADMIN` | Full system access including database switching and security config |
* **Key Headings / Subsections:**
  - `RBAC Permission Matrix`
  - `CMS-Driven Editorial Content Platform`
  - `1. Roles`
  - `2. Permission Naming Convention`
  - `3. Full Permission Matrix`
  - `Users & Access`

### 36. `document_2\README.md`
* **Document Title:** Documentation Index
* **File Size:** 3.7 KB | **Line Count:** 94 lines
* **Summary & Architectural Role:** docs/README.md  (you are here) │ ┌──────────────────┼──────────────────┐
* **Key Headings / Subsections:**
  - `Documentation Index`
  - `Document Authority`
  - `Which Document to Use When`
  - `Rule for AI Coding Agents`
  - `Development Order (Corrected)`
  - `File List`

### 37. `document_2\redis_implementation.md`
* **Document Title:** Redis Architecture & Distributed Systems Blueprint: The Gazette CMS Platform
* **File Size:** 25.4 KB | **Line Count:** 427 lines
* **Summary & Architectural Role:** **Document Status**: Production-Frozen Architectural Specification & Distributed Systems Blueprint (v3.2 Final Master) **Target Milestone**: Phase 6 Enterprise Scalability & High-Concurrency Resilience **Target Workload**: 2,000+ Concurrent Readers / Multi-Replica NestJS Cluster
* **Key Headings / Subsections:**
  - `Redis Architecture & Distributed Systems Blueprint: The Gazette CMS Platform`
  - `Table of Contents`
  - `1. Executive Summary & 6-Database System Topology`
  - `Authoritative Sources of Truth & 6-Database Roles`
  - `2. Root Problem Statement: Production Bottlenecks & Distributed Failure Modes`
  - `3. The 8-Pillar Redis Architecture Blueprint`

### 38. `document_2\SECURITY-AND-CMS.md`
* **Document Title:** Security & CMS Architecture Specification
* **File Size:** 20.3 KB | **Line Count:** 618 lines
* **Summary & Architectural Role:** Browser ↓ ATTACKER CONTROLS EVERYTHING HERE
* **Key Headings / Subsections:**
  - `Security & CMS Architecture Specification`
  - `Part 1 — Core Security Principle`
  - `Never Trust the Frontend`
  - `Browser-Side Security Check`
  - `Expected Secure Flow`
  - `Part 2 — Security Architecture`

### 39. `document_2\SMART_VIDEO_AND_EMBEDS_SPEC.md`
* **Document Title:** The Gazette — Smart Video, Rich Embeds & OpenGraph Scraping Engine Specification (Production v2.0)
* **File Size:** 12.6 KB | **Line Count:** 195 lines
* **Summary & Architectural Role:** This document defines the production-grade architectural and security specification for **Smart Video, Rich Embeds & OpenGraph Scraping Engine** across The Gazette platform. The system provides an intelligent, secure media ingestion and metadata normalization pipeline supporti...
* **Key Headings / Subsections:**
  - `The Gazette — Smart Video, Rich Embeds & OpenGraph Scraping Engine Specification (Production v2.0)`
  - `1. Executive Summary`
  - `2. Multi-Provider Architecture & Resolution Matrix`
  - `3. Advanced Cybersecurity & Anti-SSRF Defense Architecture`
  - `4. Editorial Snapshotting & 6-Database Persistence Mesh`
  - `4.1 Editorial Reproducibility Philosophy`

### 40. `document_2\STEP-2-SPEC.md`
* **Document Title:** STEP 2 — Authentication, Onboarding & User Workspace Specification
* **File Size:** 11.6 KB | **Line Count:** 207 lines
* **Summary & Architectural Role:** **Step 2** builds the complete end-to-end **Identity, Onboarding, and Author Content Workspace** for the CMS platform. It bridges secure HttpOnly cookie authentication, personalized topic onboarding, story lifecycle management, and profile governance. 1. **Authentication Suite...
* **Key Headings / Subsections:**
  - `STEP 2 — Authentication, Onboarding & User Workspace Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 2:`
  - `2. Screen & Component Architecture`
  - `3. Detailed Specifications per Screen`
  - `A. Authentication Suite`

### 41. `document_2\STEP-3-SPEC.md`
* **Document Title:** STEP 3 — Public Editorial Web Experience Specification
* **File Size:** 8.9 KB | **Line Count:** 123 lines
* **Summary & Architectural Role:** **Step 3** builds the flagship **Public Editorial Web Experience** for *The Gazette*. It brings the publication to life with high-impact editorial typography (*Newsreader* serif headlines, *Plus Jakarta Sans* body), an authoritative homepage layout inspired by world-class publ...
* **Key Headings / Subsections:**
  - `STEP 3 — Public Editorial Web Experience Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 3:`
  - `2. Page & Component Architecture`
  - `3. Technical Decisions & Invariants`
  - `1. Trending Stories Ranking`

### 42. `document_2\STEP-4-SPEC.md`
* **Document Title:** STEP 4 — Admin Governance Suite & Live Database Switcher Specification
* **File Size:** 9.8 KB | **Line Count:** 157 lines
* **Summary & Architectural Role:** **Step 4** delivers the mission-critical **Admin Governance Suite & Live Database Switcher**. It provides editorial staff and administrators with complete oversight over content moderation, user roles, taxonomy, media assets, security audit trails, and the crown jewel of the p...
* **Key Headings / Subsections:**
  - `STEP 4 — Admin Governance Suite & Live Database Switcher Specification`
  - `1. Objective & Scope`
  - `2. Hardened Architecture & Security Invariants`
  - `1. Database Switcher State Machine`
  - `2. Atomic Concurrency-Safe Database Switch`
  - `3. Strict Privilege Boundaries on Role Governance`

### 43. `document_2\SYSTEM-DESIGN-HELPERS.md`
* **Document Title:** System Design Helpers & Architectural Integration Specification
* **File Size:** 7.1 KB | **Line Count:** 160 lines
* **Summary & Architectural Role:** External services are integrated **strictly by the hard engineering problem they solve**, never as generic hype or cosmetic additions. Every service is placed behind a **modular provider interface (adapter pattern)** with an offline local fallback so that the core CMS domain r...
* **Key Headings / Subsections:**
  - `System Design Helpers & Architectural Integration Specification`
  - `1. Architectural Philosophy`
  - `2. System Design Helper Matrix`
  - `3. Subsystem Architecture Specifications`
  - `A. Media Storage: `IStorageProvider` Adapter Pattern`
  - `B. Transactional Email: `IEmailProvider` Adapter Pattern`

### 44. `document_2\TESTING.md`
* **Document Title:** Testing Specification
* **File Size:** 6.6 KB | **Line Count:** 212 lines
* **Summary & Architectural Role:** Build secure code → Test as attacker → Verify block + safe error + audit log Do **not** build deliberately vulnerable endpoints for demonstration. Test environments only for injection payloads. Never leave SQLi/XSS holes in production code paths.
* **Key Headings / Subsections:**
  - `Testing Specification`
  - `Functional + Security Test Requirements`
  - `1. Testing Philosophy`
  - `2. Test Layers`
  - `3. OWASP Security Test Checklist`
  - `A01 — Broken Access Control`

### 45. `document_2\walkthrough.md`
* **Document Title:** Visual Design & Composition Refinement — Walkthrough
* **File Size:** 2.0 KB | **Line Count:** 39 lines
* **Summary & Architectural Role:** - **Before**: Wrapped `[Total] [Published] [In Review] [Drafts]` box cards. - **After**: Large typographic stats separated by horizontal rules and clean vertical dividers: 3                 2                 1                 0
* **Key Headings / Subsections:**
  - `Visual Design & Composition Refinement — Walkthrough`
  - `Key Visual Refinements Implemented`
  - `1. Replaced Generic 4-Card KPI Rows with Typographic Metrics`
  - `2. Transformed User Dashboard into a Publication Desk (`/dashboard`)`
  - `3. Reorganized Sidebar Navigation into Editorial Desk Groups (`UserLayout`)`
  - `4. Clean Headlines & Editorial Asymmetry (`HomePage` & `ArticleReaderPage`)`

---

## Implemented Feature Specs
Total files in this section: **12**

### 1. `implemented\broadcast engine plan.md`
* **Document Title:** Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine
* **File Size:** 8.4 KB | **Line Count:** 125 lines
* **Summary & Architectural Role:** Enterprise-grade subscription, verification, bounce suppression, preference center, and broadcast campaign management engine powered by isolated BullMQ workers, SHA-256 token hashing at rest, and full campaign lifecycle tracking. 1. **SHA-256 Token Hashing at Rest**: - High-en...
* **Key Headings / Subsections:**
  - `Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine`
  - `Key Architectural Enhancements (Approved Design)`
  - `Proposed Changes`
  - `1. Domain Models & Repositories (`server/src/`)`
  - `2. BullMQ Worker & Newsletter Service (`server/src/modules/newsletter/`)`
  - `3. Frontend Experience (`client/src/`)`

### 2. `implemented\bullmq.md`
* **Document Title:** BullMQ Distributed Queues & Dead-Letter Queue (DLQ) Implementation Report
* **File Size:** 5.8 KB | **Line Count:** 84 lines
* **Summary & Architectural Role:** **Platform**: The Gazette Editorial Platform **Subsystem**: Asynchronous Distributed Processing & Queue Governance **Status**: Production Ready & Verified (16/16 Test Suites, 103/103 Unit Tests Passing)
* **Key Headings / Subsections:**
  - `BullMQ Distributed Queues & Dead-Letter Queue (DLQ) Implementation Report`
  - `1. Architectural Architecture Overview`
  - `2. Implemented Queues & Worker Isolation`
  - `3. Worker Idempotency & Crash Recovery Invariants`
  - `4. Admin DLQ Governance & Security Redaction`
  - `5. Test Suite Verification`

### 3. `implemented\EDITOR_REDESIGN_AND_FIXES_SPEC.md`
* **Document Title:** Gazette Writing Studio & Editorial Manuscript Suite: Specification (v2.0 Refined)
* **File Size:** 16.4 KB | **Line Count:** 234 lines
* **Summary & Architectural Role:** | # | Area / Component | Identified Root Cause | Refined Architectural Solution | |---|---|---|---| | **1** | **YouTube & Video Embedding** | `embedFormatter.ts` coupled transcript scraping directly into manuscript body, polluting text with raw timestamps (`[00:00] ♪♪`). Over-...
* **Key Headings / Subsections:**
  - `Gazette Writing Studio & Editorial Manuscript Suite: Specification (v2.0 Refined)`
  - `1. Executive Summary & Problem-to-Solution Matrix`
  - `2. Detailed Technical & Visual Architecture`
  - `2.1 YouTube & Unified Media Embed Model`
  - `2.2 Floating Link Popover & Selection Invariant`
  - `2.3 Document & PDF Import Pipeline (BullMQ Integration)`

### 4. `implemented\implementation_plan.md`
* **Document Title:** Redis Architecture & High-Concurrency Integration Plan
* **File Size:** 4.6 KB | **Line Count:** 87 lines
* **Summary & Architectural Role:** Implement the Production-Frozen v3.2 Redis architecture for The Gazette CMS, introducing low-latency response caching, single-flight request coalescing, dual-layer multi-node mesh signaling, fencing locks, and mutation idempotency. - Add `redis:7-alpine` service with volume pe...
* **Key Headings / Subsections:**
  - `Redis Architecture & High-Concurrency Integration Plan`
  - `User Review Required`
  - `Proposed Changes`
  - `Infrastructure & Configuration`
  - `Core Redis Module & Services`
  - `Database Mesh & Controller Integrations`

### 5. `implemented\UI_phase1.md`
* **Document Title:** The Gazette — UI Phase 1: Core Foundation, Accessibility & Stability
* **File Size:** 17.1 KB | **Line Count:** 413 lines
* **Summary & Architectural Role:** **Document:** `implemented/UI_phase1.md` **Phase:** 1 of 5 **Focus:** Foundation, Design System Normalization, Layout Resilience, Accessibility, Error Boundaries & Code Quality
* **Key Headings / Subsections:**
  - `The Gazette — UI Phase 1: Core Foundation, Accessibility & Stability`
  - `1. Executive Summary & Phase Objectives`
  - `The 3 Core Rules of Phase 1:`
  - `2. Phase 1 Architecture Overview`
  - `3. Detailed Problem Statements & Technical Solutions`
  - `Task 1.1: Design Token Normalization & Semantic Typography Roles`

### 6. `implemented\UI_phase2.md`
* **Document Title:** UI Phase 2: Interaction, Motion & Guided Onboarding
* **File Size:** 13.8 KB | **Line Count:** 297 lines
* **Summary & Architectural Role:** UI PHASE 2 ARCHITECTURE │ ┌──────────────────────────────────────┼──────────────────────────────────────┐
* **Key Headings / Subsections:**
  - `UI Phase 2: Interaction, Motion & Guided Onboarding`
  - `Architecture & System Overview`
  - `1. Motion.dev Spring & Transition System (`motion/react`)`
  - `Design & Accessibility Constraints`
  - `Component Implementations`
  - `2. Driver.js Guided Onboarding & Feature Discovery`

### 7. `implemented\UI_Phase3.1.md`
* **Document Title:** Implementation Plan: UI Phase 3 (Visual Analytics & Editorial Data Charts)
* **File Size:** 4.8 KB | **Line Count:** 77 lines
* **Summary & Architectural Role:** Build high-performance, dynamic visual analytics and editorial data charts for **The Gazette**, adhering to the refined [`implemented/UI_phase3.md`](file:///c:/Users/shrut/Desktop/CMS%20Project/implemented/UI_phase3.md) specification. - Dynamic multi-metric SVG area & line cha...
* **Key Headings / Subsections:**
  - `Implementation Plan: UI Phase 3 (Visual Analytics & Editorial Data Charts)`
  - `User Review Required`
  - `Proposed Changes`
  - `1. Analytics & Visualization Components (`client/src/components/analytics/`)`
  - `2. Data Journalism Canvas Engine (`client/src/components/canvas/`)`
  - `3. Page Integrations`

### 8. `implemented\UI_phase3.md`
* **Document Title:** The Gazette — UI Phase 3: Visual Analytics & Editorial Data Charts
* **File Size:** 12.3 KB | **Line Count:** 204 lines
* **Summary & Architectural Role:** **Document:** `implemented/UI_phase3.md` **Phase:** 3 of 5 **Focus:** Author Analytics, Dashboard Data Visualization, BullMQ & Newsletter Telemetry Charts, and Interactive Data Journalism Graphics
* **Key Headings / Subsections:**
  - `The Gazette — UI Phase 3: Visual Analytics & Editorial Data Charts`
  - `1. Executive Summary & Phase Objectives`
  - `Core Architectural Rules for Phase 3:`
  - `2. Phase 3 Architecture Overview`
  - `3. Detailed Component Specifications`
  - `Task 3.1: Author Performance Analytics Suite`

### 9. `implemented\UI_phase4.md`
* **Document Title:** The Gazette — UI Phase 4: Command Palette, Reader Experience Suite & Visual Revision Diffing
* **File Size:** 13.2 KB | **Line Count:** 183 lines
* **Summary & Architectural Role:** **Document:** `implemented/UI_phase4.md` **Phase:** 4 of 5 **Focus:** RBAC-Aware Command Palette (`Ctrl+K`), Contextual Actions, Reader Experience Suite (Typography, Progress & Deep-Linkable TOC), and Semantic Revision Diffing
* **Key Headings / Subsections:**
  - `The Gazette — UI Phase 4: Command Palette, Reader Experience Suite & Visual Revision Diffing`
  - `1. Executive Summary & Phase Objectives`
  - `Surface & Capability Boundaries:`
  - `Core Architectural Rules for Phase 4:`
  - `2. Phase 4 Architecture Overview`
  - `3. Detailed Component Specifications`

### 10. `implemented\UI_phase5.md`
* **Document Title:** The Gazette — UI Phase 5: Advanced Specialized Experiences, Local AI Editorial Studio & 3D Interactive Canvas
* **File Size:** 13.9 KB | **Line Count:** 204 lines
* **Summary & Architectural Role:** **Document:** `implemented/UI_phase5.md` **Phase:** 5 of 5 **Focus:** Local AI Writing Studio (Ollama), Code-Split 3D Interactive Canvas Experiences, Data Journalism Narrative Overlays, and Controlled Research Ingestion
* **Key Headings / Subsections:**
  - `The Gazette — UI Phase 5: Advanced Specialized Experiences, Local AI Editorial Studio & 3D Interactive Canvas`
  - `1. Executive Summary & Phase Objectives`
  - `Surface & Capability Boundaries:`
  - `Core Architectural Rules for Phase 5:`
  - `2. Phase 5 Architecture Overview`
  - `3. Detailed Component Specifications`

### 11. `implemented\upload in editor.md`
* **Document Title:** Implementation Plan: Multi-Format Document Import Pipeline (Task 3)
* **File Size:** 4.1 KB | **Line Count:** 74 lines
* **Summary & Architectural Role:** Implement multi-format manuscript extraction for `.docx`, `.md`, `.txt`, and `.pdf` files with magic-byte validation, XSS sanitization, automatic Word image extraction into The Gazette Media Library, BullMQ background job processing, and an interactive **Pre-Import Review Moda...
* **Key Headings / Subsections:**
  - `Implementation Plan: Multi-Format Document Import Pipeline (Task 3)`
  - `User Review Required`
  - `Proposed Changes`
  - `Backend Subsystem (`server/src/modules/documents/`)`
  - `Frontend Subsystem (`client/src/`)`
  - `Verification Plan`

### 12. `implemented\youtube_embed.md`
* **Document Title:** Implementation Plan: Smart Video, Rich Embeds & OpenGraph Scraping Engine
* **File Size:** 4.2 KB | **Line Count:** 90 lines
* **Summary & Architectural Role:** Implement a secure, multi-provider media ingestion, OpenGraph/oEmbed scraping, and rich embed rendering subsystem for The Gazette. - `ScrapeEmbedDto` (`@IsUrl()`, `@MaxLength(2048)`). - `EmbedMetadataResponseDto`.
* **Key Headings / Subsections:**
  - `Implementation Plan: Smart Video, Rich Embeds & OpenGraph Scraping Engine`
  - `User Review Required`
  - `Proposed Changes`
  - `Backend Subsystem (`server/src/modules/embeds/`)`
  - `Frontend Subsystem (`client/src/`)`
  - `Verification Plan`

---

## Media Ingestion & Document Pipelines
Total files in this section: **4**

### 1. `DOCUMENT_IMPORT_PIPELINE_SPEC.md`
* **Document Title:** The Gazette — Multi-Format Document Import Pipeline Specification (Production v1.0)
* **File Size:** 11.7 KB | **Line Count:** 200 lines
* **Summary & Architectural Role:** This specification defines the complete, production-grade architectural blueprint for the **Multi-Format Document Import Pipeline** across The Gazette platform. Journalists and editorial desks frequently draft manuscripts in external tools (Microsoft Word, Google Docs, Markdow...
* **Key Headings / Subsections:**
  - `The Gazette — Multi-Format Document Import Pipeline Specification (Production v1.0)`
  - `1. Executive Summary`
  - `2. End-to-End Import & Extraction Architecture`
  - `3. Supported Formats & Parsing Strategies`
  - `4. Parser Engine Specifications`
  - `4.1 `.docx` Microsoft Word Parsing (`Mammoth.js`)`

### 2. `MEDIA_EMBEDS_AND_DOCUMENT_IMPORT_SPEC.md`
* **Document Title:** The Gazette — Rich Media Embeds & Manuscript Import Pipeline Specification
* **File Size:** 10.4 KB | **Line Count:** 203 lines
* **Summary & Architectural Role:** This document establishes the comprehensive engineering architecture, data formats, security controls, and step-by-step implementation plan for three major authoring and reader enhancements requested for The Gazette: 1. **Feature 1: Native Video Upload & HTML5 Streaming Player...
* **Key Headings / Subsections:**
  - `The Gazette — Rich Media Embeds & Manuscript Import Pipeline Specification`
  - `1. Executive Summary`
  - `2. Feature 1: Native Video Upload & HTML5 Player Support`
  - `2.1 Storage, Streaming & Backend Architecture`
  - `2.2 Author Experience in Article Editor Studio`
  - `2.3 Reader Experience in `ArticleReaderPage``

### 3. `NATIVE_VIDEO_STREAMING_SPEC.md`
* **Document Title:** The Gazette — Native Video Processing Pipeline & HTML5 Streaming Engine Specification (Production v2.0)
* **File Size:** 12.9 KB | **Line Count:** 257 lines
* **Summary & Architectural Role:** This specification defines the complete, production-grade architectural blueprint for **Native Video Upload, Processing Pipeline & HTML5 Streaming Engine** across The Gazette platform. In contrast to external third-party embeds (YouTube, Vimeo, Loom, Spotify), this engine empo...
* **Key Headings / Subsections:**
  - `The Gazette — Native Video Processing Pipeline & HTML5 Streaming Engine Specification (Production v2.0)`
  - `1. Executive Summary`
  - `2. End-to-End Media Ingestion & Processing Architecture`
  - `3. Media Processing Lifecycle State Machine`
  - `4. Binary Signature, Container & Codec Validation Policy`
  - `4.1 Supported Delivery & Ingest Matrix`

### 4. `SMART_VIDEO_AND_EMBEDS_SPEC.md`
* **Document Title:** The Gazette — Smart Video, Rich Embeds & OpenGraph Scraping Engine Specification (Production v2.0)
* **File Size:** 12.6 KB | **Line Count:** 195 lines
* **Summary & Architectural Role:** This document defines the production-grade architectural and security specification for **Smart Video, Rich Embeds & OpenGraph Scraping Engine** across The Gazette platform. The system provides an intelligent, secure media ingestion and metadata normalization pipeline supporti...
* **Key Headings / Subsections:**
  - `The Gazette — Smart Video, Rich Embeds & OpenGraph Scraping Engine Specification (Production v2.0)`
  - `1. Executive Summary`
  - `2. Multi-Provider Architecture & Resolution Matrix`
  - `3. Advanced Cybersecurity & Anti-SSRF Defense Architecture`
  - `4. Editorial Snapshotting & 6-Database Persistence Mesh`
  - `4.1 Editorial Reproducibility Philosophy`

---

## Root Architecture & System Maps
Total files in this section: **9**

### 1. `accident.md`
* **Document Title:** Editorial Data Protection & Failure Recovery Architecture (`accident.md`)
* **File Size:** 15.0 KB | **Line Count:** 255 lines
* **Summary & Architectural Role:** In The Gazette Editorial Studio, manuscript state flows across **three distinct, non-competing storage tiers**: AUTHOR TYPES IN EDITOR │
* **Key Headings / Subsections:**
  - `Editorial Data Protection & Failure Recovery Architecture (`accident.md`)`
  - `1. Multi-Tier Persistence Topology`
  - `2. Debounced Local Recovery via IndexedDB`
  - `2.1 The IndexedDB Schema`
  - `2.2 Debounce & Throttle Rules`
  - `3. Authoritative Server Autosave & Dual-Key Concurrency Control`

### 2. `client\README.md`
* **Document Title:** React + TypeScript + Vite
* **File Size:** 1.2 KB | **Line Count:** 32 lines
* **Summary & Architectural Role:** This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules. Currently, two official plugins are available: - [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
* **Key Headings / Subsections:**
  - `React + TypeScript + Vite`
  - `React Compiler`
  - `Expanding the Oxlint configuration`

### 3. `CMS_PROJECT_DEEP_ANALYSIS.md`
* **Document Title:** The Gazette CMS Platform — Senior Software Engineering Comprehensive Analysis
* **File Size:** 18.6 KB | **Line Count:** 274 lines
* **Summary & Architectural Role:** **Document Status**: Final Architectural Review **Date**: September 1, 2026 **Audience**: Engineering Leadership, Product Architects, Security & Operations
* **Key Headings / Subsections:**
  - `The Gazette CMS Platform — Senior Software Engineering Comprehensive Analysis`
  - `Table of Contents`
  - `1. Executive Summary`
  - `Key Architectural Strengths`
  - `2. Codebase & Architecture Overview`
  - `Repository Topology`

### 4. `GAZETTE_MASTER_ARCHITECTURE_MAP.md`
* **Document Title:** The Gazette — Master Architecture Map
* **File Size:** 30.5 KB | **Line Count:** 1,291 lines
* **Summary & Architectural Role:** - **BUILT** — corresponding source/module/page exists in the repository and is wired into the application where applicable. - **PARTIAL** — building blocks exist, but one or more resilience, correctness, security, operational, or completeness requirements remain. - **PLANNED**...
* **Key Headings / Subsections:**
  - `The Gazette — Master Architecture Map`
  - `0. Status vocabulary`
  - `1. Product identity`
  - `1.1 Product definition`
  - `1.2 Primary personas`
  - `2. System topology`

### 5. `P0.md`
* **Document Title:** P0 — Master Editorial Platform Specification & UI Blueprint
* **File Size:** 11.5 KB | **Line Count:** 178 lines
* **Summary & Architectural Role:** * **Headlines & Editorial Titles**: *Newsreader* (Serif) — journalistic weight, optical sizing, elegant line flow. * **Body Text & UI Elements**: *Plus Jakarta Sans* / *Inter* (Sans-serif) — crisp, high legibility, clean letter spacing. * **Metadata & Numerical Data**: *JetBra...
* **Key Headings / Subsections:**
  - `P0 — Master Editorial Platform Specification & UI Blueprint`
  - `1. Locked Visual Identity & Design Philosophy`
  - `Core Typography & Token Architecture`
  - `2. Complete Screen Universe & Product Hierarchy`
  - `3. Comprehensive JIT Database Continuity (Pull-on-Miss)`
  - `Overarching Invariant:`

### 6. `PENDING_FEATURES_AND_ROADMAP.md`
* **Document Title:** The Gazette CMS Platform — Pending Features, Infrastructure & Production Roadmap
* **File Size:** 14.0 KB | **Line Count:** 220 lines
* **Summary & Architectural Role:** **Document Status**: Engineering Implementation Backlog **Date**: September 1, 2026 **Audience**: Engineering Leadership, Product Management, DevOps & System Architects
* **Key Headings / Subsections:**
  - `The Gazette CMS Platform — Pending Features, Infrastructure & Production Roadmap`
  - `Table of Contents`
  - `1. Executive Overview`
  - `2. Category 1: High-Concurrency & Multi-Instance Infrastructure`
  - `2.1 Redis Caching Layer (High-Traffic Read Buffer)`
  - `2.2 Redis Pub/Sub for Live Database Switching`

### 7. `README.md`
* **Document Title:** 🗞️ The Gazette — Enterprise Editorial Publishing Platform & Multi-Database Mesh CMS
* **File Size:** 27.7 KB | **Line Count:** 431 lines
* **Summary & Architectural Role:** <div align="center"> [![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/) [![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs....
* **Key Headings / Subsections:**
  - `🗞️ The Gazette — Enterprise Editorial Publishing Platform & Multi-Database Mesh CMS`
  - `📑 Table of Contents`
  - `🏛️ Architectural Overview & Data Mesh`
  - `💻 Complete Technology Stack`
  - `**Frontend Client (`client/`)**`
  - `**Backend Server (`server/`)**`

### 8. `server\README.md`
* **Document Title:** development
* **File Size:** 4.9 KB | **Line Count:** 98 lines
* **Summary & Architectural Role:** <p align="center"> <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a> </p>
* **Key Headings / Subsections:**
  - `Description`
  - `Project setup`
  - `Compile and run the project`
  - `development`
  - `watch mode`
  - `production mode`

### 9. `walkthrough.md`
* **Document Title:** Visual Design & Composition Refinement — Walkthrough
* **File Size:** 2.0 KB | **Line Count:** 39 lines
* **Summary & Architectural Role:** - **Before**: Wrapped `[Total] [Published] [In Review] [Drafts]` box cards. - **After**: Large typographic stats separated by horizontal rules and clean vertical dividers: 3                 2                 1                 0
* **Key Headings / Subsections:**
  - `Visual Design & Composition Refinement — Walkthrough`
  - `Key Visual Refinements Implemented`
  - `1. Replaced Generic 4-Card KPI Rows with Typographic Metrics`
  - `2. Transformed User Dashboard into a Publication Desk (`/dashboard`)`
  - `3. Reorganized Sidebar Navigation into Editorial Desk Groups (`UserLayout`)`
  - `4. Clean Headlines & Editorial Asymmetry (`HomePage` & `ArticleReaderPage`)`

---

## Security, Governance & Permissions
Total files in this section: **1**

### 1. `UNCOMMITTED_BUGS_AUDIT.md`
* **Document Title:** Uncommitted Work — Bug Audit Report
* **File Size:** 36.3 KB | **Line Count:** 790 lines
* **Summary & Architectural Role:** **Date:** 2026-09-02 **Scope:** All uncommitted changes (12 modified files + 31 untracked files) **Status:** Read-only analysis — no code changes made
* **Key Headings / Subsections:**
  - `Uncommitted Work — Bug Audit Report`
  - `Table of Contents`
  - `Executive Summary`
  - `Bug Inventory`
  - `1. Smart Video Embeds`
  - `Architecture`

---

## Submission Dossier & Capstone Deliverables
Total files in this section: **2**

### 1. `dossier\00_TABLE_OF_CONTENTS_AND_EVIDENCE_MAP.md`
* **Document Title:** The Gazette — Master Documentation Suite & Evidence Map
* **File Size:** 4.9 KB | **Line Count:** 61 lines
* **Summary & Architectural Role:** | Part | Chapter | Chapter Title | Primary Repository Evidence | | :--- | :---: | :--- | :--- | | **Front Matter** | — | **Academic Front Matter** | Abstract, Objectives, Literature & Industry Context, Methodology |
* **Key Headings / Subsections:**
  - `The Gazette — Master Documentation Suite & Evidence Map`
  - `1. Master Table of Contents`
  - `2. Repository Evidence Mapping`
  - `3. Documentation Generation Checklist`

### 2. `dossier\GAZETTE_MASTER_ENGINEERING_DOSSIER.md`
* **Document Title:** THE GAZETTE — MASTER PRODUCT & ENGINEERING DOSSIER
* **File Size:** 28.5 KB | **Line Count:** 490 lines
* **Summary & Architectural Role:** **The Gazette — An Enterprise-Grade Polyglot Headless Publication Operating System & Editorial Studio** * **Academic Stream:** Bachelor / Master of Engineering in Computer Science & Engineering * **Course:** Final Year Software Engineering Capstone / Advanced Web Systems Project
* **Key Headings / Subsections:**
  - `THE GAZETTE — MASTER PRODUCT & ENGINEERING DOSSIER`
  - `Comprehensive System Architecture, Security Audit, and Implementation Dossier`
  - `Project Title`
  - `Executive Abstract`
  - `PART I — PRODUCT DEFINITION`
  - `Chapter 1 — Product Overview`

---

## Testing & Quality Assurance
Total files in this section: **1**

### 1. `test-fixtures\pdfs\README.md`
* **Document Title:** Gazette PDF Ingestion Golden Test Corpus
* **File Size:** 2.3 KB | **Line Count:** 20 lines
* **Summary & Architectural Role:** This directory contains representative golden test fixtures to validate the **Gazette Universal Document Ingestion Subsystem** across all real-world publisher edge cases. | Fixture Category | Filename | Key Invariant & Edge Case | Expected Gazette Outcome | | :--- | :--- | :--...
* **Key Headings / Subsections:**
  - `Gazette PDF Ingestion Golden Test Corpus`
  - `Test Fixture Matrix`

---

## UI/UX & Implementation Roadmaps
Total files in this section: **7**

### 1. `PHASE-5-FRONTEND-PRODUCT-EXPERIENCE.md`
* **Document Title:** Phase 5 — Frontend Product Experience & Social Publishing Specification
* **File Size:** 34.5 KB | **Line Count:** 2,159 lines
* **Summary & Architectural Role:** **Discussion / Product Definition — no implementation instructions should override the locked architecture.** This document consolidates: - Current implementation progress after Phase 4.
* **Key Headings / Subsections:**
  - `Phase 5 — Frontend Product Experience & Social Publishing Specification`
  - `Status`
  - `1. Product Vision`
  - `2. Important Product Rule`
  - `3. Current Implementation Status`
  - `Completed`

### 2. `PLAYWRIGHT_ADVANCED_GUIDE.md`
* **Document Title:** Gazette CMS — Production Testing Architecture & Playwright Harness
* **File Size:** 16.5 KB | **Line Count:** 392 lines
* **Summary & Architectural Role:** 1. [The Gazette Testing Pyramid](#1-the-gazette-testing-pyramid) 2. [Playwright's Precise Role in the Stack](#2-playwrights-precise-role-in-the-stack) 3. [The Gazette Golden Journey (Multi-Role E2E)](#3-the-gazette-golden-journey-multi-role-e2e)
* **Key Headings / Subsections:**
  - `Gazette CMS — Production Testing Architecture & Playwright Harness`
  - `📑 Table of Contents`
  - `1. The Gazette Testing Pyramid`
  - `Layer Responsibilities:`
  - `2. Playwright's Precise Role in the Stack`
  - `3. The Gazette Golden Journey (Multi-Role E2E)`

### 3. `STEP-2-SPEC.md`
* **Document Title:** STEP 2 — Authentication, Onboarding & User Workspace Specification
* **File Size:** 11.4 KB | **Line Count:** 207 lines
* **Summary & Architectural Role:** **Step 2** builds the complete end-to-end **Identity, Onboarding, and Author Content Workspace** for the CMS platform. It bridges secure HttpOnly cookie authentication, personalized topic onboarding, story lifecycle management, and profile governance. 1. **Authentication Suite...
* **Key Headings / Subsections:**
  - `STEP 2 — Authentication, Onboarding & User Workspace Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 2:`
  - `2. Screen & Component Architecture`
  - `3. Detailed Specifications per Screen`
  - `A. Authentication Suite`

### 4. `STEP-3-SPEC.md`
* **Document Title:** STEP 3 — Public Editorial Web Experience Specification
* **File Size:** 8.8 KB | **Line Count:** 123 lines
* **Summary & Architectural Role:** **Step 3** builds the flagship **Public Editorial Web Experience** for *The Gazette*. It brings the publication to life with high-impact editorial typography (*Newsreader* serif headlines, *Plus Jakarta Sans* body), an authoritative homepage layout inspired by world-class publ...
* **Key Headings / Subsections:**
  - `STEP 3 — Public Editorial Web Experience Specification`
  - `1. Objective & Scope`
  - `What is delivered in Step 3:`
  - `2. Page & Component Architecture`
  - `3. Technical Decisions & Invariants`
  - `1. Trending Stories Ranking`

### 5. `STEP-4-SPEC.md`
* **Document Title:** STEP 4 — Admin Governance Suite & Live Database Switcher Specification
* **File Size:** 9.7 KB | **Line Count:** 157 lines
* **Summary & Architectural Role:** **Step 4** delivers the mission-critical **Admin Governance Suite & Live Database Switcher**. It provides editorial staff and administrators with complete oversight over content moderation, user roles, taxonomy, media assets, security audit trails, and the crown jewel of the p...
* **Key Headings / Subsections:**
  - `STEP 4 — Admin Governance Suite & Live Database Switcher Specification`
  - `1. Objective & Scope`
  - `2. Hardened Architecture & Security Invariants`
  - `1. Database Switcher State Machine`
  - `2. Atomic Concurrency-Safe Database Switch`
  - `3. Strict Privilege Boundaries on Role Governance`

### 6. `SYSTEM-DESIGN-HELPERS.md`
* **Document Title:** System Design Helpers & Architectural Integration Specification
* **File Size:** 7.0 KB | **Line Count:** 160 lines
* **Summary & Architectural Role:** External services are integrated **strictly by the hard engineering problem they solve**, never as generic hype or cosmetic additions. Every service is placed behind a **modular provider interface (adapter pattern)** with an offline local fallback so that the core CMS domain r...
* **Key Headings / Subsections:**
  - `System Design Helpers & Architectural Integration Specification`
  - `1. Architectural Philosophy`
  - `2. System Design Helper Matrix`
  - `3. Subsystem Architecture Specifications`
  - `A. Media Storage: `IStorageProvider` Adapter Pattern`
  - `B. Transactional Email: `IEmailProvider` Adapter Pattern`

### 7. `UI_implementation.md`
* **Document Title:** The Gazette — UI/UX Implementation Playbook (`UI_implementation.md`)
* **File Size:** 29.4 KB | **Line Count:** 559 lines
* **Summary & Architectural Role:** This document is the authoritative implementation playbook for The Gazette's frontend UI/UX decisions. It maps concrete product problems to specific solutions, enforcing three hard principles: The Gazette's visual language is: Gazette
* **Key Headings / Subsections:**
  - `The Gazette — UI/UX Implementation Playbook (`UI_implementation.md`)`
  - `The Anti-Overload Editorial Standard`
  - `Tooling Classification: Three Distinct Tiers`
  - `Removal Plan Rule`
  - `Corrected Problem & Solution Matrix (16 Items)`
  - `1. React Component Re-Render & Effect Cleanup Issues`

---
