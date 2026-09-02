import { apiClient } from './client';

export type EmbedProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'spotify'
  | 'twitter'
  | 'generic'
  | 'native_video';

export type EmbedDisplayMode = 'embed' | 'card' | 'link';

export interface EmbedMetadataResponse {
  url: string;
  provider: EmbedProvider;
  providerName: string;
  videoId?: string;
  embedUrl?: string;
  title: string;
  description?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  aspectRatio: string; // '16:9', '4:3', '1:1', 'compact'
  startTime?: number; // YouTube start timestamp in seconds
  html?: string;
  faviconUrl?: string;
  caption?: string;
  displayMode: EmbedDisplayMode;
  snapshottedAt: string;
}

export const embedsApi = {
  /**
   * Scrapes metadata and extracts embed info from a URL with SSRF protection and Redis caching.
   */
  scrape: async (url: string): Promise<EmbedMetadataResponse> => {
    const { data } = await apiClient.post<EmbedMetadataResponse>('/embeds/scrape', { url });
    return data;
  },
};
