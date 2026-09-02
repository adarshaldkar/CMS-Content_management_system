import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  FileText,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Layers,
  Music,
  Twitter,
} from 'lucide-react';
import { embedsApi, type EmbedMetadataResponse, type EmbedDisplayMode } from '../../api/embeds.api';
import { detectEmbedInfo, isValidUrl } from '../../utils/embedParser';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface RichEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (embedData: EmbedMetadataResponse) => void;
  initialUrl?: string;
}

export const RichEmbedModal: React.FC<RichEmbedModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialUrl = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [caption, setCaption] = useState('');
  const [displayMode, setDisplayMode] = useState<EmbedDisplayMode>('embed');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<EmbedMetadataResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setCaption('');
      setErrorMsg(null);
      if (initialUrl && isValidUrl(initialUrl)) {
        handleFetchPreview(initialUrl);
      } else {
        setPreviewData(null);
      }
    }
  }, [isOpen, initialUrl]);

  if (!isOpen) return null;

  const detectedInfo = url ? detectEmbedInfo(url) : null;

  const handleFetchPreview = async (targetUrl: string) => {
    if (!isValidUrl(targetUrl)) {
      setErrorMsg('Please enter a valid HTTP or HTTPS URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await embedsApi.scrape(targetUrl.trim());
      setPreviewData(data);
      if (data.displayMode) {
        setDisplayMode(data.displayMode);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          'Failed to scrape link metadata. You can still insert this as a standard link.',
      );
      // Fallback
      if (detectedInfo) {
        setPreviewData({
          url: targetUrl.trim(),
          provider: detectedInfo.provider,
          providerName: detectedInfo.providerName,
          videoId: detectedInfo.videoId,
          embedUrl: detectedInfo.embedUrl,
          title: `${detectedInfo.providerName} Media`,
          aspectRatio: '16:9',
          displayMode: detectedInfo.isMedia ? 'embed' : 'card',
          snapshottedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmInsert = () => {
    if (!previewData) {
      if (!isValidUrl(url)) return;
      // Fallback construction
      const info = detectEmbedInfo(url);
      onInsert({
        url: url.trim(),
        provider: info?.provider || 'generic',
        providerName: info?.providerName || 'Web Resource',
        videoId: info?.videoId,
        embedUrl: info?.embedUrl || url.trim(),
        title: url.trim(),
        caption: caption.trim() || undefined,
        aspectRatio: '16:9',
        displayMode,
        snapshottedAt: new Date().toISOString(),
      });
    } else {
      onInsert({
        ...previewData,
        caption: caption.trim() || undefined,
        displayMode,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-border-subtle max-w-xl w-full p-6 space-y-5 shadow-2xl rounded-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-ink-primary">
              <Video size={16} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-ink-primary">
                Embed Media or Rich Web Link
              </h2>
              <p className="text-[11px] font-mono text-ink-secondary">
                Paste YouTube, Vimeo, Loom, Spotify, X, or any web article
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink-primary transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-secondary">
            Resource URL *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetchPreview(url);
                }
              }}
              placeholder="https://www.youtube.com/watch?v=... or https://..."
              className="flex-1 px-3 py-2 text-xs border border-border-subtle focus:outline-none focus:border-ink-primary font-mono"
            />
            <button
              type="button"
              onClick={() => handleFetchPreview(url)}
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-medium rounded-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Sparkles size={12} />
                  <span>Inspect</span>
                </>
              )}
            </button>
          </div>

          {/* Real-Time Detection Pill */}
          {detectedInfo && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded">
              {detectedInfo.provider === 'youtube' && <Play size={12} className="text-rose-600" />}
              {detectedInfo.provider === 'spotify' && <Music size={12} className="text-emerald-600" />}
              {detectedInfo.provider === 'twitter' && <Twitter size={12} className="text-sky-500" />}
              <span>Detected: <strong>{detectedInfo.providerName}</strong></span>
              {detectedInfo.startTime !== undefined && (
                <span className="text-[10px] text-indigo-500">
                  (Starts at {detectedInfo.startTime}s)
                </span>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Live Preview Card */}
        {previewData && (
          <div className="space-y-3 border-t border-border-subtle pt-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary block">
              Live Preview &amp; Formatting
            </span>

            {/* Display Mode Selector */}
            <div className="flex items-center gap-2">
              {[
                { id: 'embed' as EmbedDisplayMode, label: 'Interactive Player', icon: Play },
                { id: 'card' as EmbedDisplayMode, label: 'Rich Link Card', icon: FileText },
                { id: 'link' as EmbedDisplayMode, label: 'Plain Link', icon: LinkIcon },
              ].map((m) => {
                const isSelected = displayMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDisplayMode(m.id)}
                    className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-ink-primary text-white font-medium shadow-sm'
                        : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Visual Card Display */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              {displayMode === 'embed' && previewData.embedUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-video w-full rounded bg-black overflow-hidden border border-slate-300">
                    <iframe
                      src={previewData.embedUrl}
                      title={previewData.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="text-xs font-serif font-bold text-ink-primary truncate">
                    {previewData.title}
                  </div>
                </div>
              ) : displayMode === 'card' ? (
                <div className="flex gap-3 bg-white border border-slate-200 p-3 rounded shadow-sm">
                  {previewData.thumbnailUrl && (
                    <img
                      src={previewData.thumbnailUrl}
                      alt=""
                      className="w-24 h-20 object-cover rounded shrink-0 bg-slate-100"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-secondary">
                      {previewData.faviconUrl && (
                        <img src={previewData.faviconUrl} alt="" className="w-3 h-3 rounded-full" />
                      )}
                      <span>{previewData.providerName}</span>
                    </div>
                    <h4 className="font-serif font-bold text-xs text-ink-primary line-clamp-1">
                      {previewData.title}
                    </h4>
                    {previewData.description && (
                      <p className="text-[11px] text-ink-secondary line-clamp-2">
                        {previewData.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono text-ink-primary">
                  <LinkIcon size={13} className="text-slate-400" />
                  <span className="underline truncate">{previewData.title || previewData.url}</span>
                </div>
              )}
            </div>

            {/* Optional Caption Field */}
            <div>
              <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                Optional Editorial Caption
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Figure 1: Demonstration of distributed mesh replication..."
                className="w-full px-3 py-1.5 text-xs border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-border-subtle pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono border border-border-subtle hover:bg-slate-50 text-ink-secondary rounded-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmInsert}
            disabled={!url.trim()}
            className="px-5 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-mono font-medium rounded-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Check size={13} />
            <span>Insert into Manuscript</span>
          </button>
        </div>
      </div>
    </div>
  );
};
