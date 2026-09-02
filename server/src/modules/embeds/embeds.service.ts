import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { safeFetch, validateUrlSyntactics } from './utils/ssrf-validator.util';
import type {
  EmbedMetadataResponseDto,
  EmbedProvider,
  EmbedDisplayMode,
} from './dto/embeds.dto';

@Injectable()
export class EmbedsService {
  private readonly logger = new Logger(EmbedsService.name);
  private readonly inFlightRequests = new Map<string, Promise<EmbedMetadataResponseDto>>();

  private readonly CACHE_TTL_SUCCESS_SEC = 86400; // 24 Hours
  private readonly CACHE_TTL_FAILURE_SEC = 120; // 2 Minutes negative cache

  constructor(private readonly redisService: RedisService) {}

  /**
   * Primary entry point for metadata scraping & embed normalization.
   */
  async scrapeUrl(rawUrl: string): Promise<EmbedMetadataResponseDto> {
    const parsed = validateUrlSyntactics(rawUrl.trim());
    const normalizedUrl = parsed.toString();
    const urlHash = this.hashUrl(normalizedUrl);
    const provider = this.detectProvider(parsed);

    // 1. Check Redis Cache
    const cacheKey = `embed:meta:v1:${provider}:${urlHash}`;
    const negativeCacheKey = `embed:meta:v1:err:${urlHash}`;

    const [cachedEnvelope, cachedNegativeEnvelope] = await Promise.all([
      this.redisService.getCached<EmbedMetadataResponseDto>(cacheKey),
      this.redisService.getCached<{ error: string }>(negativeCacheKey),
    ]);

    if (cachedEnvelope?.payload) {
      return cachedEnvelope.payload;
    }

    if (cachedNegativeEnvelope?.payload) {
      throw new BadRequestException('Target URL recently failed to resolve. Please retry in a few moments.');
    }

    // 2. Single-Flight Request Coalescing (Prevents duplicate simultaneous fetches)
    const flightKey = `${provider}:${urlHash}`;
    if (this.inFlightRequests.has(flightKey)) {
      return await this.inFlightRequests.get(flightKey)!;
    }

    const fetchPromise = this.resolveMetadataWithFallbacks(normalizedUrl, provider, parsed)
      .then(async (result) => {
        // Save in Redis for 24h
        await this.redisService.setCached<EmbedMetadataResponseDto>(
          cacheKey,
          result,
          this.CACHE_TTL_SUCCESS_SEC,
        );
        return result;
      })
      .catch(async (err) => {
        // Cache negative response for 2 minutes to prevent hammering
        await this.redisService.setCached<{ error: string }>(
          negativeCacheKey,
          { error: err.message },
          this.CACHE_TTL_FAILURE_SEC,
        );
        throw err;
      })
      .finally(() => {
        this.inFlightRequests.delete(flightKey);
      });

    this.inFlightRequests.set(flightKey, fetchPromise);
    return await fetchPromise;
  }

  /**
   * Dispatches scraping to provider-specific resolvers or OpenGraph fallback.
   */
  private async resolveMetadataWithFallbacks(
    url: string,
    provider: EmbedProvider,
    parsed: URL,
  ): Promise<EmbedMetadataResponseDto> {
    const snapshottedAt = new Date().toISOString();

    try {
      switch (provider) {
        case 'youtube':
          return await this.resolveYouTube(url, parsed, snapshottedAt);
        case 'vimeo':
          return await this.resolveVimeo(url, parsed, snapshottedAt);
        case 'loom':
          return await this.resolveLoom(url, parsed, snapshottedAt);
        case 'spotify':
          return await this.resolveSpotify(url, parsed, snapshottedAt);
        case 'twitter':
          return await this.resolveTwitter(url, parsed, snapshottedAt);
        case 'generic':
        default:
          return await this.resolveOpenGraph(url, parsed, snapshottedAt);
      }
    } catch (err: any) {
      this.logger.warn(`Provider [${provider}] scraping encountered error for [${url}]: ${err.message}`);

      // Graceful degradation: construct deterministic fallback card
      return this.buildFallbackMetadata(url, provider, parsed, snapshottedAt);
    }
  }

