# Gazette PDF Ingestion Golden Test Corpus

This directory contains representative golden test fixtures to validate the **Gazette Universal Document Ingestion Subsystem** across all real-world publisher edge cases.

## Test Fixture Matrix

| Fixture Category | Filename | Key Invariant & Edge Case | Expected Gazette Outcome |
| :--- | :--- | :--- | :--- |
| **PowerPoint Export** | `ppt-export.pdf` | Multiple text boxes, slide titles, shapes, charts, bullet lists | 100% Content Recovered, Slides normalized into Gazette H2/Paragraphs |
| **Word Document Export** | `word-export.pdf` | Headings (H1/H2/H3), drop-caps, wrapped line endings, styled tables | Drop-caps preserved, zero mid-sentence dropped words |
| **Multi-Column Layout** | `two-column.pdf` | 2-column and 3-column newspaper and academic reading order | `A1 → A2 → A3 → B1 → B2 → B3` (Not interleaved `A1 B1 A2 B2`) |
| **Scanned Document** | `scanned.pdf` | No embedded text layer (Pure raster bitmap pages) | Detected as Scanned (`isScanned: true`), OCR notice, 0 silent loss |
| **Mixed Content** | `mixed-content.pdf` | Alternating normal vector pages and scanned image pages | Page-by-page hybrid extraction (Text extraction + Selective OCR) |
| **Scientific Equations** | `equations.pdf` | LaTeX math formulas, inline symbols, complex fractions | MathML or high-res Figure block fallback with `requiresReview: true` |
| **Data Matrices & Tables**| `tables.pdf` | Multi-page tables, merged header cells, financial figures | Normalized `<table class="cms-editorial-table">` |
| **Image-Heavy & Duplicates**| `images.pdf` | 30+ figures with identical sponsor logos appearing repeatedly | SHA-256 deduplication: identical assets stored once |
| **Corrupted PDF** | `corrupt.pdf` | Truncated byte stream, missing EOF marker | Partial recovery of readable pages + clear `WARNING` telemetry |
| **Resource Exhaustion** | `huge.pdf` | >150 pages or oversized dimensions | Bounded page limiter (150 pages max) + 25MB file gate |
| **Multilingual & Unicode**| `multilingual.pdf` | Hindi, Arabic, Tamil, Japanese, Emoji, complex ligatures | UTF-8 encoded text with zero missing character glyphs |
| **Password Protected** | `encrypted.pdf` | PDF Encryption dictionary (AES-128/256) | Security gate flags password requirement without hanging |
