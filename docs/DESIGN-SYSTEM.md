# THE GAZETTE — Editorial Visual & Surface Composition System

> **Master Rule:** Cards are used ONLY when content genuinely requires containment (e.g. lightbox preview, media asset tile). Lists, editorial sections, horizontal hairline rules (`──────`), typography, whitespace, and asymmetrical composition MUST be preferred for informational content, selection interfaces, and workspaces.

---

## 1. Surface Identity Architecture

The platform consists of **4 distinct visual surfaces**, each tailored to its exact purpose:

```text
                                PLATFORM SURFACES
                                        │
     ┌───────────────────┬──────────────┴──────────────┬───────────────────┐
     │                   │                             │                   │
     ▼                   ▼                             ▼                   ▼
1. PUBLIC WEBSITE   2. ONBOARDING                  3. USER DESK        4. ADMIN SUITE
• Asymmetric         • Left-aligned                • Publication desk  • Operational
• Headline-driven    • Typographic lists           • Typographic stats • Tabular & dense
• Image-lead hero    • Hairline rules              • Workspace streams • Compact metadata
• Hairline rules     • Zero icon boxes / cards     • Hairline dividers • High data density
```

---

## 2. Specific Page Surface Composition Rules

### Surface A: Onboarding (`/onboarding`)
- **Layout**: Left-aligned, un-centered editorial structure.
- **Typography**: Clean serif header (`WHAT WOULD YOU LIKE TO READ?`), uppercase section dividers (`ENGINEERING`, `DESIGN & CULTURE`, `DISCOVERY`).
- **Selection Control**: Clean typographic list items separated by 1px rules (`──────`). Selected topics use bold typography, subtle accent text, and a simple `✓` or `Selected` indicator — **no 2-column card boxes, no icon containers, no checkmark circles**.
- **Explanatory text**: Removed unnecessary sub-descriptions under every item. Let the typography and subject name communicate clearly.

### Surface B: User Dashboard & Desk (`/dashboard`, `/stories`)
- **Metrics**: Large typographic stats separated by horizontal rules and clean vertical dividers:
  ```text
  3                 2                 1                 0
  Published         In Review         Drafts            Scheduled
  ─────────────────────────────────────────────────────────────
  ```
- **Story Stream**: Clean typographic list items divided by horizontal rules (`divide-y divide-border-subtle`).
- **Microcopy**: Direct human phrasing (`"No active drafts."` → `[ Write a story ]`). No promotional AI marketing copy.

### Surface C: Public Editorial Homepage (`/`)
- **Layout**: Intentional editorial asymmetry (6-col hero lead story, 3-col secondary highlights, 3-col numbered trending `01`–`05`).
- **Headlines**: Authoritative display serif headlines (*Newsreader* / *Playfair*) with tight leading (`leading-[1.1]`).
- **Categories & Tags**: Clean uppercase typography (`TECHNOLOGY · 4 MIN READ`), no rounded pill bubble backgrounds.

### Surface D: Admin Panel (`/admin/*`)
- **Layout**: Dense, operational, and tabular.
- **Design**: Clean data tables, status pills, filter bars, and compact metrics designed for high-density workflow tasks.
