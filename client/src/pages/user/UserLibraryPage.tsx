import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { ArticleCardSkeleton } from '../../components/common/SkeletonLoader';
import type { Article, PaginatedResult } from '../../types';

interface BookmarkItem {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

interface BookmarksResponse {
  items: BookmarkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TABS = [
  { id: 'bookmarks', label: 'Saved Articles' },
  { id: 'history', label: 'Reading History' },
];

export const UserLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // ── Real bookmarks from API ──────────────────────────────────────────────────
  const { data: bookmarksData, isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ['myBookmarks', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<BookmarksResponse>('/me/bookmarks', {
        params: { limit: 50 },
      });
      return data;
    },
    enabled: Boolean(user?.id) && activeTab === 'bookmarks',
  });

  // ── Fetch article details for each bookmark ──────────────────────────────────
  const bookmarkArticleIds = (bookmarksData?.items || []).map((b) => b.articleId);
  const { data: articlesData } = useQuery({
    queryKey: ['bookmarkArticles', bookmarkArticleIds.join(',')],
    queryFn: async () => {
      if (bookmarkArticleIds.length === 0) return { items: [] };
      // Fetch all published articles and filter by bookmark IDs
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { limit: 100, status: 'published' },
      });
      return data;
    },
    enabled: bookmarkArticleIds.length > 0,
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiClient.delete(`/articles/${articleId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarkArticles'] });
    },
  });

  const bookmarkedArticles = (articlesData?.items || []).filter((a) =>
    bookmarkArticleIds.includes(a.id),
  );

  const bookmarks = bookmarksData?.items || [];
  const isLoading = isLoadingBookmarks;

  return (
    <div className="font-sans">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent-crimson font-semibold mb-1">
          Your Library
        </p>
        <h1 className="font-editorial text-3xl font-semibold text-ink-primary leading-tight">
          Personal Library
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Saved articles, reading history, and personal collections
        </p>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-border-subtle mb-0">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-ink-primary text-ink-primary'
                    : 'border-transparent text-ink-secondary hover:text-ink-primary'
                }
              `}
            >
              {tab.label}
              {tab.id === 'bookmarks' && bookmarks.length > 0 && (
                <span className="font-mono text-[10px] tabular-nums text-ink-secondary">
                  {bookmarks.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bookmarks tab ────────────────────────────────────────────────────── */}
      {activeTab === 'bookmarks' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="py-16">
              <Bookmark size={20} className="text-ink-secondary mb-4" strokeWidth={1.5} />
              <p className="font-editorial text-lg text-ink-secondary">
                No saved articles yet.
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                Click the bookmark icon on any article to save it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {bookmarks.map((bookmark) => {
                // Find corresponding article data
                const article = bookmarkedArticles.find((a) => a.id === bookmark.articleId);
                const savedAt = new Date(bookmark.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div key={bookmark.id} className="py-5 group flex items-start gap-4">
                    {/* Remove button */}
                    <div className="flex-shrink-0 pt-1">
                      <button
                        onClick={() => removeBookmarkMutation.mutate(bookmark.articleId)}
                        disabled={removeBookmarkMutation.isPending}
                        className="text-ink-secondary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove bookmark"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Article info */}
                    <div className="flex-1 min-w-0">
                      {article ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
                              Article
                            </span>
                            {article.readingTimeMinutes > 0 && (
                              <>
                                <span className="font-mono text-[10px] text-border-subtle">·</span>
                                <span className="font-mono text-[10px] text-ink-secondary">
                                  {article.readingTimeMinutes} min read
                                </span>
                              </>
                            )}
                            <span className="font-mono text-[10px] text-border-subtle">·</span>
                            <span className="font-mono text-[10px] text-ink-secondary">
                              Saved {savedAt}
                            </span>
                          </div>
                          <Link to={`/articles/${article.slug}`}>
                            <h3 className="font-editorial text-base font-semibold text-ink-primary leading-snug hover:text-accent-crimson transition-colors">
                              {article.title}
                            </h3>
                          </Link>
                          {article.description && (
                            <p className="mt-0.5 text-sm text-ink-secondary line-clamp-1">
                              {article.description}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
                              Saved {savedAt}
                            </span>
                          </div>
                          <p className="text-sm text-ink-secondary font-mono">
                            Article #{bookmark.articleId.slice(0, 8)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Read link */}
                    {article?.slug && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/articles/${article.slug}`}
                          className="text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors font-mono"
                        >
                          Read →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Reading History tab ──────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="py-16">
          <p className="font-editorial text-lg text-ink-secondary">
            Reading history coming soon.
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            Articles you've read will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
};
