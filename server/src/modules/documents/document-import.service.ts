import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
const pdfParse = require('pdf-parse');
import MarkdownIt from 'markdown-it';
import { sanitizeArticleContent } from '../../common/utils/sanitizer.util';
import { MediaService } from '../media/media.service';
import type { AuthUser } from '../../domain/models';

const mdParser = new MarkdownIt({ html: true, linkify: true, typographer: true });

export interface ExtractedImageAsset {
  originalName: string;
  mediaId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentPage {
  pageNumber: number;
  title?: string;
  htmlContent: string;
  wordCount: number;
}

export interface DocumentImportResult {
  filename: string;
  format: 'docx' | 'md' | 'txt' | 'pdf';
  title?: string;
  htmlContent: string;
  pages: DocumentPage[];
  totalPages: number;
  wordCount: number;
  readingTimeMinutes: number;
  headingsCount: number;
  paragraphsCount: number;
  extractedImages: ExtractedImageAsset[];
  warnings?: string[];
}

@Injectable()
export class DocumentImportService {
  private readonly logger = new Logger(DocumentImportService.name);

  constructor(private readonly mediaService: MediaService) {}

  async importDocument(
    file: Express.Multer.File,
    user: AuthUser,
  ): Promise<DocumentImportResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No document file provided for import.');
    }

