# Phase 5 — Frontend Product Experience & Social Publishing Specification

## Status

**Discussion / Product Definition — no implementation instructions should override the locked architecture.**

This document consolidates:

- Current implementation progress after Phase 4.
- Features already defined in the project specifications.
- Frontend features still missing according to the current progress report.
- Product features discussed after reviewing Medium-like interaction patterns.
- Additional differentiating features proposed for our platform.
- Security rules that must remain enforced as these features are implemented.

This is **not a Medium clone**. Medium is used only as a reference for selected reader, writer, and interaction patterns. The final product must retain its own editorial identity and design system.

---

# 1. Product Vision

We are building a **secure editorial publishing platform** with four connected experiences:

```text
                         EDITORIAL PLATFORM
                                |
          +---------------------+----------------------+
          |                     |                      |
          v                     v                      v
      READER                 AUTHOR                 EDITOR / ADMIN
    EXPERIENCE             EXPERIENCE                EXPERIENCE
          |                     |                      |
    Discover/read          Write/manage          Review/govern
    Follow topics          Draft/submit          Approve/reject
    Save/organize          Track status           Schedule/publish
    Interact               View analytics         Moderate/manage
          |                     |                      |
          +---------------------+----------------------+
                                |
                                v
                       SECURE BACKEND API
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
        PostgreSQL                              MongoDB
             \                                     /
              +-------- Repository Layer ----------+
```

The product should feel like:

> **A serious publishing platform for readers, writers, and editorial teams — with the simplicity of a modern reading/writing product and the governance, security, revisions, moderation, and administrative control expected from a professional CMS.**

---

# 2. Important Product Rule

This project is **not**:

- A Medium clone.
- An NDTV clone.
- A WordPress clone.
- A generic AI SaaS dashboard.
- A collection of copied layouts from reference websites.

Medium-inspired functionality can be used where it improves the reader/writer experience, but the visual language must remain our own.

The existing specification explicitly requires an original editorial UI and says Medium is only a reference for readability/article experience.

---

# 3. Current Implementation Status

According to the current implementation report:

## Completed

### Phase 3 — Security & Authentication

Implemented and verified:

- Argon2id password hashing.
- Secure HttpOnly cookies.
- Token rotation and refresh-token family protection.
- CSRF protection.
- RBAC capability checks.
- Ownership checks.
- Bounded Super Admin behavior.
- Global exception redaction.
- Correlation/reference IDs.
- Structured audit logging.
- Security tests.

### Phase 4 — CMS Engine

Implemented:

- TipTap CMS editor.
- Article CRUD foundation.
- Publishing workflow.
- Revisions/versioning.
- Media pipeline.
- Server-side sanitization.
- Optimistic concurrency/version checks.
- Scheduling/publishing workflow.
- Media picker.
- SEO fields.
- Workflow controls.

## Still missing / incomplete on frontend

### Public

- Real editorial homepage.
- Article reader page.
- Category pages.
- Tag pages.
- Search results.
- Rich public navigation.

### Authentication UI

- Login.
- Registration.
- Forgot password.
- Reset password.
- Authentication state handling.

### User panel

- Full user dashboard.
- Profile.
- Bookmarks/library.
- Comments/history.
- Full story/status navigation.
- Account settings.

### Admin

- User management.
- Workflow/review queue.
- Categories.
- Tags.
- Media management.
- Audit viewer.
- Database switch UI.
- Comment moderation.

### Frontend architecture

- TanStack Query setup.
- Zustand auth/session state.
- React Hook Form + Zod forms.
- Axios interceptors.
- Route guards.
- Pagination.

---

# 4. Frontend Architecture

Final frontend stack remains locked:

```text
React
TypeScript
Vite
Tailwind CSS
React Router
TanStack Query
Zustand
React Hook Form
Zod
TipTap
Axios
Lucide
```

The architecture document is the source of truth for these choices.

Important rule:

```text
TanStack Query → server/API state
Zustand        → client/UI/session state
```

