import type { ImageVariantKind } from '../../../domain/media.model';

export interface ImageAnalysis {
  width: number;
  height: number;
  format: string;
  channels: number;
  hasAlpha: boolean;
  isAnimated: boolean;
  orientation?: number;
  megapixels: number;
  originalSizeBytes: number;
}

export interface OptimizationDecision {
  category: 'HEAVY_DOWNSCALE' | 'LOW_RES_ENHANCE' | 'STANDARD_OPTIMIZE';
  shouldResize: boolean;
  targetWidth?: number;
  targetHeight?: number;
  quality: number;
  targetFormat: 'webp' | 'avif' | 'jpeg' | 'png';
  shouldSharpen: boolean;
  sharpenSigma?: number;
  shouldNormalizeContrast: boolean;
  shouldUpscale: boolean;
  upscaleFactor?: number;
  appliedEnhancements: string[];
}

export interface ProcessedVariantResult {
  kind: ImageVariantKind;
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  filename: string;
}

export interface OptimizationResult {
  masterBuffer: Buffer;
  masterFilename: string;
  masterMimeType: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savingsPercent: string;
  appliedEnhancements: string[];
  variants: ProcessedVariantResult[];
}
