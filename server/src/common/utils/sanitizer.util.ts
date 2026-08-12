const ALLOWED_TAGS = new Set([
  'h2',
  'h3',
  'h4',
  'p',
  'blockquote',
  'pre',
  'code',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'strong',
  'em',
  's',
  'br',
  'hr',
  'figure',
  'figcaption',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

export function sanitizeArticleContent(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // 1. Remove dangerous blocks completely (scripts, iframes, objects, embeds, styles)
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Comments

  // 2. Parse and sanitize all HTML tags
  clean = clean.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag, attrString) => {
    const lowerTag = tag.toLowerCase();

    // If tag is not in allowlist, strip the tag entirely
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    // Closing tag
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    const allowedTagAttrs = ALLOWED_ATTRS[lowerTag] || new Set();
    const sanitizedAttrs: string[] = [];

    // Parse attributes: name="value" or name='value' or name=value
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    let hasHref = false;
    let isExternalLink = false;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Block all event handlers (onload, onerror, onclick, etc.)
      if (attrName.startsWith('on')) {
        continue;
      }

      // Check if attribute is allowed on this tag
      if (!allowedTagAttrs.has(attrName)) {
        continue;
      }

      // Validate URL attributes (href, src)
      if (attrName === 'href' || attrName === 'src') {
        const lowerVal = attrValue.trim().toLowerCase();
        // Strictly reject javascript: or vbscript: or data: in links
        if (
          lowerVal.startsWith('javascript:') ||
          lowerVal.startsWith('vbscript:') ||
          (attrName === 'href' && lowerVal.startsWith('data:'))
        ) {
          continue;
        }

        if (attrName === 'href') {
          hasHref = true;
          if (lowerVal.startsWith('http://') || lowerVal.startsWith('https://')) {
            isExternalLink = true;
          }
        }
      }

      sanitizedAttrs.push(`${attrName}="${attrValue.replace(/"/g, '&quot;')}"`);
    }

    // Auto-attach rel="noopener noreferrer" to external links
    if (lowerTag === 'a' && isExternalLink && !sanitizedAttrs.some((a) => a.startsWith('rel='))) {
      sanitizedAttrs.push('rel="noopener noreferrer"');
    }

    const selfClosing = match.endsWith('/>') ? ' />' : '>';
    return `<${lowerTag}${sanitizedAttrs.length > 0 ? ' ' + sanitizedAttrs.join(' ') : ''}${selfClosing}`;
  });

  return clean.trim();
}

export function calculateReadingMetrics(content: string): {
  wordCount: number;
  readingTimeMinutes: number;
} {
  if (!content) {
    return { wordCount: 0, readingTimeMinutes: 1 };
  }

  // Strip HTML tags to get pure text
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plainText) {
    return { wordCount: 0, readingTimeMinutes: 1 };
  }

  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return { wordCount, readingTimeMinutes };
}