Do not use Zustand as a replacement for API caching.

---

# 5. Three Primary Frontend Experiences

## A. Public / Reader Experience

Designed for:

- Visitors.
- Readers.
- Registered users.

Focus:

**CONTENT · READABILITY · DISCOVERY · NAVIGATION**

---

## B. User / Author Experience

Designed for:

- Registered users.
- Authors.

Focus:

**WRITING · ORGANIZATION · STATUS · COMMUNITY**

---

## C. Admin / Editorial Experience

Designed for:

- Editors.
- Admins.
- Super Admins.

Focus:

**GOVERNANCE · MODERATION · OPERATIONS · SECURITY**

The user panel must not look identical to the admin panel.

---

# 6. Public Website

## 6.1 Homepage

The homepage should be a real editorial homepage, not a project landing page.

Suggested structure:

```text
HEADER
  |
MAIN NAVIGATION
  |
PERSONALIZED / FEATURED AREA
  |
FEATURED STORY
  |
LATEST STORIES
  |
CATEGORY SECTIONS
  |
TRENDING / POPULAR
  |
EDITOR'S PICKS
  |
FOLLOWING / RECOMMENDED CONTENT
  |
MORE EDITORIAL SECTIONS
  |
FOOTER
```

Use a mixture of:

- large editorial lead story.
- horizontal story rows.
- image + text.
- typography-driven sections.
- selective grids.
- side content where useful.
- category sections.
- list-based presentation.

Do not put every section inside rounded cards.

---

# 7. Article Reader Page

A public article should include:

- Breadcrumb/category.
- Article title.
- Subtitle/excerpt.
- Author.
- Author avatar.
- Published date.
- Updated date when available.
- Reading time.
- Featured image.
- Rich article content.
- Headings.
- Lists.
- Quotes.
- Code where appropriate.
- Links.
- Tags.
- Like/reaction control.
- Comment/response control.
- Share control.
- Repost control.
- Bookmark/save control.
- Author information.
- Related articles.
- Series/collection information where applicable.
- Follow author.
- Comments.

The reading experience should remain calm and typography-first.

---

# 8. Search

Search must be server-side.

```text
User enters search
        |
        v
GET /api/articles?search=...
        |
        v
Backend validates input
        |
        v
Repository query
        |
        v
Paginated results
```

Do not load the entire database into the browser.

Search should eventually support:

- Query.
- Category.
- Topic/tag.
- Author.
- Date.
- Sorting.
- Pagination.

---

# 9. Category and Topic Pages

Examples:

```text
Technology
AI
Cybersecurity
Programming
Design
Business
Science
```

A topic page should show:

- Topic title.
- Description.
- Story count.
- Followers.
- Latest stories.
- Popular stories.
- Follow/unfollow action.

### Topic hover information

Inspired by the observed Medium interaction:

```text
LLM
48,820 stories
```

Possible richer version:

```text
LLM

48,820 articles
12,430 authors
1,240 new this week

[Follow]
```

Story counts must come from actual backend data and must not be hardcoded.

---

# 10. Personalized Topic Onboarding

This is a newly added product feature based on the Medium interaction pattern discussed.

For a new user:

```text
What would you like to read?

Technology
[Technology] [AI] [Cybersecurity] [AWS] [LLM]

Programming
[Python] [React] [Web Development] [DevOps]

Design
[UX] [UI Design] [...]

Choose 3 or more topics
```

The user may select multiple topics.

Example:

```text
User preferences:

Technology
AI
Cybersecurity
React
```

These preferences should affect the feed.

Do not make this a decorative onboarding screen that is never used.

---

# 11. Personalized Home Feed

After topic selection:

```text
                        USER HOME
                           |
           +---------------+---------------+
           |               |               |
           v               v               v
        For You         Following        Latest
           |
     +-----+------+
     |            |
     v            v
Because you    Trending in
follow AI      Cybersecurity
     |            |
     +------+-----+
            |
            v
        Articles
```

Initial personalization can be deterministic.

For example:

