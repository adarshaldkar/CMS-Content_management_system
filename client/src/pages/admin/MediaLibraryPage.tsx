import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Copy,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
            <span>Digital Asset Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Media & Asset Library
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Upload cover photography, manage inline manuscript figures, and inspect storage metadata.
          </p>
        </div>

        {/* Upload Button */}
        <label
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors font-mono cursor-pointer self-start sm:self-auto"
          style={{ borderRadius: 2 }}
        >
          <Upload size={13} />
          <span>{uploadMutation.isPending ? 'Uploading…' : 'Upload Asset'}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploadMutation.isPending}
          />
        </label>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Indexing media repository..." />
        </div>
      ) : mediaItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mediaItems.map((media) => (
            <div
              key={media.id}
              className="bg-white border border-border-subtle overflow-hidden group space-y-2 p-3 transition-colors hover:border-ink-primary"
              style={{ borderRadius: 2 }}
            >
              <div className="aspect-video bg-canvas-paper relative overflow-hidden border border-border-subtle/60" style={{ borderRadius: 2 }}>
                <img
                  src={media.url}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-mono text-ink-primary truncate font-semibold">
                  {media.filename}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-ink-secondary">
                  <span>{(media.size / 1024).toFixed(0)} KB</span>
                  <span>{media.mimeType.split('/')[1]?.toUpperCase()}</span>
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

                <button
                  onClick={() => deleteMutation.mutate(media.id)}
                  className="text-rose-600 hover:text-rose-800 transition-colors p-1"
                  title="Delete Asset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
          <ImageIcon size={28} className="mx-auto text-ink-secondary/40 mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No media assets uploaded yet</p>
          <p className="text-xs text-ink-secondary mt-1 font-editorial italic">
            Upload cover photos or editorial figures to display them here.
          </p>
        </div>
      )}
    </div>
  );
};
