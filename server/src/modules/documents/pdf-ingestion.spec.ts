import { BadRequestException } from '@nestjs/common';
import { PdfIngestionService } from './pdf-ingestion.service';
import type { AuthUser } from '../../domain/models';

jest.mock('pdf-parse', () => ({ PDFParse: jest.fn() }));

const mockPDFParse = jest.requireMock('pdf-parse').PDFParse as jest.Mock;

describe('PdfIngestionService', () => {
  let service: PdfIngestionService;
  let mockRedisService: any;
  let mockMediaService: any;

  const mockUser: AuthUser = {
    id: 'author-1',
    email: 'author@thegazette.com',
    role: 'AUTHOR' as any,
    permissions: [],
  };

  const pdfBytes = Buffer.from('%PDF-1.4\n%minimal\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const buildPdfFile = (text?: string): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'report.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: text ? Buffer.from(text) : pdfBytes,
    size: text ? Buffer.from(text).length : pdfBytes.length,
    stream: null as any,
    destination: '',
    filename: 'report.pdf',
    path: '',
  });

  beforeEach(() => {
    mockPDFParse.mockClear();
    mockPDFParse.mockImplementation(function (this: any, options: any) {
      this.options = options;
    });
    mockPDFParse.prototype.getText = jest.fn();
    mockPDFParse.prototype.getInfo = jest.fn();
    mockPDFParse.prototype.getImage = jest.fn();
    mockPDFParse.prototype.destroy = jest.fn().mockResolvedValue(undefined);

    mockMediaService = {
      uploadImage: jest.fn().mockResolvedValue({
        id: 'media-extracted-1',
        url: '/uploads/pdf-extracted-p1.png',
        mimeType: 'image/png',
        size: 2048,
      }),
    };

    mockRedisService = {
      isHealthy: jest.fn().mockReturnValue(false),
      getClient: jest.fn().mockReturnValue(null),
    };

    service = new PdfIngestionService(mockMediaService, mockRedisService);
  });

  describe('validateFileSecurity', () => {
    it('accepts a file with the %PDF- magic byte header', () => {
      expect(() => service.validateFileSecurity(buildPdfFile())).not.toThrow();
    });

    it('accepts DOCX (PK) magic bytes', () => {
      const file = buildPdfFile();
      Object.assign(file, {
        originalname: 'notes.docx',
        buffer: Buffer.from('PK\x03\x04compressed-fake-content'.padEnd(12, 'x')),
        size: 12,
      });
      expect(() => service.validateFileSecurity(file)).not.toThrow();
    });

    it('rejects files without a supported magic byte header', () => {
      const file = buildPdfFile();
      Object.assign(file, { buffer: Buffer.from('MZ000000'), size: 8 });
      expect(() => service.validateFileSecurity(file)).toThrow(BadRequestException);
    });

    it('rejects files exceeding the 25 MB cap', () => {
      const file = buildPdfFile();
      Object.assign(file, { buffer: Buffer.alloc(26 * 1024 * 1024), size: 26 * 1024 * 1024 });
      expect(() => service.validateFileSecurity(file)).toThrow(BadRequestException);
    });
  });

  describe('createIngestionJob', () => {
    it('extracts real pdf-parse page text and completes with IR + generated HTML', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 2,
        text: 'Quarterly Report\nRevenue grew 12% year over year.',
        pages: [
          { num: 1, text: 'Quarterly Report' },
          { num: 2, text: 'Revenue grew 12% year over year, beating expectations.' },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      expect(job.status).toBe('completed');
      expect(job.totalPages).toBe(2);
      expect(job.progressPercent).toBe(100);
      expect(mockPDFParse).toHaveBeenCalledTimes(1);
      expect(mockPDFParse.prototype.getText).toHaveBeenCalledWith(
        expect.objectContaining({ lineEnforce: true, pageJoiner: '' }),
      );
      expect(mockPDFParse.prototype.destroy).toHaveBeenCalled();

      expect(job.documentIR).toBeDefined();
      expect(job.documentIR!.detectedTitle).toBe('Quarterly Report');
      expect(job.documentIR!.pages).toHaveLength(2);
      expect(job.documentIR!.pages[0].blocks[0].type).toBe('heading');
      expect(job.documentIR!.pages[1].blocks[0].type).toBe('paragraph');
      expect(job.generatedHtml).toContain('<h1>Quarterly Report</h1>');
      expect(job.generatedHtml).toContain('<p>Revenue grew 12% year over year, beating expectations.</p>');
    });

    it('marks image-only pages as scanned with an honest warning instead of faking OCR', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 2,
        text: '',
        pages: [
          { num: 1, text: '' },
          { num: 2, text: 'This page has a real text layer.' },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      expect(job.status).toBe('warning');
      expect(job.documentIR!.pages[0].isScanned).toBe(true);
      expect(job.documentIR!.pages[1].isScanned).toBe(false);
      expect(job.documentIR!.summary.scannedPagesCount).toBe(1);
      expect(job.report!.scannedPagesOcrApplied).toBe(1);
      expect(job.report!.warnings.some((w) => w.includes('no extractable text layer'))).toBe(true);
      expect(job.report!.warnings.some((w) => w.includes('OCR applied'))).toBe(false);
    });

    it('recovers hyperlinks from annotations (getInfo) and bare URLs in text', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 1,
        text: 'Read the report at https://example.com/fin for details.',
        pages: [{ num: 1, text: 'Read the report at https://example.com/fin for details.' }],
      });
      mockPDFParse.prototype.getInfo.mockResolvedValue({
        total: 1,
        pages: [
          {
            pageNumber: 1,
            links: [{ text: 'Example Finance', url: 'https://example.com/fin' }],
          },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      // Annotation link deduped against the bare-URL passthrough, so only one entry.
      expect(job.documentIR!.links).toHaveLength(1);
      expect(job.documentIR!.links[0].url).toBe('https://example.com/fin');
      expect(job.documentIR!.links[0].visibleText).toBe('Example Finance');
      expect(job.documentIR!.links[0].pageNumber).toBe(1);
    });

    it('extracts embedded images, uploads them, and reports unique/duplicate counts', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 2,
        text: 'Page one\nPage two',
        pages: [
          { num: 1, text: 'Page one' },
          { num: 2, text: 'Page two' },
        ],
      });
      mockPDFParse.prototype.getImage.mockResolvedValue({
        total: 2,
        pages: [
          {
            pageNumber: 1,
            images: [
              {
                name: 'img_p1',
                width: 1200,
                height: 800,
                data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]),
                dataUrl: 'data:image/png;base64,iVBORw0KGg==',
              },
            ],
          },
          {
            pageNumber: 2,
            images: [
              {
                name: 'img_p2_dup',
                width: 1200,
                height: 800,
                data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]),
                dataUrl: 'data:image/png;base64,iVBORw0KGg==',
              },
            ],
          },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      expect(mockMediaService.uploadImage).toHaveBeenCalledTimes(1);
      expect(job.extractedImages).toHaveLength(1);
      expect(job.extractedImages![0]).toMatchObject({
        originalName: 'img_p1',
        mediaId: 'media-extracted-1',
        url: '/uploads/pdf-extracted-p1.png',
        mimeType: 'image/png',
        sha256Hash: expect.any(String),
      });
      expect(job.documentIR!.summary.uniqueImagesCount).toBe(1);
      expect(job.documentIR!.summary.duplicateImagesRemoved).toBe(1);
      expect(job.report!.imagesExtracted).toBe(1);
      expect(job.report!.duplicatesDeduplicated).toBe(1);
    });

    it('degrades gracefully when an embedded image cannot be uploaded', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 1,
        text: 'Page one',
        pages: [{ num: 1, text: 'Page one' }],
      });
      mockPDFParse.prototype.getImage.mockResolvedValue({
        total: 1,
        pages: [
          {
            pageNumber: 1,
            images: [
              {
                name: 'img_bad',
                width: 10,
                height: 10,
                data: new Uint8Array([1, 2, 3, 4, 5]),
                dataUrl: 'data:image/png;base64,AAAA',
              },
            ],
          },
        ],
      });
      mockMediaService.uploadImage.mockRejectedValue(new Error('File exceeds the maximum size limit of 5 MB.'));

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      expect(job.status).toBe('warning');
      expect(job.extractedImages).toHaveLength(0);
      expect(job.report!.warnings.some((w) => w.includes('could not be extracted'))).toBe(true);
    });

    it('marks the job failed with an error message when pdf-parse fails, without throwing', async () => {
      mockPDFParse.prototype.getText.mockRejectedValue(
        new Error('PasswordException: PDF is encrypted'),
      );

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);

      expect(job.status).toBe('failed');
      expect(job.errorMessage).toContain('PDF is encrypted');
      expect(job.completedAt).toBeUndefined();
    });

    it('does not turn justified chat/export prose into tables (ChatGPT-style PDFs)', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 1,
        text: [
          'Presenting the key findings of our Q3 analysis for review, thank you.',
          'Our revenue   grew substantially   across all regions   this quarter.',
          'Please       feel free to review      the attached numbers.',
        ].join('\n'),
        pages: [
          {
            num: 1,
            text: [
              'Presenting the key findings of our Q3 analysis for review, thank you.',
              'Our revenue   grew substantially   across all regions   this quarter.',
              'Please       feel free to review      the attached numbers.',
            ].join('\n'),
          },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);
      const firstPage = job.documentIR!.pages[0];

      expect(firstPage.blocks.filter((b) => b.type === 'table')).toHaveLength(0);
      expect(firstPage.blocks.filter((b) => b.type === 'paragraph').length).toBeGreaterThanOrEqual(2);
      expect(job.generatedHtml).not.toContain('cms-editorial-table');
    });

    it('reconstructs a genuine aligned column table across consecutive rows', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 1,
        text: [
          'Introductory sentence before the table for context here.',
          'Alpha      1200      Delta',
          'Gamma      3400      Epsilon',
        ].join('\n'),
        pages: [
          {
            num: 1,
            text: [
              'Introductory sentence before the table for context here.',
              'Alpha      1200      Delta',
              'Gamma      3400      Epsilon',
            ].join('\n'),
          },
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);
      const tables = job.documentIR!.pages[0].blocks.filter((b) => b.type === 'table');

      expect(tables).toHaveLength(1);
      const table = tables[0] as any;
      expect(table.headers).toEqual(['Alpha', '1200', 'Delta']);
      expect(table.rows).toHaveLength(2);
      expect(table.rows[1].map((c: any) => c.content)).toEqual(['Gamma', '3400', 'Epsilon']);
    });

    it('skips ChatGPT-style "1 / 2" page furniture instead of leaking it into paragraphs', async () => {
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 1,
        text: 'Introductory sentence here for context.\n1 / 2\nSecond paragraph of actual content.',
        pages: [{ num: 1, text: 'Introductory sentence here for context.\n1 / 2\nSecond paragraph of actual content.' }],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);
      const blocks = job.documentIR!.pages[0].blocks;

      expect(blocks.filter((b) => b.type === 'paragraph').length).toBeGreaterThanOrEqual(2);
      expect(blocks.some((b) => (b as any).text?.includes('1 / 2'))).toBe(false);
      expect(job.generatedHtml).not.toContain('1 / 2');
    });

    it('strips running "Title | N" headers repeated across pages (COFPS-style exports)', async () => {
      const makePage = (num: number, body: string) => {
        const text = `COFPS - Complete Course Notes | ${num}\n${body}`;
        return { num, text };
      };
      mockPDFParse.prototype.getText.mockResolvedValue({
        total: 2,
        text: 'x',
        pages: [
          makePage(1, '1.4 Financial Impact\nOnline fraud creates three major impact areas.'),
          makePage(2, 'Module 5: Fraud Prevention Principles\nThis module converts awareness into habits.'),
        ],
      });

      const job = await service.createIngestionJob(buildPdfFile(), mockUser);
      const blocks = Array.prototype.concat(...job.documentIR!.pages.map((p) => p.blocks));

      // No phantom pipe tables and no fake heading containing the header text.
      expect(blocks.filter((b) => b.type === 'table')).toHaveLength(0);
      expect(blocks.some((b) => (b as any).text?.includes('COFPS - Complete Course Notes'))).toBe(false);
      expect(job.generatedHtml).not.toContain('COFPS - Complete Course Notes');
      expect(job.generatedHtml).not.toContain('cms-editorial-table');
      // The real content survived as a merged paragraph.
      expect(
        blocks.some((b) => (b as any).text?.includes('Module 5: Fraud Prevention Principles')),
      ).toBe(true);
    });
  });

  describe('getJob', () => {
    it('returns an in-memory job by id', async () => {
      const job = await service.createIngestionJob(buildPdfFile(), mockUser);
      const found = await service.getJob(job.id);
      expect(found?.id).toBe(job.id);
    });

    it('returns null for an unknown id when Redis is unhealthy', async () => {
      expect(await service.getJob('nope')).toBeNull();
    });

    it('falls back to Redis when the job is not in memory', async () => {
      const serialized = JSON.stringify({
        id: 'job_restored',
        status: 'completed',
        progressPercent: 100,
      });
      mockRedisService.isHealthy.mockReturnValue(true);
      mockRedisService.getClient.mockReturnValue({
        get: jest.fn().mockResolvedValue(serialized),
      });

      const found = await service.getJob('job_restored');
      expect(found?.id).toBe('job_restored');
    });
  });
});