import sanitizeHtml from 'sanitize-html';

export function sanitizeArticleContent(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  const clean = sanitizeHtml(rawHtml, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'div',
      'span',
      'blockquote',
      'aside',
      'header',
      'footer',
      'section',
      'cite',
      'time',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'ins',
      'mark',
      'br',
      'hr',
      'figure',
      'figcaption',
      'iframe',
      'video',
      'source',
      'details',
      'summary',
      'caption',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'sup',
      'sub',
      'small',
      'kbd',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'align', 'id', 'dir', 'datetime', 'data-node', 'data-theme', 'data-date', 'data-style', 'data-title', 'data-author', 'data-category', 'data-variant', 'data-src', 'data-target'],
      a: ['href', 'target', 'rel', 'title', 'class', 'style'],
      time: ['datetime', 'class', 'style'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'style'],
      iframe: [
        'src',
        'title',
        'class',
        'style',
        'allow',
        'allowfullscreen',
        'loading',
        'frameborder',
        'width',
        'height',
      ],
      video: [
        'src',
        'poster',
        'controls',
        'autoplay',
        'muted',
        'loop',
        'class',
        'style',
        'width',
        'height',
      ],
      source: ['src', 'type'],
      details: ['class', 'style', 'open'],
      summary: ['class', 'style'],
      code: ['class', 'style'],
      pre: ['class', 'style'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'color': [/.*/],
        'background-color': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'text-decoration': [/.*/],
        'width': [/.*/],
        'max-width': [/.*/],
        'height': [/.*/],
        'margin': [/.*/],
        'margin-top': [/.*/],
        'margin-bottom': [/.*/],
        'margin-left': [/.*/],
        'margin-right': [/.*/],
        'padding': [/.*/],
        'position': [/.*/],
        'aspect-ratio': [/.*/],
        'border-radius': [/.*/],
        'overflow': [/.*/],
      },
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'youtube.com',
      'youtu.be',
      'www.youtube-nocookie.com',
      'player.vimeo.com',
      'vimeo.com',
      'open.spotify.com',
      'www.loom.com',
      'loom.com',
      'platform.twitter.com',
    ],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
      img: ['http', 'https', 'data'],
      iframe: ['http', 'https'],
      video: ['http', 'https', 'data', 'blob'],
      source: ['http', 'https'],
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
          attribs.rel = 'noopener noreferrer';
          attribs.target = '_blank';
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
