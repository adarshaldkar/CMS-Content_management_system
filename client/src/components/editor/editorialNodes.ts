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
   * Generates HTML for an Editorial Fact Box / Key Takeaways Block
   */
  createFactBox(title?: string, items?: string[]): string {
    const cleanTitle = title?.trim() || 'Key Facts & Findings';
    const factItems = (items && items.length > 0 ? items : [
      'Verified finding based on primary investigative records.',
      'Data independently audited across all six persistence nodes.',
      'Key metric represents a 45% increase compared to previous quarter.'
    ]).map((it) => `<li>${it.trim()}</li>`).join('\n    ');

    return `<aside class="cms-fact-box" data-node="factBox">
  <header class="cms-fact-box-header">
    <span class="cms-fact-box-icon">📊</span>
    <strong>${cleanTitle}</strong>
  </header>
  <ul class="cms-fact-box-list">
    ${factItems}
  </ul>
</aside>`;
  },

  /**
   * Generates HTML for an Urgent Warning / Editorial Advisory Banner
   */
  createWarning(title?: string, message?: string): string {
    const cleanTitle = title?.trim() || 'Urgent Editorial Notice';
    const cleanMsg = message?.trim() || 'This reporting pertains to rapidly developing breaking events. Details will be updated as corroborated by the desk.';

    return `<div class="cms-warning-banner" data-node="warning">
  <div class="cms-warning-header">
    <span class="cms-warning-icon">⚠️</span>
    <strong>${cleanTitle}</strong>
  </div>
  <p class="cms-warning-text">${cleanMsg}</p>
</div>`;
  },

  /**
   * Generates HTML for a Chronological Milestone Timeline
   */
  createTimeline(title?: string, events?: Array<{ time: string; desc: string }>): string {
    const cleanTitle = title?.trim() || 'Chronological Timeline';
    const timelineEvents = (events && events.length > 0 ? events : [
      { time: '08:00 AM', desc: 'Initial investigation report received by editorial board.' },
      { time: '11:30 AM', desc: 'Corroborating records confirmed through public data registry.' },
      { time: '02:15 PM', desc: 'Official statement delivered and integrated into the manuscript.' }
    ]).map((ev) => `  <div class="cms-timeline-item">
    <span class="cms-timeline-badge">${ev.time}</span>
    <div class="cms-timeline-body"><p>${ev.desc}</p></div>
  </div>`).join('\n');

    return `<div class="cms-timeline-block" data-node="timeline">
  <header class="cms-timeline-header">
    <span class="cms-timeline-icon">⏱️</span>
    <strong>${cleanTitle}</strong>
  </header>
  <div class="cms-timeline-items">
${timelineEvents}
  </div>
</div>`;
  },

  /**
   * Generates HTML for a Curated Related Stories Block
   */
  createRelatedStories(title?: string, stories?: Array<{ title: string; category: string; url: string; author: string }>): string {
    const cleanTitle = title?.trim() || 'Related Coverage & In-Depth Dispatches';
    const storyCards = (stories && stories.length > 0 ? stories : [
      { title: 'The Architecture of Modern Editorial Systems', category: 'INVESTIGATION', url: '#', author: 'Editorial Board' },
      { title: 'Distributed Persistence & Zero-Data Loss Workflows', category: 'TECHNOLOGY', url: '#', author: 'Systems Desk' }
    ]).map((st) => `    <div class="cms-related-card">
      <span class="cms-related-badge">${st.category}</span>
      <h4 class="cms-related-title"><a href="${st.url}">${st.title}</a></h4>
      <span class="cms-related-byline">By ${st.author}</span>
    </div>`).join('\n');

    return `<aside class="cms-related-stories-block" data-node="relatedStories">
  <header class="cms-related-header">
    <span class="cms-related-icon">📰</span>
    <strong>${cleanTitle}</strong>
  </header>
  <div class="cms-related-grid">
${storyCards}
  </div>
</aside>`;
  },

  /**
   * Generates HTML for an Inline Source Citation Block
   */
  createCitation(quote: string, source: string, url?: string): string {
    const cleanQuote = quote.trim() || 'Primary source statement corroborated by independent records.';
    const cleanSource = source.trim() || 'Official Gazette Investigative Archive';
    const linkHtml = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${cleanSource}</a>` : cleanSource;

    return `<div class="cms-citation-block" data-node="citation">
  <span class="cms-citation-icon">📌</span>
  <div class="cms-citation-content">
    <span class="cms-citation-quote">“${cleanQuote}”</span>
    <span class="cms-citation-source">— Source: ${linkHtml}</span>
  </div>
</div>`;
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