  /**
   * 1. YouTube Resolver (Watch, Shorts, Embeds, Timestamps)
   */
  private async resolveYouTube(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    const { videoId, startTime } = this.parseYouTubeParams(url, parsed);
    if (!videoId) {
      throw new BadRequestException('Could not extract a valid 11-character YouTube video ID.');
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}${
      startTime ? `?start=${startTime}` : ''
    }`;
    const defaultThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    let title = 'YouTube Video';
    let authorName = 'YouTube Creator';
    let authorUrl = 'https://www.youtube.com';
    let thumbnailUrl = defaultThumbnail;

    // Fetch official oEmbed
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await safeFetch(oembedUrl, { timeoutMs: 3000 });
      const data = JSON.parse(res.text);

      if (data.title) title = this.sanitizeText(data.title);
      if (data.author_name) authorName = this.sanitizeText(data.author_name);
      if (data.author_url) authorUrl = data.author_url;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    } catch {
      // oEmbed failed, fallback to defaults
    }

    return {
      url,
      provider: 'youtube',
      providerName: 'YouTube',
      videoId,
      embedUrl,
      title,
      description: `Watch "${title}" on YouTube.`,
      authorName,
      authorUrl,
      thumbnailUrl,
      aspectRatio: '16:9',
      startTime,
      displayMode: 'embed',
      snapshottedAt,
    };
  }

  /**
   * 2. Vimeo Resolver
   */
  private async resolveVimeo(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    const vimeoIdMatch = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))/);
    const videoId = vimeoIdMatch ? vimeoIdMatch[1] : undefined;

    let title = 'Vimeo Video';
    let authorName = 'Vimeo Creator';
    let authorUrl = 'https://vimeo.com';
    let thumbnailUrl: string | undefined;
    let embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}` : undefined;

    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
      const res = await safeFetch(oembedUrl, { timeoutMs: 3000 });
      const data = JSON.parse(res.text);

      if (data.title) title = this.sanitizeText(data.title);
      if (data.author_name) authorName = this.sanitizeText(data.author_name);
      if (data.author_url) authorUrl = data.author_url;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
      if (data.video_id) embedUrl = `https://player.vimeo.com/video/${data.video_id}`;
    } catch {
      // oEmbed failed
    }

