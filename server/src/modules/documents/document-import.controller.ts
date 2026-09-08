import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentImportService, type DocumentImportResult } from './document-import.service';
import { GutenbergAdapterService, type GutenbergParseResult } from './gutenberg-adapter.service';
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
  ): Promise<DocumentImportResult> {
    return this.documentImportService.importDocument(file, user);
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
