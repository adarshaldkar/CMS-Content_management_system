export type EmbedProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'spotify'
  | 'twitter'
  | 'generic'
  | 'native_video';

export interface ParsedEmbedInfo {
  provider: EmbedProvider;
  providerName: string;
  videoId?: string;
  embedUrl?: string;
  startTime?: number;
  isMedia: boolean;
}

/**
 * Checks if a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(str: string): boolean {
  try {
    const parsed = new URL(str.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Parses YouTube watch URLs, short URLs, embeds, Shorts, and timestamp offsets.
 */
export function parseYouTubeUrl(rawUrl: string): { videoId: string; startTime?: number; embedUrl: string } | null {
  const url = rawUrl.trim();
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})(?:[^\w\s-].*)?/;
  const match = url.match(regExp);

  if (!match || !match[1]) return null;

  const videoId = match[1];
  let startTime: number | undefined;

  // Extract ?t=... or &t=... or ?start=...
  const timeMatch = url.match(/[?&](?:t|start)=(\d+h)?(\d+m)?(\d+s|\d+)?/);
  if (timeMatch) {
    const hours = parseInt((timeMatch[1] || '').replace('h', '') || '0', 10);
    const minutes = parseInt((timeMatch[2] || '').replace('m', '') || '0', 10);
    const seconds = parseInt((timeMatch[3] || '').replace('s', '') || '0', 10);

    if (hours || minutes || seconds) {
      startTime = hours * 3600 + minutes * 60 + seconds;
    } else if (timeMatch[0].includes('=')) {
      const rawNum = parseInt(timeMatch[0].split('=')[1], 10);
      if (!isNaN(rawNum)) startTime = rawNum;
    }
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}${
    startTime ? `?start=${startTime}` : ''
  }`;

  return { videoId, startTime, embedUrl };
}

/**
 * Parses Vimeo video URLs.
 */
export function parseVimeoUrl(rawUrl: string): { videoId: string; embedUrl: string } | null {
  const match = rawUrl.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))/);
  if (!match || !match[1]) return null;

  const videoId = match[1];
  return {
    videoId,
    embedUrl: `https://player.vimeo.com/video/${videoId}`,
  };
}

/**
 * Parses Loom share URLs.
 */
export function parseLoomUrl(rawUrl: string): { videoId: string; embedUrl: string } | null {
  const match = rawUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (!match || !match[1]) return null;

  const videoId = match[1];
  return {
    videoId,
    embedUrl: `https://www.loom.com/embed/${videoId}`,
  };
}

/**
 * Parses Spotify track, album, episode, playlist URLs.
 */
export function parseSpotifyUrl(rawUrl: string): { embedUrl: string } | null {
  if (!rawUrl.includes('open.spotify.com/')) return null;
  const embedUrl = rawUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
  return { embedUrl };
}

/**
 * Comprehensive parser detecting provider and generating instant embed info.
 */
export function detectEmbedInfo(rawUrl: string): ParsedEmbedInfo | null {
  if (!isValidUrl(rawUrl)) return null;

  const url = rawUrl.trim();

  // 1. YouTube
  const yt = parseYouTubeUrl(url);
  if (yt) {
    return {
      provider: 'youtube',
      providerName: 'YouTube',
      videoId: yt.videoId,
      embedUrl: yt.embedUrl,
      startTime: yt.startTime,
      isMedia: true,
    };
  }

  // 2. Vimeo
  const vimeo = parseVimeoUrl(url);
  if (vimeo) {
    return {
      provider: 'vimeo',
      providerName: 'Vimeo',
      videoId: vimeo.videoId,
      embedUrl: vimeo.embedUrl,
      isMedia: true,
    };
  }

  // 3. Loom
  const loom = parseLoomUrl(url);
  if (loom) {
    return {
      provider: 'loom',
      providerName: 'Loom',
      videoId: loom.videoId,
      embedUrl: loom.embedUrl,
      isMedia: true,
    };
  }

  // 4. Spotify
  const spotify = parseSpotifyUrl(url);
  if (spotify) {
    return {
      provider: 'spotify',
      providerName: 'Spotify',
      embedUrl: spotify.embedUrl,
      isMedia: true,
    };
  }

  // 5. Twitter / X
  if (url.includes('twitter.com/') || url.includes('x.com/')) {
    return {
      provider: 'twitter',
      providerName: 'X (Twitter)',
      embedUrl: url,
      isMedia: false,
    };
  }

  // 6. Generic Web Link
  try {
    const parsed = new URL(url);
    return {
      provider: 'generic',
      providerName: parsed.hostname.replace(/^www\./, ''),
      embedUrl: url,
      isMedia: false,
    };
  } catch {
    return null;
  }
}
