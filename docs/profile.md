# Editorial Journalist Dossier & Author Hub Architecture (`profile.md`)

## 1. Overview

The **Author Profile & Journalist Dossier** (`/profile`) is the central editorial identity and portfolio workstation for authors, editors, and newsroom contributors across **The Gazette**.

It bridges real-time community engagement, portfolio curation, draft lifecycle tracking, topic specializations, and multi-database mesh synchronization into a cohesive, high-performance newsroom experience.

---

## 2. Multi-Database Architecture & Persistence Mesh

The author profile integrates dynamically across the 6-database persistence mesh configured in the platform:

```
                      +-----------------------------+
                      |   Client Application        |
                      |   (React 19 + Vite + Query) |
                      +--------------+--------------+
                                     |
                         HTTP / REST API (JWT/CSRF)
                                     |
                      +--------------v--------------+
                      |   NestJS API Backend Core   |
                      |   (Users / Follows / Auth)  |
                      +--------------+--------------+
                                     |
             +-----------------------+-----------------------+
             |                       |                       |
+------------v------------+ +--------v--------+ +------------v------------+
| PostgreSQL (Port 5432)  | | MariaDB (3307)  | | CockroachDB (26257)     |
| Authoritative Main Core | | Distributed SQL | | Geo-Distributed Replicas|
+------------+------------+ +--------+--------+ +------------+------------+
             |                       |                       |
+------------v------------+ +--------v--------+ +------------v------------+
| MySQL 8.4 (Port 3308)   | | MongoDB 7 (27017)| | ClickHouse (8123 / 9000)|
| Relational Storage      | | Document Store  | | Analytical Event Engine |
+-------------------------+ +-----------------+ +-------------------------+
```

### Persistence Guarantees
* **User Profile & Byline Updates**: Mutations submitted via `PATCH /api/auth/profile` update the user entity in the active storage engine (PostgreSQL, MariaDB, MySQL, CockroachDB, or MongoDB) and replicate to paired fallback stores.
* **Followers / Following Counters**: Computed dynamically via relational indices on `follows(target_type, target_id)` and `follows(follower_id)` to ensure instantaneous synchronization.
* **Topic Subscriptions**: Managed via `follows(target_type = 'category', target_id = slug)` and mapped directly to personal dispatch feed personalization (`/feed` and `/me/following/topics`).
* **Active Database Status**: Telemetry hook (`/api/database/status`) communicates real-time storage engine status to the UI badge.

---

## 3. UI/UX Component Specifications

### A. Editorial Dossier Masthead
* **Top Rule**: Gazette accent crimson rule line.
* **Avatar & Initial Badge**: High-resolution headshot rendering with graceful initial fallback.
* **Editorial Clearance & Badges**:
  * Official Clearance Pill: `SUPER_ADMIN`, `ADMIN`, `EDITOR`, `AUTHOR`, `USER`.
  * Live Active Database Indicator: Real-time pulse light with current engine identifier (`POSTGRES`, `MARIADB`, `MYSQL`, etc.).
  * Metadata Line: Email, Join Date formatted in editorial style.
* **Journalist Bio Quote**: Editorial italic blockquote for personal credentials and beat statements.
* **Quick Actions**: "Write Story" (studio shortcut), "Edit Bio", and "Copy Profile Link" with clipboard confirmation.

### B. 6-Card Impact & Telemetry Bar
1. **Published**: Real count of circulating published stories by this author.
2. **In Progress**: Real count of active drafts, review submissions, and revisions.
3. **Followers**: Real follower count connected to user follow graph.
4. **Following**: Real following count of peer journalists.
5. **Beats Covered**: Real count of subscribed topic categories.
6. **Discussions**: Total commentary contributions on platform stories.

### C. 6 Specialized Workstation Tabs
1. **Published Portfolio**:
   * Grid of authored articles with category tags, reading time, word count, publication date, and direct "Studio Edit" / "View Live" controls.
2. **Drafts & Review Queue**:
   * List of in-progress drafts, pending review submissions, and rejected pieces requiring revision with "Resume Writing" shortcuts.
3. **Community & Network**:
   * Sub-tabs for **Followers** and **Following** with populated author cards, roles, avatars, and one-click "Follow Back" / "Unfollow" mutations.
4. **Editorial Beats & Topics**:
   * Responsive grid of platform categories with topic descriptions and real-time follow/unfollow toggle.
5. **Discussions & Commentary Log**:
   * Chronological log of reader commentary with story identifiers and formatted timestamps.
6. **Journalist Settings & Byline Configuration**:
   * Form to update Author Name, Biographical Statement, and Headshot URL with validation and instant cache invalidation.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/:userId/stats` | Follower & following counts | No (Public) |
| `GET` | `/api/articles?authorId=:id&status=published` | Published author stories | No (Public) |
| `GET` | `/api/articles?authorId=:id&status=draft` | In-progress drafts | Yes |
| `GET` | `/api/users/:userId/followers` | List of followers | No (Public) |
| `GET` | `/api/users/:userId/following` | List of followed authors | Yes |
| `GET` | `/api/me/following/topics` | List of followed category slugs | Yes |
| `POST` | `/api/users/:userId/follow` | Follow a user | Yes |
| `DELETE` | `/api/users/:userId/follow` | Unfollow a user | Yes |
| `POST` | `/api/categories/:slug/follow` | Follow a topic beat | Yes |
| `DELETE` | `/api/categories/:slug/follow` | Unfollow a topic beat | Yes |
| `GET` | `/api/users/:userId/comments` | Comments posted by user | Yes |
| `PATCH` | `/api/auth/profile` | Update name, bio, avatar | Yes |
| `GET` | `/api/database/status` | Active database engine telemetry | No (Public) |

---

## 5. Verification & Testing Checklist

- [x] Client builds with zero TypeScript errors (`npm run build -w client`).
- [x] Server runs and health check returns `status: ok` (`http://localhost:3001/api/health`).
- [x] Author profile loads at `http://localhost:5173/profile`.
- [x] Tab navigation smoothly switches between Portfolio, Drafts, Community, Topics, Discussions, and Settings.
- [x] Profile updates persist to active database and sync with Zustand authentication store.
- [x] Follow/Unfollow mutations update counts immediately via React Query cache invalidation.
