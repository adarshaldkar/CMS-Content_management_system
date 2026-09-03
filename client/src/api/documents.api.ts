import { apiClient } from './client';

export interface ExtractedImageAsset {
  originalName: string;
  mediaId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentImportResult {
  filename: string;
  format: 'docx' | 'md' | 'txt' | 'pdf';
  title?: string;
  htmlContent: string;
  wordCount: number;
  readingTimeMinutes: number;
  headingsCount: number;
  paragraphsCount: number;
  extractedImages: ExtractedImageAsset[];
  warnings?: string[];
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
};