    // 25 MB file cap
    const MAX_DOC_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_DOC_SIZE) {
      throw new BadRequestException('Document file exceeds the maximum size limit of 25 MB.');
    }

    const format = this.detectFormat(file);
    let extractedRawHtml = '';
    const extractedImages: ExtractedImageAsset[] = [];
    const warnings: string[] = [];

    if (format === 'pdf') {
      warnings.push(
        'PDF layout extraction uses structured page heuristics. You can inspect and select individual pages before importing.',
      );
    }

    switch (format) {
      case 'docx':
        extractedRawHtml = await this.parseDocx(file.buffer, user, extractedImages);
        break;
      case 'md':
        extractedRawHtml = await this.parseMarkdown(file.buffer);
        break;
      case 'txt':
        extractedRawHtml = this.parsePlainText(file.buffer);
        break;
      case 'pdf':
        extractedRawHtml = await this.parsePdf(file.buffer);
        break;
      default:
        throw new BadRequestException(
          'Unsupported document format. Allowed formats: .docx, .md, .txt, .pdf',
        );
    }

    // Server-side XSS Sanitization
    const cleanHtml = sanitizeArticleContent(extractedRawHtml);

    // Split into discrete pages by page-break delimiters or major section blocks
    const pages = this.extractPages(cleanHtml, file.originalname);

    // Compute document analytics
    const wordCount = this.calculateWordCount(cleanHtml);
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));
    const headingsCount = (cleanHtml.match(/<h[1-6]/gi) || []).length;
    const paragraphsCount = (cleanHtml.match(/<p>/gi) || []).length;
    const detectedTitle = this.extractTitle(cleanHtml, file.originalname);

    return {
      filename: file.originalname,
      format,
      title: detectedTitle,
      htmlContent: cleanHtml,
      pages,
      totalPages: pages.length,
      wordCount,
      readingTimeMinutes,
      headingsCount,
      paragraphsCount,
      extractedImages,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private extractPages(html: string, fallbackFilename: string): DocumentPage[] {
    if (!html || !html.trim()) {
      return [
        {
          pageNumber: 1,
          title: 'Page 1',
          htmlContent: '',
          wordCount: 0,
        },
      ];
    }

    // Split on explicit page break horizontal rules or page comments
    const rawChunks = html
      .split(
        /<hr[^>]*class="[^"]*cms-page-break[^"]*"[^>]*>|<!--\s*CMS_PAGE_BREAK\s*-->/gi,
      )
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (rawChunks.length > 1) {
      return rawChunks.map((chunkHtml, idx) => {
        const pageTitle = this.extractTitle(chunkHtml, `Page ${idx + 1}`);
        return {
          pageNumber: idx + 1,
          title: pageTitle,
          htmlContent: chunkHtml,
          wordCount: this.calculateWordCount(chunkHtml),
        };
      });
    }

    // If no explicit page breaks found, check if there are multiple H2 major sections to create logical pages
    const sectionSplit = html.split(/(?=<h2[^>]*>)/i).filter((s) => s.trim().length > 0);
    if (sectionSplit.length > 1 && sectionSplit.length <= 15) {
      return sectionSplit.map((sectionHtml, idx) => {
        const pageTitle = this.extractTitle(sectionHtml, `Section ${idx + 1}`);
        return {
          pageNumber: idx + 1,
          title: pageTitle,
          htmlContent: sectionHtml,
          wordCount: this.calculateWordCount(sectionHtml),
        };
      });
    }

    // Single unified page
    return [
      {
        pageNumber: 1,
        title: this.extractTitle(html, fallbackFilename.replace(/\.[^/.]+$/, '')),
        htmlContent: html,
        wordCount: this.calculateWordCount(html),
      },
    ];
  }

  private detectFormat(file: Express.Multer.File): 'docx' | 'md' | 'txt' | 'pdf' {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    const buf = file.buffer;

    // Magic-byte check for .docx (PK zip header: 0x50 0x4B 0x03 0x04)
    if (ext === '.docx' || (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04)) {
      return 'docx';
    }

    // Magic-byte check for .pdf (%PDF header: 0x25 0x50 0x44 0x46)
    if (ext === '.pdf' || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
      return 'pdf';
    }

    if (ext === '.md' || ext === '.markdown') {
      return 'md';
    }

    if (ext === '.txt') {
      return 'txt';
    }

    throw new BadRequestException(`Unsupported file extension '${ext}'. Allowed: .docx, .md, .txt, .pdf`);
  }

  private async parseDocx(
    buffer: Buffer,
    user: AuthUser,
    extractedImages: ExtractedImageAsset[],
  ): Promise<string> {
    try {
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h2:fresh",
            "p[style-name='Heading 2'] => h3:fresh",
            "p[style-name='Heading 3'] => h4:fresh",
            "p[style-name='Intense Quote'] => blockquote:fresh",
            "p[style-name='Quote'] => blockquote:fresh",
          ],
          convertImage: mammoth.images.imgElement(async (image) => {
            try {
              const imageBuffer = await image.read();
              const mimeType = image.contentType || 'image/png';
              const ext = mimeType.split('/')[1] || 'png';
              const filename = `docx-extracted-${Date.now()}.${ext}`;

              const fakeMulterFile: Express.Multer.File = {
                fieldname: 'file',
                originalname: filename,
                encoding: '7bit',
                mimetype: mimeType,
                buffer: imageBuffer,
                size: imageBuffer.length,
                stream: null as any,
                destination: '',
                filename,
                path: '',
              };

              const savedMedia = await this.mediaService.uploadImage(fakeMulterFile, user);
              extractedImages.push({
                originalName: filename,
                mediaId: savedMedia.id,
                url: savedMedia.url,
                mimeType: savedMedia.mimeType,
                sizeBytes: savedMedia.size,
              });

              return { src: savedMedia.url };
            } catch {
              return { src: '' };
            }
          }),
        },
      );
      return result.value || '';
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse .docx file: ${err.message}`);
    }
  }

  private parseMarkdown(buffer: Buffer): string {
    try {
      const text = buffer.toString('utf-8');
      return mdParser.render(text);
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse Markdown file: ${err.message}`);
    }
  }

  private parsePlainText(buffer: Buffer): string {
    const text = buffer.toString('utf-8').trim();
    if (!text) return '';

    // Split paragraphs by double newlines
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs
      .map((p) => {
        const trimmed = p.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const items = trimmed.split(/\n/).map((i) => `<li>${i.replace(/^[*|-]\s*/, '')}</li>`).join('');
          return `<ul>${items}</ul>`;
        }
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  }

  private formatInlineContent(text: string): string {
    if (!text) return '';

    let formatted = text;

    // 1. Convert Markdown links [Label](url) into Gazette styled anchor tags
    formatted = formatted.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-crimson font-serif underline hover:text-rose-900 transition-colors">$1</a>',
    );

    // 2. Convert Raw URLs into clickable hyperlinks (avoid matching already linked hrefs)
    formatted = formatted.replace(
      /(?<!href=["'])(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-accent-crimson font-serif underline hover:text-rose-900 transition-colors">$1</a>',
    );

    // 3. Inline LaTeX / Math Formulas: $x^2 + y^2 = r^2$ or \sqrt{x}
    formatted = formatted.replace(
      /\$([^\$\n]+)\$/g,
      '<code class="cms-math-inline px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono text-ink-primary font-semibold">$1</code>',
    );

    // 4. Superscripts (e.g., x^2, m^3) and Subscripts (e.g., H_2O, CO_2)
    formatted = formatted.replace(/(\w+)\^(\d+|\w+)/g, '$1<sup>$2</sup>');
    formatted = formatted.replace(/(\b[A-Z][a-z]?|\w+)_(\d+)/g, '$1<sub>$2</sub>');

    return formatted;
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const renderPage = (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: any,
            text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          return '\n\n<<<CMS_PAGE_BREAK>>>\n\n' + text;
        });
      };

      let rawText = '';
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(buffer, { pagerender: renderPage });
        rawText = data?.text || '';
      } else if (pdfParse && pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const result = await parser.getText();
        rawText = result?.text || '';
      } else if (typeof pdfParse?.default === 'function') {
        const data = await pdfParse.default(buffer, { pagerender: renderPage });
        rawText = data?.text || '';
      } else {
        throw new Error('PDF parser engine initialization failed.');
      }

      if (!rawText.trim()) return '';

      // 1. Strip repetitive page numbers and header/footer noise
      let sanitizedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Strip lines like "Page 1 of 5", "Page 2", "- 1 -", "1 of 4"
        .replace(/^\s*(?:page\s+\d+(?:\s+of\s+\d+)?|-\s*\d+\s*-|\d+\s+of\s+\d+)\s*$/gim, '')
        // If bullet character is inline, break it into a separate line
        .replace(/([^\n])\s*([•\u2022\u2023\u25E6\u25AA\u25CF\u2219])\s*/g, '$1\n$2 ');

      const rawLines = sanitizedText.split('\n');
      const cleanLines: string[] = [];

      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          cleanLines.push('');
        } else {
          cleanLines.push(trimmed);
        }
      }

      const htmlBlocks: string[] = [];
      let currentParagraph: string[] = [];
      let currentListItems: string[] = [];
      let currentListType: 'ul' | 'ol' | null = null;
      let inCodeBlock = false;
      let codeBlockLines: string[] = [];
      let inTable = false;
      let tableRows: string[][] = [];
      let isFirstHeading = true;

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const rawText = currentParagraph.join(' ').trim();
          if (rawText) {
            htmlBlocks.push(`<p>${this.formatInlineContent(rawText)}</p>`);
          }
          currentParagraph = [];
        }
      };

      const flushList = () => {
        if (currentListItems.length > 0 && currentListType) {
          const items = currentListItems
            .map((item) => `<li>${this.formatInlineContent(item)}</li>`)
            .join('');
          htmlBlocks.push(`<${currentListType}>${items}</${currentListType}>`);
          currentListItems = [];
          currentListType = null;
        }
      };

      const flushCodeBlock = () => {
        if (codeBlockLines.length > 0) {
          const codeText = codeBlockLines.join('\n');
          htmlBlocks.push(
            `<pre class="cms-code-block my-5 p-4 bg-slate-900 text-slate-100 rounded text-xs font-mono overflow-x-auto leading-relaxed"><code>${codeText}</code></pre>`,
          );
          codeBlockLines = [];
          inCodeBlock = false;
        }
      };

      const flushTable = () => {
        if (tableRows.length > 0) {
          let tableHtml = `<div class="cms-table-container my-6 overflow-x-auto rounded border border-border-subtle shadow-xs"><table class="cms-table w-full border-collapse text-sm">`;
          const headerRow = tableRows[0];
          tableHtml += `<thead class="bg-slate-100/80 border-b-2 border-border-subtle text-ink-primary font-mono text-xs uppercase tracking-wider"><tr>`;
          headerRow.forEach((cell) => {
            tableHtml += `<th class="p-3 text-left font-semibold border-r border-border-subtle last:border-r-0">${this.formatInlineContent(cell)}</th>`;
          });
          tableHtml += `</tr></thead><tbody class="divide-y divide-border-subtle bg-white">`;

          for (let r = 1; r < tableRows.length; r++) {
            tableHtml += `<tr class="hover:bg-slate-50/80 transition-colors">`;
            tableRows[r].forEach((cell) => {
              tableHtml += `<td class="p-3 font-sans text-ink-primary border-r border-border-subtle last:border-r-0">${this.formatInlineContent(cell)}</td>`;
            });
            tableHtml += `</tr>`;
          }
          tableHtml += `</tbody></table></div>`;
          htmlBlocks.push(tableHtml);
          tableRows = [];
          inTable = false;
        }
      };

      for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];

        if (!line) {
          flushParagraph();
          flushList();
          if (inCodeBlock) flushCodeBlock();
          if (inTable) flushTable();
          continue;
        }

        // 0. Explicit Page Break delimiter between PDF pages
        if (line.includes('<<<CMS_PAGE_BREAK>>>')) {
          flushParagraph();
          flushList();
          if (inCodeBlock) flushCodeBlock();
          if (inTable) flushTable();
          if (htmlBlocks.length > 0) {
            htmlBlocks.push(
              '<hr class="cms-page-break my-8 border-t-2 border-dashed border-slate-300" data-page-break="true" />',
            );
          }
          continue;
        }

        // 1. Math Display Equation Block ($$...$$ or \[...\])
        if (/^\$\$(.+)\$\$$/.test(line) || /^\\\[(.+)\\\]$/.test(line)) {
          flushParagraph();
          flushList();
          const mathContent = line.replace(/^\$\$|\$\$$|^\\\[|\\\]$/g, '').trim();
          htmlBlocks.push(
            `<div class="cms-math-block my-5 p-4 bg-slate-50 border border-border-subtle rounded text-center font-mono text-sm text-ink-primary select-all"><code>$$${mathContent}$$</code></div>`,
          );
          continue;
        }

        // 2. Code Block Markers (```...```) or Programming Constructs
        if (line.startsWith('```')) {
          flushParagraph();
          flushList();
          if (inCodeBlock) {
            flushCodeBlock();
          } else {
            inCodeBlock = true;
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockLines.push(line);
          continue;
        }

        // 3. Pipe-delimited Table Row (| Col 1 | Col 2 |)
        if (line.startsWith('|') && line.endsWith('|') && line.includes('|')) {
          // Ignore markdown separator row (|---|---|)
          if (/^\|(?:\s*[-:]+[-| :]*)\|$/.test(line)) {
            continue;
          }
          flushParagraph();
          flushList();
          inTable = true;
          const cells = line
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
          continue;
        } else if (inTable) {
          flushTable();
        }

        // 4. Horizontal divider line
        if (/^[-–—_*]{3,}$/.test(line)) {
          flushParagraph();
          flushList();
          htmlBlocks.push('<hr class="cms-divider my-8 border-t border-border-subtle" />');
          continue;
        }

        // 5. Bullet list item detection
        const isBullet =
          /^[•\u2022\u2023\u25E6\u25AA\u25CF\u2219*·-–—]\s+/.test(line) ||
          /^[•\u2022\u2023\u25E6\u25AA\u25CF\u2219]/.test(line);

        if (isBullet) {
          flushParagraph();
          if (currentListType !== 'ul') {
            flushList();
            currentListType = 'ul';
          }
          const itemText = line
            .replace(/^[•\u2022\u2023\u25E6\u25AA\u25CF\u2219*·-–—]\s*/, '')
            .trim();
          currentListItems.push(itemText);
          continue;
        }

        // 6. Numbered Step / Major Section Heading (e.g. "1. Explore the 1Fi App", "2. Add 1Fi Marketplace")
        const stepMatch = line.match(/^(\d+[\.\)])\s+(.*)$/);
        if (stepMatch && line.length < 90 && !line.endsWith('.') && !line.endsWith(',')) {
          flushParagraph();
          flushList();
          htmlBlocks.push(`<h3><strong>${this.formatInlineContent(line)}</strong></h3>`);
          continue;
        }

        // 7. Alpha Sub-item (e.g. "A. Top Brands", "B. Nearby Stores", "C. 1Fi Marketplace")
        const alphaMatch = line.match(/^([A-Z][\.\)])\s+(.*)$/);
        if (alphaMatch && line.length < 70 && !line.endsWith(',')) {
          flushParagraph();
          flushList();
          htmlBlocks.push(`<p><strong>${this.formatInlineContent(line)}</strong></p>`);
          continue;
        }

        // 8. Figure / Image Label (e.g., "Figure 1: ...", "Image: ...")
        if (/^(Figure|Fig\.|Illustration|Diagram|Screenshot)\s+\d*:/i.test(line)) {
          flushParagraph();
          flushList();
          htmlBlocks.push(
            `<div class="cms-figure-caption my-3 p-2 bg-slate-50 border-l-2 border-slate-400 text-xs font-serif italic text-ink-secondary">${this.formatInlineContent(line)}</div>`,
          );
          continue;
        }

        // 9. Section Heading Heuristics (Document Title, "Objective", "Assignment", "Requirements", etc.)
        const isCommonHeadingWord =
          /^(Objective|Assignment|Overview|Requirements|Deliverables|Summary|Background|Instructions|Guidelines|Evaluation Criteria|Scope|Milestones|Introduction|Conclusion|Key Findings|Features|Tech Stack|Submission)s?:?$/i.test(
            line,
          );
        const isShortTitle = line.length > 2 && line.length < 65 && !/[.,;:!?]$/.test(line);

        if ((isFirstHeading && i < 3 && isShortTitle) || isCommonHeadingWord) {
          flushParagraph();
          flushList();
          if (isFirstHeading) {
            htmlBlocks.push(`<h2>${this.formatInlineContent(line)}</h2>`);
            isFirstHeading = false;
          } else {
            htmlBlocks.push(`<h3>${this.formatInlineContent(line)}</h3>`);
          }
          continue;
        }

        // 10. Numbered List item (e.g. "1. Item description that ends with a period.")
        if (stepMatch && (line.endsWith('.') || line.length >= 90)) {
          flushParagraph();
          if (currentListType !== 'ol') {
            flushList();
            currentListType = 'ol';
          }
          currentListItems.push(stepMatch[2].trim());
          continue;
        }

        // 11. Standard body text
        flushList();
        currentParagraph.push(line);
      }

      flushParagraph();
      flushList();
      if (inCodeBlock) flushCodeBlock();
      if (inTable) flushTable();

      return htmlBlocks.join('');
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse PDF document: ${err.message}`);
    }
  }

  private calculateWordCount(html: string): number {
    const plainText = html.replace(/<[^>]+>/g, ' ').trim();
    if (!plainText) return 0;
    return plainText.split(/\s+/).filter(Boolean).length;
  }

  private extractTitle(html: string, originalFilename: string): string {
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].replace(/<[^>]+>/g, '').trim();
    }
    const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
    if (h2Match && h2Match[1]) {
      return h2Match[1].replace(/<[^>]+>/g, '').trim();
    }
    const h3Match = html.match(/<h3[^>]*>(.*?)<\/h3>/i);
    if (h3Match && h3Match[1]) {
      return h3Match[1].replace(/<[^>]+>/g, '').trim();
    }
    return originalFilename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }
}
