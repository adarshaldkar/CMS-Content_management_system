# STEP 3 — Public Editorial Web Experience Specification

> **Phase 5 Master Blueprint — Step 3 Execution Plan**  
> **Source of Truth:** `docs/ARCHITECTURE.md` · `docs/DESIGN-SYSTEM.md` · `docs/P0.md` · `PHASE-5-FRONTEND-PRODUCT-EXPERIENCE.md`

---

## 1. Objective & Scope

**Step 3** builds the flagship **Public Editorial Web Experience** for *The Gazette*. It brings the publication to life with high-impact editorial typography (*Newsreader* serif headlines, *Plus Jakarta Sans* body), an authoritative homepage layout inspired by world-class publications (*Harvard Gazette*, *NDTV*, *Medium*), a typography-first article reader with reading progress, social engagement (authenticated likes, bookmarks, threaded comments, multi-platform share), and full category/tag archive navigation.

### What is delivered in Step 3:
1. **Publication Homepage (`/` — `HomePage.tsx`)**:
   - **Hero Lead Story Showcase**: 3-column asymmetric layout:
     - Primary Hero Lead with high-res cover visual (50% width).
     - 2 Secondary Featured stories (25% width).
     - **Numbered Trending Sidebar `01`–`05`** (25% width) driven dynamically by API engagement metrics.
   - **Latest Stories Feed**: Responsive editorial cards with reading time, category pill, and author metadata.
   - **Curated Category Sections**: Grouped showcase blocks for *Technology*, *Artificial Intelligence*, *Cybersecurity*, and *Software Architecture*.
   - **Newsletter Capture**: Inline editorial newsletter subscription card.
2. **Typography-First Article Reader (`/articles/:slug` — `ArticleReaderPage.tsx`)**:
   - Viewport-pinned **Reading Progress Bar** (Crimson accent).
   - Editorial Header with large *Newsreader* serif headline, excerpt, category breadcrumbs, reading time, and word count.
   - **Author Byline Card** with avatar, biographical note, and interactive **Follow Author** toggle.
   - **Floating Social Engagement Strip**:
     - Like button (Authenticated toggle with optimistic heart animation; guest prompt).
     - Bookmark toggle (saves to `/library`).
     - Multi-platform Share: Web Share API when supported + fallback dropdown (*Copy Link* with clipboard toast, *Twitter/X*, *LinkedIn*, *Email*).
     - Comment jump icon.
   - **Sanitized TipTap Content Renderer**: Clean typography, drop caps, editorial blockquotes, captioned image figures, and syntax-highlighted code blocks.
   - **Comments System**: Threaded comments list, comment composition form (authenticated), and guest sign-in CTA.
   - **Related Stories Grid**: 3 dynamic recommendations from the same category.
3. **Category & Tag Archives (`/category/:slug` & `/tags/:slug`)**:
   - Category header banner with description and live story counts.
   - Filterable editorial story grid.
4. **Personalized "For You" Feed (`/feed` — `ForYouFeedPage.tsx`)**:
   - Recommendation stream driven by **server-persisted topic preferences** (`user.preferredTopics`).
   - "Top Authors in Your Topics" dynamic recommendation sidebar.
5. **Full-Text Editorial Search (`/search` — `SearchPage.tsx`)**:
   - Debounced keyword search across titles, excerpts, and category taxonomies.
   - Filter chips for Category and Sort order (Latest, Most Popular).
6. **Backend Enhancements & Endpoints**:
   - Public article reader endpoints (`GET /api/articles/slug/:slug`), published articles query filtering (`GET /api/articles?status=published&categorySlug=...&search=...&sort=trending`).
   - Server-side topic preferences in `User` entity (`preferredTopics: string[]`) with cross-database JIT continuity.
   - Article interactions: `POST /api/articles/:id/like` (authenticated toggle), `GET /api/articles/:id/comments`, and `POST /api/articles/:id/comments`.
7. **Automated Verification Test**:
   - `test/step3-public-reader-test.mjs` verifying the entire public reading, search, interaction, and JIT continuity pipeline.

---

## 2. Page & Component Architecture

