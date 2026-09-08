import React, { useState, useEffect } from 'react';
import {
  Video,
  Globe,
  Upload,
  Play,
  Clock,
  ShieldCheck,
  Subtitles,
  Sparkles,
  Check,
  AlertCircle,
  Film,
  Maximize2,
  AlignCenter,
  AlignLeft,
  AlignRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  videoProviderRegistry,
  type VideoBlockMetadata,
  type VideoProviderType,
} from '../../utils/videoProviderRegistry';
import { uploadMediaAsset } from '../../api/media.api';
import { LoadingSpinner } from '../common/LoadingSpinner';


interface UnifiedVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertVideo: (videoHtml: string) => void;
  initialUrl?: string;
}

export const UnifiedVideoModal: React.FC<UnifiedVideoModalProps> = ({
  isOpen,
  onClose,
  onInsertVideo,
  initialUrl = '',
}) => {
  const [sourceType, setSourceType] = useState<'external' | 'hosted'>('external');

  // External Embed State
  const [externalUrl, setExternalUrl] = useState(initialUrl);
  const [startMinutes, setStartMinutes] = useState(0);
  const [startSeconds, setStartSeconds] = useState(0);
  const [isPrivacyEnhanced, setIsPrivacyEnhanced] = useState(true);

  // Self-Hosted Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hostedVideoUrl, setHostedVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState('');
  const [subtitleLang, setSubtitleLang] = useState('en');

  // Shared Editorial Metadata
  const [videoTitle, setVideoTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [credit, setCredit] = useState('');
  const [accessibilityDescription, setAccessibilityDescription] = useState('');
  const [widthPercent, setWidthPercent] = useState<number>(100);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExternalUrl(initialUrl || '');
      setStartMinutes(0);
      setStartSeconds(0);
      setIsPrivacyEnhanced(true);
      setUploadedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setHostedVideoUrl('');
      setPosterUrl('');
      setSubtitleUrl('');
      setSubtitleLang('en');
      setVideoTitle('');
      setCaption('');
      setCredit('');
      setAccessibilityDescription('');
      setWidthPercent(100);
      setAlign('center');
      setErrorMsg(null);
    }
  }, [isOpen, initialUrl]);

  // Derived external canonical data
  const totalStartSeconds = startMinutes * 60 + startSeconds;
  const canonical = externalUrl ? videoProviderRegistry.canonicalize(externalUrl, totalStartSeconds, isPrivacyEnhanced) : null;

  const handleFileUpload = async (file: File) => {
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
    if (!validVideoTypes.includes(file.type) && !/\.(mp4|webm|mov|ogg)$/i.test(file.name)) {
      setErrorMsg('Invalid video format. Supported: MP4 (H.264), WebM (VP9), MOV, OGG.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMsg('Video file exceeds the 200 MB maximum size limit.');
      return;
    }

    setUploadedFile(file);
    setErrorMsg(null);
    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Simulate chunked upload progress then upload via Media API
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 300);

      const uploadedAsset = await uploadMediaAsset(file);
      clearInterval(interval);
      setUploadProgress(100);
      setHostedVideoUrl(uploadedAsset.url);

      setVideoTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Video upload failed. Check network connectivity.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsert = () => {
    if (sourceType === 'external') {
      if (!canonical || !canonical.isValid) {
        setErrorMsg(canonical?.error || 'Please enter a valid video URL from YouTube, Vimeo, Loom, or Spotify.');
        return;
      }

      const meta: VideoBlockMetadata = {
        id: `vid_${Date.now()}`,
        sourceType: 'external',
        provider: canonical.provider,
        videoId: canonical.videoId,
        url: canonical.originalUrl,
        embedUrl: canonical.embedUrl,
        posterUrl: canonical.thumbnailUrl,
        title: videoTitle || canonical.title,
        caption,
        credit,
        accessibilityDescription,
        startSeconds: totalStartSeconds,
        aspectRatio: canonical.aspectRatio,
        widthPercent,
        align,
      };

      const html = videoProviderRegistry.generateVideoBlockHtml(meta);
      onInsertVideo(html);
      onClose();
    } else {
      // Hosted Gazette Video
      if (!hostedVideoUrl) {
        setErrorMsg('Please select and upload a video file first.');
        return;
      }

      const meta: VideoBlockMetadata = {
        id: `vid_hosted_${Date.now()}`,
        sourceType: 'hosted',
        provider: 'self_hosted',
        url: hostedVideoUrl,
        posterUrl,
        title: videoTitle || 'Gazette Hosted Video',
        caption,
        credit,
        accessibilityDescription,
        widthPercent,
        align,
        subtitles: subtitleUrl
          ? [
              {
                srclang: subtitleLang,
                label: subtitleLang === 'en' ? 'English' : subtitleLang.toUpperCase(),
                url: subtitleUrl,
              },
            ]
          : undefined,
      };

      const html = videoProviderRegistry.generateVideoBlockHtml(meta);
      onInsertVideo(html);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white font-sans">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-rose-800 rounded-md border border-rose-100">
              <Video size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-serif font-bold text-slate-900">
                Editorial Video &amp; Rich Media Studio
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Embed high-definition external broadcasts or host secure Gazette MP4/WebM video streams
              </DialogDescription>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md text-xs font-mono border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setSourceType('external');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                sourceType === 'external' ? 'bg-white text-rose-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe size={13} />
              <span>External Embed</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceType('hosted');
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all ${
                sourceType === 'hosted' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload size={13} />
              <span>Gazette Upload</span>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ─── TAB 1: EXTERNAL VIDEO EMBED ───────────────────────────────── */}
          {sourceType === 'external' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    External Video URL (YouTube, Vimeo, Loom, Spotify)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    value={externalUrl}
                    onChange={(e) => {
                      setExternalUrl(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-800 font-mono text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Supports normal URLs, youtu.be, YouTube Shorts, Vimeo with private hashes, and Loom recordings.
                  </p>
                </div>

                {/* Timestamp Controls */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Clock size={13} className="text-rose-800" />
                    <span>Playback Start Timestamp</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={startMinutes}
                        onChange={(e) => setStartMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-14 p-1.5 bg-white border border-slate-200 rounded text-center"
                      />
                      <span className="text-slate-500">min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={startSeconds}
                        onChange={(e) => setStartSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                        className="w-14 p-1.5 bg-white border border-slate-200 rounded text-center"
                      />
                      <span className="text-slate-500">sec</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      (Total: {totalStartSeconds}s)
                    </span>
                  </div>
                </div>

                {/* Privacy Enhanced Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Privacy-Enhanced Mode</span>
                      <span className="text-[11px] text-slate-500">Embed via youtube-nocookie.com (No tracking cookies until played)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPrivacyEnhanced}
                    onChange={(e) => setIsPrivacyEnhanced(e.target.checked)}
                    className="rounded text-rose-800"
                  />
                </div>
              </div>

              {/* Right: Live Embed Preview */}
              <div className="md:col-span-5 flex flex-col justify-center">
                <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-md aspect-video relative flex items-center justify-center text-slate-500 text-xs">
                  {canonical && canonical.isValid ? (
                    <iframe
                      src={canonical.embedUrl}
                      title="Preview"
                      className="w-full h-full border-0 absolute inset-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <Film size={28} className="mx-auto text-slate-600" />
                      <p className="font-mono text-[11px]">Enter a video URL to generate preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ─── TAB 2: GAZETTE HOSTED VIDEO ──────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-4">
                {!hostedVideoUrl ? (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                    <Upload size={28} className="mx-auto text-rose-800 mb-2" />
                    <h5 className="font-serif font-bold text-sm text-slate-800">Upload Video Asset</h5>
                    <p className="text-xs text-slate-500 mb-4">MP4, WebM, or MOV up to 200 MB</p>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/ogg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                      <span className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono rounded shadow-xs">
                        Select Video File
                      </span>
                    </label>

                    {isUploading && (
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-xs font-mono text-slate-500">
                          <span>Uploading &amp; Scanning…</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-800 h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-800 font-mono">
                      <Check size={14} className="text-emerald-600" />
                      <span>Uploaded: {uploadedFile?.name || 'Hosted Video Stream'}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHostedVideoUrl('');
                        setUploadedFile(null);
                      }}
                      className="text-xs font-mono text-slate-600"
                    >
                      Replace
                    </Button>
                  </div>
                )}

                {/* Poster & Subtitle Track Inputs */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Custom Video Poster Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={posterUrl}
                      onChange={(e) => setPosterUrl(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                      <Subtitles size={13} className="text-rose-800" />
                      <span>Accessibility Subtitle Track (WebVTT .vtt URL)</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="url"
                        placeholder="https://domain.com/subtitles.vtt"
                        value={subtitleUrl}
                        onChange={(e) => setSubtitleUrl(e.target.value)}
                        className="col-span-3 text-xs p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                      />
                      <select
                        value={subtitleLang}
                        onChange={(e) => setSubtitleLang(e.target.value)}
                        className="col-span-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                      >
                        <option value="en">English (en)</option>
                        <option value="hi">Hindi (hi)</option>
                        <option value="ta">Tamil (ta)</option>
                        <option value="fr">French (fr)</option>
                        <option value="es">Spanish (es)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Hosted Video Player Preview */}
              <div className="md:col-span-5 flex flex-col justify-center">
                <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-md aspect-video relative flex items-center justify-center text-slate-500 text-xs">
                  {hostedVideoUrl ? (
                    <video
                      src={hostedVideoUrl}
                      poster={posterUrl || undefined}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <Film size={28} className="mx-auto text-slate-600" />
                      <p className="font-mono text-[11px]">Upload a video to preview HTML5 player</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── SHARED EDITORIAL METADATA & SIZING ─────────────────────────── */}
          <div className="pt-5 border-t border-slate-200 space-y-4">
            <h5 className="font-serif font-bold text-sm text-slate-900">
              Editorial Typography &amp; Placement Controls
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-500 block mb-1">Figure Caption</label>
                <input
                  type="text"
                  placeholder="Journalistic caption describing footage context…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded font-serif"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-500 block mb-1">Videographer / Agency Credit</label>
                <input
                  type="text"
                  placeholder="e.g. Associated Press / Reuters Video"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded font-mono"
                />
              </div>
            </div>

            {/* Sizing & Alignment */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold">Display Width:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWidthPercent(50)}
                    className={`px-2.5 py-1 rounded ${widthPercent === 50 ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidthPercent(75)}
                    className={`px-2.5 py-1 rounded ${widthPercent === 75 ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWidthPercent(100)}
                    className={`px-2.5 py-1 rounded ${widthPercent === 100 ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                  >
                    100% Full Width
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold">Alignment:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAlign('left')}
                    className={`p-1.5 rounded ${align === 'left' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                    title="Align Left"
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlign('center')}
                    className={`p-1.5 rounded ${align === 'center' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                    title="Align Center"
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlign('right')}
                    className={`p-1.5 rounded ${align === 'right' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                    title="Align Right"
                  >
                    <AlignRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            Semantic Gazette Video Node with Parity Rendering
          </span>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInsert}
              className="bg-rose-800 hover:bg-rose-900 text-white text-xs font-mono flex items-center gap-1.5 shadow-xs"
            >
              <Play size={13} />
              <span>Insert Video into Manuscript</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
