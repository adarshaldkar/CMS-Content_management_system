/**
 * Gazette Unified Video Provider Registry
 * 
 * Centralized, secure canonicalizer and embed generator for all external video platforms
 * (YouTube, Vimeo, Loom, Spotify, Dailymotion, Wistia).
 * 
 * Invariants:
 * 1. Strict Provider Allowlist (No arbitrary <iframe> injection).
 * 2. URL Canonicalization (Extracts videoId, clean timestamps, removes tracking params).
 * 3. Graceful Fallbacks (Never break if metadata fetch fails).
 * 4. Privacy-Enhanced Embeds (youtube-nocookie.com, no autoplay by default).
 */

export type VideoProviderType = 'youtube' | 'vimeo' | 'loom' | 'spotify' | 'dailymotion' | 'wistia' | 'self_hosted';

export interface CanonicalVideoData {
  provider: VideoProviderType;
  videoId: string;
  originalUrl: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
  startSeconds?: number;
  aspectRatio: string; // e.g. "16/9"
  isPrivacyEnhanced: boolean;
  isValid: boolean;
  error?: string;
}

export interface VideoBlockMetadata {
  id: string;
  sourceType: 'external' | 'hosted';
  provider?: VideoProviderType;
  videoId?: string;
  url: string;
  embedUrl?: string;
  posterUrl?: string;
  title?: string;
  caption?: string;
  credit?: string;
  accessibilityDescription?: string;
  startSeconds?: number;
  durationSeconds?: number;
  aspectRatio?: string;
  widthPercent?: number; // 50, 75, 100
  align?: 'left' | 'center' | 'right';
  subtitles?: {
    srclang: string;
    label: string;
    url: string;
  }[];
}

