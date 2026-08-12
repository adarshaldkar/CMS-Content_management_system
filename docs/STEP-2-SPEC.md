# STEP 2 — Authentication, Onboarding & User Workspace Specification

> **Phase 5 Master Blueprint — Step 2 Execution Plan**  
> **Source of Truth:** `docs/ARCHITECTURE.md` · `docs/DESIGN-SYSTEM.md` · `docs/P0.md` · `PHASE-5-FRONTEND-PRODUCT-EXPERIENCE.md`

---

## 1. Objective & Scope

**Step 2** builds the complete end-to-end **Identity, Onboarding, and Author Content Workspace** for the CMS platform. It bridges secure HttpOnly cookie authentication, personalized topic onboarding, story lifecycle management, and profile governance.

### What is delivered in Step 2:
1. **Authentication Suite (`/login`, `/register`, `/forgot-password`, `/reset-password`)**:
   - Zod validation, rate-limit 429 countdowns, password strength meter using registration policy, HttpOnly cookie sessions, and generic error messaging.
   - **"Remember this device" Security Policy**: Extends refresh session cookie lifetime to 30 days (default standard session is 7 days).
2. **Personalized Topic Onboarding (`/onboarding`)**:
   - Multi-select topic picker (Technology, AI, Cybersecurity, Design, Science, Architecture) seeding user feed preferences.
3. **Author Dashboard (`/dashboard`)**:
   - KPI metrics (Drafts, In Review, Published, Reads), quick "Write New Story" trigger, and recent activity feed.
4. **Stories Lifecycle Manager (`/stories`)**:
   - Multi-tab lifecycle filter (`All`, `Drafts`, `In Review`, `Approved`, `Published`, `Scheduled`, `Changes Requested` [internal `rejected`], `Archived`).
   - Detailed story rows with cover previews, word counts, reading time, revision badges (`v4`), and contextual actions.
5. **Profile & Account Security (`/profile`, `/settings`, `/library`)**:
   - Profile updating (Name, Bio, Avatar), password change form with server-side Argon2id verification, session management ("Log out all devices"), and saved bookmarks library.
6. **Backend Enhancements & Seamless JIT Continuity for Step 2 Entities**:
   - Profile updates (`PATCH /api/auth/me`), password changes (`PATCH /api/auth/change-password`), author article filtering (`GET /api/articles?authorId=...`).
   - **Cross-Database Continuity**: On-demand JIT pull-on-miss explicitly covers user identity, topic preferences, profile metadata (bio, avatar), bookmarks, and saved library items upon active DB switch.
7. **Automated Verification Test**:
   - Comprehensive test script `test/step2-workspace-test.mjs` validating all Step 2 workflows end-to-end.

---

## 2. Screen & Component Architecture

```text
                                  STEP 2 WORKSPACE MAP
                                           │
     ┌─────────────────────────────┬───────┴─────────────────────────────┬─────────────────────────────┐
     ▼                             ▼                                     ▼                             ▼
1. AUTH SUITE                 2. TOPIC ONBOARDING                   3. AUTHOR DASHBOARD           4. STORIES LIFECYCLE
   • /login                      • /onboarding                         • /dashboard                  • /stories
   • /register                     - Topic Grid                          - Author Welcome Card         - Status Tabs
   • /forgot-password              - Multi-Select Pills                  - 4 Metric KPI Cards          - Story Data Rows
   • /reset-password               - Preference Sync                     - Recent Drafts List          - Actions Menu
                                                                                                  5. PROFILE & SECURITY
                                                                                                     • /profile
                                                                                                     • /settings
                                                                                                     • /library
```

---

## 3. Detailed Specifications per Screen

### A. Authentication Suite

#### 1. Login Screen (`/login` — `LoginPage.tsx`)
* **Layout**: Centered editorial card with subtle border and `The Gazette` brand masthead.
* **Fields**:
  - Email (with auto-focus and RFC 5322 validation).
  - Password (toggle visibility icon).
  - "Remember this device" checkbox (extends refresh token session lifetime to 30 days).
  - "Forgot password?" link $\to$ `/forgot-password`.
* **Security & UX**:
  - Real-time Zod schema validation.
  - Generic error toast on failure: *"Invalid email or password."* (prevents user enumeration).
  - Handles `HTTP 429 Too Many Requests` with a live visual countdown timer disabling the submit button until the window resets.
  - Redirects to intended protected route (`location.state.from`) or default `/dashboard`.

#### 2. Registration Screen (`/register` — `RegisterPage.tsx`)
* **Fields**:
  - Full Name (min 2 characters).
  - Email address.
  - Password + Confirm Password.
  - Terms of Service acceptance checkbox.
* **Security & UX**:
  - **Dynamic Password Strength Meter (Registration Policy)**:
    - Minimum 10 characters.
    - At least 1 uppercase, 1 lowercase, 1 digit, 1 special character.
    - Color-coded progress bar (Weak = Red, Moderate = Amber, Strong = Emerald).
  - On successful registration $\to$ automatically logs in via HttpOnly cookie and redirects to `/onboarding`.

#### 3. Forgot Password Screen (`/forgot-password` — `ForgotPasswordPage.tsx`)
* **Fields**: Email input.
* **Security**: Always returns generic success message: *"If an account is associated with this email, a reset link has been dispatched."* (Strict anti-enumeration standard).

#### 4. Reset Password Screen (`/reset-password` — `ResetPasswordPage.tsx`)
* **Fields**: Token (extracted from `?token=...`), New Password, Confirm Password.
* **Feedback**: On success, redirects to `/login` with a green notification banner.

---

### B. Topic Selection Onboarding (`/onboarding` — `OnboardingPage.tsx`)

