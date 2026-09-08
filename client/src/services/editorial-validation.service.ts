/**
 * Gazette Editorial Studio — Native Editorial Validation Engine
 * 
 * Evaluates manuscripts against rigorous journalistic and technical standards:
 * - BLOCKING: Severe flaws that prevent publishing (e.g. missing headline, empty body, invalid slug)
 * - WARNING: Editorial issues requiring attention (e.g. missing deck, missing image alt text, heading hierarchy gaps)
 * - INFO: Helpful newsroom telemetry (reading time, SEO title truncation, citation presence)
 */

export interface ValidationItem {
  id: string;
  severity: 'BLOCKING' | 'WARNING' | 'INFO';
  category: 'metadata' | 'content' | 'accessibility' | 'seo' | 'editorial';
  title: string;
  description: string;
  remediation?: string;
  passed: boolean;
}

export interface EditorialAuditReport {
  isPublishable: boolean;
  score: number; // 0 to 100
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  items: ValidationItem[];
  metrics: {
    wordCount: number;
    readingTimeMinutes: number;
    headingsCount: number;
    imagesCount: number;
    missingAltImagesCount: number;
    citationsCount: number;
    hasDropCap: boolean;
    hasPullQuote: boolean;
  };
}

export class EditorialValidationEngine {
  /**
   * Evaluates an article manuscript against all Gazette editorial standards
   */
  static audit(article: {
    title?: string;
    description?: string;
    content?: string;
    slug?: string;
    categoryId?: string;
    coverImage?: string;
  }): EditorialAuditReport {
    const items: ValidationItem[] = [];

    const title = (article.title || '').trim();
    const description = (article.description || '').trim();
    const content = (article.content || '').trim();
    const slug = (article.slug || '').trim();
    const categoryId = (article.categoryId || '').trim();
    const coverImage = (article.coverImage || '').trim();

    // DOM Parser for content inspection
    const parser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;
    const doc = parser ? parser.parseFromString(content, 'text/html') : null;

    // Metrics computation
    const textContent = doc ? (doc.body.textContent || '').trim() : content.replace(/<[^>]*>/g, '').trim();
    const words = textContent.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 225));

    const headings = doc ? Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) : [];
    const images = doc ? Array.from(doc.querySelectorAll('img')) : [];
    const missingAltImages = images.filter((img) => !img.getAttribute('alt')?.trim());
    const citations = doc ? Array.from(doc.querySelectorAll('footer.cms-source-note, cite')) : [];
    const hasDropCap = content.includes('cms-drop-cap');
    const hasPullQuote = content.includes('cms-pull-quote') || content.includes('<blockquote');

    // 1. BLOCKING RULES
    // Rule: Title Presence
    items.push({
      id: 'rule-title-presence',
      severity: 'BLOCKING',
      category: 'metadata',
      title: 'Article Headline',
      description: 'A clear journalistic headline is required for publication.',
      remediation: 'Enter an informative, compelling headline in the title bar.',
      passed: title.length > 0,
    });

    // Rule: Content Substance
    items.push({
      id: 'rule-content-substance',
      severity: 'BLOCKING',
      category: 'content',
      title: 'Manuscript Body Substance',
      description: 'Manuscript must contain meaningful body text (>50 words).',
      remediation: 'Draft the core narrative and reporting in the editor canvas.',
      passed: wordCount >= 50,
    });

    // Rule: URL Slug Safety
    const slugValid = slug.length > 0 && /^[a-z0-9-]+$/.test(slug);
    items.push({
      id: 'rule-slug-validity',
      severity: 'BLOCKING',
      category: 'seo',
      title: 'Canonical URL Slug',
      description: 'URL slug must be lowercase alphanumeric with hyphens.',
      remediation: 'Provide a valid slug (e.g., economic-telemetry-stabilization).',
      passed: slugValid,
    });

    // Rule: Primary Desk / Category Assignment
    items.push({
      id: 'rule-category-assigned',
      severity: 'BLOCKING',
      category: 'editorial',
      title: 'Desk / Section Assignment',
      description: 'Article must be filed under an approved editorial section.',
      remediation: 'Select a primary category in the metadata panel.',
      passed: categoryId.length > 0,
    });

    // 2. WARNING RULES
    // Rule: Headline Length Optimization
    const titleLengthGood = title.length >= 20 && title.length <= 110;
    items.push({
      id: 'rule-title-length',
      severity: 'WARNING',
      category: 'seo',
      title: 'Headline Length Quality',
      description: 'Optimal journalistic headlines range between 20 and 110 characters.',
      remediation: `Current length: ${title.length} characters. Adjust for ideal editorial impact.`,
      passed: titleLengthGood,
    });

    // Rule: Deck / Excerpt
    items.push({
      id: 'rule-deck-presence',
      severity: 'WARNING',
      category: 'metadata',
      title: 'Editorial Deck / Subtitle',
      description: 'A 1–2 sentence summary enhances reader comprehension and SERP indexing.',
      remediation: 'Add an engaging summary in the article description field.',
      passed: description.length >= 30,
    });

    // Rule: Cover Visual
    items.push({
      id: 'rule-cover-visual',
      severity: 'WARNING',
      category: 'editorial',
      title: 'Cover Image / Hero Asset',
      description: 'Lead visual asset for the frontpage and social distribution cards.',
      remediation: 'Upload or select a high-resolution cover photo.',
      passed: coverImage.length > 0,
    });

    // Rule: Image Accessibility (Alt Text)
    items.push({
      id: 'rule-image-alt-tags',
      severity: 'WARNING',
      category: 'accessibility',
      title: 'Image Alt-Text Accessibility',
      description: 'All inline images must have descriptive alt attributes for accessibility.',
      remediation: missingAltImages.length > 0
        ? `${missingAltImages.length} image(s) missing alt text. Click to add descriptions.`
        : undefined,
      passed: missingAltImages.length === 0,
    });

    // Rule: Heading Hierarchy Check (H2 before H3)
    let headingHierarchyBroken = false;
    let prevLevel = 1;
    for (const h of headings) {
      const level = parseInt(h.tagName.replace('H', ''), 10);
      if (level > prevLevel + 1) {
        headingHierarchyBroken = true;
        break;
      }
      prevLevel = level;
    }
    items.push({
      id: 'rule-heading-hierarchy',
      severity: 'WARNING',
      category: 'content',
      title: 'Heading Hierarchy Sequence',
      description: 'Section headings should follow sequential ordering (H1 → H2 → H3) without skipping levels.',
      remediation: 'Adjust heading levels for structured document accessibility.',
      passed: !headingHierarchyBroken,
    });

    // 3. INFO RULES
    // Rule: Drop-Cap Styling
    items.push({
      id: 'rule-drop-cap',
      severity: 'INFO',
      category: 'editorial',
      title: 'Illuminated Drop-Cap',
      description: 'Opening paragraph drop-cap gives classic Gazette publication elegance.',
      remediation: 'Toggle Drop Cap via the ribbon for magazine-grade presentation.',
      passed: hasDropCap,
    });

    // Rule: Source Citations
    items.push({
      id: 'rule-sources-presence',
      severity: 'INFO',
      category: 'editorial',
      title: 'Sources & Document Evidence',
      description: 'Articles citing primary sources foster institutional reader trust.',
      remediation: 'Insert a Sources & References block or cite primary documents.',
      passed: citations.length > 0,
    });

    // Rule: Pull-Quote Callout
    items.push({
      id: 'rule-pull-quote',
      severity: 'INFO',
      category: 'editorial',
      title: 'Editorial Pull Quote',
      description: 'Pull-quotes highlight key thesis statements and break long text blocks.',
      remediation: 'Highlight a compelling statement and click "Pull Quote".',
      passed: hasPullQuote,
    });

    const blockingItems = items.filter((i) => i.severity === 'BLOCKING' && !i.passed);
    const warningItems = items.filter((i) => i.severity === 'WARNING' && !i.passed);
    const infoItems = items.filter((i) => i.severity === 'INFO' && !i.passed);

    // Score calculation
    const totalItems = items.length;
    const passedItems = items.filter((i) => i.passed).length;
    const score = Math.round((passedItems / totalItems) * 100);

    return {
      isPublishable: blockingItems.length === 0,
      score,
      blockingCount: blockingItems.length,
      warningCount: warningItems.length,
      infoCount: infoItems.length,
      items,
      metrics: {
        wordCount,
        readingTimeMinutes,
        headingsCount: headings.length,
        imagesCount: images.length,
        missingAltImagesCount: missingAltImages.length,
        citationsCount: citations.length,
        hasDropCap,
        hasPullQuote,
      },
    };
  }
}
