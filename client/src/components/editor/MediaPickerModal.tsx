import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Image as ImageIcon, X, Trash2, Loader2, Link2, Check } from 'lucide-react';
import { listMediaAssets, uploadMediaAsset, deleteMediaAsset } from '../../api/media.api';
import type { Media } from '../../types';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, media?: Media) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'url'>('library');
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [urlPreviewError, setUrlPreviewError] = useState(false);
  const [customUrlError, setCustomUrlError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await listMediaAssets(1, 40, 'own');
      setMediaList(res.items);
    } catch {
      // safe ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchMedia();
      setUploadError(null);
      setCustomUrl('');
      setUrlPreviewError(false);
    }
  }, [isOpen]);

  // Escape key listener for accessible dismissal. stopImmediatePropagation()
  // prevents the keystroke from also tripping sibling editors/modals
  // (CE9: double-Escape cascade).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the maximum limit of 5 MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const uploaded = await uploadMediaAsset(file);
      setMediaList((prev) => [uploaded, ...prev]);
      setActiveTab('library');
      onSelect(uploaded.url, uploaded);
      onClose();
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message ||
          'Upload failed. Ensure the file is a valid image (PNG, JPEG, WebP, AVIF, GIF).',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteMediaAsset(id);
      setMediaList((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // silent — user can retry
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteRequest = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) {
      setCustomUrlError('Please enter an image URL.');
      return;
    }
    if (/[\s"`<>]/.test(trimmed)) {
      setCustomUrlError('URL contains invalid characters.');
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setCustomUrlError('Please enter a valid absolute URL, e.g. https://example.com/image.jpg');
      return;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      setCustomUrlError('Only http(s) image URLs are allowed.');
      return;
    }
    setCustomUrlError(null);
    onSelect(trimmed);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans"
        >
          {/* Backdrop with pointer-only dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Modal Dialog Card with Micro-Spring Motion */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="bg-white border border-border-subtle w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative z-10"
            style={{ borderRadius: 2 }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas-paper">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-0.5">
                  Editorial Media Library
                </p>
                <h2 id="media-modal-title" className="font-editorial text-lg font-semibold text-ink-primary">
                  Select or Insert Image
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-ink-secondary hover:text-ink-primary p-1.5 transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-0 px-6 border-b border-border-subtle bg-white">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-ink-primary text-ink-primary font-semibold'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Asset Library ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-ink-primary text-ink-primary font-semibold'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Upload New File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'border-ink-primary text-ink-primary font-semibold'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Cloudinary / Web URL</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-canvas-paper">
          {activeTab === 'url' && (
            <form onSubmit={handleApplyCustomUrl} className="space-y-4 max-w-xl mx-auto py-4">
              <div className="bg-white p-6 border border-border-subtle space-y-4" style={{ borderRadius: 2 }}>
                <div>
                  <label className="block text-xs font-medium text-ink-primary mb-1 font-mono uppercase tracking-wider">
                    Direct Image or Cloudinary URL
                  </label>
                  <p className="text-[11px] text-ink-secondary mb-3">
                    Paste any public image link from Cloudinary, Unsplash, or CDN.
                  </p>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setUrlPreviewError(false);
                      setCustomUrlError(null);
                    }}
                    placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..."
                    className="w-full px-3 py-2 text-xs border border-border-subtle focus:border-ink-primary bg-canvas-paper text-ink-primary focus:outline-none font-mono"
                    style={{ borderRadius: 2 }}
                    autoFocus
                  />
                </div>

                {customUrlError && (
                  <div
                    className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono"
                    style={{ borderRadius: 2 }}
                  >
                    {customUrlError}
                  </div>
                )}

                {customUrl && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary">
                      Preview
                    </p>
                    <div className="aspect-video w-full bg-slate-100 border border-border-subtle flex items-center justify-center overflow-hidden" style={{ borderRadius: 2 }}>
                      {urlPreviewError ? (
                        <div className="text-center p-4 text-rose-600 text-xs font-mono">
                          Unable to load image from this URL. Please verify the link.
                        </div>
                      ) : (
                        <img
                          src={customUrl}
                          alt="Preview"
                          onError={() => setUrlPreviewError(true)}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!customUrl.trim() || urlPreviewError}
                    className="px-5 py-2 bg-ink-primary hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 font-mono"
                    style={{ borderRadius: 2 }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Image URL</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'upload' && (
            <div
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-border-subtle hover:border-ink-secondary bg-white transition-colors"
              style={{ borderRadius: 2 }}
            >
              <UploadCloud className="w-10 h-10 text-ink-secondary/60 mb-3" />
              <h3 className="font-editorial text-base font-semibold text-ink-primary mb-1">
                Upload image asset
              </h3>
              <p className="text-xs text-ink-secondary mb-4 text-center max-w-sm font-mono">
                PNG, JPEG, WebP, AVIF, GIF · Max 5 MB
              </p>

              {uploadError && (
                <div
                  className="mb-4 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs"
                  style={{ borderRadius: 2 }}
                >
                  {uploadError}
                </div>
              )}

              <label
                className="cursor-pointer px-5 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-2"
                style={{ borderRadius: 2 }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" /> Select Local File
                  </>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/avif, image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {activeTab === 'library' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-ink-secondary gap-2 font-mono text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-ink-primary" /> Loading assets…
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-16 text-ink-secondary">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-editorial italic">No media assets in library yet.</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1.5 bg-ink-primary text-white text-xs font-medium hover:bg-slate-800 font-mono"
                      style={{ borderRadius: 2 }}
                    >
                      Upload File
                    </button>
                    <button
                      onClick={() => setActiveTab('url')}
                      className="px-3 py-1.5 border border-border-subtle bg-white text-ink-primary text-xs font-medium hover:bg-canvas-paper font-mono"
                      style={{ borderRadius: 2 }}
                    >
                      Paste Image URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaList.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => {
                        onSelect(media.url, media);
                        onClose();
                      }}
                      className="group relative border border-border-subtle hover:border-ink-primary bg-white overflow-hidden cursor-pointer transition-colors"
                      style={{ borderRadius: 2 }}
                    >
                      <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={media.url}
                          alt={media.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2 border-t border-border-subtle bg-white">
                        {confirmDeleteId === media.id ? (
                          // Inline confirmation row
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-mono text-rose-600 shrink-0">Delete?</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteConfirm(media.id, e)}
                              disabled={deletingId === media.id}
                              className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-mono rounded-sm hover:bg-rose-700 disabled:opacity-60 shrink-0"
                            >
                              {deletingId === media.id ? '...' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteCancel}
                              className="px-2 py-0.5 border border-border-subtle text-[10px] font-mono rounded-sm hover:bg-slate-50 shrink-0"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-mono text-ink-primary truncate max-w-[100px]">
                              {media.originalName}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRequest(media.id, e)}
                              className="text-ink-secondary hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete asset"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
