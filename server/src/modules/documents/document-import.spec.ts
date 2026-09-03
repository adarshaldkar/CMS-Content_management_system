import { BadRequestException } from '@nestjs/common';
import { DocumentImportService } from './document-import.service';
import type { AuthUser } from '../../domain/models';

describe('DocumentImportService', () => {
  let service: DocumentImportService;
  let mockMediaService: any;

  const mockUser: AuthUser = {
    id: 'user-123',
    email: 'author@thegazette.com',
    role: 'AUTHOR' as any,
    permissions: [],
  };

  beforeEach(() => {
    mockMediaService = {
      uploadImage: jest.fn().mockResolvedValue({
        id: 'media-extracted-1',
        url: '/uploads/docx-extracted-1.png',
        mimeType: 'image/png',
        size: 1024,
      }),
    };

    service = new DocumentImportService(mockMediaService);
  });

  describe('Markdown Parsing (.md)', () => {
    it('should parse GFM headings, bold text, lists, and code blocks cleanly', async () => {
      const mdContent = `
# Artificial Intelligence in Journalism

Recent developments in **large language models** have transformed editorial workflows.

- Real-time fact verification
- Automated transcript generation

\`\`\`typescript
const editor = "The Gazette Studio";
\`\`\`
`.trim();

      const fakeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'ai_report.md',
        encoding: '7bit',
        mimetype: 'text/markdown',
        buffer: Buffer.from(mdContent),
        size: Buffer.from(mdContent).length,
        stream: null as any,
        destination: '',
        filename: 'ai_report.md',
        path: '',
      };

      const result = await service.importDocument(fakeFile, mockUser);

      expect(result.format).toBe('md');
      expect(result.filename).toBe('ai_report.md');
      expect(result.title).toBe('Artificial Intelligence in Journalism');
      expect(result.wordCount).toBeGreaterThan(15);
      expect(result.headingsCount).toBe(1);
      expect(result.htmlContent).toContain('<h1>Artificial Intelligence in Journalism</h1>');
      expect(result.htmlContent).toContain('<strong>large language models</strong>');
      expect(result.htmlContent).toContain('<li>Real-time fact verification</li>');
    });
  });

  describe('Plain Text Parsing (.txt)', () => {
    it('should split paragraphs and format bullet lists', async () => {
      const txtContent = `
Breakthroughs in Quantum Computing

Engineers have demonstrated fault-tolerant qubits operating at sub-kelvin temperatures.

* Superconducting circuits
* Ion-trap architectures
`.trim();

      const fakeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'quantum.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        buffer: Buffer.from(txtContent),
        size: Buffer.from(txtContent).length,
        stream: null as any,
        destination: '',
        filename: 'quantum.txt',
        path: '',
      };

      const result = await service.importDocument(fakeFile, mockUser);

      expect(result.format).toBe('txt');
      expect(result.filename).toBe('quantum.txt');
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.htmlContent).toContain('<p>Breakthroughs in Quantum Computing</p>');
      expect(result.htmlContent).toContain('<ul><li>Superconducting circuits</li>');
    });
  });

  describe('Format Gatekeeper & Size Limits', () => {
    it('should reject unsupported file formats', async () => {
      const fakeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'malicious.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('MZ000000'),
        size: 8,
        stream: null as any,
        destination: '',
        filename: 'malicious.exe',
        path: '',
      };

      await expect(service.importDocument(fakeFile, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject files exceeding 25 MB cap', async () => {
      const fakeFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'oversized.docx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.alloc(26 * 1024 * 1024),
        size: 26 * 1024 * 1024,
        stream: null as any,
        destination: '',
        filename: 'oversized.docx',
        path: '',
      };

      await expect(service.importDocument(fakeFile, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
