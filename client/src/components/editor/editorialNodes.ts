/**
 * Gazette Editorial Studio — Semantic Editorial Node Specifications & Templates
 * 
 * Formalizes semantic HTML structures for Word-grade editorial storytelling:
 * 1. pullQuote: High-impact editorial quotes with author attribution
 * 2. callout: Themed informational aside (info, tip, warning, editorial)
 * 3. correction: Formal journalistic rectification notices with timestamps
 * 4. sourceNote: Numbered references, data sources, and bibliographies
 * 5. divider: Stylized section separators (asterisms ⁂, ornaments, clean rules)
 * 6. dropCap: Elegant illuminated first-letter styling for opening paragraphs
 */

export type CalloutTheme = 'info' | 'tip' | 'warning' | 'editorial';
export type DividerStyle = 'asterism' | 'ornament' | 'line';

export const editorialNodes = {
  /**
   * Generates HTML for a Pull Quote with Attribution
   */
  createPullQuote(quote: string, author?: string, publication?: string): string {
    const cleanQuote = quote.trim() || 'A compelling statement that captures the core essence of the journalistic dispatch.';
    const cleanAuthor = author?.trim() || '';
    const cleanPub = publication?.trim() || '';
    
    let citeText = '';
    if (cleanAuthor && cleanPub) {
      citeText = `— ${cleanAuthor}, <em>${cleanPub}</em>`;
    } else if (cleanAuthor) {
      citeText = `— ${cleanAuthor}`;
    }

    return `<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>${cleanQuote}</p>
  ${citeText ? `<cite>${citeText}</cite>` : ''}
</blockquote>`;
  },

  /**
   * Generates HTML for a Themed Editorial Callout Box
   */
  createCallout(title: string, body: string, theme: CalloutTheme = 'info'): string {
    const cleanTitle = title.trim() || 'Editorial Brief';
    const cleanBody = body.trim() || 'Provide crucial background context, key takeaways, or analytical perspective here.';

    const themeLabels: Record<CalloutTheme, { icon: string; defaultHeader: string }> = {
      info: { icon: 'ℹ️', defaultHeader: 'Background Context' },
      tip: { icon: '💡', defaultHeader: 'Key Takeaway' },
      warning: { icon: '⚠️', defaultHeader: 'Important Notice' },
      editorial: { icon: '✒️', defaultHeader: 'Editor’s Note' },
    };

    const header = cleanTitle || themeLabels[theme].defaultHeader;

    return `<aside class="cms-callout" data-theme="${theme}" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">${themeLabels[theme].icon}</span>
    <strong>${header}</strong>
  </header>
  <div class="cms-callout-content">
    <p>${cleanBody}</p>
  </div>
</aside>`;
  },

  /**
   * Generates HTML for an Official Journalistic Correction Notice
   */
  createCorrection(text: string, dateIso?: string): string {
    const cleanText = text.trim() || 'An earlier version of this article misstated a figure. It has been updated.';
    const dateFormatted = dateIso 
      ? new Date(dateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `<div class="cms-editorial-correction" data-date="${dateFormatted}" data-node="correction">
  <div class="cms-correction-badge">
    <span class="badge-text">CORRECTION</span>
    <time datetime="${dateIso || new Date().toISOString()}">${dateFormatted}</time>
  </div>
  <p>${cleanText}</p>
</div>`;
  },

  /**
   * Generates HTML for a Sources & References Section
   */
  createSourceNote(sources: string[]): string {
    const listItems = (sources.length > 0 ? sources : ['Original investigation and primary source reporting.'])
      .map((s) => `<li>${s.trim()}</li>`)
      .join('\n');

    return `<footer class="cms-source-note" data-node="sourceNote">
  <div class="cms-source-note-title">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
    <span>Sources &amp; References</span>
  </div>
  <ol>
    ${listItems}
  </ol>
</footer>`;
  },

  /**
   * Generates HTML for an Editorial Section Divider
   */
  createDivider(style: DividerStyle = 'asterism'): string {
    if (style === 'asterism') {
      return `<div class="cms-editorial-divider" data-style="asterism" data-node="divider"><span>⁂</span></div>`;
    }
    if (style === 'ornament') {
      return `<div class="cms-editorial-divider" data-style="ornament" data-node="divider"><span>◆ ◆ ◆</span></div>`;
    }
    return `<div class="cms-editorial-divider" data-style="line" data-node="divider"><hr /></div>`;
  },

  /**
   * Wraps an opening paragraph with the Drop-Cap CSS class
   */
  applyDropCap(paragraphHtml: string): string {
    if (paragraphHtml.includes('cms-drop-cap')) {
      return paragraphHtml.replace(/\s*class="[^"]*cms-drop-cap[^"]*"/i, '');
    }
    if (paragraphHtml.startsWith('<p')) {
      return paragraphHtml.replace(/^<p(\s+class="([^"]*)")?/i, (_match, _fullClass, existingClass) => {
        if (existingClass) {
          return `<p class="${existingClass} cms-drop-cap"`;
        }
        return `<p class="cms-drop-cap"`;
      });
    }
    return `<p class="cms-drop-cap">${paragraphHtml}</p>`;
  },
};
