import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Flag,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const CommentsModerationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged'>('all');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['adminCommentsModeration', filter],
    queryFn: async () => {
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
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <MessageSquare size={13} />
            <span>Community Safety</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Reader Comments & Moderation
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Review reader discussions, filter abusive submissions, and maintain civil editorial discourse.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-border-subtle">
          {['all', 'pending', 'flagged'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 uppercase tracking-wider font-mono transition-colors ${
                filter === tab
                  ? 'border-ink-primary text-ink-primary'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
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
        <div className="bg-white border border-border-subtle divide-y divide-border-subtle" style={{ borderRadius: 2 }}>
          {comments.map((c) => (
            <div key={c.id} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink-primary font-sans">{c.authorName}</span>
                  <span className="text-ink-secondary">on</span>
                  <span className="font-editorial font-semibold text-accent-crimson line-clamp-1">
                    "{c.articleTitle}"
                  </span>
                </div>
                <span className="text-[10px] font-mono text-ink-secondary tabular-nums">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-ink-primary leading-relaxed bg-canvas-paper p-3 border border-border-subtle" style={{ borderRadius: 2 }}>
                {c.content}
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => alert('Comment marked as approved.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors font-mono"
                  style={{ borderRadius: 2 }}
                >
                  <CheckCircle2 size={12} />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => alert('Comment flagged for spam review.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors font-mono"
                  style={{ borderRadius: 2 }}
                >
                  <Flag size={12} />
                  <span>Flag</span>
                </button>
                <button
                  onClick={() => alert('Comment removed.')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors font-mono"
                  style={{ borderRadius: 2 }}
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
          <p className="text-xs text-ink-secondary font-editorial italic">No comments in this moderation view.</p>
        </div>
      )}
    </div>
  );
};
