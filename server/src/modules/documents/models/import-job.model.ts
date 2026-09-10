import { GazetteDocumentIR } from './gazette-document-ir';
import type { ExtractedImageAsset } from '../document-import.service';

export type ImportJobStatus =
  | 'queued'
  | 'inspecting'
  | 'processing'
  | 'completed'
  | 'warning'
  | 'review_required'
  | 'failed';

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
  status: ImportJobStatus;
  progressPercent: number; // 0 to 100
  pagesProcessed: number;
  totalPages: number;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  report?: ImportJobReport;
  documentIR?: GazetteDocumentIR;
  extractedImages?: ExtractedImageAsset[];
  generatedHtml?: string;
  errorMessage?: string;
}
