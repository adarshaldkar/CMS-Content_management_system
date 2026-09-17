export type ImageVariantKind = 'original' | 'hero' | 'article' | 'card' | 'thumbnail';
export type ProcessingStatus = 'UPLOADED' | 'VALIDATING' | 'PROCESSING' | 'READY' | 'FAILED';
export type UsageProfile = 'HERO' | 'ARTICLE' | 'CARD' | 'THUMBNAIL' | 'EDITORIAL' | 'AVATAR' | 'COVER';

export interface ImageVariant {
  kind: ImageVariantKind;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  url: string;
  storageKey?: string;
}

export interface ImageOptimizationMeta {
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savingsPercent: string;
  width: number;
  height: number;
  format: string;
  appliedEnhancements: string[];
  isUpscaled?: boolean;
  isDownscaled?: boolean;
}

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: Date;
  processingStatus?: ProcessingStatus;
  aspectRatio?: number;
  usageProfile?: UsageProfile;
  storageKey?: string;
  cdnUrl?: string;
  variants?: ImageVariant[];
  optimization?: ImageOptimizationMeta;
}

export interface CreateMediaDto {
  id?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  processingStatus?: ProcessingStatus;
  aspectRatio?: number;
  usageProfile?: UsageProfile;
  storageKey?: string;
  cdnUrl?: string;
  variants?: ImageVariant[];
  optimization?: ImageOptimizationMeta;
}