```text
Priority:
1. Followed authors
2. Followed topics
3. Selected onboarding interests
4. Recent content
5. Trending/popular
```

A complex ML recommendation engine is not required initially.

---

# 12. Following System

The product should support:

```text
Follow
├── Authors
├── Topics
└── Publications / Collections
```

A user should be able to see:

### Following

```text
Writers
Topics
Publications
```

And:

### Followers

```text
People following you
```

Profile pages should show appropriate counts:

```text
Articles: 42
Followers: 1,240
Following: 186
```

Only data allowed by privacy rules should be exposed.

---

# 13. User Dashboard

The user dashboard should be a complete personal workspace.

Suggested structure:

```text
USER DASHBOARD

Overview
Profile
Stories
Drafts
Scheduled
Published
Rejected
Following
Followers
Library
Highlights
Reading History
Responses
Notifications
Stats
Settings
```

The dashboard is not only an author dashboard. A normal registered reader should also have useful features.

---

# 14. User Profile

Profile should include:

- Profile image.
- Name.
- Bio.
- Public article count.
- Followers.
- Following.
- Published stories.
- Activity where privacy allows.
- About section.
- Optional social links.
- Follow/unfollow.
- Lists/collections where public.
- Author statistics where enabled.

Suggested profile layout:

```text
PROFILE HEADER
--------------------------------

Avatar
Name
Bio
Followers | Following

[Follow / Edit Profile]

--------------------------------

Articles | About | Activity | Collections

--------------------------------

Content
```

The exact tabs can differ from Medium. They should be styled using our own design system.

---

# 15. Stories / Author Content Management

User stories page should support:

```text
Stories

Drafts
Scheduled
Published
Submissions
Rejected
Archived
```

Each story row can show:

- title.
- status.
- last updated.
- scheduled date.
- revision.
- word count.
- reading time.
- actions.

Example:

```text
Secure API Design
Pending Review
Updated 12 min ago

[Edit] [View History]
```

---

# 16. Writing Experience

The writing screen uses TipTap.

Core capabilities:

- Title.
- Subtitle/description.
- Rich body.
- H2/H3.
- Bold.
- Italic.
- Strike.
- Lists.
- Blockquote.
- Code.
- Links.
- Images.
- Cover image.
- Category.
- Tags.
- SEO.
- Slug.
- Canonical URL.
- Social image.
- Draft saving.
- Submit for review.

### Writing flow

```text
CREATE ARTICLE
       |
       v
WRITE
       |
       +----> Autosave
       |
       +----> Media
       |
       +----> SEO
       |
       v
SAVE DRAFT
       |
       v
SUBMIT REVIEW
```

---

# 17. Draft Autosave

The editor should provide a visible state:

```text
Saving...
Saved just now
```

The user should not have to manually save every tiny change.

Autosave must still follow the backend version/concurrency rules.

---

# 18. Publishing Readiness

Before submitting, the CMS should show an editorial checklist:

```text
PUBLISHING READINESS

✓ Title
✓ Slug
✓ Content
✓ Category
✓ Tags
✓ Cover image
✓ Author
✓ SEO title
✓ SEO description
✓ Canonical URL

1,460 words
7 min read

Ready for review
```

This is a product feature, not an AI feature.

---

# 19. Article Revisions

Every important article change creates an immutable revision.

```text
Revision 1
Revision 2
Revision 3
Revision 4
```

Revision history should show:

- version.
- author.
- timestamp.
- change summary.
- status at that time.

### Restore rule

Restoring an old revision must create a **new revision**.

```text
1 → 2 → 3 → 4
          |
          +---- restore 2
                 |
                 v
                5
```

Do not delete the historical chain.

---

# 20. Optimistic Concurrency

If two people edit the same article:

```text
Author A opens version 7
Editor B saves version 8

Author A submits expectedVersion=7
        |
        v
Server sees currentVersion=8
        |
        v
409 Conflict
```

The UI should explain that another user changed the article and allow the author to refresh/reconcile.

