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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Media Asset Studio</h2>
              <p className="text-xs text-slate-400">Upload & insert secure, sanitized images</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('library')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'library'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Media Library ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload New Asset
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/40 transition">
              <UploadCloud className="w-12 h-12 text-slate-500 mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">
                Drop your image or browse
              </h3>
              <p className="text-xs text-slate-400 mb-4 text-center max-w-sm">
                Supported formats: PNG, JPEG, WebP, AVIF, GIF. Max file size: 5 MB.
                (Active SVGs strictly prohibited).
              </p>

              {uploadError && (
                <div className="mb-4 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                  {uploadError}
                </div>
              )}

              <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg transition flex items-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading & Verifying...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Select File
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
                <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Loading media...
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No media uploaded yet.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 text-xs text-emerald-400 hover:underline"
                  >
                    Upload your first asset
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaList.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => {
                        onSelect(media.url, media);
                        onClose();
                      }}
                      className="group relative rounded-xl border border-slate-800 hover:border-emerald-500/60 bg-slate-950 overflow-hidden cursor-pointer transition shadow-md"
                    >
                      <div className="aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                        <img
                          src={media.url}
                          alt={media.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-2.5 flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                          {media.originalName}
                        </p>
                        <button
                          onClick={(e) => handleDelete(media.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
