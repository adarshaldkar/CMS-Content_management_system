import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { MediaService } from '../media/media.service';
import { AuthUser } from '../../domain/models';
import {
  GazetteDocumentIR,
  GazetteDocumentPageIR,
  GazetteBlock,
  ParagraphBlock,
  HeadingBlock,
  TableBlock,
  ExtractedLink,
} from './models/gazette-document-ir';
import { ImportJob, ImportJobReport } from './models/import-job.model';
import type { ExtractedImageAsset } from './document-import.service';

const JOB_TTL_SECONDS = 60 * 60 * 24; // 24h
const JOB_TOTAL_CPU_BUDGET_MS = 20_000; // D3: hard CPU ceiling across the whole job
const JOB_PAGE_CPU_BUDGET_MS = 5_000; // D3: per-page ceiling

// pdf-parse v2 (pdf.js wrapper): named `PDFParse` class export.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require('pdf-parse') as any;

interface EmbeddedImageDescriptor {
  name?: string;
  width?: number;
  height?: number;
  data?: Uint8Array;
  dataUrl?: string;
}

@Injectable()
export class PdfIngestionService {
  private readonly logger = new Logger(PdfIngestionService.name);
  private readonly activeJobs = new Map<string, ImportJob>();

  constructor(
    private readonly mediaService: MediaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Validates file security and magic bytes
   */
  validateFileSecurity(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for ingestion.');
    }

    // Max 25 MB limit
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('File exceeds the 25 MB maximum upload limit.');
    }

    // Check magic bytes for PDF (%PDF-) or Office Open XML (PK\x03\x04)
    const bufferHeader = file.buffer.subarray(0, 8).toString('binary');
    const isPdf = bufferHeader.startsWith('%PDF-');
    const isZipOrDocx = bufferHeader.startsWith('PK\x03\x04');
    const isTextOrMd = file.mimetype.includes('text') || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt');