Do not silently overwrite another person's work.

---

# 21. Social Interactions

The product should support basic publishing-community interactions.

### Required interactions

- Like/reaction.
- Comment/response.
- Share.
- Repost.
- Bookmark/save.
- Follow.
- Unfollow.
- Mention users.
- Notifications.
- Report content/user/comment.
- Block user.
- Mute user where appropriate.

Article engagement can be shown quietly:

```text
1.2K views
245 likes
38 comments
19 reposts
84 saves
```

Do not make the reading page look like a social-media feed.

---

# 22. Repost

A repost should preserve attribution.

```text
Reposted by Adarsh

Original:
"How Passkeys Work"
by Rahul
```

The original author and original article remain clearly identifiable.

Do not duplicate the article as a new independent article.

---

# 23. Comments and Responses

Users with the appropriate capability can comment.

Features:

- Create.
- Edit own comment where permitted.
- Delete own comment.
- Moderator hide/delete.
- Replies if included.
- Mentions.
- Report.
- Moderation status.

All comment content is untrusted input.

Server-side sanitization and authorization are mandatory.

---

# 24. Notifications

Notifications are required once follows, likes, comments, reposts, mentions, and editorial workflow exist.

Examples:

```text
Rahul followed you
Priya liked your article
Adarsh commented on your article
You were mentioned in a comment
Your article was approved
Your article was rejected
Your article was published
Your scheduled article is now live
```

Suggested groups:

```text
All
Mentions
Social
Editorial
System
```

Notifications should never expose sensitive admin/security information to normal users.

---

# 25. Library

User library should be richer than a single bookmarks page.

```text
MY LIBRARY

Saved Articles
My Lists
Highlights
Reading History
Responses
```

### Personal lists

A user can create lists such as:

```text
Security Research
Learn React
Startup Ideas
Weekend Reading
```

Lists can be private or public if the product chooses to support public lists.

---

# 26. Reading History

Store the user's reading activity in a privacy-conscious way.

Example:

```text
Continue reading

Secure API Design
67% complete
```

The system should avoid exposing reading history to other users unless the user explicitly makes activity public.

---

# 27. Highlights

A user can highlight an article passage and access saved highlights from the library.

Potential structure:

```text
HIGHLIGHTS

"Important sentence from article..."

Article:
Secure API Design

Author:
Rahul

Saved:
12 Aug 2026
```

The system must enforce access controls on private highlights.

---

# 28. Collections / Series

Authors or editors can group related articles into a series.

Example:

```text
SERIES: Learn Web Security

1. Authentication
2. Session Security
3. OWASP
4. Secure APIs
5. Threat Modeling
```

Readers can follow the series and continue where they stopped.

This is a strong content-organization feature that does not require AI.

---

# 29. Author Analytics

Authors should eventually have a statistics area.

Example:

```text
ARTICLE ANALYTICS

Views                 12,480
Unique readers         9,840
Average read time       5m 42s
Bookmarks                 384
Comments                   52
Shares                    127
Reposts                    19
```

Author-level statistics can show:

- Total views.
- Published articles.
- Most-read article.
- Most-saved article.
- Most-discussed article.
- Top topics.
- Engagement over time.

Only show data the logged-in user is authorized to view.

---

# 30. Editorial Review Queue

This is one of our primary differentiators.

```text
EDITORIAL REVIEW

Pending: 14
Approved today: 8
Rejected today: 3

Article                  Author       Status
------------------------------------------------
Future of Web            Arun         Review
Cloud Security           Priya        Review
React Architecture       Rahul        Review
```

Opening an article:

```text
Current revision
Previous revision
Author
SEO completeness
Word count
Reading time
Review notes

[Approve]
[Reject]
[Schedule]
```

---

# 31. Editorial Workflow

The workflow remains server-enforced:

```text
DRAFT
  |
  v
PENDING_REVIEW
  |
  +---------> REJECTED --------+
  |                            |
  |                            v
  |                          DRAFT
  |
  v
APPROVED
  |
  +---------> PUBLISHED
  |
  +---------> SCHEDULED
                     |
                     v
                  PUBLISHED
                     |
                     v
                  ARCHIVED
```

