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

export interface DocumentImportResult {
  filename: string;
  format: 'docx' | 'md' | 'txt' | 'pdf';
  title?: string;
  htmlContent: string;
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
      warnings.push('PDF layout extraction uses text heuristics. Complex multi-column layouts may require manual editorial review.');
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
        throw new BadRequestException('Unsupported document format. Allowed formats: .docx, .md, .txt, .pdf');
    }

    // Server-side XSS Sanitization
    const cleanHtml = sanitizeArticleContent(extractedRawHtml);

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
      wordCount,
      readingTimeMinutes,
      headingsCount,
      paragraphsCount,
      extractedImages,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
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

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      let rawText = '';
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(buffer);
        rawText = data?.text || '';
      } else if (pdfParse && pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const result = await parser.getText();
        rawText = result?.text || '';
      } else if (typeof pdfParse?.default === 'function') {
        const data = await pdfParse.default(buffer);
        rawText = data?.text || '';
      } else {
        throw new Error('PDF parser engine initialization failed.');
      }

      if (!rawText.trim()) return '';

      const lines = rawText.split('\n');
      const htmlBlocks: string[] = [];
      let currentParagraph: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentParagraph.length > 0) {
            htmlBlocks.push(`<p>${currentParagraph.join(' ')}</p>`);
            currentParagraph = [];
          }
          continue;
        }

        // Layout Heuristic: All-caps short lines become section headers
        if (trimmed.length > 3 && trimmed.length < 60 && trimmed === trimmed.toUpperCase() && !trimmed.endsWith('.')) {
          if (currentParagraph.length > 0) {
            htmlBlocks.push(`<p>${currentParagraph.join(' ')}</p>`);
            currentParagraph = [];
          }
          htmlBlocks.push(`<h2>${trimmed}</h2>`);
        } else {
          currentParagraph.push(trimmed);
        }
      }

      if (currentParagraph.length > 0) {
        htmlBlocks.push(`<p>${currentParagraph.join(' ')}</p>`);
      }

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
    return originalFilename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }
}
