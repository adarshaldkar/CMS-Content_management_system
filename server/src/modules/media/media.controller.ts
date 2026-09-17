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
  Headers,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import * as fs from 'fs';
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
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Upload and auto-optimize an image asset (PNG, JPEG, WebP, AVIF, GIF up to 100MB)' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB Limit
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<Media> {
    return this.mediaService.uploadImage(file, user);
  }

  @Post('video/upload')
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Upload a video asset (MP4, WebM, MOV up to 100 MB)' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<Media> {
    return this.mediaService.uploadVideo(file, user);
  }

  /**
   * HTTP 206 Partial Content Streaming Endpoint
   * Supports range requests, conditional ETag headers, and low-latency seeking.
   * Publicly accessible for HTML5 video elements.
   */
  @Get('stream/:mediaId')
  @ApiOperation({ summary: 'Stream video asset using HTTP 206 Byte-Ranges' })
  async streamVideo(
    @Param('mediaId') mediaId: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const streamInfo = await this.mediaService.getMediaStreamInfo(mediaId, rangeHeader);

    const { filePath, fileSize, mimeType, rangeInfo } = streamInfo;

    // Set standard response caching headers
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('ETag', `"video-${mediaId}"`);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');

    if (rangeInfo) {
      const { start, end, chunkSize } = rangeInfo;
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);

      const videoStream = fs.createReadStream(filePath, { start, end });
      videoStream.pipe(res);
    } else {
      res.status(HttpStatus.OK);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Type', mimeType);

      const videoStream = fs.createReadStream(filePath);
      videoStream.pipe(res);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Get details and processing status of a single media asset' })
  async getOne(@Param('id') id: string): Promise<Media> {
    return this.mediaService.getMedia(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
  @ApiOperation({ summary: 'List uploaded media assets' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '24',
    @Query('scope') scope?: string,
  ): Promise<PaginatedResult<Media>> {
    return this.mediaService.listMedia(
      user,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 24,
      scope === 'own',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, CsrfGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Delete a media asset' })
  @RequirePermissions(Permission.MEDIA_DELETE_OWN)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.mediaService.deleteMedia(id, user);
  }
}
