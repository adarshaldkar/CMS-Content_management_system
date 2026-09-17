import { Injectable } from '@nestjs/common';
import type { ImageAnalysis, OptimizationDecision } from './image.types';
import type { ImageVariantKind } from '../../../domain/media.model';

export interface VariantRule {
  kind: ImageVariantKind;
  maxLongEdge: number;
  quality: number;
}

@Injectable()
export class ImagePolicyService {
  readonly MAX_WEB_LONG_EDGE = 2560;
  readonly MIN_EDITORIAL_LONG_EDGE = 1200;
  readonly LOW_RES_THRESHOLD = 600;

  readonly VARIANT_RULES: VariantRule[] = [
    { kind: 'hero', maxLongEdge: 2400, quality: 85 },
    { kind: 'article', maxLongEdge: 1600, quality: 82 },
    { kind: 'card', maxLongEdge: 800, quality: 80 },
    { kind: 'thumbnail', maxLongEdge: 320, quality: 78 },
  ];

  evaluate(analysis: ImageAnalysis): OptimizationDecision {
    const { width, height, originalSizeBytes } = analysis;
    const longEdge = Math.max(width, height);
    const appliedEnhancements: string[] = [];

    // 1. TIER 1: HEAVY / LARGE IMAGE (e.g. 20MB-80MB or > 2560px)
    if (originalSizeBytes > 5 * 1024 * 1024 || longEdge > this.MAX_WEB_LONG_EDGE) {
      appliedEnhancements.push('LANCZOS3_DOWNSCALE_2560', 'STRIP_METADATA', 'WEBP_QUANTIZATION');
      return {
        category: 'HEAVY_DOWNSCALE',
        shouldResize: true,
        targetWidth: width >= height ? this.MAX_WEB_LONG_EDGE : undefined,
        targetHeight: height > width ? this.MAX_WEB_LONG_EDGE : undefined,
        quality: 82,
        targetFormat: 'webp',
        shouldSharpen: true,
        sharpenSigma: 0.8,
        shouldNormalizeContrast: false,
        shouldUpscale: false,
        appliedEnhancements,
      };
    }

    // 2. TIER 2: LOW RESOLUTION / SMALL IMAGE (e.g. < 600px width/height)
    if (width < this.LOW_RES_THRESHOLD || height < this.LOW_RES_THRESHOLD) {
      const scaleFactor = Math.min(3, Math.max(2, Math.ceil(this.MIN_EDITORIAL_LONG_EDGE / longEdge)));
      appliedEnhancements.push(
        `LANCZOS3_UPSCALE_${scaleFactor}X`,
        'UNSHARP_MASK_EDGE_SHARPEN',
        'CONTRAST_DYNAMIC_RANGE_NORMALIZE',
        'HIGH_FIDELITY_444_ENCODE',
      );

      return {
        category: 'LOW_RES_ENHANCE',
        shouldResize: true,
        targetWidth: width * scaleFactor,
        targetHeight: height * scaleFactor,
        quality: 95,
        targetFormat: 'webp',
        shouldSharpen: true,
        sharpenSigma: 1.2,
        shouldNormalizeContrast: true,
        shouldUpscale: true,
        upscaleFactor: scaleFactor,
        appliedEnhancements,
      };
    }

    // 3. TIER 3: STANDARD PRODUCTION IMAGE
    appliedEnhancements.push('COLOR_NORMALIZATION', 'SUBTLE_EDGE_POLISH', 'WEBP_ENCODE');
    return {
      category: 'STANDARD_OPTIMIZE',
      shouldResize: false,
      quality: 85,
      targetFormat: 'webp',
      shouldSharpen: true,
      sharpenSigma: 0.6,
      shouldNormalizeContrast: false,
      shouldUpscale: false,
      appliedEnhancements,
    };
  }

  getVariantRules(): VariantRule[] {
    return this.VARIANT_RULES;
  }
}
