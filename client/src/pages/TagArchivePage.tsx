import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hash, Clock, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const TagArchivePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['tagArchive', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', tagSlugs: slug, limit: 20 },
      });
      return data;
    },
    enabled: Boolean(slug),
  });

  const articles = articlesData?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      <div className="border-b border-border-subtle pb-6">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
          <Hash size={14} />
          <span>Topic Tag</span>
        </div>
        <h1 className="text-3xl font-editorial font-bold text-ink-primary">#{slug}</h1>
        <p className="text-xs text-ink-secondary mt-1">
          Articles and editorial dispatches tagged with #{slug}.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label={`Loading #${slug} stories...`} />
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-2 group hover:shadow-md transition-shadow"
            >
              <Link to={`/articles/${article.slug}`}>
                <h3 className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h3>
              </Link>
              <p className="text-xs text-ink-secondary line-clamp-2">{article.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-xl">
          <p className="text-xs text-ink-secondary">No articles associated with this tag yet.</p>
        </div>
      )}
    </div>
  );
};
