import { apiClient } from './client';
import type { Media, PaginatedResult } from '../types';

export async function uploadMediaAsset(file: File): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<Media>('/media/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function listMediaAssets(
  page = 1,
  limit = 24,
  scope?: 'own' | 'all',
): Promise<PaginatedResult<Media>> {
  const { data } = await apiClient.get<PaginatedResult<Media>>('/media', {
    params: { page, limit, ...(scope ? { scope } : {}) },
  });
  return data;
}

export async function deleteMediaAsset(id: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/media/${id}`);
  return data;
}
