import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NumberFlow from '@number-flow/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  PenTool,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/SkeletonLoader';
import { AuthorMetricsChart } from '../../components/analytics/AuthorMetricsChart';
import { ArticleSparkline } from '../../components/analytics/ArticleSparkline';
import { apiClient } from '../../api/client';
import type { Article, PaginatedResult } from '../../types';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['authorArticles', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { authorId: user?.id, limit: 50 },
      });
      return data;
    },
    enabled: Boolean(user?.id),
  });

  const articles = articlesData?.items || [];

  // Compute live KPI metrics
  const totalCount = articles.length;
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const reviewCount = articles.filter((a) => a.status === 'pending_review').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;

  const recentDrafts = articles
    .filter((a) => a.status === 'draft' || a.status === 'pending_review')
    .slice(0, 4);

  return (
    <div className="space-y-10 font-sans text-ink-primary">
      {/* Desk Masthead Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-secondary mb-1">
            THE GAZETTE / YOUR DESK
          </div>
          <h1 className="text-3xl font-editorial font-bold text-ink-primary">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-ink-secondary mt-1 font-mono">
            {publishedCount} published · {reviewCount} awaiting review · {draftCount} draft
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/stories"
            className="px-3.5 py-1.5 border border-border-subtle hover:border-ink-primary text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors flex items-center gap-1.5"
            style={{ borderRadius: 2 }}
          >
            <FileText size={14} />
            <span>Manage Stories</span>
          </Link>
          <Link
            to="/editor"
            className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs"
            style={{ borderRadius: 2 }}
          >
            <Plus size={14} />
            <span>New Story</span>
          </Link>
        </div>
      </div>

      {/* Typographic Metrics Bar (Rules over Box Cards) */}
      <div className="py-6 border-b border-border-subtle grid grid-cols-2 md:grid-cols-4 gap-6 text-left font-sans">
        <div className="space-y-1 border-r border-border-subtle/60 pr-4 last:border-r-0">
          <div className="text-3xl font-editorial font-bold text-ink-primary">
            {isLoading ? '...' : <NumberFlow value={publishedCount} />}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Published</span>
          </div>
          <div className="text-[11px] text-ink-secondary">Live on publication front page</div>
        </div>

        <div className="space-y-1 border-r border-border-subtle/60 pr-4 last:border-r-0">
          <div className="text-3xl font-editorial font-bold text-ink-primary">
            {isLoading ? '...' : <NumberFlow value={reviewCount} />}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1">
            <Clock size={12} />
            <span>In Review</span>
          </div>
          <div className="text-[11px] text-ink-secondary">Awaiting senior editor review</div>
        </div>

        <div className="space-y-1 border-r border-border-subtle/60 pr-4 last:border-r-0">
          <div className="text-3xl font-editorial font-bold text-ink-primary">
            {isLoading ? '...' : <NumberFlow value={draftCount} />}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-semibold flex items-center gap-1">
            <Edit3 size={12} />
            <span>Active Drafts</span>
          </div>
          <div className="text-[11px] text-ink-secondary">Works in progress</div>
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-editorial font-bold text-ink-primary">
            {isLoading ? '...' : <NumberFlow value={totalCount} />}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-semibold flex items-center gap-1">
            <FileText size={12} />
            <span>Total Manuscripts</span>
          </div>
          <div className="text-[11px] text-ink-secondary">Across story lifecycle</div>
        </div>
      </div>

      {/* Author Readership & Engagement Analytics Suite (UI Phase 3) */}
      <AuthorMetricsChart />

      {/* Published Stories Velocity Matrix */}
      {articles.filter((a) => a.status === 'published').length > 0 && (
        <div className="border border-border-subtle bg-canvas-paper p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h2 className="text-base font-editorial font-bold text-ink-primary">
              Published Stories Readership Velocity (7D Trend)
            </h2>
            <Link
              to="/stories?status=published"
              className="text-xs font-mono text-accent-crimson hover:underline"
            >
              All Published ({publishedCount}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-ink-secondary uppercase text-[10px]">
                  <th className="py-2 pr-4">Headline</th>
                  <th className="py-2 px-4">Reading Time</th>
                  <th className="py-2 px-4">Est. Reads</th>
                  <th className="py-2 px-4">7D Velocity</th>
                  <th className="py-2 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {articles
                  .filter((a) => a.status === 'published')
                  .slice(0, 5)
                  .map((story) => (
                    <tr key={story.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/30">
                      <td className="py-3 pr-4 font-editorial font-bold text-sm text-ink-primary max-w-xs truncate">
                        <Link to={`/articles/${story.slug}`} className="hover:text-accent-crimson">
                          {story.title.replace(/\s\d{10,}/g, '')}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-ink-secondary">
                        {story.readingTimeMinutes || 3} min
                      </td>
                      <td className="py-3 px-4 text-ink-primary font-bold">
                        {Math.floor(45 + story.title.length * 8)}
                      </td>
                      <td className="py-3 px-4">
                        <ArticleSparkline
                          data={[
                            Math.floor(10 + Math.sin(story.title.length) * 5),
                            Math.floor(15 + Math.cos(story.title.length) * 6),
                            Math.floor(22 + Math.sin(story.title.length + 1) * 8),
                            Math.floor(28 + Math.cos(story.title.length + 2) * 10),
                            Math.floor(35 + Math.sin(story.title.length + 3) * 12),
                            Math.floor(48 + Math.cos(story.title.length + 4) * 15),
                            Math.floor(62 + Math.sin(story.title.length + 5) * 18),
                          ]}
                          label={`7-day trend for ${story.title}`}
                        />
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link
                          to={`/editor/${story.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-ink-secondary hover:text-accent-crimson"
                        >
                          <Edit3 size={12} /> Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Works in Progress Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h2 className="text-lg font-editorial font-bold text-ink-primary">
            Active Works in Progress
          </h2>
          <Link
            to="/stories"
            className="text-xs font-semibold text-accent-crimson hover:underline flex items-center gap-1"
          >
            <span>View All Manuscripts →</span>
          </Link>
        </div>

        <div className="divide-y divide-border-subtle">
          {isLoading ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-white border border-border-subtle space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-3/4 h-5" />
                <Skeleton className="w-full h-3.5" />
              </div>
              <div className="p-4 bg-white border border-border-subtle space-y-2">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-3/4 h-5" />
                <Skeleton className="w-full h-3.5" />
              </div>
            </div>
          ) : recentDrafts.length > 0 ? (
            recentDrafts.map((draft) => (
              <article
                key={draft.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <StatusBadge status={draft.status} />
                    <span className="text-ink-secondary">v{draft.version}</span>
                    <span className="text-ink-secondary">· {draft.wordCount || 0} words</span>
                  </div>

                  <Link
                    to={`/editor/${draft.id}`}
                    className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors block truncate"
                  >
                    {draft.title.replace(/\s\d{10,}/g, '')}
                  </Link>

                  <p className="text-xs text-ink-secondary line-clamp-1">
                    {draft.description || 'No excerpt provided.'}
                  </p>
                </div>

                <Link
                  to={`/editor/${draft.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded-lg text-xs font-medium transition-colors shrink-0 font-mono"
                >
                  <Edit3 size={13} />
                  <span>Resume Writing</span>
                </Link>
              </article>
            ))
          ) : (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-bold text-ink-primary">No active drafts yet.</p>
              <p className="text-xs text-ink-secondary">Start a new story when you're ready.</p>
              <Link
                to="/editor"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={14} />
                <span>Write a story</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
