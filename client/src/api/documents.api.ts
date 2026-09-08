import { apiClient } from './client';

export interface ExtractedImageAsset {
  originalName: string;
  mediaId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash?: string;
  caption?: string;
  credit?: string;
  isVectorOrChart?: boolean;
}

export interface DocumentPage {
  pageNumber: number;
  title?: string;
  htmlContent: string;
  wordCount: number;
  isScanned?: boolean;
}

export interface ExtractedLinkDetail {
  id: string;
  pageNumber: number;
  visibleText: string;
  url: string;
  isExternal: boolean;
  isMalformed?: boolean;
  needsReview?: boolean;
}

export interface ImportJobReport {
  statusOutcome: 'SUCCESS' | 'WARNING' | 'REVIEW REQUIRED' | 'FAILED';
  totalWords: number;
  totalPages: number;
  imagesExtracted: number;
  duplicatesDeduplicated: number;
  linksRecovered: number;
  tablesReconstructed: number;
  equationsPreserved: number;
  scannedPagesOcrApplied: number;
  warnings: string[];
  reviewRequiredItems: string[];
}

export interface ImportJob {
  id: string;
  documentId: string;
  userId: string;
  filename: string;
  fileSizeBytes: number;
  status: 'queued' | 'inspecting' | 'processing' | 'completed' | 'warning' | 'review_required' | 'failed';
  progressPercent: number;
  pagesProcessed: number;
  totalPages: number;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  report?: ImportJobReport;
  generatedHtml?: string;
  errorMessage?: string;
}

export interface DocumentImportResult {
  filename: string;
  format?: 'docx' | 'md' | 'txt' | 'pdf' | 'gutenberg';
  detectedType?: string;
  title?: string;
  htmlContent: string;
  pages?: DocumentPage[];
  totalPages?: number;
  wordCount: number;
  readingTimeMinutes?: number;
  headingsCount?: number;
  paragraphsCount?: number;
  fileSizeBytes?: number;
  extractedImages?: ExtractedImageAsset[];
  links?: ExtractedLinkDetail[];
  warnings?: string[];
  job?: ImportJob;
}

export interface GutenbergParseResult {
  title: string;
  html: string;
  blocksCount: number;
  unsupportedBlocksCount: number;
}

export const documentsApi = {
  importDocument: async (file: File): Promise<DocumentImportResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<DocumentImportResult>(
      '/documents/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return data;
  },

  getJobStatus: async (jobId: string): Promise<ImportJob> => {
    const { data } = await apiClient.get<ImportJob>(`/documents/jobs/${jobId}`);
    return data;
  },

  parseGutenberg: async (gutenbergHtml: string): Promise<GutenbergParseResult> => {
    const { data } = await apiClient.post<GutenbergParseResult>(
      '/documents/gutenberg/parse',
      { gutenbergHtml },
    );
    return data;
  },

  serializeGutenberg: async (gazetteHtml: string): Promise<{ gutenbergHtml: string }> => {
    const { data } = await apiClient.post<{ gutenbergHtml: string }>(
      '/documents/gutenberg/serialize',
      { gazetteHtml },
    );
    return data;
  },
};
