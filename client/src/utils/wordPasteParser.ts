/**
 * Intelligent Word & Google Docs Clipboard HTML Sanitizer
 *
 * Strips Microsoft Office (MSO) proprietary tags, XML metadata,
 * Google Docs internal wrappers, and non-semantic formatting spans
 * while preserving rich structure (headings, tables, lists, links, bolds/italics).
 */

export function isWordOrDocsHtml(html: string): boolean {
  if (!html) return false;
  return (
    html.includes('urn:schemas-microsoft-com:office') ||
    html.includes('mso-') ||
    html.includes('class="Mso') ||
    html.includes('class=Mso') ||
    html.includes('docs-internal-guid') ||
    html.includes('id="docs-internal-guid') ||
    html.includes('data-teams=') ||
    html.includes('<!--[if gte mso')
  );
}

export function cleanWordHtml(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // 1. Remove XML declarations and conditional MSO comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<meta[\s\S]*?>/gi, '');
  cleaned = cleaned.replace(/<link[\s\S]*?>/gi, '');

  // 2. Remove Microsoft Office namespaced elements like <o:p>, <w:worddocument> etc.
  cleaned = cleaned.replace(/<\/?\w+:[^>]*>/gi, '');

  // 3. Remove inline mso- styling from elements
  cleaned = cleaned.replace(/style="[^"]*mso-[^"]*"/gi, '');
  cleaned = cleaned.replace(/style='[^']*mso-[^']*'/gi, '');

  // 4. Remove MsoNormal and other proprietary Office classes
  cleaned = cleaned.replace(/class="Mso[^"]*"/gi, '');
  cleaned = cleaned.replace(/class='Mso[^']*'/gi, '');
  cleaned = cleaned.replace(/class=Mso\w+/gi, '');

  // 5. Parse with DOMParser to perform semantic normalization
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/html');
      const body = doc.body;

      normalizeElement(body);

      cleaned = body.innerHTML;
    } catch (e) {
      console.warn('Word DOM parse cleanup fallback:', e);
    }
  }

  // 6. Final string cleanup: Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*(?:&nbsp;|<br\s*\/?>)?\s*<\/p>/gi, '<p><br></p>');
  cleaned = cleaned.replace(/(?:<p><br><\/p>){3,}/gi, '<p><br></p><p><br></p>');

  return cleaned.trim();
}

function normalizeElement(element: HTMLElement) {
  const children = Array.from(element.children) as HTMLElement[];

  for (const child of children) {
    normalizeElement(child);

    const tagName = child.tagName.toLowerCase();

    // Map Word Headings (e.g., H1 -> H2 to match Gazette hierarchy)
    if (tagName === 'h1') {
      const h2 = document.createElement('h2');
      h2.innerHTML = child.innerHTML;
      child.replaceWith(h2);
      continue;
    }

    // Strip unstyled spans that don't add semantic value
    if (tagName === 'span') {
      const hasMeaningfulStyle =
        child.style.fontWeight === 'bold' ||
        child.style.fontStyle === 'italic' ||
        child.style.textDecoration === 'underline' ||
        child.classList.contains('mention');

      if (!hasMeaningfulStyle && child.attributes.length === 0) {
        const frag = document.createDocumentFragment();
        while (child.firstChild) {
          frag.appendChild(child.firstChild);
        }
        child.replaceWith(frag);
        continue;
      }
    }

    // Convert <b> to <strong>, <i> to <em>
    if (tagName === 'b') {
      const strong = document.createElement('strong');
      strong.innerHTML = child.innerHTML;
      child.replaceWith(strong);
      continue;
    }
    if (tagName === 'i') {
      const em = document.createElement('em');
      em.innerHTML = child.innerHTML;
      child.replaceWith(em);
      continue;
    }

    // Clean font tags
    if (tagName === 'font') {
      const frag = document.createDocumentFragment();
      while (child.firstChild) {
        frag.appendChild(child.firstChild);
      }
      child.replaceWith(frag);
      continue;
    }

    // Clean table styling into Gazette styled table
    if (tagName === 'table') {
      child.classList.add('cms-table', 'w-full', 'border-collapse', 'my-6', 'text-sm');
      if (!child.getAttribute('data-theme')) {
        child.setAttribute('data-theme', 'classic');
      }
    }

    // Strip Microsoft inline margins/paddings if present in styles
    if (child.hasAttribute('style')) {
      const style = child.getAttribute('style') || '';
      const filteredStyle = style
        .split(';')
        .map((s) => s.trim())
        .filter(
          (s) =>
            !s.startsWith('font-family') &&
            !s.startsWith('line-height') &&
            !s.startsWith('mso-') &&
            !s.startsWith('margin') &&
            !s.startsWith('tab-stops') &&
            !s.startsWith('text-indent'),
        )
        .join('; ');

      if (filteredStyle) {
        child.setAttribute('style', filteredStyle);
      } else {
        child.removeAttribute('style');
      }
    }
  }
}
