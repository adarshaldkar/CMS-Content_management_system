# CMS-Driven Content Platform — Project Specification

> **Document purpose:** Detailed instructions for building the secure, CMS-driven editorial content platform.  
> **Tech stack:** Locked — see `ARCHITECTURE.md` (React + TS + Vite + Tailwind + NestJS + PostgreSQL + MongoDB)  
> **Related docs:** `ARCHITECTURE.md` · `SECURITY-AND-CMS.md` · `MASTER-SPEC.md`

---

## 1. Project Overview

Build a **production-quality, secure, CMS-driven content publishing platform**.

This is **NOT**:

- A Medium clone
- An NDTV clone
- A generic AI-generated SaaS dashboard
- A WordPress clone

The application must be an **original professional editorial/content platform** inspired by the strengths of several reference websites and CMS platforms — with its own visual identity.

### Required Components

1. Public Website
2. User Authentication and User Panel
3. User CMS / Content Management System
4. Admin Panel
5. Secure Backend API
6. PostgreSQL database with SQL
7. MongoDB database
8. Database abstraction layer (admin can switch active database)
9. Strong security based on OWASP Top 10:2025 principles
10. Complete CRUD operations
11. Content publishing workflow
12. Media/content management
13. Clean, professional, human-designed UI

The final result must feel like a real professional product built by an experienced development team.

---

## 2. Tech Stack

> **FINAL — do not substitute.** Full locked stack, auth architecture, and module layout: **`docs/ARCHITECTURE.md`**

| Layer | Final Choice |
|-------|--------------|
| Frontend | React 18+ · TypeScript · Vite · Tailwind · React Router · TanStack Query · Zustand · React Hook Form · Zod · TipTap · Axios · Lucide |
| Backend | Node.js · TypeScript · **NestJS** · REST · OpenAPI/Swagger · `pg` · Mongoose · Argon2id · Zod · Pino |
| Security | JWT + HttpOnly cookies · helmet · CORS · `@nestjs/throttler` · sanitize-html · multer |
| Testing | Jest · Supertest · Playwright |
| Infrastructure | Docker Compose · GitHub Actions · npm · `package-lock.json` |

Design tokens: **`docs/DESIGN-SYSTEM.md`**

---

## 3. UI Design Requirements

### DO NOT Make the UI Look AI-Generated

This is one of the most important requirements.

**Avoid:**

- Excessive rounded cards
- Excessive glassmorphism
- Excessive gradients
- Huge glowing backgrounds
- Purple/blue AI-style gradients everywhere
- Excessive floating cards
- Every section inside a card
- Unnecessary animations
- Giant headings with excessive whitespace
- Generic dashboard templates
- "Modern AI startup" visual style
- Excessive shadows
- Random decorative blobs
- Overuse of icons
- Excessive pill-shaped buttons
- Everything being perfectly symmetrical
- Repetitive card grids
- Generic Tailwind/shadcn-looking layouts without customization

The UI must look **intentionally designed by a professional product designer** — like a real editorial/content platform, not something generated from a UI prompt.

### Design References (Inspiration Only — Do NOT Copy)

Study these for design and information architecture. **Do not copy** branding, text, logos, images, or layouts exactly.

| Reference | URL | Study |
|-----------|-----|-------|
| Harvard Gazette | https://news.harvard.edu/gazette/ | Clean editorial hierarchy, typography, whitespace, article presentation, navigation, professional visual structure |
| NDTV | https://www.ndtv.com/ | Content organization, categories, featured/latest content, search, information density — **not** cluttered appearance |
| EUHost | https://euhost.co/ | Modern professional presentation, typography, spacing, section hierarchy |
| Allo17 | https://allo17.fr/ | Editorial presentation, visual hierarchy, modern human-designed layouts |
| WordPress ColorMag | https://wordpress.org/themes/colormag/preview/ | Content-heavy layouts, categories, sidebars, featured content, editorial structure |
| Medium | General reference only | Reading experience, typography, article readability — **final site must NOT look like Medium** |

