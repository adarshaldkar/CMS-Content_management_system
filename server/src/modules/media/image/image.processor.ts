import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { QUEUE_NAMES, JOB_NAMES } from '../../../bull/bull-queue.constants';
import {
  MEDIA_REPOSITORY,
  type IMediaRepository,
} from '../../../repositories/interfaces/media.repository.interface';
import { ImageOptimizerService } from './image-optimizer.service';
import { StorageService } from '../storage/storage.service';
import type { ImageVariant } from '../../../domain/models';

export interface ImageProcessingJobData {
  mediaId: string;
  tempFilePath: string;
  originalName: string;
  mimeType: string;
  usageProfile?: string;
}

@Processor(QUEUE_NAMES.IMAGE_PROCESSING)
export class ImageProcessor extends WorkerHost {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepo: IMediaRepository,
    private readonly imageOptimizer: ImageOptimizerService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ImageProcessingJobData>): Promise<any> {
    const { mediaId, tempFilePath, originalName, mimeType, usageProfile } = job.data;
    this.logger.log(`[BullMQ Worker] Processing image job for mediaId ${mediaId}`);

    const media = await this.mediaRepo.findById(mediaId);
    if (!media) {
      this.logger.error(`[BullMQ Worker] Media record ${mediaId} not found.`);
      return;
    }

    try {
      await this.mediaRepo.update(mediaId, { processingStatus: 'PROCESSING' });

      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temp file missing at path: ${tempFilePath}`);
      }

      const fileBuffer = fs.readFileSync(tempFilePath);
      const fileBaseId = `media-${mediaId}`;

      // Run Image Intelligence Pipeline
      const optimizedResult = await this.imageOptimizer.processImage(
        fileBuffer,
        originalName,
        fileBaseId,
      );

      // 1. Save Master WebP Asset
      const masterWebpAsset = await this.storageService.saveFile(
        optimizedResult.masterFilename,
        optimizedResult.masterBuffer,
        optimizedResult.masterMimeType,
      );

      const variants: ImageVariant[] = [
        {
          kind: 'original',
          width: optimizedResult.width,
          height: optimizedResult.height,
          mimeType: mimeType,
          sizeBytes: fileBuffer.length,
          url: media.url,
          storageKey: media.filename,
        },
      ];

      // 2. Save derivatives (Hero, Article, Card, Thumbnail)
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

      const aspectRatio =
        optimizedResult.height > 0
          ? Number((optimizedResult.width / optimizedResult.height).toFixed(4))
          : 1;

      // Update media status to READY with processed variants and metadata
      await this.mediaRepo.update(mediaId, {
        filename: optimizedResult.masterFilename,
        mimeType: optimizedResult.masterMimeType,
        size: optimizedResult.optimizedSizeBytes,
        url: masterWebpAsset.url,
        variants,
        optimization: {
          originalSizeBytes: optimizedResult.originalSizeBytes,
          optimizedSizeBytes: optimizedResult.optimizedSizeBytes,
          savingsPercent: optimizedResult.savingsPercent,
          width: optimizedResult.width,
          height: optimizedResult.height,
          format: 'webp',
          appliedEnhancements: optimizedResult.appliedEnhancements,
          isUpscaled: optimizedResult.appliedEnhancements.some((e) => e.includes('UPSCALE')),
          isDownscaled: optimizedResult.appliedEnhancements.some((e) => e.includes('DOWNSCALE')),
        },
        aspectRatio,
        usageProfile,
        processingStatus: 'READY',
      });

      this.logger.log(
        `[BullMQ Worker] Image processing READY for mediaId ${mediaId} (${optimizedResult.savingsPercent} saved)`,
      );

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      return { status: 'READY', mediaId, savingsPercent: optimizedResult.savingsPercent };
    } catch (err: any) {
      this.logger.error(`[BullMQ Worker] Failed to process image ${mediaId}: ${err.message}`, err.stack);
      await this.mediaRepo.update(mediaId, { processingStatus: 'FAILED' });
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw err;
    }
  }
}
