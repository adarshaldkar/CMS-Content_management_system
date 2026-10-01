import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, History, Trash2, X, ArrowRight, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { ArticleCardSkeleton } from '../../components/common/SkeletonLoader';

interface BookmarkItem {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
  article?: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    coverImage?: string | null;
    readingTimeMinutes?: number;
    category?: string | null;
    authorName?: string | null;
    createdAt?: string;
  };
}

interface BookmarksResponse {
  items: BookmarkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ReadingHistoryItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  categorySlug?: string;
  readingTimeMinutes?: number;
  readAt: string;
}

const TABS = [
  { id: 'bookmarks', label: 'Saved Articles' },
  { id: 'history', label: 'Reading History' },
];

export const UserLibraryPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>(() =>
    location.pathname === '/history' ? 'history' : 'bookmarks'
  );
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.pathname === '/history') {
      setActiveTab('history');
    } else if (location.pathname === '/library') {
      setActiveTab('bookmarks');
    }
  }, [location.pathname]);

  // Dynamic Reading History State
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gazette_reading_history') || '[]');
    } catch {
      return [];
    }
  });

  const clearHistory = () => {
    localStorage.removeItem('gazette_reading_history');
    setReadingHistory([]);
  };

  // ── Real populated bookmarks directly from API ──────────────────────────────
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

  const removeBookmarkMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiClient.delete(`/articles/${articleId}/bookmark`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookmarks'] });
    },
  });

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
              {tab.id === 'history' && readingHistory.length > 0 && (
                <span className="font-mono text-[10px] tabular-nums text-ink-secondary">
                  {readingHistory.length}
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
                const article = bookmark.article;
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
                            {Boolean(article.readingTimeMinutes && article.readingTimeMinutes > 0) && (
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
        <div>
          {readingHistory.length === 0 ? (
            <div className="py-16">
              <History size={20} className="text-ink-secondary mb-4" strokeWidth={1.5} />
              <p className="font-editorial text-lg text-ink-secondary">
                No reading history recorded yet.
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                Articles you read on The Gazette will appear here automatically.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="font-mono text-[11px] text-ink-secondary uppercase tracking-wider">
                  Recently Read Articles ({readingHistory.length})
                </span>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 font-mono text-xs text-red-600 hover:text-red-700 transition-colors py-1 px-2 hover:bg-red-50 rounded"
                >
                  <Trash2 size={12} />
                  Clear History
                </button>
              </div>

              <div className="divide-y divide-border-subtle">
                {readingHistory.map((item) => {
                  const readDate = new Date(item.readAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={item.id} className="py-5 group flex items-start gap-4 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-accent-crimson font-semibold">
                            {item.categorySlug ? item.categorySlug.replace(/-/g, ' ') : 'Dispatch'}
                          </span>
                          {item.readingTimeMinutes && item.readingTimeMinutes > 0 && (
                            <>
                              <span className="font-mono text-[10px] text-border-subtle">·</span>
                              <span className="font-mono text-[10px] text-ink-secondary flex items-center gap-1">
                                <Clock size={10} />
                                {item.readingTimeMinutes} min read
                              </span>
                            </>
                          )}
                          <span className="font-mono text-[10px] text-border-subtle">·</span>
                          <span className="font-mono text-[10px] text-ink-secondary">
                            Viewed {readDate}
                          </span>
                        </div>
                        <Link to={`/articles/${item.slug}`}>
                          <h3 className="font-editorial text-base font-semibold text-ink-primary leading-snug hover:text-accent-crimson transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        {item.description && (
                          <p className="mt-0.5 text-sm text-ink-secondary line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 pt-1">
                        <Link
                          to={`/articles/${item.slug}`}
                          className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors font-mono"
                        >
                          Read again <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
