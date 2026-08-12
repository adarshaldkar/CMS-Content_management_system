import sanitizeHtml from 'sanitize-html';

export function sanitizeArticleContent(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  const clean = sanitizeHtml(rawHtml, {
    allowedTags: [
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
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
      img: ['http', 'https', 'data'],
    },
    allowProtocolRelative: false,
    enforceHtmlBoundary: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href || '').trim().toLowerCase();
        if (
          href.startsWith('javascript:') ||
          href.startsWith('vbscript:') ||
          href.startsWith('data:')
        ) {
          delete attribs.href;
        }
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        if (isExternal) {
          attribs.rel = attribs.rel
            ? `${attribs.rel} noopener noreferrer`.trim()
            : 'noopener noreferrer';
          attribs.target = attribs.target || '_blank';
        }
        return { tagName, attribs };
      },
    },
    parser: {
      lowerCaseAttributeNames: true,
    },
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
