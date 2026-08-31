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
  ): Promise<PaginatedResult<Media>> {
    // If user has MEDIA_READ_ALL or is ADMIN/EDITOR, view all. Otherwise view own.
    const canReadAll =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.EDITOR ||
      user.permissions.includes(Permission.MEDIA_READ_ALL);

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
}