```text
+-------------------------------------------------------------+
|                     WELCOME TO THE GAZETTE                  |
|     Select at least 3 topics to personalize your reading    |
|                                                             |
|   [ + Technology ]   [ + Artificial Intelligence ]          |
|   [ + Cybersecurity] [ + Editorial Design ]                 |
|   [ + Architecture ] [ + Media & Society ]                  |
|   [ + Science ]      [ + Policy & Governance ]              |
|                                                             |
|   Selected: 3/3 minimum                                     |
|                                     [ Continue to Stories ] |
+-------------------------------------------------------------+
```

* **Interactive Pills**: Toggle selection with animated border and checkmark.
* **State**: Persists user preferences and routes to `/dashboard` or `/feed`.

---

### C. Author Dashboard (`/dashboard` — `UserDashboardPage.tsx`)

#### 1. Welcome Banner
* Personalized greeting (`"Welcome back, Adarsh"`).
* Current role badge (`Author` / `Editor`).
* Quick action button: `"Write New Story"` $\to$ routes to `/editor`.

#### 2. KPI Metric Cards
1. **Total Stories**: Count of all drafts, pending, and published stories.
2. **Published**: Total live articles accessible by readers.
3. **In Review**: Stories awaiting editorial approval.
4. **Drafts**: Works in progress.

#### 3. Recent Drafts Quick Access
* List of the last 3 modified stories with relative timestamp (`"Updated 12m ago"`), word count, and `"Resume Editing"` trigger.

---

### D. Stories Lifecycle Manager (`/stories` — `StoriesManagerPage.tsx`)

#### 1. Filter Tabs & Status Consistency
* `All` | `Drafts` | `In Review` (`pending_review`) | `Approved` (`approved`) | `Published` (`published`) | `Scheduled` (`scheduled`) | `Changes Requested` (`rejected`) | `Archived` (`archived`).
* Active tab displays badge count (e.g. `In Review (2)`).

#### 2. Responsive Story Rows / Cards
Each story item renders:
* **Cover Thumbnail**: Image preview with fallback editorial pattern.
* **Title & Excerpt**: Truncated with ellipsis.
* **Category Pill & Tags**: Taxonomy links.
* **State Machine Status Badge**:
  - `Draft` $\to$ Slate
  - `In Review` $\to$ Amber
  - `Approved` $\to$ Emerald
  - `Published` $\to$ Blue
  - `Scheduled` $\to$ Purple
  - `Changes Requested` $\to$ Rose
* **Editorial Metrics**: Word count, reading time in minutes (`JetBrains Mono`).
* **Revision Counter**: `v1`, `v2`, `v3` tag.
* **Action Menu**:
  - `Edit in Studio` $\to$ `/editor/:id`
  - `Submit for Review` $\to$ Transitions state from `DRAFT` $\to$ `PENDING_REVIEW`
  - `View History` $\to$ Opens revision history drawer
  - `Delete Draft` $\to$ Soft deletes draft

---

### E. User Profile & Account Settings (`/profile`, `/settings`, `/library`)

#### 1. User Profile (`/profile` — `UserProfilePage.tsx`)
* Edit Name, Bio, and Avatar Image URL.
* Read-only Email, Role, and Member Since date.
* Follower & Following count statistics.

#### 2. Account Security (`/settings` — `UserSettingsPage.tsx`)
* **Change Password**: Current password verification + new Argon2id password.
* **Session Manager**: Displays active session details and `"Sign Out of All Devices"` trigger (`POST /api/auth/logout-all`).

#### 3. Saved Library (`/library` — `UserLibraryPage.tsx`)
* Tabbed view for **Saved Bookmarks** and **Reading History**.
* Quick remove from bookmarks button.

---

## 4. Backend Endpoints Supporting Step 2

| Method | Endpoint | Description | Auth / Guard |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public + CSRF |
| `POST` | `/api/auth/login` | Authenticate & set HttpOnly cookies | Public + CSRF |
| `POST` | `/api/auth/refresh` | Rotate refresh token session | Public + Cookie |
| `POST` | `/api/auth/logout` | Invalidate current session | Public + Cookie |
| `POST` | `/api/auth/logout-all` | Invalidate all user sessions | Authenticated |
| `GET` | `/api/auth/me` | Fetch authenticated user & permissions | Authenticated |
| `PATCH` | `/api/auth/me` | Update profile (name, bio, avatar) | Authenticated |
| `PATCH` | `/api/auth/change-password` | Verify current & set new password (Argon2id) | Authenticated |
| `GET` | `/api/articles` | List articles (supports `authorId` & `status` filters) | Authenticated / Public |
| `POST` | `/api/articles` | Create new article draft | Authenticated (`article.create`) |
| `PATCH` | `/api/articles/:id` | Update article with optimistic locking | Authenticated (`article.update.own`) |
| `DELETE` | `/api/articles/:id` | Delete article draft | Authenticated (`article.delete.own`) |

---

## 5. Step 2 Verification & Definition of Done

* [ ] Full auth suite accessible and functioning with real HttpOnly cookies and CSRF headers.
* [ ] Rate-limit 429 countdown works visually when spamming login attempts.
* [ ] Registration password policy strength meter enforces secure passwords.
* [ ] Onboarding topic picker saves preferences and routes seamlessly.
* [ ] Author Dashboard displays real KPI metrics computed from user articles.
* [ ] Stories manager allows filtering across all 7 state machine statuses.
* [ ] Profile and Password change forms work with backend verification.
* [ ] Dual-Database JIT Continuity: Logging in after a database switch seamlessly pull-replicates user, profile, bookmarks, and preferences.
* [ ] `node test/step2-workspace-test.mjs` executes and passes 100%.
