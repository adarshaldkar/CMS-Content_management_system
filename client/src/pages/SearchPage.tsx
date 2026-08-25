import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, RotateCcw } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EditorialTopicNav } from '../components/articles/EditorialTopicNav';
import { EditorialFilterBar } from '../components/articles/EditorialFilterBar';
import type { EditorialFilterState } from '../components/articles/EditorialFilterBar';
import type { Article, PaginatedResult } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL state
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || searchParams.get('categorySlugs') || '';
  const tagParam = searchParams.get('tagSlugs') || '';
  const authorParam = searchParams.get('authorId') || '';
  const formatParam = (searchParams.get('contentType') as any) || 'all';
  const sortParam = (searchParams.get('sortBy') as any) || 'latest';
  const rangeParam = (searchParams.get('dateRange') as any) || 'all';

  const [searchTerm, setSearchTerm] = useState(qParam);

  // Sync debounced search input with URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (searchTerm.trim()) {
        newParams.set('q', searchTerm.trim());
      } else {
        newParams.delete('q');
      }
      setSearchParams(newParams);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, searchParams, setSearchParams]);

  // Compute date filter bounds
  let fromDate: string | undefined = undefined;
  if (rangeParam === '24h') {
    fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  } else if (rangeParam === '7d') {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (rangeParam === '30d') {
    fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Fetch articles via react-query
  const { data: searchData, isLoading, isError } = useQuery({
    queryKey: [
      'articleSearch',
      qParam,
      categoryParam,
      tagParam,
      authorParam,
      formatParam,
      sortParam,
      rangeParam,
    ],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: {
          status: 'published',
          search: qParam || undefined,
          categorySlugs: categoryParam || undefined,
          tagSlugs: tagParam || undefined,
          authorId: authorParam || undefined,
          contentType: formatParam !== 'all' ? formatParam : undefined,
          sortBy: sortParam,
          fromDate,
          limit: 30,
        },
      });
      return data;
    },
  });

  const articles = searchData?.items || [];
  const total = searchData?.total ?? articles.length;

  const currentFilters: EditorialFilterState = {
    categorySlug: categoryParam,
    tagSlugs: tagParam,
    authorId: authorParam,
    contentType: formatParam,
    sortBy: sortParam,
    dateRange: rangeParam,
    search: qParam,
  };

  const handleFilterChange = (newFilters: EditorialFilterState) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newFilters.categorySlug) nextParams.set('category', newFilters.categorySlug);
    else nextParams.delete('category');

    if (newFilters.tagSlugs) nextParams.set('tagSlugs', newFilters.tagSlugs);
    else nextParams.delete('tagSlugs');

    if (newFilters.authorId) nextParams.set('authorId', newFilters.authorId);
    else nextParams.delete('authorId');

    if (newFilters.contentType && newFilters.contentType !== 'all') {
      nextParams.set('contentType', newFilters.contentType);
    } else {
      nextParams.delete('contentType');
    }

    if (newFilters.sortBy && newFilters.sortBy !== 'latest') {
      nextParams.set('sortBy', newFilters.sortBy);
    } else {
      nextParams.delete('sortBy');
    }

    if (newFilters.dateRange && newFilters.dateRange !== 'all') {
      nextParams.set('dateRange', newFilters.dateRange);
    } else {
      nextParams.delete('dateRange');
    }

    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 font-sans">
      {/* Editorial Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Search & Discover
        </h1>

        {/* Search Input Box */}
        <div className="relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stories by headline, keyword, or topic..."
            className="w-full pl-11 pr-4 py-3.5 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
            autoFocus
          />
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400"
          />
        </div>

        {/* Dynamic Admin Editorial Topic Navigation */}
        <EditorialTopicNav
          selectedSlug={categoryParam}
          onSelectTopic={(slug) => handleFilterChange({ ...currentFilters, categorySlug: slug })}
        />

        {/* Expandable Editorial Filter Controls & Active Summary */}
        <EditorialFilterBar
          filters={currentFilters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          totalResults={total}
        />
      </div>

      {/* Invalid Query Error Display */}
      {isError && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-mono">
          Unable to validate query parameters. Please check search parameters.
        </div>
      )}

      {/* Results List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Searching manuscripts..." />
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-8 divide-y divide-stone-200 dark:divide-stone-800">
          {articles.map((article) => (
            <article key={article.id} className="pt-6 first:pt-0 space-y-2 group">
              <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500 font-medium">
                {article.categorySlug || 'Editorial'}
              </span>

              <Link to={`/articles/${article.slug}`}>
                <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:underline leading-snug">
                  {article.title}
                </h2>
              </Link>

              <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed font-sans">
                {article.description}
              </p>

              <div className="flex items-center gap-3 text-[11px] font-mono text-stone-400 pt-1">
                {article.authorName && (
                  <>
                    <span>By {article.authorName}</span>
                    <span>·</span>
                  </>
                )}
                <span>{article.readingTimeMinutes || 3} min read</span>
                <span>·</span>
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State UX */
        <div className="py-16 px-6 text-center border border-dashed border-stone-300 dark:border-stone-800">
          <p className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100 mb-2">
            No stories match these filters.
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 font-sans">
            Try adjusting your search terms or clearing active category and date filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-widest bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
};