```text
                                STEP 3 PUBLIC EDITORIAL MAP
                                             │
     ┌───────────────────────────────┬───────┴───────────────────────────────┬───────────────────────────────┐
     ▼                               ▼                                       ▼                               ▼
1. HOMEPAGE (`/`)               2. ARTICLE READER (`/articles/:slug`)    3. ARCHIVES & FEED             4. SEARCH (`/search`)
   • Hero Lead Story (Col 1)       • Reading Progress Bar (Pinned Top)     • /category/:slug               • Debounced Search Input
   • Secondary Featured (Col 2)    • Category Breadcrumbs & Meta           • /tags/:slug                   • Category Filter Chips
   • Trending Sidebar (Col 3)      • Author Bio & Follow Action            • /feed (Server Preferences)    • Results Grid & Highlights
   • Category Sections             • Floating Social Bar (Like, Bookmark)
   • Latest Stories Feed           • Sanitized TipTap Body
   • Newsletter Strip              • Interactive Comments System
                                   • Related Articles Footer
```

---

## 3. Technical Decisions & Invariants

### 1. Trending Stories Ranking
* Query: `GET /api/articles?sort=trending&limit=5`
* Ranking Metric: Dynamic weighted score `(viewCount * 1 + likeCount * 3 + commentCount * 5)` or sorted by `likeCount` descending for published articles.
* Dynamic: 100% data-driven from the database (no hardcoded mock stories).

### 2. Social Sharing Architecture
* Pure client-side action without superfluous backend tracking endpoints:
  - If `navigator.share` is available $\to$ invokes native Web Share sheet.
  - Fallback dropdown menu with:
    - **Copy Link**: Copies URL to clipboard and triggers feedback toast.
    - **Twitter / X**: Opens `https://twitter.com/intent/tweet?text={title}&url={url}`.
    - **LinkedIn**: Opens `https://www.linkedin.com/sharing/share-offsite/?url={url}`.
    - **Email**: Opens `mailto:?subject={title}&body={url}`.

### 3. Like Authentication Model
* **Read / View Like Count**: Public (all readers can view total likes).
* **Toggle Like Action (`POST /api/articles/:id/like`)**: Requires authentication. Returns `{ liked: boolean, likeCount: number }`.
* **Guest User Experience**: Clicking like opens a friendly modal/toast: *"Sign in to like stories and join the community."* with a direct link to `/login`.

### 4. Topic Preferences Server-Side Source of Truth
* `preferredTopics?: string[]` is a first-class column/field in `cms_users` and MongoDB `UserSchema`.
* Persisted via `PATCH /api/auth/me` on onboarding completion and updated in profile settings.
* Seamless JIT proxy replicates `preferredTopics` across PostgreSQL $\leftrightarrow$ MongoDB Atlas during database switches.

---

## 4. Backend Endpoints Supporting Step 3

| Method | Endpoint | Description | Auth / Guard |
|---|---|---|---|
| `GET` | `/api/articles` | List published articles (supports `status=published`, `categorySlug`, `search`, `sort=trending`, `limit`, `page`) | Public |
| `GET` | `/api/articles/slug/:slug` | Retrieve single published article by slug with author details & view count increment | Public |
| `GET` | `/api/categories` | List all active categories | Public |
| `GET` | `/api/categories/slug/:slug` | Get single category by slug | Public |
| `GET` | `/api/articles/:id/comments` | List comments for an article | Public |
| `POST` | `/api/articles/:id/comments` | Post reader comment on an article | Authenticated (`comment.create`) |
| `POST` | `/api/articles/:id/like` | Toggle like state for authenticated user | Authenticated |
| `POST` | `/api/articles/:id/bookmark` | Toggle saved bookmark for authenticated user | Authenticated |
| `PATCH` | `/api/auth/me` | Update author profile & `preferredTopics` | Authenticated |

---

## 5. Step 3 Verification & Definition of Done

* [ ] Homepage renders 3-column asymmetric Hero Lead Story, Secondary Stories, and dynamic API-driven Numbered Trending Sidebar.
* [ ] Article reader renders Newsreader typography, reading progress bar, author bio, social floating bar, and sanitized TipTap body.
* [ ] Likes (authenticated toggle with guest prompt), Bookmarks, and Shares (Web Share API + Copy Link) function seamlessly.
* [ ] Category archives (`/category/:slug`) and Tag archives (`/tags/:slug`) filter articles correctly.
* [ ] Personalized "For You" Feed (`/feed`) is powered by server-side `preferredTopics`.
* [ ] Full-text debounced search (`/search`) matches articles by headline and content.
* [ ] Cross-Database JIT Continuity: Public article and category queries continue working without missing records across PostgreSQL $\leftrightarrow$ MongoDB Atlas.
* [ ] `node test/step3-public-reader-test.mjs` passes 100% green.
