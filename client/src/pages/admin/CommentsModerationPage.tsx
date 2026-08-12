import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Flag,
  MessageSquare,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const CommentsModerationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged'>('all');

  // Simulated / real comments query
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['adminCommentsModeration', filter],
    queryFn: async () => {
      // In real CMS, calls GET /api/comments/moderation or article comments
      return [
        {
          id: 'cm-1',
          authorName: 'Eleanor Vance',
          articleTitle: 'The Architecture of Independent Journalism',
          content: 'Extraordinary depth of technical inquiry. The architectural analysis of JIT proxies is spot on.',
          status: 'approved',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'cm-2',
          authorName: 'Marcus Holloway',
          articleTitle: 'Resilient Editorial Architecture in Modern Media',
          content: 'The zero-buffer database continuity paradigm sets a new baseline for high-availability publishing platforms.',
          status: 'approved',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ];
    },
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <MessageSquare size={15} />
            <span>Community Safety</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            Reader Comments & Moderation
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Review reader discussions, filter abusive submissions, and maintain civil editorial discourse.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {['all', 'pending', 'flagged'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-mono transition-colors ${
                filter === tab ? 'bg-white text-ink-primary shadow-sm' : 'text-ink-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Comments Feed */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Loading comments queue..." />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4 divide-y divide-border-subtle bg-white border border-border-subtle rounded-2xl p-6 shadow-sm">
          {comments.map((c) => (
            <div key={c.id} className="pt-4 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-ink-primary font-sans">{c.authorName}</span>
                  <span className="text-ink-secondary">on</span>
                  <span className="font-editorial font-bold text-accent-crimson line-clamp-1">
                    "{c.articleTitle}"
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-secondary">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-ink-primary leading-relaxed bg-slate-50 p-3 rounded-lg border border-border-subtle/60">
                {c.content}
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => alert('Comment marked as approved.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                >
                  <CheckCircle2 size={12} />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => alert('Comment flagged for spam review.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                >
                  <Flag size={12} />
                  <span>Flag</span>
                </button>
                <button
                  onClick={() => alert('Comment removed.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-2xl">
          <p className="text-xs text-ink-secondary">No comments in this moderation view.</p>
        </div>
      )}
    </div>
  );
};
