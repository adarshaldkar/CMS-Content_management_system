import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators/security.decorators';
import { Permission, type AuthUser, type Media, type PaginatedResult } from '../../domain/models';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image asset (PNG, JPEG, WebP, AVIF, GIF)' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<Media> {
    return this.mediaService.uploadImage(file, user);
  }

  @Get()
  @ApiOperation({ summary: 'List uploaded media assets' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '24',
  ): Promise<PaginatedResult<Media>> {
    return this.mediaService.listMedia(
      user,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 24,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media asset' })
  @RequirePermissions(Permission.MEDIA_DELETE_OWN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteMedia(id, user);
  }
}