Rules:

- Authors cannot publish directly.
- Editors/Admins with the required capability can approve/reject/publish/schedule.
- Rejection requires review feedback.
- Scheduled publishing is system-controlled.
- Archived content is read-only unless restored.
- Every transition is audited.

---

# 32. Admin Dashboard

Admin and editorial dashboards should be operational rather than decorative.

Example:

```text
ADMIN DASHBOARD

Users             12,450
Published          8,920
Pending Review        32
Scheduled             18
Comments           4,284

Active Database
PostgreSQL

MongoDB
Healthy
```

Admin UI may use:

- tables.
- filters.
- tabs.
- status badges.
- compact metrics.
- side navigation.

But it must not become a generic AI SaaS dashboard.

---

# 33. Admin User Management

Features:

- Search users.
- Filter by role.
- Filter by active/deactivated.
- View profile.
- Assign permitted roles.
- Deactivate user.
- Reactivate where permitted.
- Soft delete where authorized.
- View user activity where permitted.

Never allow a normal frontend role field to control authorization.

---

# 34. Admin Content Management

Admin/editor can manage:

- Articles.
- Pages.
- Categories.
- Tags.
- Media.
- Comments.
- Review queue.
- Publishing states.

All actions require backend authorization.

---

# 35. Categories and Tags

Categories:

- name.
- slug.
- description.
- image/icon if needed.
- SEO title.
- SEO description.
- status.
- article count.
- followers if topic-following is supported.

Tags:

- name.
- slug.
- usage count.
- follower count where relevant.

Deletion requires dependency checks.

---

# 36. Media Library

Media library should allow:

```text
Search
Filter
Upload
Preview
Select
Reuse
Delete
```

Suggested display:

```text
MEDIA LIBRARY

[Search] [Type] [Date] [Uploader]

+---------+ +---------+ +---------+
| image   | | image   | | image   |
| preview | | preview | | preview |
| 1.4 MB  | | 2.1 MB  | | 850 KB  |
+---------+ +---------+ +---------+
```

Security:

```text
Upload
  ↓
Authentication
  ↓
Permission
  ↓
Size validation
  ↓
MIME validation
  ↓
File signature validation
  ↓
Image parser/decoder validation
  ↓
Safe storage
  ↓
Database metadata
```

Do not trust filenames or browser-supplied MIME types.

Do not allow executable web content to be uploaded as ordinary media.

---

# 37. Comments Moderation

Admin/editor moderation:

```text
Comment
   |
   +--> Visible
   +--> Hidden
   +--> Removed
   +--> Reported
```

Moderators should be able to:

- search comments.
- filter reports.
- hide/remove.
- inspect article context.
- view author.
- record moderation action.

---

# 38. Followers / Following

### Followers page

```text
FOLLOWERS

Avatar   Name       Followed on
--------------------------------
...
```

### Following page

```text
FOLLOWING

Writers | Topics | Publications

Rahul
AI
Cybersecurity
...
```

The system should maintain follower/following relationships safely and prevent duplicate relationships.

---

# 39. Publications / Organizations

This is a future/expansion feature worth designing for.

```text
PUBLICATION
|
+-- Editors
+-- Authors
+-- Sections
+-- Articles
+-- Settings
+-- Editorial workflow
```

Potential examples:

- University publication.
- Company engineering publication.
- Technical magazine.
- Research publication.
- Community publication.

This lets the platform grow beyond individual authors.

---

# 40. Reader Discovery

The homepage should eventually support:

```text
For You
Following
Latest
Trending
Editor's Picks
Recommended
Topic sections
```

The recommendation system should begin with transparent deterministic signals:

```text
Followed topic
+
Followed author
+
Selected interests
+
Recent activity
+
Trending
```

Do not claim advanced AI recommendations until such a system actually exists.

---

