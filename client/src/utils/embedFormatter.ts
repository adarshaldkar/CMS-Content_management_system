import type { EmbedMetadataResponse, EmbedDisplayMode } from '../api/embeds.api';

/**
 * Formats EmbedMetadataResponse into a rich, semantic editorial HTML element.
 * Strictly decouples media players from transcripts, eliminating timestamp pollution.
 */
export function formatEmbedHtml(
  data: EmbedMetadataResponse,
  options: {
    caption?: string;
    width?: 'standard' | 'wide' | 'full';
    displayMode?: EmbedDisplayMode;
    includeTranscript?: boolean;
  } = {},
): string {
  const displayMode = options.displayMode || data.displayMode || 'embed';
  const width = options.width || 'wide';
  const caption = options.caption || data.caption || '';
  const title = escapeHtml(data.title || 'Embedded Media');
  const description = escapeHtml(data.description || '');
  const authorName = escapeHtml(data.authorName || data.providerName || '');
  const url = escapeHtml(data.url);
  const embedUrl = data.embedUrl ? escapeHtml(data.embedUrl) : url;
  const thumbnailUrl = data.thumbnailUrl ? escapeHtml(data.thumbnailUrl) : '';
  const faviconUrl = data.faviconUrl ? escapeHtml(data.faviconUrl) : '';

  const widthClass =
    width === 'full'
      ? 'w-full max-w-full my-8'
      : width === 'wide'
      ? 'max-w-4xl mx-auto my-7'
      : 'max-w-2xl mx-auto my-6';

  let innerContent = '';

  if (displayMode === 'embed' && data.embedUrl) {
    const isAudio = data.provider === 'spotify';
    const containerAspect = isAudio ? 'h-24 sm:h-32' : 'aspect-video w-full';

    innerContent = `
      <div class="cms-embed-container ${containerAspect} rounded-sm overflow-hidden bg-slate-950 border border-slate-800 relative">
        <iframe
          src="${embedUrl}"
          title="${title}"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          class="w-full h-full border-0 absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    `;
  } else if (displayMode === 'card') {
    innerContent = `
      <a
        href="${url}"
        target="_blank"
        rel="noopener noreferrer"
        class="cms-embed-card group block bg-white hover:bg-slate-50 border border-border-subtle hover:border-slate-400 p-4 rounded-sm transition-all text-left no-underline"
      >
        <div class="flex flex-col sm:flex-row gap-4 items-start">
          ${
            thumbnailUrl
              ? `<img src="${thumbnailUrl}" alt="" class="w-full sm:w-36 h-28 object-cover rounded-xs bg-slate-100 shrink-0 border border-slate-200" />`
              : ''
          }
          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary">
              ${
                faviconUrl
                  ? `<img src="${faviconUrl}" alt="" class="w-3.5 h-3.5 rounded-full inline-block" />`
                  : ''
              }
              <span class="font-bold uppercase tracking-wider text-accent-crimson">${escapeHtml(
                data.providerName,
              )}</span>
              ${authorName ? `<span class="text-slate-400">&bull;</span><span>${authorName}</span>` : ''}
            </div>
            <h4 class="font-serif font-bold text-sm sm:text-base text-ink-primary group-hover:text-accent-crimson transition-colors line-clamp-2 m-0 leading-snug">
              ${title}
            </h4>
            ${
              description
                ? `<p class="text-xs text-ink-secondary line-clamp-2 m-0 leading-relaxed">${description}</p>`
                : ''
            }
            <span class="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 pt-1">
              <span>Read source</span>
              <span>&rarr;</span>
            </span>
          </div>
        </div>
      </a>
    `;
  } else {
    // Plain link mode
    innerContent = `
      <p class="cms-embed-plain my-3">
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          class="font-serif font-bold text-accent-crimson hover:underline inline-flex items-center gap-1"
        >
          <span>${title}</span>
          <span class="text-xs font-mono">&nearr;</span>
        </a>
      </p>
    `;
  }

  const captionHtml = caption
    ? `<figcaption class="cms-embed-caption text-center text-xs font-serif text-ink-secondary italic mt-2.5">${escapeHtml(
        caption,
      )}</figcaption>`
    : '';

  // Transcripts are strictly opt-in and cleaned of raw bracketed timestamps
  const includeTranscript = options.includeTranscript === true;
  const rawTranscript = data.transcript?.trim();
  const cleanedTranscript = rawTranscript
    ? rawTranscript.replace(/\[\d{2}:\d{2}(?::\d{2})?\]\s*/g, '').trim()
    : '';

  const transcriptHtml =
    includeTranscript && cleanedTranscript
      ? `
    <details class="cms-embed-transcript mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-sm text-left select-text">
      <summary class="font-mono text-xs font-semibold text-accent-crimson cursor-pointer select-none flex items-center gap-2 hover:underline">
        <span>📜 Editorial Transcript Reference</span>
      </summary>
      <div class="cms-transcript-content mt-2.5 pt-2.5 border-t border-slate-200 text-xs font-sans text-ink-primary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
${escapeHtml(cleanedTranscript)}
      </div>
    </details>
  `.trim()
      : '';

  return `
<figure class="cms-embed-block ${widthClass} clear-both select-none" data-provider="${data.provider}" data-url="${url}" data-embed-url="${embedUrl}" data-title="${title}" data-display-mode="${displayMode}" data-width="${width}">
  ${innerContent.trim()}
  ${captionHtml}
  ${transcriptHtml ? '\n  ' + transcriptHtml : ''}
</figure>
  `.trim();
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
