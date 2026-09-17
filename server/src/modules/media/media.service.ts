import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  MEDIA_REPOSITORY,
  type IMediaRepository,
} from '../../repositories/interfaces/media.repository.interface';
import {
  AuditEventType,
  Permission,
  UserRole,
  type AuthUser,
  type Media,
  type PaginatedResult,
  type ImageVariant,
  type ImageOptimizationMeta,
} from '../../domain/models';
import { validateImageBuffer } from '../../common/utils/image-validator.util';
import {
  validateVideoMagicBytes,
  parseRangeHeader,
} from './utils/video-validator.util';
import { AuditService } from '../audit/audit.service';
import { OwnershipHelper } from '../../common/guards/ownership.guard';
import { ImageOptimizerService } from './image/image-optimizer.service';
import { StorageService } from './storage/storage.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepo: IMediaRepository,
    private readonly auditService: AuditService,
    private readonly imageOptimizer: ImageOptimizerService,
    private readonly storageService: StorageService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    user: AuthUser,
  ): Promise<Media> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided for upload.');
    }

    const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100 MB Limit
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File exceeds the maximum allowable limit of 100 MB.');
    }

    // Binary file signature & magic number verification
    const validation = validateImageBuffer(file.buffer);
    if (!validation.isValid) {
      throw new BadRequestException(
        validation.error || 'Invalid or forbidden image format.',
      );
    }

    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/avif': 'avif',
    };

    const ext = mimeToExt[validation.detectedMime || ''] || 'jpg';
    const fileBaseId = `media-${crypto.randomUUID()}`;
    const originalFilename = `${fileBaseId}-original.${ext}`;

    // 1. Save original master
    const originalAsset = await this.storageService.saveFile(
      originalFilename,
      file.buffer,
      validation.detectedMime || file.mimetype,
    );

    let finalMainUrl = originalAsset.url;
    let finalMainFilename = originalFilename;
    let finalMainMimeType = validation.detectedMime || file.mimetype;
    let finalMainSize = file.size;
    let variants: ImageVariant[] = [
      {
        kind: 'original',
        width: 0,
        height: 0,
        mimeType: finalMainMimeType,
        sizeBytes: file.size,
        url: originalAsset.url,
        storageKey: originalAsset.storageKey,
      },
    ];
    let optimizationMeta: ImageOptimizationMeta | undefined;

    // 2. Run Image Intelligence Pipeline for non-GIF static images
    if (validation.detectedMime !== 'image/gif') {
      try {
        const optimizedResult = await this.imageOptimizer.processImage(
          file.buffer,
          file.originalname,
          fileBaseId,
        );

        // Save Master WebP Derivative
        const masterWebpAsset = await this.storageService.saveFile(
          optimizedResult.masterFilename,
          optimizedResult.masterBuffer,
          optimizedResult.masterMimeType,
        );

        finalMainUrl = masterWebpAsset.url;
        finalMainFilename = optimizedResult.masterFilename;
        finalMainMimeType = optimizedResult.masterMimeType;
        finalMainSize = optimizedResult.optimizedSizeBytes;

        // Save responsive derivatives (Hero, Article, Card, Thumbnail)
        for (const variant of optimizedResult.variants) {
          const variantAsset = await this.storageService.saveFile(
            variant.filename,
            variant.buffer,
            variant.mimeType,
          );

          variants.push({
            kind: variant.kind,
            width: variant.width,
            height: variant.height,
            mimeType: variant.mimeType,
            sizeBytes: variant.sizeBytes,
            url: variantAsset.url,
            storageKey: variantAsset.storageKey,
          });
        }

        optimizationMeta = {
          originalSizeBytes: optimizedResult.originalSizeBytes,
          optimizedSizeBytes: optimizedResult.optimizedSizeBytes,
          savingsPercent: optimizedResult.savingsPercent,
          width: optimizedResult.width,
          height: optimizedResult.height,
          format: 'webp',
          appliedEnhancements: optimizedResult.appliedEnhancements,
          isUpscaled: optimizedResult.appliedEnhancements.some((e) => e.includes('UPSCALE')),
          isDownscaled: optimizedResult.appliedEnhancements.some((e) => e.includes('DOWNSCALE')),
        };
      } catch (err: any) {
        this.logger.error(`Image Intelligence Pipeline error: ${err.message}`, err.stack);
        // Graceful fallback to original file if processing fails
      }
    }

    const media = await this.mediaRepo.create({
      filename: finalMainFilename,
      originalName: path.basename(file.originalname).slice(0, 150),
      mimeType: finalMainMimeType,
      size: finalMainSize,
      url: finalMainUrl,
      uploadedBy: user.id,
      variants,
      optimization: optimizationMeta,
    });

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.MEDIA_UPLOADED,
      resource: `Media:${media.id}`,
      result: 'SUCCESS',
      metadata: {
        filename: finalMainFilename,
        size: finalMainSize,
        originalSize: file.size,
        savingsPercent: optimizationMeta?.savingsPercent || '0%',
        mimeType: media.mimeType,
        variantsCount: variants.length,
      },
    });

    return media;
  }

  async listMedia(
    user: AuthUser,
    page = 1,
    limit = 24,
    forceOwn = false,
  ): Promise<PaginatedResult<Media>> {
    const canReadAll =
      !forceOwn &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.EDITOR ||
        user.permissions.includes(Permission.MEDIA_READ_ALL));

    return this.mediaRepo.findMany({
      uploadedBy: canReadAll ? undefined : user.id,
      page,
      limit,
    });
  }

  async deleteMedia(id: string, user: AuthUser): Promise<{ success: boolean }> {
    const media = await this.mediaRepo.findById(id);
    if (!media) {
      throw new NotFoundException('Media asset not found.');
    }

    const canDeleteAny =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.permissions.includes(Permission.MEDIA_DELETE_ANY);

    OwnershipHelper.verifyOwnership(user, media, canDeleteAny);

    // Delete database record
    await this.mediaRepo.delete(id);

    // Delete local master file
    await this.storageService.deleteLocalFile(media.filename);

    // Delete local variant files if any
    if (media.variants && Array.isArray(media.variants)) {
      for (const variant of media.variants) {
        if (variant.storageKey) {
          await this.storageService.deleteLocalFile(variant.storageKey);
        }
      }
    }

    return { success: true };
  }

  async uploadVideo(
    file: Express.Multer.File,
    user: AuthUser,
  ): Promise<Media> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No video file provided for upload.');
    }

    const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Video exceeds maximum allowable limit of 100 MB.');
    }

    // Magic-byte binary header validation
    const validation = validateVideoMagicBytes(file.buffer);
    if (!validation.isValid) {
      throw new BadRequestException(
        'Invalid or corrupted video container. Only MP4, WebM, and MOV formats are allowed.',
      );
    }

    const ext = validation.format || 'mp4';
    const randomizedName = `video-${crypto.randomUUID()}.${ext}`;
    
    const asset = await this.storageService.saveFile(
      randomizedName,
      file.buffer,
      file.mimetype || `video/${ext}`,
    );

    const media = await this.mediaRepo.create({
      filename: randomizedName,
      originalName: path.basename(file.originalname).slice(0, 150),
      mimeType: file.mimetype || `video/${ext}`,
      size: file.size,
      url: `/uploads/${randomizedName}`,
      uploadedBy: user.id,
    });

    const streamUrl = `/api/media/stream/${media.id}`;
    const resultMedia = { ...media, url: streamUrl };

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.MEDIA_UPLOADED,
      resource: `Media:${media.id}`,
      result: 'SUCCESS',
      metadata: {
        filename: randomizedName,
        size: file.size,
        mimeType: media.mimeType,
        isVideo: true,
      },
    });

    return resultMedia;
  }

  async getMediaStreamInfo(
    mediaId: string,
    rangeHeader: string | undefined,
  ): Promise<{
    filePath: string;
    fileSize: number;
    mimeType: string;
    rangeInfo: ReturnType<typeof parseRangeHeader>;
    filename: string;
  }> {
    const media = await this.mediaRepo.findById(mediaId);
    if (!media) {
      throw new NotFoundException('Video media asset not found.');
    }

    const safeFilename = path.basename(media.filename);
    const filePath = path.join(this.uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Video file does not exist on storage disk.');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeInfo = parseRangeHeader(rangeHeader, fileSize);

    return {
      filePath,
      fileSize,
      mimeType: media.mimeType || 'video/mp4',
      rangeInfo,
      filename: safeFilename,
    };
  }
}
