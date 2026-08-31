import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Edit3, ExternalLink, Plus, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { Skeleton } from '../../components/common/SkeletonLoader';
import type { Article, PaginatedResult } from '../../types';

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  published: { label: 'Published', dot: 'bg-emerald-500' },
  draft: { label: 'Draft', dot: 'bg-slate-300' },
  pending_review: { label: 'In Review', dot: 'bg-amber-400' },
  approved: { label: 'Approved', dot: 'bg-sky-400' },
  rejected: { label: 'Changes Requested', dot: 'bg-red-400' },
  scheduled: { label: 'Scheduled', dot: 'bg-violet-400' },
  archived: { label: 'Archived', dot: 'bg-slate-400' },
};

const TABS = [
  { id: 'all', label: 'All Stories' },
  { id: 'draft', label: 'Drafts' },
  { id: 'pending_review', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'published', label: 'Published' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'rejected', label: 'Changes Requested' },
  { id: 'archived', label: 'Archived' },
];

export const StoriesManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, hasRole } = useAuthStore();
  const isAdminOrSuperAdmin =
    hasRole('admin') ||
    hasRole('super_admin') ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['authorStories', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { authorId: user?.id, limit: 100 },
      });
      return data;
    },
    enabled: Boolean(user?.id),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiClient.post(`/articles/${articleId}/transition`, {
        targetStatus: 'pending_review',
        changeSummary: 'Submitted for editorial review by author',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorStories'] });
    },
  });

  const toggleBylineMutation = useMutation({
    mutationFn: async ({ articleId, show }: { articleId: string; show: boolean }) => {
      await apiClient.patch(`/articles/${articleId}`, { showAuthorName: show });
      return show;
    },
    onSuccess: (_, vars) => {
      queryClient.setQueryData<PaginatedResult<Article>>(
        ['authorStories', user?.id],
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((a) =>
                  a.id === vars.articleId ? { ...a, showAuthorName: vars.show } : a,
                ),
              }
            : old,
      );
    },
  });

  const allArticles = articlesData?.items || [];

  const filteredArticles = allArticles.filter((a) => {
    const matchTab = activeTab === 'all' || a.status === activeTab;
    const matchSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (tab: string) =>
    tab === 'all' ? allArticles.length : allArticles.filter((a) => a.status === tab).length;

  return (
    <div className="font-sans">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-crimson font-semibold mb-1">
            Your Desk
          </p>
          <h1 className="font-editorial text-3xl font-semibold text-ink-primary leading-tight">
            Stories
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {allArticles.length} {allArticles.length === 1 ? 'story' : 'stories'} across all stages
          </p>
        </div>
        <button
          onClick={() => navigate('/write')}
          className="inline-flex items-center gap-2 bg-ink-primary text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 transition-colors"
          style={{ borderRadius: 2 }}
        >
          <Plus size={14} />
          New Story
        </button>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle mb-0">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const count = tabCount(tab.id);
            const isCoreTab = ['all', 'draft', 'pending_review', 'published', 'rejected'].includes(tab.id);
            if (!isCoreTab && count === 0) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-ink-primary text-ink-primary'
                      : 'border-transparent text-ink-secondary hover:text-ink-primary'
                  }
                `}
              >
                {tab.label}
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    activeTab === tab.id ? 'text-ink-primary' : 'text-ink-secondary'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="py-4 border-b border-border-subtle">
        <input
          type="text"
          placeholder="Search within stories…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm bg-transparent border-0 border-b border-border-subtle text-sm text-ink-primary placeholder:text-ink-secondary/50 outline-none py-1 font-sans"
        />
      </div>

      {/* ── Story list ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="divide-y divide-border-subtle">
          <div className="py-5 space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-2/3 h-5" />
            <Skeleton className="w-full h-3.5" />
          </div>
          <div className="py-5 space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-2/3 h-5" />
            <Skeleton className="w-full h-3.5" />
          </div>
          <div className="py-5 space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-2/3 h-5" />
            <Skeleton className="w-full h-3.5" />
          </div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16">
          <p className="font-editorial text-lg text-ink-secondary">
            {searchQuery ? `No stories match "${searchQuery}"` : 'No stories yet.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/write')}
              className="mt-4 inline-flex items-center gap-2 text-sm text-accent-crimson font-medium"
            >
              Write your first story <ArrowRight size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {filteredArticles.map((article) => {
            const status = STATUS_LABELS[article.status] || {
              label: article.status,
              dot: 'bg-slate-300',
            };
            const isOwner = article.authorId === user?.id;
            const canEdit = isOwner || isAdminOrSuperAdmin;

            return (
              <div
                key={article.id}
                className="py-5 group flex items-start gap-4"
              >
                {/* Status indicator */}
                <div className="pt-1.5 flex-shrink-0">
                  <span className={`block w-2 h-2 rounded-full ${status.dot}`} title={status.label} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
                      {status.label}
                    </span>
                    <span className="text-border-subtle font-mono text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-ink-secondary tabular-nums">
                      v{(article as any).version || 1}
                    </span>
                    {article.wordCount > 0 && (
                      <>
                        <span className="text-border-subtle font-mono text-[10px]">·</span>
                        <span className="font-mono text-[10px] text-ink-secondary">
                          {article.wordCount.toLocaleString()} words
                        </span>
                      </>
                    )}
                    {article.readingTimeMinutes > 0 && (
                      <>
                        <span className="text-border-subtle font-mono text-[10px]">·</span>
                        <span className="font-mono text-[10px] text-ink-secondary">
                          {article.readingTimeMinutes} min read
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="font-editorial text-base font-semibold text-ink-primary leading-snug mb-1 group-hover:text-accent-crimson transition-colors">
                    {article.title || <span className="text-ink-secondary italic">Untitled</span>}
                  </h3>

                  {article.description && (
                    <p className="text-sm text-ink-secondary leading-relaxed line-clamp-1">
                      {article.description}
                    </p>
                  )}

                  {/* Review note */}
                  {article.status === 'rejected' && (article as any).reviewNote && (
                    <div className="mt-2 pl-3 border-l-2 border-red-200">
                      <p className="text-xs text-ink-secondary italic">
                        {(article as any).reviewNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {article.status === 'draft' && isOwner && (
                    <button
                      onClick={() => submitForReviewMutation.mutate(article.id)}
                      disabled={submitForReviewMutation.isPending}
                      className="px-3 py-1 text-xs font-medium text-accent-crimson border border-accent-crimson hover:bg-accent-crimson hover:text-white transition-colors"
                      style={{ borderRadius: 2 }}
                    >
                      Submit
                    </button>
                  )}
                  {isAdminOrSuperAdmin && (
                    <button
                      onClick={() =>
                        toggleBylineMutation.mutate({
                          articleId: article.id,
                          show: article.showAuthorName === false,
                        })
                      }
                      disabled={toggleBylineMutation.isPending}
                      title={
                        article.showAuthorName === false
                          ? 'Show Author Name'
                          : 'Hide Author Name (publish as Editorial Staff)'
                      }
                      className={`px-2.5 py-1 text-xs flex items-center gap-1 border transition-colors ${
                        article.showAuthorName === false
                          ? 'text-ink-secondary border-border-subtle hover:text-ink-primary'
                          : 'text-accent-crimson border-accent-crimson/40 hover:bg-accent-crimson hover:text-white'
                      }`}
                      style={{ borderRadius: 2 }}
                    >
                      <User size={11} />
                      <span>{article.showAuthorName === false ? 'Byline: Off' : 'Byline: On'}</span>
                    </button>
                  )}
                  {canEdit && (
                    <Link
                      to={`/write/${article.id}`}
                      className="p-1.5 text-ink-secondary hover:text-ink-primary border border-border-subtle hover:bg-slate-100 transition-colors"
                      title={isOwner ? 'Edit Your Story' : 'Edit Manuscript (Admin)'}
                      style={{ borderRadius: 2 }}
                    >
                      <Edit3 size={13} />
                    </Link>
                  )}
                  {article.status === 'published' && article.slug && (
                    <Link
                      to={`/articles/${article.slug}`}
                      className="px-2.5 py-1 text-xs text-ink-secondary hover:text-ink-primary flex items-center gap-1 border border-border-subtle hover:bg-slate-50 transition-colors"
                      title="View Live Published Story"
                      style={{ borderRadius: 2 }}
                    >
                      <span>View</span>
                      <ExternalLink size={12} />
                    </Link>
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
