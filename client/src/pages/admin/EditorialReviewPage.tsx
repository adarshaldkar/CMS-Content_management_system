import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileCheck,
  FileText,
  History,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Skeleton } from '../../components/common/SkeletonLoader';
import type { Article, ArticleRevision, PaginatedResult } from '../../types';

export const EditorialReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending_review' | 'changes_requested' | 'approved' | 'scheduled'>('pending_review');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // 1. Fetch Review Queue Articles
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['editorialReviewQueue', activeTab],
    queryFn: async () => {
      const statusMap: Record<string, string> = {
        pending_review: 'pending_review',
        changes_requested: 'rejected',
        approved: 'approved',
        scheduled: 'scheduled',
      };
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: statusMap[activeTab], limit: 30 },
      });
      return data;
    },
  });

  // 2. Fetch Revisions for Diff Viewer when an article is selected
  const { data: revisions = [] } = useQuery({
    queryKey: ['articleRevisions', selectedArticle?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<ArticleRevision[]>(
        `/articles/${selectedArticle?.id}/revisions`,
      );
      return data;
    },
    enabled: Boolean(selectedArticle?.id),
  });

  // 3. Workflow State Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: async ({
      articleId,
      targetStatus,
      note,
      scheduledAt,
    }: {
      articleId: string;
      targetStatus: string;
      note?: string;
      scheduledAt?: string;
    }) => {
      const { data } = await apiClient.post(`/articles/${articleId}/transition`, {
        targetStatus,
        changeSummary: note || `State transitioned to ${targetStatus}`,
        reviewNote: note,
        scheduledAt,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorialReviewQueue'] });
      setSelectedArticle(null);
      setShowRejectModal(false);
      setShowScheduleModal(false);
      setReviewNote('');
    },
  });

  const articles = articlesData?.items || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <FileCheck size={13} />
            <span>Editorial Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Manuscript Review Queue
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Review author submissions, inspect version snapshots, and approve pieces for publication.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center border-b border-border-subtle overflow-x-auto">
          {[
            { id: 'pending_review', label: 'Pending Review', count: articles.length },
            { id: 'changes_requested', label: 'Changes Requested' },
            { id: 'approved', label: 'Approved' },
            { id: 'scheduled', label: 'Scheduled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedArticle(null);
              }}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-ink-primary text-ink-primary'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'pending_review' && articles.length > 0 && (
                <span className="font-mono text-[10px] text-accent-crimson font-bold">
                  ({articles.length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Review Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Manuscripts Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold">
            Submissions ({articles.length})
          </p>

          {isLoading ? (
            <div className="space-y-3 p-2">
              <div className="p-4 bg-white border border-border-subtle space-y-2">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-full h-5" />
                <Skeleton className="w-3/4 h-3.5" />
              </div>
              <div className="p-4 bg-white border border-border-subtle space-y-2">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-full h-5" />
                <Skeleton className="w-3/4 h-3.5" />
              </div>
              <div className="p-4 bg-white border border-border-subtle space-y-2">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-full h-5" />
                <Skeleton className="w-3/4 h-3.5" />
              </div>
            </div>
          ) : articles.length > 0 ? (
            <div className="divide-y divide-border-subtle bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`p-4 transition-colors cursor-pointer space-y-1.5 ${
                    selectedArticle?.id === article.id
                      ? 'bg-slate-50 border-l-2 border-accent-crimson'
                      : 'hover:bg-slate-50/60 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-accent-crimson font-semibold uppercase tracking-wider">
                      {article.categorySlug || 'Dispatch'}
                    </span>
                    <span className="text-ink-secondary">v{article.version}</span>
                  </div>

                  <h3 className="text-sm font-editorial font-semibold text-ink-primary leading-snug line-clamp-2">
                    {article.title}
                  </h3>

                  {article.description && (
                    <p className="text-xs text-ink-secondary line-clamp-2">{article.description}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-ink-secondary pt-2">
                    <span>{article.readingTimeMinutes || 3} min read</span>
                    <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
              <CheckCircle2 size={20} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-ink-primary">Queue is clear</p>
              <p className="text-xs text-ink-secondary mt-1 font-editorial italic">No manuscripts in this status.</p>
            </div>
          )}
        </div>

        {/* Inspection & Manuscript Detail (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedArticle ? (
            <div className="bg-white border border-border-subtle p-6 space-y-6" style={{ borderRadius: 2 }}>
              {/* Inspection Header */}
              <div className="space-y-2 border-b border-border-subtle pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-semibold text-accent-crimson tracking-wider">
                    {selectedArticle.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-ink-secondary">
                    Version: <strong className="text-ink-primary font-mono">v{selectedArticle.version}</strong>
                  </span>
                </div>

                <h2 className="text-2xl font-editorial font-semibold text-ink-primary leading-tight">
                  {selectedArticle.title}
                </h2>

                {selectedArticle.description && (
                  <p className="text-sm text-ink-secondary italic font-editorial">
                    {selectedArticle.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 bg-canvas-paper p-3 border border-border-subtle" style={{ borderRadius: 2 }}>
                <button
                  onClick={() =>
                    transitionMutation.mutate({
                      articleId: selectedArticle.id,
                      targetStatus: 'approved',
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold tracking-wide transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <CheckCircle2 size={13} />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() =>
                    transitionMutation.mutate({
                      articleId: selectedArticle.id,
                      targetStatus: 'published',
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <Sparkles size={13} />
                  <span>Publish Directly</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold tracking-wide transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <XCircle size={13} />
                  <span>Request Changes</span>
                </button>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-subtle text-ink-secondary hover:text-ink-primary text-xs font-semibold tracking-wide transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <Calendar size={13} />
                  <span>Schedule</span>
                </button>
              </div>

              {/* Revision Snapshot & Content Body */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-ink-secondary border-b border-border-subtle pb-2">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <History size={13} />
                    <span>Manuscript Content (v{selectedArticle.version})</span>
                  </span>
                  <span>{revisions.length} revision snapshots</span>
                </div>

                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed p-4 bg-canvas-paper border border-border-subtle font-sans max-h-96 overflow-y-auto"
                  style={{ borderRadius: 2 }}
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
              <FileText size={28} className="mx-auto text-ink-secondary/40 mb-3" />
              <p className="text-sm font-semibold text-ink-primary">Select a manuscript from the queue</p>
              <p className="text-xs text-ink-secondary mt-1 font-editorial italic">
                Inspect author changes, review revision snapshots, and approve or request revisions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject / Request Changes Modal */}
      {showRejectModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-border-subtle w-full max-w-md p-6 space-y-4 shadow-xl" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle size={16} />
              <h3 className="text-base font-bold text-ink-primary">Request Editorial Changes</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Provide constructive feedback notes to the author explaining what revisions are required before publication.
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Please clarify citations in section 2 and provide benchmark numbers…"
              rows={4}
              className="w-full p-3 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
              style={{ borderRadius: 2 }}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  transitionMutation.mutate({
                    articleId: selectedArticle.id,
                    targetStatus: 'rejected',
                    note: reviewNote,
                  })
                }
                disabled={!reviewNote.trim() || transitionMutation.isPending}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                style={{ borderRadius: 2 }}
              >
                Submit Feedback Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Release Modal */}
      {showScheduleModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-border-subtle w-full max-w-md p-6 space-y-4 shadow-xl" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 text-ink-primary">
              <Calendar size={16} className="text-accent-crimson" />
              <h3 className="text-base font-bold">Schedule Publication Release</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Select the date and time when this article will be automatically published.
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full p-2.5 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-mono"
              style={{ borderRadius: 2 }}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  transitionMutation.mutate({
                    articleId: selectedArticle.id,
                    targetStatus: 'scheduled',
                    scheduledAt: scheduleDate,
                  })
                }
                disabled={!scheduleDate || transitionMutation.isPending}
                className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
                style={{ borderRadius: 2 }}
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
