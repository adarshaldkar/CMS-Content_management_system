# The Gazette — Master Documentation Suite & Evidence Map

> **Project:** The Gazette — Enterprise-Grade Headless Publication Operating System  
> **Repository:** `adarshaldkar/CMS-Content_management_system`  
> **Classification:** Product & Engineering Master Dossier + Evaluation Presentation  
> **Target Audience:** Academic Examination Committee, Technical Architecture Reviewers, Software Engineering Evaluators  
> **Date:** October 2026  
> **Status:** Submission Ready / Baseline Verified  

---

## 1. Master Table of Contents

| Part | Chapter | Chapter Title | Primary Repository Evidence |
| :--- | :---: | :--- | :--- |
| **Front Matter** | — | **Academic Front Matter** | Abstract, Objectives, Literature & Industry Context, Methodology |
| **PART I** | **01** | **Product Overview** | System goals, editorial challenges, core contributions, persona landscape |
| **PRODUCT** | **02** | **Product Requirements Document (As-Built PRD)** | Functional & non-functional requirements, user stories, acceptance criteria |
| **DEFINITION**| **03** | **User Roles and Product Workflows** | RBAC matrix (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `AUTHOR`, `READER`), state machines |
| **PART II** | **04** | **UI/UX and Interface Design** | Information architecture, screen inventory, Tiptap studio, recovery modals, states |
| **UI/UX** | | | |
| **PART III** | **05** | **System Architecture** | C4 Context/Container diagrams, modular boundaries, async topologies, trade-offs |
| **TECHNICAL** | **06** | **Technology Stack & Design Decisions** | React 19, NestJS, Vite, PostgreSQL, MongoDB, Redis, ClickHouse, BullMQ rationales |
| **DESIGN** | **07** | **Database and Schema Design** | Polyglot persistence, PostgreSQL ER schemas, MongoDB documents, Redis keys, ClickHouse |
| | **08** | **Backend and API Design** | NestJS modular structure, guards, DTOs, Swagger/OpenAPI contracts, error handling |
| | **09** | **Core Feature Engineering** | Deep dive into Autosave/Recovery, Tiptap, BullMQ queues, SSRF-guarded scrapers |
| **PART IV** | **10** | **Security Architecture and Threat Model** | Dual JWT lifecycle, Argon2id, CSRF double-submit, SSRF zero-trust, Rate-limiting |
| **SECURITY &**| **11** | **Testing Strategy** | Vitest unit/integration suites, Playwright E2E Golden Journey, authorization matrices |
| **QUALITY** | **12** | **Penetration Testing and Findings** | Burp Suite Pro verification, Collaborator OOB tests, 429 stress tests, JWT tampering |
| | **13** | **Deployment, Operations & Observability** | Docker multi-container topology, memory-budgeting profiles, telemetry, health checks |
| **PART V** | **14** | **Results and Demonstration** | End-to-end authoring and publishing scenarios, operational proofs, metrics |
| **SUBMISSION**| **15** | **Limitations, Future Scope and Conclusion** | Technical trade-offs, roadmap (multi-tenancy, AI co-pilot), final evaluation summary |
| **End Matter**| — | **Appendices & References** | API route catalog, full schema scripts, test logs, bibliography |

---

## 2. Repository Evidence Mapping

| Component | Architecture Role | Source Implementation Files |
| :--- | :--- | :--- |
| **Backend Core** | NestJS Modular Framework | `server/src/app.module.ts`, `server/src/main.ts` |
| **Authentication** | Dual-Token JWT & Argon2id | `server/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `jwt-auth.guard.ts` |
| **Security Controls** | CSRF, SSRF, Rate Limiting | `server/src/common/guards/csrf.guard.ts`, `common/utils/ssrf-validator.util.ts` |
| **Relational Core** | PostgreSQL 16 & TypeORM | `server/src/database/postgres.service.ts`, entities in `server/src/entities/` |
| **Document Core** | MongoDB 7 & Mongoose | `server/src/repositories/mongo/`, `article.schema.ts`, `revision.schema.ts` |
| **Cache & Queues** | Redis 7 & BullMQ | `server/src/modules/jobs/`, `editorial-queue.processor.ts`, `publishing-slot.service.ts` |
| **Analytics Engine**| ClickHouse Columnar Store | `server/src/database/clickhouse.service.ts` |
| **Frontend Studio** | React 19, Vite & Tiptap | `client/src/components/editor/`, `client/src/pages/`, `client/src/stores/` |
| **End-to-End QA** | Playwright Test Suite | `client/tests/e2e/editorial/golden-journey.spec.ts` |
| **Penetration Test**| Burp Suite Pro & Collaborator | Repeater OOB Collaborator traces, Intruder 429 rate limit telemetry |

---

## 3. Documentation Generation Checklist

- [x] Codebase and active runtime audited (Docker mesh, backend NestJS on port 3001, Vite client on port 5173).
- [x] Verified database schemas and polyglot architecture patterns.
- [x] Gathered security testing evidence (Burp Collaborator OOB DNS/HTTP hits, rate-limit responses, JWT tampering controls).
- [x] Created `dossier/GAZETTE_MASTER_ENGINEERING_DOSSIER.md` containing all 15 comprehensive chapters.
- [x] Implemented `dossier/presentation/generate_presentation.py` to compile the 15-slide master `.pptx` presentation deck.
- [x] Created `dossier/presentation/SPEAKER_SCRIPT_AND_SLIDE_NOTES.md` providing exact talking points.
