import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import type { ImageAnalysis } from './image.types';

@Injectable()
export class ImageInspectorService {
  // Maximum decoded pixels to protect against decompression bombs (40 Megapixels)
  private readonly MAX_PIXELS = 40_000_000;

  async inspect(buffer: Buffer): Promise<ImageAnalysis> {
    try {
      const probe = sharp(buffer, {
        failOn: 'none',
        limitInputPixels: this.MAX_PIXELS,
      });

      const metadata = await probe.metadata();

      const width = metadata.width || 1200;
      const height = metadata.height || 800;
      const format = metadata.format || 'jpeg';
      const channels = metadata.channels || 3;
      const hasAlpha = metadata.hasAlpha || channels === 4;
      const isAnimated = (metadata.pages || 1) > 1;
      const orientation = metadata.orientation;
      const megapixels = (width * height) / 1_000_000;

      if (width * height > this.MAX_PIXELS) {
        throw new BadRequestException(
          `Image resolution (${width}x${height} = ${megapixels.toFixed(1)}MP) exceeds safety limit of 40MP.`,
        );
      }

      return {
        width,
        height,
        format,
        channels,
        hasAlpha,
        isAnimated,
        orientation,
        megapixels,
        originalSizeBytes: buffer.length,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(`Failed to inspect image: ${err.message || 'Invalid image buffer'}`);
    }
  }
}
