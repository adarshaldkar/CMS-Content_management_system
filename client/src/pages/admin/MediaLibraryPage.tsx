import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  Image as ImageIcon,
  Trash2,
  Upload,
  Sparkles,
  Layers,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Media, PaginatedResult, ImageVariant } from '../../types';

export const MediaLibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Fetch Media Assets
  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['adminMediaList'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Media>>('/media', {
        params: { limit: 40 },
      });
      return data;
    },
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['adminMediaList'] });
    },
    onError: (err: any) => {
      setUploadError(
        err?.response?.data?.message ||
          'Upload failed. Ensure the image is valid (PNG, JPEG, WebP, AVIF, GIF) and under 100 MB.',
      );
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to delete this media asset and all its responsive derivatives?')) return;
      await apiClient.delete(`/media/${id}`);
    },
    onSuccess: () => {
      if (selectedMedia) setSelectedMedia(null);
      queryClient.invalidateQueries({ queryKey: ['adminMediaList'] });
    },
  });

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setUploadError('File size exceeds the maximum limit of 100 MB.');
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const mediaItems = mediaData?.items || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <ImageIcon size={13} />
            <span>Digital Asset Management & AI Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Media & Asset Library
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Upload high-resolution photography with automated WebP compression, multi-size responsive generation, and Cloudinary CDN support.
          </p>
        </div>

        {/* Upload Button */}
        <label
          className="flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors font-mono cursor-pointer self-start sm:self-auto shadow-sm"
          style={{ borderRadius: 2 }}
        >
          <Upload size={13} />
          <span>{uploadMutation.isPending ? 'Optimizing & Uploading…' : 'Upload Image (Up to 100MB)'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {uploadError && (
        <div
          className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono"
          style={{ borderRadius: 2 }}
        >
          {uploadError}
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Indexing media repository..." />
        </div>
      ) : mediaItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mediaItems.map((media) => {
            const hasOptimization = Boolean(media.optimization);
            const savings = media.optimization?.savingsPercent;
            const variantsCount = media.variants?.length || 0;

            return (
              <div
                key={media.id}
                className="bg-white border border-border-subtle overflow-hidden group space-y-2 p-3 transition-colors hover:border-ink-primary flex flex-col justify-between"
                style={{ borderRadius: 2 }}
              >
                <div className="space-y-2">
                  <div
                    onClick={() => setSelectedMedia(media)}
                    className="aspect-video bg-canvas-paper relative overflow-hidden border border-border-subtle/60 cursor-pointer"
                    style={{ borderRadius: 2 }}
                  >
                    <img
                      src={media.url}
                      alt={media.originalName || media.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Optimization Pill */}
                    {hasOptimization && savings && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-emerald-900/90 backdrop-blur-xs text-emerald-200 text-[9px] font-mono font-medium rounded-xs flex items-center gap-1 shadow-sm">
                        <Sparkles size={10} />
                        {savings} saved
                      </span>
                    )}

                    {variantsCount > 1 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-mono rounded-xs flex items-center gap-0.5">
                        <Layers size={9} />
                        {variantsCount} sizes
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p
                      className="text-xs font-mono text-ink-primary truncate font-semibold cursor-pointer hover:underline"
                      onClick={() => setSelectedMedia(media)}
                      title={media.originalName || media.filename}
                    >
                      {media.originalName || media.filename}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-ink-secondary">
                      <span>{(media.size / 1024).toFixed(0)} KB</span>
                      <span>
                        {media.optimization?.format?.toUpperCase() ||
                          media.mimeType.split('/')[1]?.toUpperCase()}
                      </span>
                    </div>

                    {media.optimization?.width && (
                      <p className="text-[9px] font-mono text-ink-secondary/70">
                        {media.optimization.width} × {media.optimization.height} px
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
                  <button
                    onClick={() => handleCopyUrl(media.id, media.url)}
                    className="flex items-center gap-1 text-[11px] font-mono text-ink-secondary hover:text-ink-primary transition-colors"
                  >
                    {copiedId === media.id ? (
                      <>
                        <Check size={11} className="text-emerald-700" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedMedia(media)}
                      className="text-ink-secondary hover:text-ink-primary transition-colors p-1"
                      title="Inspect Variants"
                    >
                      <Info size={12} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(media.id)}
                      className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                      title="Delete Asset"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
          <ImageIcon size={28} className="mx-auto text-ink-secondary/40 mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No media assets uploaded yet</p>
          <p className="text-xs text-ink-secondary mt-1 font-editorial italic">
            Upload high-resolution photography to automatically optimize, compress, and generate responsive web variants.
          </p>
        </div>
      )}

      {/* Asset Inspector & Responsive Variants Modal */}
      {selectedMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="bg-white border border-border-subtle w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            style={{ borderRadius: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas-paper">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-0.5">
                  Asset Intelligence & Derivatives
                </p>
                <h2 className="font-editorial text-lg font-semibold text-ink-primary truncate max-w-md">
                  {selectedMedia.originalName || selectedMedia.filename}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-ink-secondary hover:text-ink-primary p-1.5"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Preview */}
              <div className="aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden border border-border-subtle" style={{ borderRadius: 2 }}>
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Optimization Performance Stats */}
              {selectedMedia.optimization && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 space-y-2" style={{ borderRadius: 2 }}>
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs font-mono">
                    <Sparkles size={14} />
                    <span>Auto-Optimization Results</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
                    <div>
                      <span className="text-emerald-700 text-[10px] block">Original Size</span>
                      <strong className="text-emerald-950">
                        {(selectedMedia.optimization.originalSizeBytes / 1024).toFixed(1)} KB
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] block">Optimized (WebP)</span>
                      <strong className="text-emerald-950">
                        {(selectedMedia.optimization.optimizedSizeBytes / 1024).toFixed(1)} KB
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] block">Bandwidth Saved</span>
                      <strong className="text-emerald-950 font-bold">
                        {selectedMedia.optimization.savingsPercent}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 text-[10px] block">Dimensions</span>
                      <strong className="text-emerald-950">
                        {selectedMedia.optimization.width}×{selectedMedia.optimization.height}px
                      </strong>
                    </div>
                  </div>

                  {selectedMedia.optimization.appliedEnhancements?.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200 text-[11px] font-mono text-emerald-800 flex flex-wrap gap-1.5">
                      {selectedMedia.optimization.appliedEnhancements.map((e, idx) => (
                        <span key={idx} className="bg-emerald-100 px-2 py-0.5 rounded-xs">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Responsive Derivatives Table */}
              <div className="space-y-2">
                <h3 className="font-editorial text-sm font-semibold text-ink-primary flex items-center gap-1.5">
                  <Layers size={14} className="text-accent-crimson" />
                  <span>Generated Responsive Variants ({selectedMedia.variants?.length || 1})</span>
                </h3>
                <p className="text-[11px] text-ink-secondary">
                  Ready-to-use derivative URLs for responsive picture and srcset tags:
                </p>

                <div className="border border-border-subtle bg-white overflow-hidden" style={{ borderRadius: 2 }}>
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-canvas-paper border-b border-border-subtle text-[10px] uppercase tracking-wider text-ink-secondary">
                      <tr>
                        <th className="px-3 py-2">Variant</th>
                        <th className="px-3 py-2">Dimensions</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {(selectedMedia.variants && selectedMedia.variants.length > 0
                        ? selectedMedia.variants
                        : [
                            {
                              kind: 'original' as const,
                              width: selectedMedia.optimization?.width || 0,
                              height: selectedMedia.optimization?.height || 0,
                              mimeType: selectedMedia.mimeType,
                              sizeBytes: selectedMedia.size,
                              url: selectedMedia.url,
                            },
                          ]
                      ).map((v: ImageVariant, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold capitalize text-ink-primary">
                            {v.kind}
                          </td>
                          <td className="px-3 py-2 text-ink-secondary">
                            {v.width > 0 ? `${v.width} × ${v.height} px` : 'Source Size'}
                          </td>
                          <td className="px-3 py-2 text-ink-secondary">
                            {(v.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleCopyUrl(`${selectedMedia.id}-${v.kind}`, v.url)}
                              className="px-2 py-1 bg-canvas-paper hover:bg-ink-primary hover:text-white border border-border-subtle text-[10px] transition-colors rounded-xs"
                            >
                              {copiedId === `${selectedMedia.id}-${v.kind}` ? 'Copied' : 'Copy URL'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border-subtle bg-canvas-paper flex justify-end">
              <button
                onClick={() => setSelectedMedia(null)}
                className="px-4 py-1.5 bg-ink-primary text-white text-xs font-mono font-medium hover:bg-slate-800"
                style={{ borderRadius: 2 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
