import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentImportService, type DocumentImportResult } from './document-import.service';
import { GutenbergAdapterService, type GutenbergParseResult } from './gutenberg-adapter.service';
import { PdfIngestionService } from './pdf-ingestion.service';
import { type ImportJob } from './models/import-job.model';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators/security.decorators';
import { Permission, type AuthUser } from '../../domain/models';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class DocumentImportController {
  constructor(
    private readonly documentImportService: DocumentImportService,
    private readonly gutenbergAdapterService: GutenbergAdapterService,
    private readonly pdfIngestionService: PdfIngestionService,
  ) {}

  @Post('import')
  @ApiOperation({ summary: 'Import document (.docx, .md, .txt, .pdf) into manuscript' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
    }),
  )
  async importDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<DocumentImportResult & { job?: ImportJob }> {
    // If it's a PDF, run through the comprehensive PdfIngestionService pipeline
    if (file.originalname.toLowerCase().endsWith('.pdf')) {
      const job = await this.pdfIngestionService.createIngestionJob(file, user);
      const docIR = job.documentIR;

      const pages = (docIR?.pages || []).map((p) => ({
        pageNumber: p.pageNumber,
        htmlContent: this.pdfIngestionService.convertIRToSemanticHtml({
          ...docIR!,
          pages: [p],
        }),
        wordCount: p.wordCount,
      }));

      return {
        htmlContent: job.generatedHtml || '',
        title: docIR?.detectedTitle || file.originalname.replace(/\.[^/.]+$/, ''),
        wordCount: docIR?.totalWords || 0,
        totalPages: docIR?.totalPages || 1,
        pages,
        format: 'pdf',
        readingTimeMinutes: Math.max(1, Math.ceil((docIR?.totalWords || 0) / 225)),
        headingsCount: docIR?.pages.reduce((acc, p) => acc + p.blocks.filter((b) => b.type === 'heading').length, 0) || 0,
        paragraphsCount: docIR?.pages.reduce((acc, p) => acc + p.blocks.filter((b) => b.type === 'paragraph').length, 0) || 0,
        extractedImages: [],
        filename: file.originalname,
        job,
      };

    }

    return this.documentImportService.importDocument(file, user);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get current status and telemetry of an ingestion job' })
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  async getJobStatus(@Param('id') jobId: string): Promise<ImportJob> {
    const job = this.pdfIngestionService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found.`);
    }
    return job;
  }

  @Post('gutenberg/parse')
  @ApiOperation({ summary: 'Parse WordPress Gutenberg block HTML comments into Gazette Semantic HTML' })
  @RequirePermissions(Permission.ARTICLE_CREATE)
  async parseGutenberg(
    @Body('gutenbergHtml') gutenbergHtml: string,
  ): Promise<GutenbergParseResult> {
    return this.gutenbergAdapterService.parseGutenbergToGazette(gutenbergHtml || '');
  }

  @Post('gutenberg/serialize')
  @ApiOperation({ summary: 'Serialize Gazette Semantic HTML into standard WordPress Gutenberg block comments' })
  @RequirePermissions(Permission.ARTICLE_CREATE)
  async serializeGutenberg(
    @Body('gazetteHtml') gazetteHtml: string,
  ): Promise<{ gutenbergHtml: string }> {
    const serialized = this.gutenbergAdapterService.serializeGazetteToGutenberg(gazetteHtml || '');
    return { gutenbergHtml: serialized };
  }
}
