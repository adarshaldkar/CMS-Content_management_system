import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export type EmbedProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'spotify'
  | 'twitter'
  | 'generic'
  | 'native_video';

export type EmbedDisplayMode = 'embed' | 'card' | 'link';

export class ScrapeEmbedDto {
  @IsNotEmpty({ message: 'URL is required.' })
  @IsString({ message: 'URL must be a string.' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    },
    { message: 'A valid HTTP or HTTPS URL is required.' },
  )
  @MaxLength(2048, { message: 'URL cannot exceed 2048 characters.' })
  url!: string;
}

export interface TranscriptLineDto {
  time?: string;
  seconds?: number;
  text: string;
}

export interface EmbedMetadataResponseDto {
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
  transcript?: string;
  transcriptLines?: TranscriptLineDto[];
  hasTranscript?: boolean;
}