### Combined Design Principle

| Source | Contribution |
|--------|--------------|
| Harvard Gazette | Clean editorial presentation |
| NDTV | Content organization |
| EUHost / Allo17 | Modern professional presentation |
| ColorMag | Content structure |
| Medium | Readability on article pages only |

**Final result must be ORIGINAL.**

### Visual System

**Prefer:**

- Strong typography
- Clear spacing
- Editorial grids
- Subtle borders
- Controlled shadows
- Neutral professional palette
- Consistent spacing
- Purposeful imagery

**Avoid:**

- Excessive gradients, rounded corners, animations
- Neon colors, AI-style decorative backgrounds
- Generic dashboard templates

Animations should be subtle and purposeful.

### UI Priority

Prioritize **CONTENT · READABILITY · NAVIGATION · HIERARCHY · USABILITY** over decorative effects.

---

## 4. Application Structure

Three major user-facing areas:

### A. Public Website

Visitors can:

- View homepage
- Browse articles and categories
- Search content
- View article details, author profiles, tags
- View featured, latest, popular/trending, and related content
- Navigate with pagination
- Read articles comfortably
- Share content where appropriate

### B. User Panel + User CMS

Authenticated users with appropriate roles can:

- Register, login, logout, reset password
- Manage profile (name, bio, email, profile image)
- Create and edit content
- Save drafts, submit for review
- View publishing status
- Bookmark, like, and comment (role-dependent)

Users must **not** access administrative operations.

### C. Admin Panel

Professional management interface for authorized administrators and editors.

---

## 5. Public Homepage Structure

```
Header
  ↓
Main Navigation
  ↓
Featured Content
  ↓
Latest Content
  ↓
Category Sections
  ↓
Popular/Trending Content
  ↓
Additional Editorial Sections
  ↓
Newsletter/CTA (if required)
  ↓
Footer
```

Use a mixture of:

- Large editorial layouts
- Horizontal article rows
- Image + text combinations
- Typography-driven sections
- Grid layouts only where useful
- Featured article layouts
- List layouts
- Category sections

Do not force every section into cards.

---

## 6. Article Page

Must include:

- Breadcrumb/category
- Article title, subtitle/excerpt
- Author with profile image
- Published date, updated date (if available), reading time
- Featured image
- Article content (headings, images, quotes, lists, links)
- Tags and share controls
- Related articles and author information
- Comments (if enabled)

Typography and line height are critical. Must **not** look like a dashboard.

---

## 7. User System

### Authentication Features

- Registration, login, logout
- Password hashing (Argon2id)
- Password reset
- Profile management
- Account settings

### User Panel Navigation

- Dashboard
- My Profile
- My Articles
- Create Article
- Drafts / Submitted / Published
- Bookmarks
- Comments
- Settings

### Content Status Indicators

`Draft` · `Pending Review` · `Approved` · `Published` · `Rejected` · `Archived`

User panel must **not** look identical to the admin panel.

---

## 8. User CMS

Authorized users create and manage content without modifying source code.

### Basic Fields

Title, slug, short description, main content, cover image, author, category, tags

### Publishing Fields

Status, publish date, scheduled date, draft state

### SEO Fields

SEO title, SEO description, canonical URL, social image, slug

### Optional Content Fields

Featured image, gallery, quotes, embedded media, external links

Use a proper rich text/content editor. Do not make the editor visually excessive.

---

## 9. CMS Workflow

```
CREATE
  ↓
DRAFT
  ↓
SUBMIT FOR REVIEW
  ↓
PENDING REVIEW
  ↓
APPROVED
  ↓
PUBLISHED
```

Rejection path:

```
PENDING REVIEW → REJECTED → AUTHOR EDITS → SUBMIT AGAIN
```

Archive path:

```
PUBLISHED → ARCHIVED
```

Scheduling (if implemented):

```
APPROVED → SCHEDULED → PUBLISHED
```

