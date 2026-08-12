import React, { useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, Trash2, Loader2 } from 'lucide-react';
import { listMediaAssets, uploadMediaAsset, deleteMediaAsset } from '../../api/media.api';
import type { Media } from '../../types';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, media: Media) => void;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await listMediaAssets(1, 40);
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this media asset?')) return;
    try {
      await deleteMediaAsset(id);
      setMediaList((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert('Failed to delete asset.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-sans">
      <div
        className="bg-white border border-border-subtle w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ borderRadius: 2 }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas-paper">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-0.5">
              Editorial Media Library
            </p>
            <h2 className="font-editorial text-lg font-semibold text-ink-primary">
              Select or Upload Asset
            </h2>
          </div>
          <button
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
                ? 'border-ink-primary text-ink-primary'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Asset Library ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-ink-primary text-ink-primary'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Upload New File
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-canvas-paper">
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
                  <p className="text-sm font-editorial italic">No media assets uploaded yet.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 text-xs text-accent-crimson font-medium hover:underline font-mono"
                  >
                    Upload your first asset →
                  </button>
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
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between border-t border-border-subtle">
                        <p className="text-[11px] font-mono text-ink-secondary truncate max-w-[120px]">
                          {media.originalName}
                        </p>
                        <button
                          onClick={(e) => handleDelete(media.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-red-500 p-0.5 transition-opacity"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
