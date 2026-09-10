import { Injectable, Logger } from '@nestjs/common';
import { sanitizeArticleContent } from '../../common/utils/sanitizer.util';

export interface GutenbergBlock {
  blockName: string;
  attrs: Record<string, any>;
  innerHTML: string;
  innerBlocks?: GutenbergBlock[];
}

export interface GutenbergParseResult {
  title: string;
  html: string;
  blocksCount: number;
  unsupportedBlocksCount: number;
}

@Injectable()
export class GutenbergAdapterService {
  private readonly logger = new Logger(GutenbergAdapterService.name);

  // D4: HTML-escape attribute text before it is interpolated into markup.
  private escapeHtmlAttr(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;');
  }

  // D4: HTML-escape element text (no quote escaping needed, but harmless).
  private escapeHtmlText(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // D4: only allow a known-safe subset of alignment CSS values to reach style=
  private textAlignStyle(value: unknown): string {
    const v = String(value ?? '').toLowerCase();
    return ['left', 'center', 'right', 'justify'].includes(v)
      ? ` style="text-align: ${v}"`
      : '';
  }

  /**
   * Bi-directional Parser: Converts WordPress Gutenberg HTML comments into clean Gazette Semantic HTML
   */
  parseGutenbergToGazette(gutenbergContent: string): GutenbergParseResult {
    if (!gutenbergContent || typeof gutenbergContent !== 'string') {
      return { title: '', html: '', blocksCount: 0, unsupportedBlocksCount: 0 };
    }

    let detectedTitle = '';
    let blocksCount = 0;
    let unsupportedBlocksCount = 0;
    const outputHtmlPieces: string[] = [];

    // Regular expression matching Gutenberg block delimiters: <!-- wp:blockName {...jsonAttrs...} --> ... <!-- /wp:blockName --> or self-closing <!-- wp:blockName {...} /-->
    const blockRegex = /<!--\s+wp:([a-z0-9\/-]+)(?:\s+(\{.*?\}))?\s+(?:\/-->|-->([\s\S]*?)<!--\s+\/wp:\1\s+-->)/gi;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = blockRegex.exec(gutenbergContent)) !== null) {
      blocksCount++;
      const blockName = match[1].toLowerCase();
      const rawAttrs = match[2];
      const rawInnerHtml = (match[3] || '').trim();

      let attrs: Record<string, any> = {};
      if (rawAttrs) {
        try {
          attrs = JSON.parse(rawAttrs);
        } catch {
          attrs = {};
        }
      }

      switch (blockName) {
        case 'paragraph':
        case 'core/paragraph': {
          const dropCap = attrs.dropCap ? ' class="cms-drop-cap"' : '';
          const align = this.textAlignStyle(attrs.textAlign);
          const cleanP = rawInnerHtml || '<p></p>';
          if (dropCap || align) {
            outputHtmlPieces.push(cleanP.replace(/^<p>/i, `<p${dropCap}${align}>`));
          } else {
            outputHtmlPieces.push(cleanP);
          }
          break;
        }

        case 'heading':
        case 'core/heading': {
          const level = attrs.level || 2;
          const align = this.textAlignStyle(attrs.textAlign);
          const cleanText = rawInnerHtml.replace(/<\/?h[1-6][^>]*>/gi, '').trim();
          if (!detectedTitle && level <= 2) {
            detectedTitle = cleanText.replace(/<[^>]*>/g, '');
          }
          outputHtmlPieces.push(`<h${level}${align}>${cleanText}</h${level}>`);
          break;
        }

        case 'image':
        case 'core/image': {
          const imgMatch = rawInnerHtml.match(/<img[^>]+src="([^">]+)"[^>]*>/i);
          const src = this.escapeHtmlAttr(attrs.url || (imgMatch ? imgMatch[1] : ''));
          const alt = this.escapeHtmlAttr(attrs.alt || 'Editorial Image');
          const captionMatch = rawInnerHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
          const caption = this.escapeHtmlText(attrs.caption || (captionMatch ? captionMatch[1] : ''));
          const alignClass = attrs.align === 'wide' ? ' class="cms-align-wide"' : attrs.align === 'full' ? ' class="cms-align-full"' : '';

          outputHtmlPieces.push(
            `<figure${alignClass}><img src="${src}" alt="${alt}" class="cms-editorial-image" style="max-width: 100%; border-radius: 4px; margin: 1.5rem 0;" />${
              caption ? `<figcaption style="font-size: 0.85rem; color: #64748b; text-align: center; margin-top: 0.5rem; font-style: italic;">${caption}</figcaption>` : ''
            }</figure>`
          );
          break;
        }

        case 'quote':
        case 'core/quote':
        case 'pullquote':
        case 'core/pullquote': {
          const citationMatch = rawInnerHtml.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
          const cite = attrs.citation || (citationMatch ? citationMatch[1] : '');
          const quoteBody = rawInnerHtml.replace(/<cite[^>]*>[\s\S]*?<\/cite>/gi, '').trim();
          outputHtmlPieces.push(
            `<blockquote class="cms-pull-quote">${quoteBody}${cite ? `<cite>— ${cite}</cite>` : ''}</blockquote>`
          );
          break;
        }

        case 'table':
        case 'core/table': {
          outputHtmlPieces.push(rawInnerHtml || '<table class="cms-editorial-table"></table>');
          break;
        }

        case 'code':
        case 'core/code': {
          const codeContent = rawInnerHtml.replace(/<\/?pre[^>]*>|<\/?code[^>]*>/gi, '').trim();
          outputHtmlPieces.push(`<pre><code class="language-plaintext">${codeContent}</code></pre>`);
          break;
        }

        case 'separator':
        case 'core/separator': {
          outputHtmlPieces.push('<div class="cms-editorial-divider" data-style="asterism"><span>⁂</span></div>');
          break;
        }

        case 'list':
        case 'core/list': {
          outputHtmlPieces.push(rawInnerHtml);
          break;
        }

        default: {
          // Unsupported block: Safely preserve content inside a labeled editorial container without data loss
          unsupportedBlocksCount++;
          outputHtmlPieces.push(
            `<div class="cms-unsupported-gutenberg-block" data-gutenberg-block="${blockName}" style="padding: 1rem; margin: 1rem 0; border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 4px;">${rawInnerHtml}</div>`
          );
          break;
        }
      }
      lastIndex = blockRegex.lastIndex;
    }

    // If no Gutenberg comment delimiters were present, treat as raw HTML or markdown
    if (blocksCount === 0) {
      return {
        title: '',
        html: sanitizeArticleContent(gutenbergContent),
        blocksCount: 0,
        unsupportedBlocksCount: 0,
      };
    }

    return {
      title: detectedTitle,
      html: sanitizeArticleContent(outputHtmlPieces.join('\n\n')),
      blocksCount,
      unsupportedBlocksCount,
    };
  }

  /**
   * Bi-directional Serializer: Converts Gazette Semantic HTML into valid WordPress Gutenberg Block HTML Comments
   */
  serializeGazetteToGutenberg(gazetteHtml: string): string {
    if (!gazetteHtml || typeof gazetteHtml !== 'string') return '';

    const lines = gazetteHtml.split(/\n\s*\n/);
    const gutenbergBlocks: string[] = [];

    for (const rawPiece of lines) {
      const piece = rawPiece.trim();
      if (!piece) continue;

      // Headings
      const headingMatch = piece.match(/^<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>$/i);
      if (headingMatch) {
        const level = parseInt(headingMatch[1], 10);
        const content = headingMatch[3].trim();
        gutenbergBlocks.push(`<!-- wp:heading {"level":${level}} -->\n<h${level}>${content}</h${level}>\n<!-- /wp:heading -->`);
        continue;
      }

      // Pull Quotes / Blockquotes
      if (piece.startsWith('<blockquote')) {
        const citeMatch = piece.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
        const citeText = citeMatch ? citeMatch[1].replace(/^[—–-]\s*/, '').trim() : '';
        const bodyText = piece.replace(/<cite[^>]*>[\s\S]*?<\/cite>/gi, '').replace(/^<blockquote[^>]*>|<\/blockquote>$/gi, '').trim();
        gutenbergBlocks.push(`<!-- wp:quote {"citation":${JSON.stringify(citeText)}} -->\n<blockquote class="wp-block-quote"><p>${bodyText}</p>${citeText ? `<cite>${citeText}</cite>` : ''}</blockquote>\n<!-- /wp:quote -->`);
        continue;
      }

      // Images / Figures
      if (piece.startsWith('<figure') || piece.startsWith('<img')) {
        const srcMatch = piece.match(/src="([^">]+)"/i);
        const altMatch = piece.match(/alt="([^">]+)"/i);
        const captionMatch = piece.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        const src = srcMatch ? srcMatch[1] : '';
        const alt = altMatch ? altMatch[1] : '';
        const caption = captionMatch ? captionMatch[1] : '';

        gutenbergBlocks.push(
          `<!-- wp:image {"url":${JSON.stringify(src)},"alt":${JSON.stringify(alt)}} -->\n<figure class="wp-block-image size-large"><img src="${src}" alt="${alt}"/>${
            caption ? `<figcaption>${caption}</figcaption>` : ''
          }</figure>\n<!-- /wp:image -->`
        );
        continue;
      }

      // Tables
      if (piece.startsWith('<table')) {
        gutenbergBlocks.push(`<!-- wp:table -->\n<figure class="wp-block-table">${piece}</figure>\n<!-- /wp:table -->`);
        continue;
      }

      // Code blocks
      if (piece.startsWith('<pre')) {
        const codeText = piece.replace(/^<pre[^>]*><code[^>]*>|<\/code><\/pre>$/gi, '').trim();
        gutenbergBlocks.push(`<!-- wp:code -->\n<pre class="wp-block-code"><code>${codeText}</code></pre>\n<!-- /wp:code -->`);
        continue;
      }

      // Dividers / Asterisms
      if (piece.includes('cms-editorial-divider') || piece.startsWith('<hr')) {
        gutenbergBlocks.push(`<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->`);
        continue;
      }

      // Unordered or Ordered Lists
      if (piece.startsWith('<ul') || piece.startsWith('<ol')) {
        gutenbergBlocks.push(`<!-- wp:list -->\n${piece}\n<!-- /wp:list -->`);
        continue;
      }

      // Callouts / Aside
      if (piece.startsWith('<aside') || piece.includes('cms-callout')) {
        gutenbergBlocks.push(`<!-- wp:group {"className":"cms-callout"} -->\n<div class="wp-block-group cms-callout">${piece}</div>\n<!-- /wp:group -->`);
        continue;
      }

      // Default to Paragraph
      const dropCap = piece.includes('cms-drop-cap');
      const cleanContent = piece.replace(/^<p[^>]*>|<\/p>$/gi, '').trim();
      gutenbergBlocks.push(`<!-- wp:paragraph${dropCap ? ' {"dropCap":true}' : ''} -->\n<p${dropCap ? ' class="has-drop-cap"' : ''}>${cleanContent}</p>\n<!-- /wp:paragraph -->`);
    }

    return sanitizeArticleContent(gutenbergBlocks.join('\n\n'));
  }
}
