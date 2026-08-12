import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  MessageSquare,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
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
  const latestRevision = revisions[0];
  const previousRevision = revisions[1];

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <FileCheck size={15} />
            <span>Editorial Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            Manuscript Review Queue
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Review author submissions, inspect revision diffs, and approve pieces for publication.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-ink-primary shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === 'pending_review' && (
                <span className="px-1.5 py-0.5 bg-accent-crimson text-white rounded-full text-[10px] font-mono">
                  {articles.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Review Area: List & Side-by-Side Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Manuscripts Queue List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-semibold">
            Submissions ({articles.length})
          </h2>

          {isLoading ? (
            <div className="py-12 text-center">
              <LoadingSpinner label="Loading submissions..." />
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-3">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    selectedArticle?.id === article.id
                      ? 'bg-white border-accent-crimson shadow-md ring-1 ring-accent-crimson/20'
                      : 'bg-white border-border-subtle hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-accent-crimson font-semibold uppercase tracking-wider">
                      {article.categorySlug || 'Technology'}
                    </span>
                    <span className="text-ink-secondary">v{article.version}</span>
                  </div>

                  <h3 className="text-sm font-editorial font-bold text-ink-primary leading-snug line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-xs text-ink-secondary line-clamp-2">{article.description}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary pt-2 border-t border-border-subtle/50">
                    <span>{article.readingTimeMinutes || 3} min read</span>
                    <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-white border border-border-subtle rounded-xl">
              <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-ink-primary">Queue is clear</p>
              <p className="text-xs text-ink-secondary mt-1">No manuscripts in this status.</p>
            </div>
          )}
        </div>

        {/* Inspection & Diff Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedArticle ? (
            <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-sm space-y-6">
              {/* Inspection Header */}
              <div className="space-y-3 border-b border-border-subtle pb-5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider">
                    {selectedArticle.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-ink-secondary">
                    Version: <strong className="text-ink-primary font-mono">v{selectedArticle.version}</strong>
                  </span>
                </div>

                <h2 className="text-2xl font-editorial font-bold text-ink-primary leading-tight">
                  {selectedArticle.title}
                </h2>

                <p className="text-sm text-ink-secondary italic font-editorial">
                  {selectedArticle.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-xl border border-border-subtle">
                <button
                  onClick={() =>
                    transitionMutation.mutate({
                      articleId: selectedArticle.id,
                      targetStatus: 'approved',
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve Manuscript</span>
                </button>

                <button
                  onClick={() =>
                    transitionMutation.mutate({
                      articleId: selectedArticle.id,
                      targetStatus: 'published',
                    })
                  }
                  disabled={transitionMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent-crimson hover:bg-accent-crimson-hover text-white rounded-lg text-xs font-semibold tracking-wide transition-colors"
                >
                  <Sparkles size={14} />
                  <span>Publish Directly</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                >
                  <XCircle size={14} />
                  <span>Request Changes</span>
                </button>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-border-subtle text-ink-secondary hover:text-ink-primary rounded-lg text-xs font-semibold tracking-wide transition-colors"
                >
                  <Calendar size={14} />
                  <span>Schedule Release</span>
                </button>
              </div>

              {/* Revision Snapshot & Content Body */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-ink-secondary border-b border-border-subtle pb-2">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <History size={14} />
                    <span>Revision Snapshot (v{selectedArticle.version})</span>
                  </span>
                  <span>{revisions.length} total revision snapshots</span>
                </div>

                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed p-4 bg-slate-50/70 rounded-xl border border-border-subtle font-sans max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>
            </div>
          ) : (
            <div className="p-16 text-center bg-white border border-dashed border-border-subtle rounded-2xl">
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-ink-primary">Select a manuscript from the queue</p>
              <p className="text-xs text-ink-secondary mt-1">
                Inspect author changes, review revision diffs, and approve or request revisions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject / Request Changes Modal */}
      {showRejectModal && selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle size={18} />
              <h3 className="text-base font-bold text-ink-primary">Request Editorial Changes</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Provide constructive feedback notes to the author explaining what revisions are required before publication.
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Please substantiate the claim in section 2 with verified benchmarks..."
              rows={4}
              className="w-full p-3 text-xs bg-slate-50 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
              >
                Submit Feedback Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Release Modal */}
      {showScheduleModal && selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-ink-primary">
              <Calendar size={18} className="text-accent-crimson" />
              <h3 className="text-base font-bold">Schedule Publication Release</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Select the date and time when this article will be automatically published to the public front page.
            </p>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-crimson/20"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary"
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
                className="px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
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
