import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Media, PaginatedResult } from '../../types';

export const MediaLibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['adminMediaList'] });
    },
  });

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to delete this media asset?')) return;
      await apiClient.delete(`/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMediaList'] });
    },
  });

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const assets = mediaData?.items || [];
  const totalSizeBytes = assets.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <ImageIcon size={15} />
            <span>Digital Asset Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            Editorial Media Library
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Inspect uploaded images, copy CDN URLs, and manage storage resources.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm cursor-pointer self-start sm:self-auto">
          <Upload size={14} />
          <span>Upload Asset</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      {/* Storage Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-border-subtle text-xs font-mono">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-ink-secondary" />
          <span>Storage Footprint: <strong className="text-ink-primary">{totalSizeMB} MB</strong></span>
        </div>
        <div>
          <span>Total Assets: <strong className="text-ink-primary">{assets.length}</strong></span>
        </div>
        <div>
          <span>Provider: <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Local / Cloud CDN</strong></span>
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading media assets..." />
        </div>
      ) : assets.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm space-y-2 group hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="aspect-square bg-slate-100 relative overflow-hidden border-b border-border-subtle">
                <img
                  src={asset.url}
                  alt={asset.originalFilename || 'Media asset'}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-sm text-white rounded text-[10px] font-mono uppercase">
                  {asset.mimeType?.split('/')[1] || 'IMAGE'}
                </span>
              </div>

              <div className="p-3 space-y-2">
                <p className="text-xs font-bold text-ink-primary truncate">
                  {asset.originalFilename || 'asset.jpg'}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                  <span>{((asset.sizeBytes || 0) / 1024).toFixed(0)} KB</span>
                  <span>{asset.width && asset.height ? `${asset.width}x${asset.height}` : '2D'}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => handleCopyUrl(asset.id, asset.url)}
                    className="flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink-primary font-mono"
                  >
                    {copiedId === asset.id ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteMutation.mutate(asset.id)}
                    className="p-1 text-rose-500 hover:text-rose-700 rounded"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-2xl">
          <FolderOpen size={28} className="mx-auto text-ink-secondary mb-2" />
          <p className="text-xs font-semibold text-ink-primary">Media library is empty</p>
          <p className="text-xs text-ink-secondary mt-1">Upload images to use them in article manuscripts.</p>
        </div>
      )}
    </div>
  );
};