# 41. Contextual Onboarding / Help

We can use small contextual hints like the observed Medium-style help popups.

Examples:

```text
"Follow a topic to personalize your homepage."

"Save an article to read it later."

"Create a list to organize saved stories."

"Submit your draft when it is ready for editorial review."
```

Rules:

- Contextual.
- Rare.
- Dismissible.
- Never blocking normal use.
- Do not show the same hint repeatedly after dismissal.

---

# 42. Privacy & Social Controls

Because social features are being introduced, plan for:

- Profile visibility.
- Who can follow.
- Who can comment.
- Who can mention.
- Activity visibility.
- Reading-history visibility.
- Highlight privacy.
- List privacy.
- Block/mute controls.

Private information must never be exposed by guessing IDs or changing API parameters.

---

# 43. Security Architecture Must Remain Intact

Every new frontend feature must follow:

```text
Browser
  |
  | UNTRUSTED
  v
HTTP Request
  |
  v
Authentication
  |
  v
Permission
  |
  v
Ownership
  |
  v
Input Validation
  |
  v
Business Rules
  |
  v
Repository
  |
  v
Database
```

Frontend checks are only UX.

Example:

Hiding:

```text
[Publish]
```

does NOT prevent an author from calling:

```text
POST /api/articles/:id/publish
```

The backend must still reject the request.

---

# 44. Security Rules for Social Features

### Follow

Backend must verify:

- authenticated user.
- target user/topic exists.
- user is allowed to follow target.
- duplicate follow is handled safely.

### Like

Backend must enforce:

- one valid reaction per user/article where applicable.
- authorization.
- idempotent behavior.

### Comment

Backend must enforce:

- authenticated user.
- input validation.
- sanitization.
- rate limits.
- moderation rules.

### Repost

Backend must enforce:

- authenticated user.
- original content exists and is public.
- repost is allowed.
- original author attribution is preserved.

### Share

Do not treat browser sharing UI as a permission bypass. Private/unpublished content must not produce a publicly accessible shareable representation.

---

# 45. Security Rules for Personalized Feed

The feed must never expose:

- Draft articles.
- Pending review content.
- Private user information.
- Private lists.
- Private reading history.
- Private highlights.

The feed query must enforce publication status on the server.

```text
User requests feed
      |
      v
Backend identifies user
      |
      v
Load allowed preferences
      |
      v
Query only published/authorized content
      |
      v
Return feed
```

---

# 46. Security Rules for Admin Dashboard

Admin UI is only a presentation layer.

Every admin endpoint must independently enforce capability tokens.

Examples:

```text
user.read.any
user.update.any
article.approve
article.publish
category.manage
media.delete.any
audit.read
database.switch
```

The permission matrix remains the authority.

---

# 47. Security Rules for Auth UI

Login/register/reset forms must use:

- React Hook Form.
- Zod validation.
- Secure API calls through Axios.
- HttpOnly authentication cookies.
- Generic authentication failure messages.
- Rate-limit handling.

Never:

- Store JWTs in localStorage.
- Display password hashes.
- Expose backend exceptions.
- Treat client-side role information as trusted.

---

# 48. Axios Interceptor Strategy

Once frontend auth is implemented:

```text
API request
    |
    v
Axios
    |
    v
NestJS
    |
    +---- 200 → return data
    |
    +---- 401 → attempt refresh
                     |
                     v
                refresh API
                     |
              +------+------+
              |             |
             OK            Fail
              |             |
              v             v
        retry request    logout/session clear
```

Refresh behavior must never expose refresh tokens to JavaScript.

---

# 49. Route Protection

Frontend route guards are for UX only.

Examples:

```text
/public              → public
/login               → public
/register            → public

/dashboard           → authenticated
/articles/create     → authenticated + capability

/admin               → authenticated + admin capability
/admin/users         → user.read.any
/admin/reviews       → article.approve/reject
/admin/database      → database.switch
```

The backend must repeat the authorization checks.

---

# 50. Loading / Empty / Error States

