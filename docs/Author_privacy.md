# Author Byline Visibility Toggle (Show/Hide Author Name by Admin)

Allow administrators and editors to configure whether an article displays the specific author's name or publishes under "Editorial Staff" / Anonymous Newsroom Byline.

## Proposed Changes

### Database & Domain Models

#### [MODIFY] [article.model.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/domain/article.model.ts)
- Add `showAuthorName?: boolean` to `Article`, `CreateArticleDto`, and `UpdateArticleDto`.

#### [MODIFY] [postgres-article.repository.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/postgres/postgres-article.repository.ts)
- Add `ALTER TABLE articles ADD COLUMN IF NOT EXISTS show_author_name boolean NOT NULL DEFAULT true;` to DDL schema migration.
- Map `show_author_name` in `toDomain`, `create`, and `update` queries.
- When `show_author_name` is false, resolve `authorName` as `"Editorial Staff"` for public readers.

---

### Frontend Client

#### [MODIFY] [types/article.types.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/types/article.types.ts)
- Add `showAuthorName?: boolean` to `Article` and update DTOs.

#### [MODIFY] [ArticleEditorPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx)
- Add **Author Byline Visibility** control in the metadata & publishing sidebar:
  - Toggle: "Display Author Byline" (Show Author Name vs. Publish as Editorial Staff).
  - Explanatory note: "When turned off, the public byline displays 'Editorial Staff' to protect author anonymity or publish institutional editorials."
  - Highlighted for Admin / Super Admin roles.

#### [MODIFY] [ArticleReaderPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleReaderPage.tsx)
- Check `article.showAuthorName !== false`:
  - If true: Displays `"Written by [Author Name]"` and author profile card.
  - If false: Displays `"Written by Editorial Staff"` with the Gazette Newsroom signature.

---

## Verification Plan

### Automated & Manual Verification
1. Run `npm run build -w server` and `npm run build -w client` to ensure zero compilation errors.
2. Toggle "Display Author Byline" OFF for a story (e.g. *Story of Pie*) in `/write/:id` as Admin.
3. Save changes and verify on `/articles/story-of-pie` that it shows *"Written by Editorial Staff"*.
4. Toggle "Display Author Byline" ON and verify it returns to *"Written by Roshan"*.
