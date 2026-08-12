import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  BookOpen,
  Clock,
  ExternalLink,
  History,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../../types';

export const UserLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history'>('bookmarks');

  // Fetch published articles to simulate saved bookmarks / reading history
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['publicLibraryArticles'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 20 },
      });
      return data;
    },
  });

  const articles = articlesData?.items || [];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">Personal Library</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Your saved bookmarks, reading history, and offline reference lists
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-slate-100 text-ink-primary font-semibold'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
            }`}
          >
            <Bookmark size={15} />
            <span>Saved Bookmarks</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-ink-secondary">
              {articles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-100 text-ink-primary font-semibold'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
            }`}
          >
            <History size={15} />
            <span>Reading History</span>
          </button>
        </div>

        {/* Content */}
        <div className="pt-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner label="Loading saved library..." />
            </div>
          ) : articles.length > 0 ? (
            <div className="divide-y divide-border-subtle">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-accent-crimson font-semibold">
                        {article.categorySlug || 'Article'}
                      </span>
                      <span className="text-[11px] font-mono text-ink-secondary">
                        · {article.readingTimeMinutes || 2} min read
                      </span>
                    </div>
                    <Link
                      to={`/articles/${article.slug}`}
                      className="text-sm font-bold text-ink-primary hover:text-accent-crimson transition-colors truncate block"
                    >
                      {article.title}
                    </Link>
                    <p className="text-xs text-ink-secondary mt-0.5 line-clamp-1">
                      {article.description || 'Editorial analysis and commentary.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded-lg text-xs font-medium transition-colors"
                    >
                      <span>Read</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-ink-secondary">
                <Bookmark size={20} />
              </div>
              <p className="text-xs font-semibold text-ink-primary">No saved stories yet</p>
              <p className="text-xs text-ink-secondary mt-1">
                Explore the publication front page and click bookmark to save stories for later.
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <span>Browse Front Page</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
