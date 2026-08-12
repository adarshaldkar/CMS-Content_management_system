import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Compass, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const CategoryArchivePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['categoryArchive', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 24, sort: 'latest' },
      });
      return data;
    },
    enabled: Boolean(slug),
  });

  const articles = articlesData?.items || [];
  const categoryTitle = slug
    ? slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Category';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      {/* Category Masthead Header */}
      <div className="border-b border-border-subtle pb-6">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
          <Compass size={14} />
          <span>Editorial Section</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-ink-primary">
          {categoryTitle}
        </h1>
        <p className="text-xs text-ink-secondary mt-1.5 max-w-xl">
          Curated dispatches, investigative reviews, and architectural analysis filed under {categoryTitle}.
        </p>
      </div>

      {/* Story Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label={`Loading ${categoryTitle} archive...`} />
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-3 group hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="aspect-[16/9] rounded-lg overflow-hidden bg-slate-100 border border-border-subtle mb-3">
                  {article.coverImage ? (
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <FileText size={28} />
                    </div>
                  )}
                </div>

                <Link to={`/articles/${article.slug}`}>
                  <h2 className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h2>
                </Link>

                <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                  {article.description || 'Editorial analysis and commentary.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary pt-3 border-t border-border-subtle/60">
                <span>{article.readingTimeMinutes || 3} min read</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-xl">
          <p className="text-xs font-semibold text-ink-primary">No published stories in this section yet.</p>
        </div>
      )}
    </div>
  );
};