Every important page needs explicit states.

### Loading

```text
Loading articles...
```

### Empty

```text
No drafts yet.
Start writing your first article.
```

### Error

```text
We couldn't load this content.
Reference: ERR-20260812-AB12
```

Do not display raw backend errors.

---

# 51. Pagination

All list pages should use server-side pagination:

- Articles.
- Search.
- Users.
- Comments.
- Audit logs.
- Followers.
- Following.
- Notifications.
- Media.
- Reading history.

Example:

```text
Page 2 of 34

[Previous] 1 2 3 ... 34 [Next]
```

---

# 52. Responsive Behavior

The experience must work on:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Do not merely shrink desktop layouts.

Examples:

### Desktop

```text
Sidebar | Content | Secondary column
```

### Mobile

```text
Header
Content
Bottom/compact navigation
```

Admin tables may become:

```text
Table → stacked cards / horizontally scrollable table
```

depending on the information.

---

# 53. UI Design Rules

Continue using the locked editorial design system:

- Newsreader for editorial headings.
- Plus Jakarta Sans for body/UI.
- JetBrains Mono selectively for metadata.
- Warm paper/neutral palette.
- Strong typography.
- Editorial borders.
- Purposeful imagery.
- Controlled shadows.
- Asymmetrical editorial layouts.

Avoid:

- Purple AI gradients.
- Glassmorphism.
- Excessive rounded cards.
- Neon.
- Giant decorative blobs.
- Excessive animations.
- Repetitive card grids.
- Generic shadcn dashboard appearance.

The UI priority remains:

```text
CONTENT
READABILITY
NAVIGATION
HIERARCHY
USABILITY
```

---

# 54. Public vs User vs Admin Design Language

Do NOT make all three look identical.

```text
PUBLIC
Editorial
Visual
Readable
Image + typography focused

USER
Focused
Content workspace
Writing/status oriented

ADMIN
Dense
Operational
Tables/filters
Governance oriented
```

All three share the same design tokens and brand identity.

---

# 55. Proposed Frontend Route Map

## Public

```text
/
 /articles/:slug
 /category/:slug
 /tags/:slug
 /search
 /author/:username
 /topic/:slug
 /series/:slug
 /publication/:slug
```

## Authentication

```text
/login
/register
/forgot-password
/reset-password
```

## User

```text
/dashboard
/profile
/stories
/stories/create
/stories/:id/edit
/stories/drafts
/stories/submitted
/stories/scheduled
/stories/published
/library
/library/lists
/library/highlights
/library/history
/following
/followers
/notifications
/stats
/settings
```

## Admin

```text
/admin
/admin/users
/admin/roles
/admin/articles
/admin/review
/admin/categories
/admin/tags
/admin/media
/admin/comments
/admin/audit
/admin/database
/admin/settings
```

These routes are a proposed product expansion. They should be reconciled with the existing route structure before implementation rather than copied blindly.

---

# 56. Suggested Navigation

## Public header

```text
Logo
Search
Topics
Latest
Trending
Write
Sign in / Profile
```

Depending on authentication state.

## User navigation

```text
Home
Following
Library
Stories
Profile
Notifications
Stats
Settings
```

## Admin navigation

```text
Overview
Content
Review Queue
Users
Categories
Tags
Media
Comments
Audit
Database
Settings
```

---

# 57. Feature Priority

Not every discussed feature must be built simultaneously.

## P0 — Core frontend completion

- Public homepage.
- Article reader.
- Categories.
- Tags.
- Search.
- Login.
- Register.
- Forgot/reset.
- Auth state.
- User dashboard.
- User profile.
- Story management.
- Admin dashboard.
- Users.
- Review queue.
- Categories/tags.
- Media.
- Audit.
- Database switcher.
- Pagination.
- Route guards.

## P1 — Reader/community layer

- Topic onboarding.
- Follow authors.
- Follow topics.
- Followers/following pages.
- Personalized feed.
- Likes.
- Comments.
- Reposts.
- Shares.
- Notifications.
- Library.
- Lists.
- Reading history.
- Highlights.

