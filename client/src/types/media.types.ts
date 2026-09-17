export interface ImageVariant {
  kind: 'hero' | 'article' | 'card' | 'thumbnail' | 'original';
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
  variants?: ImageVariant[];
  optimization?: ImageOptimizationMeta;
  createdAt: string;
}
