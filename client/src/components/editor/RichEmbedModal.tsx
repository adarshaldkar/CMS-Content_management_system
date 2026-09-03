import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Play,
  FileText,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  Check,
  X,
  Music,
  Twitter,
  ScrollText,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
  Clock,
} from 'lucide-react';
import {
  embedsApi,
  type EmbedMetadataResponse,
  type EmbedDisplayMode,
  type TranscriptLine,
} from '../../api/embeds.api';
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

  // Transcript state
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [includeTranscriptInEmbed, setIncludeTranscriptInEmbed] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setCaption('');
      setErrorMsg(null);
      setTranscriptOpen(false);
      setTranscriptSearch('');
      setIncludeTranscriptInEmbed(true);
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
    setTranscriptOpen(false);

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
        transcript: includeTranscriptInEmbed ? previewData.transcript : undefined,
      });
    }
    onClose();
  };

  const handleCopyTranscript = () => {
    const text = previewData?.transcript || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredTranscriptLines = (): TranscriptLine[] => {
    const lines = previewData?.transcriptLines || [];
    if (!transcriptSearch.trim()) return lines;
    const q = transcriptSearch.toLowerCase();
    return lines.filter((l) => l.text.toLowerCase().includes(q));
  };

  const hasTranscript = !!previewData?.hasTranscript && (previewData.transcriptLines?.length ?? 0) > 0;
  const providerLabel = previewData?.provider === 'generic' ? 'Article' : 'Video';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-border-subtle max-w-2xl w-full shadow-2xl rounded-sm flex flex-col max-h-[90vh]">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
              <div className="flex items-center gap-2 flex-wrap">
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

              {/* ─── TRANSCRIPT PANEL ─── */}
              {hasTranscript && (
                <div className="border border-slate-200 rounded overflow-hidden">
                  {/* Transcript toggle header */}
                  <button
                    type="button"
                    onClick={() => setTranscriptOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ScrollText size={13} className="text-indigo-500 shrink-0" />
                      <span className="text-[11px] font-mono font-semibold text-ink-primary uppercase tracking-wider">
                        {providerLabel} Transcript
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">
                        {previewData.transcriptLines!.length} lines
                      </span>
                      {previewData.provider === 'youtube' && (
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={9} />
                          timestamped
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTranscript();
                        }}
                        className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-ink-primary transition-colors px-2 py-1 rounded hover:bg-slate-200"
                        title="Copy full transcript"
                      >
                        {copied ? (
                          <>
                            <CheckCheck size={11} className="text-emerald-500" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      {transcriptOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Expanded transcript body */}
                  {transcriptOpen && (
                    <div className="border-t border-slate-200">
                      {/* Search bar */}
                      <div className="px-3 py-2 border-b border-slate-100 bg-white">
                        <input
                          type="text"
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          placeholder="Search transcript..."
                          className="w-full px-2 py-1 text-[11px] font-mono border border-border-subtle rounded focus:outline-none focus:border-indigo-400 bg-slate-50"
                        />
                      </div>

                      {/* Lines */}
                      <div
                        ref={transcriptRef}
                        className="max-h-52 overflow-y-auto divide-y divide-slate-50"
                      >
                        {filteredTranscriptLines().length === 0 ? (
                          <div className="px-4 py-6 text-center text-[11px] font-mono text-slate-400">
                            No matching lines found.
                          </div>
                        ) : (
                          filteredTranscriptLines().map((line, idx) => (
                            <div
                              key={idx}
                              className="flex gap-2.5 px-3 py-1.5 hover:bg-slate-50 transition-colors group"
                            >
                              {line.time && (
                                <span className="shrink-0 text-[10px] font-mono text-indigo-400 mt-0.5 min-w-[48px] select-none">
                                  {line.time}
                                </span>
                              )}
                              <p className="text-[11px] text-ink-secondary leading-relaxed flex-1">
                                {transcriptSearch.trim()
                                  ? highlightText(line.text, transcriptSearch)
                                  : line.text}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Controls row */}
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-[11px] font-mono text-ink-primary cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeTranscriptInEmbed}
                            onChange={(e) => setIncludeTranscriptInEmbed(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                          />
                          <span>Attach transcript accordion in manuscript</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            onInsert({
                              ...previewData,
                              displayMode: 'link',
                              title: `${previewData.title} (Transcript)`,
                              transcript: previewData.transcript,
                            });
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[10px] font-mono text-slate-700 bg-slate-200 hover:bg-slate-300 rounded transition-colors font-medium"
                        >
                          Insert Transcript Only
                        </button>
                      </div>

                      {/* Footer hint */}
                      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">
                          {previewData.provider === 'youtube'
                            ? 'Sourced from YouTube auto-captions'
                            : 'Extracted from article content'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {filteredTranscriptLines().length} / {previewData.transcriptLines!.length} lines
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No-transcript badge for scraped articles */}
              {previewData && !hasTranscript && previewData.provider !== 'youtube' && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded">
                  <ScrollText size={11} />
                  <span>No transcript available for this resource.</span>
                </div>
              )}

              {/* No-transcript for YouTube without captions */}
              {previewData && !hasTranscript && previewData.provider === 'youtube' && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded">
                  <ScrollText size={11} />
                  <span>Auto-captions not available for this video — transcript could not be extracted.</span>
                </div>
              )}

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
        </div>

        {/* Footer Actions — always visible */}
        <div className="border-t border-border-subtle px-6 py-4 flex items-center justify-end gap-2 bg-white">
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

/**
 * Highlights occurrences of `query` inside `text` with a yellow span.
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-ink-primary rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
