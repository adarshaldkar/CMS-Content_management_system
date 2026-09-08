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
  Globe,
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

  // Transcript state (Default strictly to OFF to prevent manuscript pollution)
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [includeTranscriptInEmbed, setIncludeTranscriptInEmbed] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setCaption('');
      setErrorMsg(null);
      setTranscriptOpen(false);
      setTranscriptSearch('');
      setIncludeTranscriptInEmbed(false);
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-border-subtle max-w-2xl w-full shadow-2xl rounded-sm flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FCFBF9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-slate-100 flex items-center justify-center text-ink-primary">
              <Video size={16} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-ink-primary">
                Embed Media or Web Resource
              </h2>
              <p className="text-xs font-mono text-ink-secondary">
                Embed YouTube, Vimeo, Loom, Spotify, or any web article
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink-primary transition-colors p-1.5 rounded-xs hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
              Resource Destination URL <span className="text-accent-crimson">*</span>
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
                autoFocus
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-xs focus:outline-none focus:border-accent-crimson bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => handleFetchPreview(url)}
                disabled={isLoading || !url.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-medium rounded-xs disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Sparkles size={12} className="text-amber-300" />
                    <span>Inspect</span>
                  </>
                )}
              </button>
            </div>

            {/* Real-Time Detection Pill */}
            {detectedInfo && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-800 bg-indigo-50/80 border border-indigo-100 px-3 py-1 rounded-xs">
                {detectedInfo.provider === 'youtube' && <Play size={12} className="text-rose-600" />}
                {detectedInfo.provider === 'spotify' && <Music size={12} className="text-emerald-600" />}
                {detectedInfo.provider === 'twitter' && <Twitter size={12} className="text-sky-500" />}
                <span>Detected Provider: <strong>{detectedInfo.providerName}</strong></span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Live Preview Card */}
          {previewData && (
            <div className="space-y-3.5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
                  Display Formatting
                </span>
                <span className="text-[10px] font-mono text-slate-400">Select presentation layout</span>
              </div>

              {/* Display Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'embed' as EmbedDisplayMode, label: 'Interactive Player', icon: Play },
                  { id: 'card' as EmbedDisplayMode, label: 'Editorial Card', icon: FileText },
                  { id: 'link' as EmbedDisplayMode, label: 'Inline Link', icon: LinkIcon },
                ].map((m) => {
                  const isSelected = displayMode === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDisplayMode(m.id)}
                      className={`px-3 py-2 text-xs font-mono rounded-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Visual Preview */}
              <div className="p-3.5 bg-[#FCFBF9] border border-border-subtle rounded-sm">
                {displayMode === 'embed' && previewData.embedUrl ? (
                  <div className="space-y-2">
                    <div className="relative aspect-video w-full rounded-sm bg-slate-950 overflow-hidden border border-slate-800">
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
                  <div className="flex gap-3 bg-white border border-slate-200 p-3 rounded-xs shadow-2xs">
                    {previewData.thumbnailUrl && (
                      <img
                        src={previewData.thumbnailUrl}
                        alt=""
                        className="w-24 h-20 object-cover rounded-xs shrink-0 bg-slate-100 border border-slate-200"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-secondary">
                        {previewData.faviconUrl && (
                          <img src={previewData.faviconUrl} alt="" className="w-3 h-3 rounded-full" />
                        )}
                        <span className="font-bold text-accent-crimson uppercase">{previewData.providerName}</span>
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
                    <LinkIcon size={13} className="text-accent-crimson" />
                    <span className="underline truncate font-serif text-accent-crimson">
                      {previewData.title || previewData.url}
                    </span>
                  </div>
                )}
              </div>

              {/* Caption Input */}
              <div>
                <label className="text-[11px] font-mono text-ink-secondary block mb-1">
                  Editorial Caption (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Video courtesy of Imagine Dragons (Official)"
                  className="w-full px-2.5 py-1.5 text-xs font-sans border border-slate-200 rounded-xs focus:outline-none focus:border-accent-crimson bg-slate-50/50"
                />
              </div>

              {/* ─── CLEAN TRANSCRIPT VIEWER & ATTACH TOGGLE ─── */}
              {hasTranscript && (
                <div className="border border-slate-200 rounded-sm overflow-hidden bg-white">
                  {/* Transcript Header Toggle */}
                  <button
                    type="button"
                    onClick={() => setTranscriptOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <ScrollText size={14} className="text-accent-crimson shrink-0" />
                      <span className="text-xs font-mono font-bold text-ink-primary">
                        {providerLabel} Transcript &amp; Lyrics ({previewData?.transcriptLines?.length || 0} lines)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">
                        {transcriptOpen ? 'Collapse' : 'Preview'}
                      </span>
                      {transcriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {transcriptOpen && (
                    <div className="p-3.5 space-y-3 border-t border-slate-200 bg-[#FCFBF9]">
                      {/* Search & Copy Bar */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          placeholder="Search speech / lyric phrases…"
                          className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-xs bg-white focus:outline-none focus:border-accent-crimson"
                        />
                        <button
                          type="button"
                          onClick={handleCopyTranscript}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1 transition-colors shrink-0"
                          title="Copy Clean Transcript"
                        >
                          {copied ? (
                            <>
                              <CheckCheck size={12} className="text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Clean Transcript Lines Display (No bracketed timestamps) */}
                      <div
                        ref={transcriptRef}
                        className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white border border-slate-200 rounded-xs text-xs font-sans text-ink-primary leading-relaxed"
                      >
                        {filteredTranscriptLines().length > 0 ? (
                          filteredTranscriptLines().map((line, idx) => (
                            <div key={idx} className="hover:bg-slate-50 px-1.5 py-0.5 rounded-xs transition-colors">
                              <span>{line.text}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs font-mono text-slate-400 py-3 text-center">
                            No transcript lines match "{transcriptSearch}"
                          </div>
                        )}
                      </div>

                      {/* Attach Transcript Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <label className="text-xs font-sans text-ink-primary cursor-pointer flex items-center gap-2 select-none">
                          <input
                            type="checkbox"
                            checked={includeTranscriptInEmbed}
                            onChange={(e) => setIncludeTranscriptInEmbed(e.target.checked)}
                            className="rounded-xs text-accent-crimson focus:ring-accent-crimson w-3.5 h-3.5"
                          />
                          <span>Attach transcript section under video in manuscript</span>
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">Clean text format</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-[#FCFBF9] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-400 text-xs font-mono text-ink-secondary hover:text-ink-primary rounded-xs transition-colors bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmInsert}
            disabled={!url.trim() || isLoading}
            className="px-4 py-1.5 bg-accent-crimson hover:bg-rose-900 text-white text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Check size={13} />
            <span>Insert into Manuscript</span>
          </button>
        </div>
      </div>
    </div>
  );
};
