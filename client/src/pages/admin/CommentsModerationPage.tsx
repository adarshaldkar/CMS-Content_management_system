import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Flag,
  MessageSquare,
  Trash2,
  RefreshCw,
  Eye,
  Search,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Skeleton } from '../../components/common/SkeletonLoader';

interface Comment {
  id: string;
  articleId: string;
  articleTitle?: string;
  authorId: string;
  authorName?: string;
  body: string;
  status: 'pending' | 'approved' | 'hidden' | 'flagged';
  isHidden: boolean;
  flagCount?: number;
  createdAt: string;
}

interface CommentsResponse {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CommentsModerationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'flagged' | 'hidden'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: commentsData, isLoading, refetch } = useQuery({
    queryKey: ['adminComments', filter],
    queryFn: async () => {
      const { data } = await apiClient.get<CommentsResponse>('/comments', {
        params: {
          limit: 50,
          ...(filter === 'flagged' ? { flagged: true } : {}),
          ...(filter === 'hidden' ? { hidden: true } : {}),
        },
      });
      return data;
    },
  });

  const hideCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.post(`/comments/${commentId}/hide`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminComments'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminComments'] });
    },
  });

  const comments = commentsData?.items || [];

  const filteredComments = comments.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.body.toLowerCase().includes(term) ||
      (c.authorName || '').toLowerCase().includes(term) ||
      (c.articleTitle || '').toLowerCase().includes(term)
    );
  });

  const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
    approved: { label: 'Approved', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    pending: { label: 'Pending', dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
    flagged: { label: 'Flagged', dot: 'bg-rose-500', bg: 'bg-rose-50 border-rose-200 text-rose-800' },
    hidden: { label: 'Hidden', dot: 'bg-slate-400', bg: 'bg-slate-100 border-slate-300 text-slate-600' },
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <MessageSquare size={13} />
            <span>Community Safety</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Reader Comments &amp; Moderation
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            {commentsData?.total ?? 0} total comments
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-border-subtle rounded-lg text-ink-secondary hover:text-ink-primary hover:border-ink-primary transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:border-ink-primary"
          />
        </div>

        {/* Filter Tabs */}
        {(['all', 'flagged', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors capitalize ${
              filter === f
                ? 'bg-ink-primary text-white border-ink-primary'
                : 'border-border-subtle text-ink-secondary hover:border-ink-primary hover:text-ink-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Comment List */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="p-4 bg-white border border-border-subtle rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-32 h-4" />
            </div>
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
          </div>
          <div className="p-4 bg-white border border-border-subtle rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-32 h-4" />
            </div>
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-3/4 h-4" />
          </div>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border-subtle rounded-xl">
          <MessageSquare size={32} className="mx-auto mb-3 text-ink-secondary opacity-40" />
          <p className="text-sm text-ink-secondary">No comments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => {
            const cfg = statusConfig[comment.status] || statusConfig.approved;
            return (
              <div
                key={comment.id}
                className="bg-white border border-border-subtle rounded-xl p-5 space-y-3"
              >
                {/* Top row: author + status */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-semibold text-ink-primary">
                      {comment.authorName || 'Anonymous'}
                    </span>
                    <span className="text-[10px] text-ink-secondary">·</span>
                    <span className="text-[10px] font-mono text-ink-secondary">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Article context */}
                {comment.articleTitle && (
                  <p className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary">
                    On: {comment.articleTitle}
                  </p>
                )}

                {/* Comment body */}
                <p className="text-xs text-ink-primary leading-relaxed">{comment.body}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {!comment.isHidden && (
                    <button
                      onClick={() => hideCommentMutation.mutate(comment.id)}
                      disabled={hideCommentMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <Eye size={12} />
                      Hide
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Permanently delete this comment?')) {
                        deleteCommentMutation.mutate(comment.id);
                      }
                    }}
                    disabled={deleteCommentMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border border-rose-300 text-rose-700 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                  {comment.flagCount != null && comment.flagCount > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-rose-600 font-mono">
                      <Flag size={11} />
                      {comment.flagCount} flag{comment.flagCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!comment.flagCount && comment.status === 'approved' && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
                      <CheckCircle2 size={11} />
                      Approved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
