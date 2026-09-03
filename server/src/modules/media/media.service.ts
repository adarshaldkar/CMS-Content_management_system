import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
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
} from '../../domain/models';
import { validateImageBuffer } from '../../common/utils/image-validator.util';
import {
  validateVideoMagicBytes,
  parseRangeHeader,
} from './utils/video-validator.util';
import { AuditService } from '../audit/audit.service';
import { OwnershipHelper } from '../../common/guards/ownership.guard';

@Injectable()
export class MediaService {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepo: IMediaRepository,
    private readonly auditService: AuditService,
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

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File exceeds the maximum size limit of 5 MB.');
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
    const randomizedName = `media-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(this.uploadDir, randomizedName);

    // Save binary securely to local disk
    await fs.promises.writeFile(filePath, file.buffer);

    const publicUrl = `/uploads/${randomizedName}`;

    const media = await this.mediaRepo.create({
      filename: randomizedName,
      originalName: path.basename(file.originalname).slice(0, 150),
      mimeType: validation.detectedMime || file.mimetype,
      size: file.size,
      url: publicUrl,
      uploadedBy: user.id,
    });

    await this.auditService.log({
      actorId: user.id,
      action: AuditEventType.MEDIA_UPLOADED,
      resource: `Media:${media.id}`,
      result: 'SUCCESS',
      metadata: {
        filename: randomizedName,
        size: file.size,
        mimeType: media.mimeType,
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
    // forceOwn=true means: always show only this user's uploads (used by editor media picker)
    // forceOwn=false: admins/editors can see all (used by admin media library page)
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

    // Delete disk file
    const filePath = path.join(this.uploadDir, media.filename);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Safe ignore
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

    // 100 MB Limit
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
    const filePath = path.join(this.uploadDir, randomizedName);

    // Save video binary safely
    await fs.promises.writeFile(filePath, file.buffer);

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

    // Path Traversal Security: sanitize basename
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