    return {
      url,
      provider: 'vimeo',
      providerName: 'Vimeo',
      videoId,
      embedUrl,
      title,
      authorName,
      authorUrl,
      thumbnailUrl,
      aspectRatio: '16:9',
      displayMode: 'embed',
      snapshottedAt,
    };
  }

  /**
   * 3. Loom Resolver
   */
  private async resolveLoom(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
    const videoId = loomMatch ? loomMatch[1] : undefined;
    const embedUrl = videoId ? `https://www.loom.com/embed/${videoId}` : url;

    let title = 'Loom Recording';
    let authorName = 'Loom User';
    let thumbnailUrl: string | undefined;

    try {
      const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`;
      const res = await safeFetch(oembedUrl, { timeoutMs: 3000 });
      const data = JSON.parse(res.text);

      if (data.title) title = this.sanitizeText(data.title);
      if (data.author_name) authorName = this.sanitizeText(data.author_name);
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    } catch {
      // Fallback
    }

    return {
      url,
      provider: 'loom',
      providerName: 'Loom',
      videoId,
      embedUrl,
      title,
      authorName,
      thumbnailUrl,
      aspectRatio: '16:9',
      displayMode: 'embed',
      snapshottedAt,
    };
  }

  /**
   * 4. Spotify Resolver
   */
  private async resolveSpotify(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    // e.g. open.spotify.com/track/123 -> open.spotify.com/embed/track/123
    const embedUrl = url.replace('open.spotify.com/', 'open.spotify.com/embed/');

    let title = 'Spotify Audio';
    let authorName = 'Spotify';
    let thumbnailUrl: string | undefined;

    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await safeFetch(oembedUrl, { timeoutMs: 3000 });
      const data = JSON.parse(res.text);

      if (data.title) title = this.sanitizeText(data.title);
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    } catch {
      // Fallback
    }

    return {
      url,
      provider: 'spotify',
      providerName: 'Spotify',
      embedUrl,
      title,
      authorName,
      thumbnailUrl,
      aspectRatio: 'compact',
      displayMode: 'embed',
      snapshottedAt,
    };
  }

  /**
   * 5. Twitter / X Resolver
   */
  private async resolveTwitter(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    let title = 'Post on X';
    let authorName = 'X User';
    let authorUrl = 'https://x.com';
    let html: string | undefined;

    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
      const res = await safeFetch(oembedUrl, { timeoutMs: 3000 });
      const data = JSON.parse(res.text);

      if (data.author_name) authorName = this.sanitizeText(data.author_name);
      if (data.author_url) authorUrl = data.author_url;
      if (data.html) html = data.html;
      title = `${authorName} on X`;
    } catch {
      // Fallback
    }

    return {
      url,
      provider: 'twitter',
      providerName: 'X (Twitter)',
      title,
      authorName,
      authorUrl,
      html,
      aspectRatio: 'compact',
      displayMode: 'card',
      snapshottedAt,
    };
  }

  /**
   * 6. Generic Web OpenGraph HTML Scraper (Fallback)
   */
  private async resolveOpenGraph(
    url: string,
    parsed: URL,
    snapshottedAt: string,
  ): Promise<EmbedMetadataResponseDto> {
    const res = await safeFetch(url, { timeoutMs: 3500 });
    const htmlText = res.text;

    const title =
      this.extractMetaContent(htmlText, 'property', 'og:title') ||
      this.extractMetaContent(htmlText, 'name', 'twitter:title') ||
      this.extractTitleTag(htmlText) ||
      parsed.hostname;

    const description =
      this.extractMetaContent(htmlText, 'property', 'og:description') ||
      this.extractMetaContent(htmlText, 'name', 'twitter:description') ||
      this.extractMetaContent(htmlText, 'name', 'description') ||
      '';

    let thumbnailUrl =
      this.extractMetaContent(htmlText, 'property', 'og:image') ||
      this.extractMetaContent(htmlText, 'name', 'twitter:image') ||
      undefined;

    // Resolve relative thumbnail URL to absolute
    if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
      try {
        thumbnailUrl = new URL(thumbnailUrl, url).toString();
      } catch {
        thumbnailUrl = undefined;
      }
    }

    const siteName =
      this.extractMetaContent(htmlText, 'property', 'og:site_name') ||
      parsed.hostname.replace(/^www\./, '');

    const faviconUrl = this.extractFavicon(htmlText, url, parsed);

    return {
      url,
      provider: 'generic',
      providerName: siteName,
      title: this.sanitizeText(title),
      description: this.sanitizeText(description),
      authorName: siteName,
      authorUrl: `${parsed.protocol}//${parsed.hostname}`,
      thumbnailUrl,
      faviconUrl,
      aspectRatio: '16:9',
      displayMode: 'card',
      snapshottedAt,
    };
  }

  /**
   * Helper: Parse YouTube parameters (videoId and start timestamp)
   */
  private parseYouTubeParams(url: string, parsed: URL): { videoId?: string; startTime?: number } {
    let videoId: string | undefined;

    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1).split(/[?#&]/)[0];
    } else if (parsed.pathname.includes('/shorts/')) {
      videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?#&]/)[0];
    } else if (parsed.pathname.includes('/embed/')) {
      videoId = parsed.pathname.split('/embed/')[1]?.split(/[?#&]/)[0];
    } else {
      videoId = parsed.searchParams.get('v') || undefined;
    }

    // Validate 11-char ID
    if (videoId && !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      // If regex match inside URL string
      const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      videoId = match ? match[1] : undefined;
    }

    // Parse start time (e.g. ?t=45, ?t=1m30s, ?start=90)
    let startTime: number | undefined;
    const rawTime = parsed.searchParams.get('t') || parsed.searchParams.get('start');
    if (rawTime) {
      if (/^\d+$/.test(rawTime)) {
        startTime = parseInt(rawTime, 10);
      } else {
        const hours = parseInt((rawTime.match(/(\d+)h/) || [])[1] || '0', 10);
        const mins = parseInt((rawTime.match(/(\d+)m/) || [])[1] || '0', 10);
        const secs = parseInt((rawTime.match(/(\d+)s/) || [])[1] || '0', 10);
        startTime = hours * 3600 + mins * 60 + secs;
      }
    }

    return { videoId, startTime };
  }

  /**
   * Helper: Provider detection from URL hostname
   */
  private detectProvider(parsed: URL): EmbedProvider {
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('youtube-nocookie.com')) {
      return 'youtube';
    }
    if (host.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (host.includes('loom.com')) {
      return 'loom';
    }
    if (host.includes('spotify.com')) {
      return 'spotify';
    }
    if (host.includes('twitter.com') || host.includes('x.com')) {
      return 'twitter';
    }

    return 'generic';
  }

  /**
   * Helper: Regex extraction for meta tag content
   */
  private extractMetaContent(html: string, attrName: string, attrVal: string): string | null {
    const regex = new RegExp(`<meta[^>]*${attrName}=["']${attrVal}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${attrVal}["']`, 'i');
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  private extractTitleTag(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1] : null;
  }

  private extractFavicon(html: string, pageUrl: string, parsed: URL): string {
    const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i);
    if (match && match[1]) {
      try {
        return new URL(match[1], pageUrl).toString();
      } catch {
        // Fallback
      }
    }
    return `${parsed.protocol}//${parsed.hostname}/favicon.ico`;
  }

  private sanitizeText(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .trim();
  }

  private hashUrl(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private buildFallbackMetadata(
    url: string,
    provider: EmbedProvider,
    parsed: URL,
    snapshottedAt: string,
  ): EmbedMetadataResponseDto {
    const siteName = parsed.hostname.replace(/^www\./, '');
    return {
      url,
      provider,
      providerName: siteName,
      title: `${provider.toUpperCase()} Resource`,
      description: `Link to external resource on ${siteName}`,
      authorName: siteName,
      authorUrl: `${parsed.protocol}//${parsed.hostname}`,
      aspectRatio: '16:9',
      displayMode: provider === 'youtube' || provider === 'vimeo' || provider === 'loom' ? 'embed' : 'card',
      snapshottedAt,
    };
  }
}
