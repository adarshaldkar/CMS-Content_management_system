import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { ImageInspectorService } from './image-inspector.service';
import { ImagePolicyService } from './image-policy.service';
import type { OptimizationResult, ProcessedVariantResult } from './image.types';

@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  constructor(
    private readonly inspector: ImageInspectorService,
    private readonly policy: ImagePolicyService,
  ) {}

  async processImage(
    inputBuffer: Buffer,
    originalFilename: string,
    fileBaseId: string,
  ): Promise<OptimizationResult> {
    const originalSizeBytes = inputBuffer.length;
    const analysis = await this.inspector.inspect(inputBuffer);
    const decision = this.policy.evaluate(analysis);

    this.logger.log(
      `Processing image "${originalFilename}" (${analysis.width}x${analysis.height}, ${(originalSizeBytes / (1024 * 1024)).toFixed(2)} MB) -> Decision: ${decision.category}`,
    );

    // 1. Base pipeline with EXIF rotation & color profile normalization
    let basePipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

    // 2. Apply contrast normalization for washed-out / low-res images
    if (decision.shouldNormalizeContrast) {
      basePipeline = basePipeline.normalize();
    }

    // 3. Apply resizing (downscaling heavy images or upscaling low-res images)
    if (decision.shouldResize && (decision.targetWidth || decision.targetHeight)) {
      basePipeline = basePipeline.resize(decision.targetWidth, decision.targetHeight, {
        fit: 'inside',
        withoutEnlargement: !decision.shouldUpscale,
        kernel: sharp.kernel.lanczos3,
      });
    }

    // 4. Apply unsharp masking / detail polish
    if (decision.shouldSharpen) {
      const sigma = decision.sharpenSigma || 0.8;
      basePipeline = basePipeline.sharpen({
        sigma,
        m1: 1.0,
        m2: 2.0,
      });
    }

    // 5. Generate Master WebP Buffer
    const masterWebpBuffer = await basePipeline
      .webp({
        quality: decision.quality,
        effort: 6,
        smartSubsample: true,
        alphaQuality: 90,
      })
      .toBuffer();

    const masterMetadata = await sharp(masterWebpBuffer).metadata();
    const finalWidth = masterMetadata.width || analysis.width;
    const finalHeight = masterMetadata.height || analysis.height;
    const optimizedSizeBytes = masterWebpBuffer.length;

    const savingsPercent =
      originalSizeBytes > optimizedSizeBytes
        ? `${(((originalSizeBytes - optimizedSizeBytes) / originalSizeBytes) * 100).toFixed(1)}%`
        : '0.0%';

    // 6. Generate Responsive Delivery Derivatives (Hero, Article, Card, Thumbnail)
    const variants: ProcessedVariantResult[] = [];
    const variantRules = this.policy.getVariantRules();

    for (const rule of variantRules) {
      const longEdge = Math.max(finalWidth, finalHeight);
      const targetEdge = Math.min(longEdge, rule.maxLongEdge);

      const isLandscape = finalWidth >= finalHeight;
      const targetWidth = isLandscape ? targetEdge : undefined;
      const targetHeight = !isLandscape ? targetEdge : undefined;

      const variantBuffer = await sharp(masterWebpBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        })
        .webp({
          quality: rule.quality,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer();

      const variantMeta = await sharp(variantBuffer).metadata();

      variants.push({
        kind: rule.kind,
        buffer: variantBuffer,
        width: variantMeta.width || targetWidth || 320,
        height: variantMeta.height || targetHeight || 240,
        sizeBytes: variantBuffer.length,
        mimeType: 'image/webp',
        filename: `${fileBaseId}-${rule.kind}.webp`,
      });
    }

    return {
      masterBuffer: masterWebpBuffer,
      masterFilename: `${fileBaseId}-optimized.webp`,
      masterMimeType: 'image/webp',
      width: finalWidth,
      height: finalHeight,
      originalSizeBytes,
      optimizedSizeBytes,
      savingsPercent,
      appliedEnhancements: decision.appliedEnhancements,
      variants,
    };
  }
}
