import { Logger } from '@nestjs/common';
import type { CreateMediaDto, Media, PaginatedResult } from '../../domain/models';
import type { IMediaRepository, MediaFilters } from '../interfaces/media.repository.interface';

/**
 * SeamlessMediaRepository
 *
 * Wraps active and peer media repositories. Physical media assets exist on shared disk (/uploads).
 * On metadata miss in the active DB, copies the media record from the peer DB into the active DB.
 */
export class SeamlessMediaRepository implements IMediaRepository {
  private readonly logger = new Logger(SeamlessMediaRepository.name);

  constructor(
    private readonly activeRepo: IMediaRepository,
    private readonly peerRepo: IMediaRepository,
    private readonly activeDbName: string,
    private readonly peerDbName: string,
  ) {}

  async create(data: CreateMediaDto): Promise<Media> {
    return this.activeRepo.create(data);
  }

  async findById(id: string): Promise<Media | null> {
    const media = await this.activeRepo.findById(id);
    if (media) return media;

    try {
      const peerMedia = await this.peerRepo.findById(id);
      if (peerMedia) {
        this.logger.log(
          `[Seamless Sync] JIT replicating media "${peerMedia.originalName}" from ${this.peerDbName} to ${this.activeDbName}`,
        );
        return await this.activeRepo.create({
          filename: peerMedia.filename,
          originalName: peerMedia.originalName,
          mimeType: peerMedia.mimeType,
          size: peerMedia.size,
          url: peerMedia.url,
          uploadedBy: peerMedia.uploadedBy,
        });
      }
    } catch (err: any) {
      this.logger.warn(`[Seamless Sync] Media lookup by ID failed: ${err.message}`);
    }

    return null;
  }

  async findMany(filters: MediaFilters): Promise<PaginatedResult<Media>> {
    return this.activeRepo.findMany(filters);
  }

  async delete(id: string): Promise<boolean> {
    return this.activeRepo.delete(id);
  }
}