    if (!isPdf && !isZipOrDocx && !isTextOrMd) {
      throw new BadRequestException('Invalid file format. Supported manuscripts: PDF, Word (.docx), Markdown (.md), Text (.txt).');
    }
  }

  /**
   * Starts or processes an ingestion job
   */
  async createIngestionJob(file: Express.Multer.File, user: AuthUser): Promise<ImportJob> {
    this.validateFileSecurity(file);

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const documentId = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fileSha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    const job: ImportJob = {
      id: jobId,
      documentId,
      userId: user.id,
      filename: file.originalname,
      fileSizeBytes: file.size,
      status: 'inspecting',
      progressPercent: 10,
      pagesProcessed: 0,
      totalPages: 1,
      currentStage: 'Security Validation & Magic Byte Inspection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.activeJobs.set(jobId, job);
    await this.persistJob(job);

    // Run processing within the budget synchronously or transition to queued
    try {
      await this.processPdfJob(job, file, user, fileSha256);
    } catch (err: any) {
      job.status = 'failed';
      job.errorMessage = err?.message || 'Document processing failed.';
      job.updatedAt = new Date().toISOString();
      this.logger.error(`Document ingestion job ${jobId} failed: ${job.errorMessage}`, err?.stack);
    }
    await this.persistJob(job);

    return job;
  }

  /**
   * Persists a job snapshot to Redis so it survives a process restart within the
   * 24h window (D2: replaces the ephemeral in-memory Map as the source of truth).
   */
  private async persistJob(job: ImportJob): Promise<void> {
    if (!this.redisService.isHealthy()) return;
    const client = this.redisService.getClient();
    if (!client) return;
    try {
      await client.set(`job:import:${job.id}`, JSON.stringify(job), 'EX', JOB_TTL_SECONDS);
    } catch (err: any) {
      this.logger.warn(`Failed to persist import job [${job.id}]: ${err.message}`);
    }
  }

  /**
   * Retrieves a running or completed import job (memory first, Redis fallback)
   */
  async getJob(jobId: string): Promise<ImportJob | null> {
    const fromMemory = this.activeJobs.get(jobId);
    if (fromMemory) return fromMemory;

    if (!this.redisService.isHealthy()) return null;
    const client = this.redisService.getClient();
    if (!client) return null;

    try {
      const raw = await client.get(`job:import:${jobId}`);
      if (!raw) return null;
      const restored = JSON.parse(raw) as ImportJob;
      this.activeJobs.set(jobId, restored);
      return restored;
    } catch (err: any) {
      this.logger.warn(`Failed to read import job [${jobId}] from Redis: ${err.message}`);
      return null;
    }
  }

  /**
   * Core multi-stage PDF inspection and IR compilation pipeline.
   *
   * Uses pdf-parse v2 (pdf.js) for real text extraction from compressed PDF
   * content streams. The earlier regex-on-raw-bytes approach produced garbage
   * for virtually all real-world PDFs that use Flate compression.
   */
  private async processPdfJob(
    job: ImportJob,
    file: Express.Multer.File,
    user: AuthUser,
    fileSha256: string,
  ): Promise<void> {
    job.status = 'processing';
    job.progressPercent = 30;
    job.currentStage = 'Text Layer Extraction (pdf.js)';

    // D5: Real text extraction via pdf-parse v2 (pdf.js). Replaces raw-byte
    // regex segmentation which failed on Flate/Predicted content streams.
    // Also pulls embedded images + hyperlink annotations in the same pass.
    const content = await this.extractPdfContent(file.buffer);
    const pageTexts = content.pageTexts;
    const totalPages = Math.min(Math.max(pageTexts.length, 1), 150); // Bound at 150 pages
    job.totalPages = totalPages;

    job.currentStage = 'Structural Layout Analysis & Multi-Column Sorting';

    // D6: Running page headers like "COFPS - Complete Course Notes | 4" repeat
    // verbatim (title + page number) at the top of every page. Detect the
    // shared header across >= 2 pages once, then strip it from each page so it
    // can never be misread as a pipe-delimited table or a fake heading.
    const runningPageHeader = this.detectRunningHeader(pageTexts);

    const pagesIR: GazetteDocumentPageIR[] = [];
    const allLinks: ExtractedLink[] = [];
    const extractedImages: ExtractedImageAsset[] = [];
    const seenImageHashes = new Set<string>();
    let uniqueImagesCount = 0;
    let duplicateImagesCount = 0;
    let totalWords = 0;
    const warnings: string[] = [];
    const reviewRequiredItems: string[] = [];

    // Process each page. D3: cooperative yielding between pages keeps the event
    // loop responsive; a per-page and per-job CPU budget prevent a maliciously
    // crafted PDF from monopolizing the process.
    const jobStartedAt = Date.now();
    for (let i = 0; i < totalPages; i++) {
      const pageStartedAt = Date.now();
      if (pageStartedAt - jobStartedAt > JOB_TOTAL_CPU_BUDGET_MS) {
        throw new Error(`Document processing exceeded the ${JOB_TOTAL_CPU_BUDGET_MS}ms CPU budget.`);
      }
      const pageNum = i + 1;
      const pageText = this.stripRunningHeader(pageTexts[i] || '', runningPageHeader);
      job.pagesProcessed = pageNum;
      job.progressPercent = Math.round(30 + ((pageNum / totalPages) * 50));
      await this.persistJob(job);

      const pageBlocks: GazetteBlock[] = [];

      // D5: Honest per-page scanned detection. Empty text from pdf.js means no
      // text layer — the page is a scanned image, not a "page with no content
      // after regex failure."  There is no OCR pipeline yet.
      const isPageScanned = !pageText.trim();
      if (isPageScanned) {
        warnings.push(
          `Page ${pageNum} has no extractable text layer (scanned or image-only page). Multi-column heuristics could not recover content.`,
        );
      }

      // Extract lines & reconstruct reading order (multi-column aware)
      const reconstructedLines = this.reconstructPageLines(pageText);

      // Recover hyperlinks: (a) real link annotations reported by pdf.js, and
      // (b) bare URLs present in the decoded text. Dedupe by url+page.
      const pageAnnotations = content.pageLinks.find((p) => p.pageNumber === pageNum)?.links || [];
      const seenPageUrls = new Set<string>();
      let pageLinkIndex = 0;
      for (const annotation of pageAnnotations) {
        pageLinkIndex++;
        const rawUrl = annotation.url || '';
        const displayText = annotation.text || rawUrl;
        if (!rawUrl || seenPageUrls.has(rawUrl)) continue;
        seenPageUrls.add(rawUrl);

        const isValid = /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(rawUrl);
        allLinks.push({
          id: `link_p${pageNum}_${pageLinkIndex}`,
          pageNumber: pageNum,
          visibleText: displayText,
          url: rawUrl,
          isExternal: true,
          isMalformed: !isValid,
          needsReview: !isValid,
        });
        if (!isValid) {
          reviewRequiredItems.push(`Malformed hyperlink on page ${pageNum}: ${rawUrl}`);
        }
      }

      const pageLinkRegex = /(https?:\/\/[^\s<>"']+)/gi;
      let pageLinkMatch: RegExpExecArray | null;
      while ((pageLinkMatch = pageLinkRegex.exec(pageText)) !== null) {
        const url = pageLinkMatch[1];
        if (seenPageUrls.has(url)) continue;
        seenPageUrls.add(url);
        const isValid = /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(url);
        allLinks.push({
          id: `link_p${pageNum}_bare_${pageLinkIndex++}`,
          pageNumber: pageNum,
          visibleText: url,
          url,
          isExternal: true,
          isMalformed: !isValid,
          needsReview: !isValid,
        });
        if (!isValid) {
          reviewRequiredItems.push(`Malformed hyperlink on page ${pageNum}: ${url}`);
        }
      }

      let isFirstLine = true;
      // Column-aligned tables are buffered across consecutive rows so prose
      // with wide justified gaps (ChatGPT/chat-export PDFs) is never turned
      // into a single-row garbage table.
      let pendingTable: { positions: number[]; rows: string[][]; rawTexts: string[] } | null = null;
      const flushPendingTable = () => {
        if (!pendingTable) return;
        if (pendingTable.rows.length >= 2) {
          pageBlocks.push({
            id: `block_${pageNum}_${pageBlocks.length}`,
            type: 'table',
            headers: pendingTable.rows[0],
            rows: pendingTable.rows.map((row) => row.map((c) => ({ content: c, isHeader: false }))),
            pageNumber: pageNum,
            confidence: 0.85,
          });
        } else {
          // A lone gap-rich line is not a table — restore it as a paragraph.
          for (const rawText of pendingTable.rawTexts) {
            totalWords += rawText.split(/\s+/).filter(Boolean).length;
            pageBlocks.push({
              id: `block_${pageNum}_${pageBlocks.length}`,
              type: 'paragraph',
              text: rawText,
              isDropCap: false,
              pageNumber: pageNum,
              confidence: 0.98,
            });
          }
        }
        pendingTable = null;
      };
      for (const line of reconstructedLines) {
        if (Date.now() - pageStartedAt > JOB_PAGE_CPU_BUDGET_MS) {
          throw new Error(`Page ${pageNum} exceeded the ${JOB_PAGE_CPU_BUDGET_MS}ms CPU budget.`);
        }
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip repeated page furniture / footer line numbers ("1 / 2", "Page 3 of 8")
        if (/^(page\s+\d+(\s+of\s+\d+)?|\d+\s*[/-]\s*\d+|\d+)$/i.test(trimmed)) {
          continue;
        }

        // Heading Detection
        if (isFirstLine && (trimmed.length < 85 || /^[A-Z0-9\s:—–-]{5,}$/.test(trimmed)) && !trimmed.endsWith('.')) {
          pageBlocks.push({
            id: `block_${pageNum}_${pageBlocks.length}`,
            type: 'heading',
            level: pageNum === 1 ? 1 : 2,
            text: trimmed,
            pageNumber: pageNum,
            confidence: 0.95,
          });
          isFirstLine = false;
          continue;
        }

        // Table Detection — requires >= 2 consecutive rows sharing the same
        // column offsets. Pipe-delimited rows are unambiguous and may stand alone.
        const pipeCells = trimmed.includes('|') ? trimmed.split('|').map((c) => c.trim()).filter(Boolean) : [];
        if (trimmed.includes('|') && pipeCells.length >= 2) {
          flushPendingTable();
          pageBlocks.push({
            id: `block_${pageNum}_${pageBlocks.length}`,
            type: 'table',
            headers: pipeCells,
            rows: [pipeCells.map((c) => ({ content: c, isHeader: false }))],
            pageNumber: pageNum,
            confidence: 0.85,
          });
          continue;
        }
        const gapPositions = this.tableGapPositions(trimmed);
        if (gapPositions.length >= 1) {
          const cells = trimmed.split(/\s{3,}/).map((c) => c.trim()).filter(Boolean);
          if (cells.length >= 2) {
            if (pendingTable && this.sameTableSignature(pendingTable.positions, gapPositions)) {
              pendingTable.rows.push(cells);
              pendingTable.rawTexts.push(trimmed);
            } else {
              flushPendingTable();
              pendingTable = { positions: gapPositions, rows: [cells], rawTexts: [trimmed] };
            }
            continue;
          }
          flushPendingTable();
        }
        flushPendingTable();

        // Quote / Blockquote Detection
        if (trimmed.startsWith('\u201C') || trimmed.startsWith('"') || trimmed.startsWith('\u00BB') || trimmed.startsWith('>')) {
          const cleanQuote = trimmed.replace(/^[\u201C">\u00BB]\s*|[\u201D"]$/g, '').trim();
          pageBlocks.push({
            id: `block_${pageNum}_${pageBlocks.length}`,
            type: 'pullQuote',
            text: cleanQuote,
            pageNumber: pageNum,
            confidence: 0.9,
          });
          continue;
        }

        // Standard Paragraph
        const words = trimmed.split(/\s+/).filter(Boolean);
        totalWords += words.length;

        pageBlocks.push({
          id: `block_${pageNum}_${pageBlocks.length}`,
          type: 'paragraph',
          text: trimmed,
          isDropCap: isFirstLine && pageNum === 1 && trimmed.length > 50,
          pageNumber: pageNum,
          confidence: 0.98,
        });

        isFirstLine = false;
      }
      flushPendingTable();

      // Embedded image extraction for this page (deduped by content hash).
      const pageImages = content.pageImages.find((p) => p.pageNumber === pageNum)?.images || [];
      for (const embeddedImage of pageImages) {
        if (uniqueImagesCount + extractedImages.length >= 100) {
          warnings.push('Embedded image limit reached; remaining images on this document were skipped.');
          break;
        }
        const imageBuffer = embeddedImage.data ? Buffer.from(embeddedImage.data) : null;
        if (!imageBuffer || imageBuffer.length === 0) continue;

        const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        if (seenImageHashes.has(imageHash)) {
          duplicateImagesCount++;
          continue;
        }
        seenImageHashes.add(imageHash);

        const ext = /^data:image\/([a-z0-9]+);/i.exec(embeddedImage.dataUrl || '')?.[1] || 'png';
        const filename = `pdf-extracted-p${pageNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const fakeMulterFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: filename,
          encoding: '7bit',
          mimetype: `image/${ext}`,
          buffer: imageBuffer,
          size: imageBuffer.length,
          stream: null as any,
          destination: '',
          filename,
          path: '',
        };

        try {
          const savedMedia = await this.mediaService.uploadImage(fakeMulterFile, user);
          uniqueImagesCount++;
          extractedImages.push({
            originalName: embeddedImage.name || filename,
            mediaId: savedMedia.id,
            url: savedMedia.url,
            mimeType: savedMedia.mimeType,
            sizeBytes: savedMedia.size,
            sha256Hash: imageHash,
            width: embeddedImage.width,
            height: embeddedImage.height,
            caption: `Extracted image from page ${pageNum}`,
          });
          // D3: yield after I/O so the event loop is not starved.
          await new Promise<void>((resolve) => setImmediate(resolve));
        } catch (err: any) {
          warnings.push(
            `Image on page ${pageNum} (${embeddedImage.name || 'unknown'}) could not be extracted: ${err?.message || 'upload failed'}`,
          );
        }
      }

      pagesIR.push({
        pageNumber: pageNum,
        width: 595, // A4 standard pt
        height: 842,
        rotation: 0,
        isScanned: isPageScanned,
        blocks: pageBlocks,
        wordCount: pageBlocks.reduce((acc, b) => (b.type === 'paragraph' ? acc + (b as ParagraphBlock).text.split(/\s+/).length : acc), 0),
      });

      // D3: yield to the event loop so pending HTTP/SSE traffic is not starved.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    // Compile Gazette Document IR
    const detectedTitle = pagesIR[0]?.blocks.find((b) => b.type === 'heading')?.text || file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const documentIR: GazetteDocumentIR = {
      version: '1.0',
      sourceFormat: file.originalname.endsWith('.pdf') ? 'pdf' : 'docx',
      filename: file.originalname,
      fileSizeBytes: file.size,
      sha256: fileSha256,
      totalPages,
      totalWords,
      detectedTitle,
      creationDate: new Date().toISOString(),
      pages: pagesIR,
      links: allLinks,
      summary: {
        totalBlocks: pagesIR.reduce((acc, p) => acc + p.blocks.length, 0),
        textBlocksCount: pagesIR.reduce((acc, p) => acc + p.blocks.filter((b) => b.type === 'paragraph' || b.type === 'heading').length, 0),
        imagesCount: uniqueImagesCount + duplicateImagesCount,
        uniqueImagesCount,
        duplicateImagesRemoved: duplicateImagesCount,
        tablesCount: pagesIR.reduce((acc, p) => acc + p.blocks.filter((b) => b.type === 'table').length, 0),
        linksCount: allLinks.length,
        figuresCount: 0,
        equationsCount: 0,
        footnotesCount: 0,
        scannedPagesCount: pagesIR.filter((p) => p.isScanned).length,
        requiresReviewCount: reviewRequiredItems.length,
      },
    };

    // Generate Semantic HTML from IR
    const generatedHtml = this.convertIRToSemanticHtml(documentIR);

    const statusOutcome: ImportJobReport['statusOutcome'] =
      reviewRequiredItems.length > 0 ? 'REVIEW REQUIRED' : warnings.length > 0 ? 'WARNING' : 'SUCCESS';

    job.report = {
      statusOutcome,
      totalWords,
      totalPages,
      imagesExtracted: uniqueImagesCount,
      duplicatesDeduplicated: duplicateImagesCount,
      linksRecovered: allLinks.length,
      tablesReconstructed: documentIR.summary.tablesCount,
      equationsPreserved: 0,
      scannedPagesOcrApplied: documentIR.summary.scannedPagesCount,
      warnings,
      reviewRequiredItems,
    };

    job.status = statusOutcome === 'REVIEW REQUIRED' ? 'review_required' : statusOutcome === 'WARNING' ? 'warning' : 'completed';
    job.progressPercent = 100;
    job.currentStage = 'Ingestion Completed';
    job.documentIR = documentIR;
    job.extractedImages = extractedImages;
    job.generatedHtml = generatedHtml;
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
  }

  /**
   * Converts canonical GazetteDocumentIR into semantic Gazette HTML
   */
  convertIRToSemanticHtml(docIR: GazetteDocumentIR): string {
    const pageHtmlPieces: string[] = [];

    for (const page of docIR.pages) {
      const blockHtmlPieces: string[] = [];

      for (const block of page.blocks) {
        switch (block.type) {
          case 'heading': {
            const h = block as HeadingBlock;
            blockHtmlPieces.push(`<h${h.level}>${this.linkifyInlineText(h.text)}</h${h.level}>`);
            break;
          }
          case 'paragraph': {
            const p = block as ParagraphBlock;
            const dropCapClass = p.isDropCap ? ' class="cms-drop-cap"' : '';
            blockHtmlPieces.push(`<p${dropCapClass}>${this.linkifyInlineText(p.text)}</p>`);
            break;
          }
          case 'pullQuote': {
            blockHtmlPieces.push(`<blockquote class="cms-pull-quote"><p>${this.linkifyInlineText((block as any).text)}</p></blockquote>`);
            break;
          }
          case 'table': {
            const t = block as TableBlock;
            const headersHtml = t.headers.map((h) => `<th style="padding: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 600;">${h}</th>`).join('');
            const rowsHtml = t.rows.map((row) => `<tr>${row.map((c) => `<td style="padding: 8px; border: 1px solid #cbd5e1;">${c.content}</td>`).join('')}</tr>`).join('');
            blockHtmlPieces.push(`<table class="cms-editorial-table" style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;"><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`);
            break;
          }
          default:
            break;
        }
      }

      if (blockHtmlPieces.length > 0) {
        pageHtmlPieces.push(blockHtmlPieces.join('\n\n'));
      }
    }

    return pageHtmlPieces.join('\n\n<hr class="cms-page-break my-6" />\n\n');
  }

  /**
   * Makes hyperlinks from a PDF live in the generated HTML, mirroring the
   * docx pipeline's formatInlineContent conversion:
   *   1. Markdown-style [visible text](https://...) — produced by pdf-parse
   *      when `parseHyperlinks: true` renders link annotations inline.
   *   2. Bare http(s) URLs.
   */
  private linkifyInlineText(text: string): string {
    if (!text) return '';

    let formatted = text;
    formatted = formatted.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-crimson font-serif underline hover:text-rose-900 transition-colors">$1</a>',
    );
    formatted = formatted.replace(/(?<!href=["'])(https?:\/\/[^\s<]+)/g, (url) => {
      const safeUrl = url.replace(/[),.;]+$/, '') || url;
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-accent-crimson font-serif underline hover:text-rose-900 transition-colors">${safeUrl}</a>`;
    });
    return formatted;
  }

  /**
   * D5: Real extraction via pdf-parse v2 (pdf.js): per-page text, embedded
   * images, and per-page hyperlink annotations in a single parser pass.
   *
   * The earlier `segmentPdfPages()` regex-scraped raw PDF bytes looking for
   * `(readable strings)` and `[arrays]` inside uncompressed stream objects.
   * Virtually all modern PDFs compress content streams with Flate/prediction,
   * which means those byte patterns don't exist in the raw file — producing
   * either empty pages or a 5000-byte mojibake fallback.
   *
   * pdf-parse v2 uses pdf.js to decode the actual content streams, yielding
   * correct per-page text for text-based PDFs plus recoverable embedded images
   * (getImage) and link annotations (getInfo parsePageInfo). For scanned/
   * image-only PDFs (no text layer), pages come back with empty strings — which
   * the caller marks as `isScanned: true` with an honest warning.
   */
  private async extractPdfContent(buffer: Buffer): Promise<{
    pageTexts: string[];
    pageImages: Array<{ pageNumber: number; images: EmbeddedImageDescriptor[] }>;
    pageLinks: Array<{ pageNumber: number; links: Array<{ text?: string; url?: string }> }>;
  }> {
    const PDFParseCtor = pdfParseModule?.PDFParse;
    if (typeof PDFParseCtor !== 'function') {
      throw new BadRequestException('PDF parsing engine (pdf-parse v2) is unavailable on this server.');
    }

    const parser = new PDFParseCtor({ data: buffer });
    try {
      const result = await parser.getText({
        lineEnforce: true,   // preserve paragraph / line structure
        pageJoiner: '',      // we read per-page from result.pages, no markers
        parseHyperlinks: true, // render link annotations inline as [text](url)
      });

      const pages: Array<{ num?: number; text?: string }> = Array.isArray(result?.pages) ? result.pages : [];
      const pageTexts = pages
        .slice()
        .sort((a, b) => (a?.num ?? 0) - (b?.num ?? 0))
        .map((p) => (typeof p?.text === 'string' ? p.text : ''));

      // Best-effort: hyperlink annotations (visible text + target URL).
      let pageLinks: Array<{ pageNumber: number; links: Array<{ text?: string; url?: string }> }> = [];
      if (typeof parser.getInfo === 'function') {
        try {
          const info = await parser.getInfo({ parsePageInfo: true });
          if (Array.isArray(info?.pages)) {
            pageLinks = info.pages
              .filter((p: any) => Array.isArray(p?.links))
              .map((p: any) => ({
                pageNumber: p.pageNumber,
                links: p.links,
              }));
          }
        } catch (err: any) {
          this.logger.warn(`Hyperlink annotation extraction skipped (${err?.message})`);
        }
      }

      // Best-effort: embedded images per page (data as raw Uint8Array).
      let pageImages: Array<{ pageNumber: number; images: EmbeddedImageDescriptor[] }> = [];
      if (typeof parser.getImage === 'function') {
        try {
          const imageResult = await parser.getImage({ imageThreshold: 0 });
          if (Array.isArray(imageResult?.pages)) {
            pageImages = imageResult.pages
              .filter((p: any) => Array.isArray(p?.images))
              .map((p: any) => ({
                pageNumber: p.pageNumber,
                images: p.images.map((img: any) => ({
                  name: img?.name,
                  width: img?.width,
                  height: img?.height,
                  data: img?.data,
                  dataUrl: img?.dataUrl,
                })),
              }));
          }
        } catch (err: any) {
          this.logger.warn(`Embedded image extraction skipped (${err?.message})`);
        }
      }

      return {
        // A valid PDF always yields >= 1 page. An empty array means something
        // unexpected — fall back to a single empty page so the downstream IR
        // pipeline still produces a result rather than crashing.
        pageTexts: pageTexts.length > 0 ? pageTexts : [''],
        pageImages,
        pageLinks,
      };
    } finally {
      await parser.destroy();
    }
  }

  /**
   * Reconstructs wrapped lines into natural multi-column paragraphs.
   *
   * Now operates on real pdf.js-extracted text (one page at a time), so the
   * heuristic merge of continuation lines actually works on semantic content
   * rather than garbled binary fragments. Chat/export PDFs (Word, ChatGPT,
   * e.g.) repeat two kinds of chrome on every line:
   *   - "1 / 2"-style page fractions and bare page numbers
   *   - "Title | N" running headers (title, pipe, page number) whose pipe
   *     would otherwise be misread as a table delimiter
   * Those tokens are dropped before merging so they can never leak into
   * paragraphs or become phantom one-row tables / fake headings.
   */
  private reconstructPageLines(rawPageText: string): string[] {
    const isPageChrome = (line: string) =>
      /^(page\s+\d+(\s+of\s+\d+)?|\d+\s*[/-]\s*\d+|\d+)$/i.test(line) ||
      /^.{10,}\|\s*\d+\s*$/.test(line);
    const lines = rawPageText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !isPageChrome(l));
    const paragraphs: string[] = [];
    let currentPara = '';

    for (const line of lines) {
      if (!currentPara) {
        currentPara = line;
        continue;
      }

      // Check if line continues previous sentence. A wide-gap line is a
      // column-aligned row candidate — never merge it into running prose
      // (this is what turned justified chat text + tables into "random stuff").
      const endsWithSentencePunctuation = /[.!?:;]$/.test(currentPara);
      const isListItemOrBullet = /^(\d+\.|\*|-|•)\s+/.test(line);
      const isColumnarCandidate = /\s{3,}/.test(line) || /\s{3,}/.test(currentPara);

      if (endsWithSentencePunctuation || isListItemOrBullet || isColumnarCandidate) {
        paragraphs.push(currentPara);
        currentPara = line;
      } else {
        currentPara += ` ${line}`;
      }
    }

    if (currentPara) {
      paragraphs.push(currentPara);
    }

    return paragraphs;
  }

  /**
   * Returns the byte offsets where a line has runs of 3+ spaces (candidate
   * column gaps). Empty when the line has no wide gaps.
   */
  private tableGapPositions(line: string): number[] {
    const positions: number[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === ' ') {
        const start = i;
        while (i < line.length && line[i] === ' ') i += 1;
        if (i - start >= 3) positions.push(start);
      } else {
        i += 1;
      }
    }
    return positions;
  }

  /**
   * True when two rows' column gaps fall at the same offsets (±3 chars),
   * i.e. they share the same column layout. Distinct rows of a real table
   * align; justified prose lines do not.
   */
  private sameTableSignature(a: number[], b: number[]): boolean {
    if (a.length !== b.length || a.length === 0) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (Math.abs(a[i] - b[i]) > 3) return false;
    }
    return true;
  }

  /**
   * Normalizes a running-header candidate: strips a trailing "| N" or " N"
   * page-number token so "Title | 4" and "Title   4" both normalize to "Title".
   */
  private normalizeHeaderCandidate(line: string): string {
    return line.replace(/\s*\|\s*\d+\s*$/i, '').replace(/\s\d+\s*$/, '').trim();
  }

  /**
   * Detects a running document header: a first-line string that repeats, modulo
   * its page number, on >= 2 pages. Returns null when no shared header exists.
   */
  private detectRunningHeader(pageTexts: string[]): string | null {
    const sightings = new Map<string, number>();
    for (const pageText of pageTexts) {
      const firstLine = pageText.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
      if (!firstLine || firstLine.length < 8) continue;
      const normalized = this.normalizeHeaderCandidate(firstLine);
      if (!normalized || normalized.length < 8) continue;
      sightings.set(normalized, (sightings.get(normalized) ?? 0) + 1);
    }
    let header: string | null = null;
    let bestCount = 0;
    for (const [candidate, count] of sightings) {
      if (count > bestCount) {
        bestCount = count;
        header = candidate;
      }
    }
    return bestCount >= 2 ? header : null;
  }

  /**
   * Removes every line whose normalized form equals the running header, so
   * the "Title | N" chrome is stripped from the body before block building.
   */
  private stripRunningHeader(pageText: string, header: string | null): string {
    if (!header) return pageText;
    return pageText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => {
        if (!l) return false;
        if (l.length < 8) return true;
        return this.normalizeHeaderCandidate(l) !== header;
      })
      .join('\n');
  }
}