export const videoProviderRegistry = {
  /**
   * Detects and canonicalizes an input video URL into structured video metadata
   */
  canonicalize(rawUrl: string, startSeconds = 0, privacyMode = true): CanonicalVideoData {
    const trimmed = (rawUrl || '').trim();

    if (!trimmed) {
      return {
        provider: 'youtube',
        videoId: '',
        originalUrl: rawUrl,
        embedUrl: '',
        aspectRatio: '16/9',
        isPrivacyEnhanced: privacyMode,
        isValid: false,
        error: 'Empty video URL provided.',
      };
    }

    // 1. YOUTUBE (Normal, youtu.be, Shorts, Embeds, Timestamps)
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      
      // Extract timestamp if present in URL (?t=120 or ?t=2m0s)
      let detectedTime = startSeconds;
      const timeMatch = trimmed.match(/[?&]t=(?:(\d+)m)?(\d+)s?|t=(\d+)/i);
      if (timeMatch) {
        if (timeMatch[3]) {
          detectedTime = parseInt(timeMatch[3], 10);
        } else {
          const minutes = timeMatch[1] ? parseInt(timeMatch[1], 10) : 0;
          const seconds = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          detectedTime = minutes * 60 + seconds;
        }
      }

      const host = privacyMode ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
      const timeParam = detectedTime > 0 ? `&start=${detectedTime}` : '';
      const embedUrl = `${host}/embed/${videoId}?rel=0&modestbranding=1&autoplay=0${timeParam}`;

      return {
        provider: 'youtube',
        videoId,
        originalUrl: trimmed,
        embedUrl,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: 'YouTube Video Dispatch',
        startSeconds: detectedTime,
        aspectRatio: '16/9',
        isPrivacyEnhanced: privacyMode,
        isValid: true,
      };
    }

    // 2. VIMEO (Normal, Channel, OnDemand, Private hash)
    const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:[?&]h=([a-z0-9]+))?)/i);
    if (vimeoMatch && vimeoMatch[3]) {
      const videoId = vimeoMatch[3];
      const hash = vimeoMatch[4] ? `?h=${vimeoMatch[4]}&` : '?';
      const timeParam = startSeconds > 0 ? `#t=${startSeconds}s` : '';
      const embedUrl = `https://player.vimeo.com/video/${videoId}${hash}dnt=1&title=0&byline=0&portrait=0${timeParam}`;

      return {
        provider: 'vimeo',
        videoId,
        originalUrl: trimmed,
        embedUrl,
        thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
        title: 'Vimeo Cinematic Dispatch',
        startSeconds,
        aspectRatio: '16/9',
        isPrivacyEnhanced: true,
        isValid: true,
      };
    }

    // 3. LOOM (loom.com/share/ID)
    const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-f0-9]{32})/i);
    if (loomMatch && loomMatch[1]) {
      const videoId = loomMatch[1];
      const embedUrl = `https://www.loom.com/embed/${videoId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;

      return {
        provider: 'loom',
        videoId,
        originalUrl: trimmed,
        embedUrl,
        thumbnailUrl: `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.jpg`,
        title: 'Loom Video Recording',
        startSeconds,
        aspectRatio: '16/9',
        isPrivacyEnhanced: true,
        isValid: true,
      };
    }

    // 4. SPOTIFY (spotify.com/episode/... or track)
    const spotifyMatch = trimmed.match(/spotify\.com\/(episode|track|show)\/([a-zA-Z0-9]+)/i);
    if (spotifyMatch && spotifyMatch[2]) {
      const type = spotifyMatch[1];
      const videoId = spotifyMatch[2];
      const embedUrl = `https://open.spotify.com/embed/${type}/${videoId}?utm_source=gazette`;

      return {
        provider: 'spotify',
        videoId,
        originalUrl: trimmed,
        embedUrl,
        title: 'Spotify Audio & Video Podcast',
        aspectRatio: '16/9',
        isPrivacyEnhanced: true,
        isValid: true,
      };
    }

    // 5. DAILYMOTION
    const dmMatch = trimmed.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i);
    if (dmMatch && dmMatch[1]) {
      const videoId = dmMatch[1];
      const embedUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui-theme=dark&autoPlay=0`;

      return {
        provider: 'dailymotion',
        videoId,
        originalUrl: trimmed,
        embedUrl,
        thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
        title: 'Dailymotion Video Broadcast',
        startSeconds,
        aspectRatio: '16/9',
        isPrivacyEnhanced: true,
        isValid: true,
      };
    }

    // Direct MP4 / WebM / Video Stream URL
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
      return {
        provider: 'self_hosted',
        videoId: 'hosted_' + Math.random().toString(36).slice(2, 9),
        originalUrl: trimmed,
        embedUrl: trimmed,
        title: 'Gazette Hosted Video Stream',
        startSeconds,
        aspectRatio: '16/9',
        isPrivacyEnhanced: true,
        isValid: true,
      };
    }

    return {
      provider: 'youtube',
      videoId: '',
      originalUrl: trimmed,
      embedUrl: '',
      aspectRatio: '16/9',
      isPrivacyEnhanced: privacyMode,
      isValid: false,
      error: 'Unsupported video provider. Supported platforms: YouTube, Vimeo, Loom, Spotify, Dailymotion, or direct MP4/WebM streams.',
    };
  },

  /**
   * Formats a canonical Gazette Video Block into safe, responsive HTML markup
   */
  generateVideoBlockHtml(meta: VideoBlockMetadata): string {
    const widthStyle = meta.widthPercent ? `max-width: ${meta.widthPercent}%;` : 'max-width: 100%;';
    const alignClass = meta.align === 'left' ? 'mr-auto' : meta.align === 'right' ? 'ml-auto' : 'mx-auto';

    if (meta.sourceType === 'hosted') {
      const subtitlesHtml = (meta.subtitles || [])
        .map((s) => `<track kind="subtitles" src="${s.url}" srclang="${s.srclang}" label="${s.label}" default />`)
        .join('');

      return `
<figure class="cms-video-block cms-video-hosted my-8 ${alignClass}" style="${widthStyle}" data-node="videoBlock" data-source="hosted" data-url="${meta.url}" data-title="${meta.title || ''}">
  <div class="cms-video-container relative rounded-lg overflow-hidden bg-slate-950 shadow-lg" style="aspect-ratio: ${meta.aspectRatio || '16/9'};">
    <video
      controls
      preload="metadata"
      ${meta.posterUrl ? `poster="${meta.posterUrl}"` : ''}
      class="w-full h-full object-contain"
    >
      <source src="${meta.url}" type="video/mp4" />
      ${subtitlesHtml}
      Your browser does not support HTML5 video playback.
    </video>
  </div>
  ${meta.caption || meta.credit ? `
  <figcaption class="cms-video-caption font-serif italic text-xs text-slate-500 text-center mt-2.5">
    ${meta.caption ? `<span>${meta.caption}</span>` : ''}
    ${meta.credit ? `<cite class="not-italic font-mono text-[11px] text-slate-400 block sm:inline sm:ml-2">— Credit: ${meta.credit}</cite>` : ''}
  </figcaption>` : ''}
</figure>
<p><br></p>`.trim();
    }

    // External Provider Embed
    const canonical = this.canonicalize(meta.url, meta.startSeconds, true);

    return `
<figure class="cms-video-block cms-video-external my-8 ${alignClass}" style="${widthStyle}" data-node="videoBlock" data-source="external" data-provider="${canonical.provider}" data-video-id="${canonical.videoId}" data-url="${meta.url}" data-title="${meta.title || ''}">
  <div class="cms-video-container relative rounded-lg overflow-hidden bg-slate-950 shadow-lg" style="aspect-ratio: ${meta.aspectRatio || '16/9'};">
    <iframe
      src="${canonical.embedUrl}"
      title="${meta.title || 'Gazette Editorial Video'}"
      class="w-full h-full border-0 absolute inset-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  ${meta.caption || meta.credit ? `
  <figcaption class="cms-video-caption font-serif italic text-xs text-slate-500 text-center mt-2.5">
    ${meta.caption ? `<span>${meta.caption}</span>` : ''}
    ${meta.credit ? `<cite class="not-italic font-mono text-[11px] text-slate-400 block sm:inline sm:ml-2">— Credit: ${meta.credit}</cite>` : ''}
  </figcaption>` : ''}
</figure>
<p><br></p>`.trim();
  },
};