---

## 10. Admin Panel

### Navigation

Dashboard · Users · Roles · Permissions · Posts · Pages · Categories · Tags · Authors · Media · Comments · Content Workflow · SEO · Audit Logs · Security · Database · System Settings

Use professional tables, filters, tabs, forms, drawers/modals — not huge decorative cards.

### Admin Dashboard Metrics

- Total users, active users
- Total articles, drafts, pending reviews, published articles
- Categories, comments
- Recent articles, recent users, pending approvals, recent admin activity

Prioritize **useful information** over meaningless decorative statistics.

---

## 11. Role-Based Access Control (RBAC)

### Roles

| Role | Access |
|------|--------|
| SUPER ADMIN | Full system access |
| ADMIN | Users, CMS, content, settings per permissions |
| EDITOR | Review, edit, publish content |
| AUTHOR | Create and manage own content |
| USER | Public/user-level features |

Design the system so roles and permissions can be configured.

**Authorization MUST be enforced on the backend.** Never rely only on hiding frontend buttons.

---

## 12. CRUD Requirements

All major entities require proper CRUD:

Users · Posts · Pages · Categories · Tags · Media · Comments · Authors · Roles · Permissions

Where appropriate, use deactivate, archive, restore, publish, unpublish instead of destructive deletion.

### Soft Delete

For important entities, prefer `deletedAt` over immediate destruction for recovery, auditing, and data integrity.

---

## 13. Categories & Tags

### Categories

Fields: name, slug, description, image/icon, SEO title, SEO description, status  
Prevent invalid/dependent deletion.

### Tags

Fields: name, slug, usage count  
Full CRUD with dependency checks.

---

## 14. Media Management

- Upload, view, search, delete, replace media
- Use media in content
- Validate file type, size, extension, MIME type
- Do not trust user-supplied filenames
- Prevent malicious file uploads

---

## 15. Search

Server-side search for articles, users (admin), categories, tags, media.

Provide search input, filtering, sorting, pagination. **Never** load the entire database into the browser for client-side search.

---

## 16. Database Architecture

### Dual Database Requirement

1. **PostgreSQL** — relational, SQL with parameterized queries
2. **MongoDB** — document database with validated queries

### Repository Abstraction Layer

```
Frontend
  ↓
Backend
  ↓
Service Layer
  ↓
Repository / Database Abstraction Layer
  ↓
PostgreSQL OR MongoDB
```

Example:

```typescript
interface ArticleRepository {
  createArticle()
  getArticle()
  getArticles()
  updateArticle()
  deleteArticle()
  publishArticle()
}

// Implementations:
PostgresArticleRepository
MongoArticleRepository
```

Business logic interacts with the **interface**, not directly with a database.

### Common Application-Level Data Model

PostgreSQL and MongoDB may store data differently internally, but the application receives consistent structures:

```typescript
interface Article {
  id: string
  title: string
  slug: string
  description: string
  content: string
  authorId: string
  categoryId: string
  tags: string[]
  coverImage: string
  status: ContentStatus
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}
```

### Database Switching

Admin Panel provides database control:

- Display current active database (PostgreSQL or MongoDB)
- Switch database (authorized administrators only)

**Critical rule:** Do NOT automatically migrate or delete data when switching.

| PostgreSQL | MongoDB |
|------------|---------|
| 100 articles | 20 articles |

When PostgreSQL is active → app reads PostgreSQL.  
When MongoDB is active → app reads MongoDB.  
Each database maintains its **own independent dataset**.

Switching must:

1. Require authentication and authorization
2. Validate selected database
3. Confirm connection before switching
4. Update active configuration safely
5. Log the operation
6. Fail safely — keep previous database active if connection fails
7. Never expose credentials to frontend

---

## 17. API Design

### Authentication

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

### Users

```
GET    /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
```

### Articles

```
GET    /articles
GET    /articles/:slug
POST   /articles
PATCH  /articles/:id
DELETE /articles/:id
```

