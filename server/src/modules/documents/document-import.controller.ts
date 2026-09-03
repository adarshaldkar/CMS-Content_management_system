import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentImportService, type DocumentImportResult } from './document-import.service';
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
  constructor(private readonly documentImportService: DocumentImportService) {}

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
}
