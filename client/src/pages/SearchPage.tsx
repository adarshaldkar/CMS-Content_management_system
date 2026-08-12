import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Filter, Search as SearchIcon } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Debounced query parameter update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        setSearchParams({ q: searchTerm.trim() });
      } else {
        setSearchParams({});
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, setSearchParams]);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['articleSearch', initialQuery, selectedCategory],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: {
          status: 'published',
          search: initialQuery || undefined,
          limit: 30,
        },
      });
      return data;
    },
  });

  const articles = searchData?.items || [];
  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'technology', label: 'Technology' },
    { id: 'ai', label: 'AI' },
    { id: 'cybersecurity', label: 'Cybersecurity' },
    { id: 'editorial-design', label: 'Design' },
    { id: 'software-architecture', label: 'Architecture' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      {/* Search Input Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">
          Search The Gazette
        </h1>

        <div className="relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stories by headline, keyword, or topic..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all shadow-sm text-ink-primary"
            autoFocus
          />
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-secondary"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-ink-primary text-white font-semibold'
                  : 'bg-slate-100 text-ink-secondary hover:text-ink-primary hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-mono text-ink-secondary border-b border-border-subtle pb-3">
        <span>
          {initialQuery
            ? `Search results for "${initialQuery}"`
            : 'Displaying latest editorial stories'}
        </span>
        <span className="font-semibold text-ink-primary">{articles.length} stories found</span>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Searching manuscripts..." />
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-6 divide-y divide-border-subtle">
          {articles.map((article) => (
            <article key={article.id} className="pt-6 first:pt-0 space-y-2 group">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-semibold">
                {article.categorySlug || 'Article'}
              </span>

              <Link to={`/articles/${article.slug}`}>
                <h2 className="text-xl font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug">
                  {article.title}
                </h2>
              </Link>

              <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                {article.description}
              </p>

              <div className="flex items-center gap-2 text-[11px] font-mono text-ink-secondary pt-1">
                <span>{article.readingTimeMinutes || 3} min read</span>
                <span>·</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-xl">
          <SearchIcon size={24} className="mx-auto text-ink-secondary mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No articles found matching your criteria</p>
          <p className="text-xs text-ink-secondary mt-1">Try adjusting your keywords or selecting All Categories.</p>
        </div>
      )}
    </div>
  );
};