### CMS

```
GET    /cms/content
POST   /cms/content
PATCH  /cms/content/:id
DELETE /cms/content/:id
```

### Categories & Tags

```
GET/POST/PATCH/DELETE  /categories
GET/POST/PATCH/DELETE  /tags
```

### Admin Database

```
GET   /admin/database
POST  /admin/database/switch
```

Every endpoint receiving user input must validate on the backend. Do not trust frontend validation alone.

---

## 18. SEO

Support:

- SEO title, description, canonical URL, slug
- Open Graph and social sharing metadata
- Sitemap, robots configuration
- Proper heading hierarchy
- Clean URLs: `/articles/future-of-ai` not `/article?id=123`

---

## 19. Performance

- Pagination on all list endpoints
- Lazy loading where useful
- Image optimization
- Server-side filtering
- Database indexing
- Efficient queries
- Caching where appropriate

Do not optimize blindly — first create clean architecture.

---

## 20. Responsive Design & Accessibility

### Responsive

Must work on desktop, laptop, tablet, mobile. Reorganize content for smaller screens — do not simply shrink desktop layout.

### Accessibility

- Semantic HTML
- Keyboard navigation
- Proper labels and focus states
- Alt text on images
- Accessible forms and buttons
- Proper heading hierarchy
- Sufficient color contrast
- Screen-reader-friendly structure

---

## 21. Frontend Component Architecture

Reusable components:

Header · Navigation · Footer · Article card · Featured article · Author card · Category section · Search · Pagination · Forms · Tables · Modals · Rich text editor · Media selector · Status badge · Admin navigation · CMS editor · Toast/notification · Loading/empty/error states

---

## 22. Development Priority

| Priority | Focus |
|----------|-------|
| 1 | Application structure |
| 2 | Authentication |
| 3 | Public website |
| 4 | Admin panel |
| 5 | CMS |
| 6 | CRUD |
| 7 | PostgreSQL |
| 8 | MongoDB |
| 9 | Database abstraction/switching |
| 10 | Security hardening |
| 11 | Polishing and responsive UI |

Do not spend most development time on decorative UI while core functionality is incomplete.

---

## 23. Pre-Implementation Checklist

Before writing a large amount of code:

1. Analyze complete requirements
2. Create project architecture
3. Define modules
4. Define database models
5. Define database abstraction interfaces
6. Define API structure
7. Define authentication/authorization
8. Define CMS workflow
9. Define public website structure
10. Define admin structure
11. Define UI design system

Then implement module by module. Do not create random pages without consistent architecture.

---

## 24. Most Important Rules

1. Build an **ORIGINAL UI**
2. Do not copy reference websites
3. Do not make the UI look AI-generated
4. Keep the public website clean and editorial
5. Keep the admin panel functional and professional
6. Build a **real CMS** (our own — see `SECURITY-AND-CMS.md`)
7. Implement proper CRUD
8. Use PostgreSQL with parameterized SQL
9. Use MongoDB with validated queries
10. Create a database abstraction layer
11. Allow authorized admin database switching
12. Keep PostgreSQL data in PostgreSQL; MongoDB data in MongoDB
13. Do not auto-migrate data during switch
14. Maintain a common application-level data model
15. Secure all database operations
16. Follow OWASP Top 10:2025 (see `SECURITY-AND-CMS.md`)
17. Enforce authorization on the backend
18. Never expose database credentials
19. Log sensitive administrative actions
20. Validate all user input
21. Build responsive and accessible interfaces

---

## 25. Final Goal

A secure, original, professional, editorial CMS platform with:

**PUBLIC WEBSITE + USER SYSTEM + USER CMS + ADMIN PANEL + CRUD + POSTGRESQL + MONGODB + DATABASE ABSTRACTION + DATABASE SWITCHING + OWASP SECURITY + CLEAN ORIGINAL UI**

The references are inspiration and research material. The final product must be **OUR OWN platform**.