## P2 — Differentiation

- Content analytics.
- Series/collections.
- Publication/organization model.
- Publishing readiness.
- Advanced content relationships.
- Editorial recommendations.

## P3 — Future

- Newsletter system.
- Paid content.
- Memberships.
- Monetization.
- Advanced recommendation engine.
- Advanced publication analytics.

---

# 58. Key Differentiators

The product should not be sold as "another Medium."

Our strongest differentiators are:

### Editorial governance

```text
Author
  ↓
Review
  ↓
Approve
  ↓
Schedule/Publish
```

### Immutable revision history

```text
Revision 1 → 2 → 3 → 4
```

### Secure-by-architecture CMS

OWASP-based controls across the backend.

### Granular permissions

Capability-based RBAC + ownership.

### Database flexibility

```text
PostgreSQL ↔ MongoDB
```

with independent datasets.

### Secure media

Validation, signature checks, safe storage.

### Professional editorial experience

A publication-style interface rather than a generic AI SaaS dashboard.

---

# 59. Product Positioning

A good customer-facing description:

> **A secure editorial publishing platform that combines a clean reader and writer experience with professional editorial workflow, content governance, revision history, audience engagement, analytics, and administrative control.**

The product supports:

```text
Readers
    ↓
Discover → Follow → Read → Save → Highlight → Comment → Share

Authors
    ↓
Write → Draft → Improve → Submit → Track → Publish → Analyze

Editors
    ↓
Review → Feedback → Approve → Schedule → Publish → Archive

Administrators
    ↓
Users → Permissions → Content → Media → Audit → Database → Security
```

---

# 60. Final Frontend Product Model

```text
                              PLATFORM
                                 |
        +------------------------+------------------------+
        |                        |                        |
        v                        v                        v
      READER                   AUTHOR                EDITOR/ADMIN
        |                        |                        |
  Topic onboarding         Writing studio          Review queue
  Personalized feed       Drafts                  Approval
  Following               Autosave                Rejection
  Discover                Revisions               Scheduling
  Reading                Media                    Publishing
  Library                SEO                      Moderation
  Lists                  Analytics                Audit
  Highlights             Profile                  RBAC
  History                Notifications             DB control
  Comments               Status                    System
  Likes/Reposts
        |                        |                        |
        +------------------------+------------------------+
                                 |
                                 v
                         NESTJS REST API
                                 |
                    +------------+-------------+
                    |                          |
                    v                          v
              Security Layer             CMS Services
                    |                          |
       Auth → CSRF → RBAC →             Articles
       Ownership → Validation           Workflow
       Business Rules                   Revisions
       Audit                            Media
                                        Notifications
                                        Social
                                        Search
                                        Analytics
                    |                          |
                    +------------+-------------+
                                 |
                        Repository Interfaces
                           /             \
                          /               \
                         v                 v
                   PostgreSQL           MongoDB
```

---

# 61. Non-Negotiable Security Rule

Every feature added after Phase 4 must be reviewed through the same question:

> **Can an attacker bypass the frontend and make the backend perform an action they are not authorized to perform?**

For every new feature, define:

1. Who can access it?
2. What resource can they access?
3. What ownership rule applies?
4. What input is accepted?
5. What workflow rules apply?
6. What audit event is created?
7. What private information must remain hidden?
8. What happens on failure?

If these are not defined, the feature is not ready for implementation.

---

# 62. Important Scope Boundary

The new Medium-inspired reader/community features are **product additions discussed after the original specification**.

They should not silently replace the existing CMS requirements.

The existing foundation remains:

```text
Security
+
CMS
+
Editorial workflow
+
PostgreSQL
+
MongoDB
+
Repository abstraction
+
Admin
+
User system
```

The new product experience sits on top:

```text
Reader discovery
+
Personalization
+
Social interaction
+
Library
+
Analytics
+
Collections
+
Notifications
```

This preserves the original architecture while making the product much more complete.
