import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, RotateCcw, X, Clock, Calendar, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { ArticleCardSkeleton } from '../components/common/SkeletonLoader';
import { FacetedFilterSidebar, type FacetedFilterState } from '../components/articles/FacetedFilterSidebar';
import { ActiveFilterChips } from '../components/articles/ActiveFilterChips';
import type { Article, PaginatedResult } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse query parameters
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || searchParams.get('categorySlugs') || '';
  const rangeParam = (searchParams.get('dateRange') as any) || 'all';
  const readingParam = (searchParams.get('readingTime') as any) || 'all';
  const sortParam = (searchParams.get('sortBy') as any) || 'latest';

  const [searchTerm, setSearchTerm] = useState(qParam);

  // Sync debounced search input with URL query string
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
  const fromDate = useMemo(() => {
    if (rangeParam === '24h') return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (rangeParam === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (rangeParam === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    if (rangeParam === '365d') return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    return undefined;
  }, [rangeParam]);

  // Parse multi-category array
  const categorySlugsArray = useMemo(() => {
    if (!categoryParam) return [];
    return categoryParam.split(',').map((s) => s.trim()).filter(Boolean);
  }, [categoryParam]);

  // Fetch articles via react-query
  const { data: searchData, isLoading, isError } = useQuery({
    queryKey: [
      'articleFacetedSearch',
      qParam,
      categoryParam,
      sortParam,
      rangeParam,
      fromDate,
    ],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: {
          status: 'published',
          search: qParam || undefined,
          categorySlugs: categorySlugsArray.length > 0 ? categorySlugsArray.join(',') : undefined,
          sortBy: sortParam,
          fromDate,
          limit: 40,
        },
      });
      return data;
    },
  });

  const rawArticles = searchData?.items || [];

  // Client-side reading time filter
  const articles = useMemo(() => {
    if (readingParam === 'quick') {
      return rawArticles.filter((a) => (a.readingTimeMinutes || 3) < 3);
    }
    if (readingParam === 'medium') {
      return rawArticles.filter((a) => {
        const rt = a.readingTimeMinutes || 3;
        return rt >= 3 && rt <= 7;
      });
    }
    if (readingParam === 'deep') {
      return rawArticles.filter((a) => (a.readingTimeMinutes || 3) > 7);
    }
    return rawArticles;
  }, [rawArticles, readingParam]);

  const total = articles.length;

  const currentFilters: FacetedFilterState = {
    search: qParam,
    categorySlugs: categorySlugsArray,
    readingTime: readingParam,
    dateRange: rangeParam,
    sortBy: sortParam,
  };

  const handleFilterChange = (newFilters: FacetedFilterState) => {
    const nextParams = new URLSearchParams(searchParams);

    if (newFilters.categorySlugs && newFilters.categorySlugs.length > 0) {
      nextParams.set('categorySlugs', newFilters.categorySlugs.join(','));
      nextParams.delete('category');
    } else {
      nextParams.delete('categorySlugs');
      nextParams.delete('category');
    }

    if (newFilters.readingTime && newFilters.readingTime !== 'all') {
      nextParams.set('readingTime', newFilters.readingTime);
    } else {
      nextParams.delete('readingTime');
    }

    if (newFilters.dateRange && newFilters.dateRange !== 'all') {
      nextParams.set('dateRange', newFilters.dateRange);
    } else {
      nextParams.delete('dateRange');
    }

    if (newFilters.sortBy && newFilters.sortBy !== 'latest') {
      nextParams.set('sortBy', newFilters.sortBy);
    } else {
      nextParams.delete('sortBy');
    }

    setSearchParams(nextParams);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchParams({});
  };

  const handleRemoveCategory = (slug: string) => {
    const updated = categorySlugsArray.filter((s) => s !== slug);
    handleFilterChange({ ...currentFilters, categorySlugs: updated });
  };

  const handleRemoveReadingTime = () => {
    handleFilterChange({ ...currentFilters, readingTime: 'all' });
  };

  const handleRemoveDateRange = () => {
    handleFilterChange({ ...currentFilters, dateRange: 'all' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header & Main Search Box */}
      <div className="space-y-4 max-w-3xl">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-accent-crimson font-semibold block">
            The Gazette Archives &amp; Intelligence
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink-primary tracking-tight mt-1">
            Search &amp; Discovery Studio
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Filter historical stories across multiple desks, durations, and publication timelines.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search stories by headline, topic, author, or keyword..."
            aria-label="Search stories by headline, topic, author, or keyword"
            className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-border-subtle rounded-xl text-ink-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-xs transition-all"
          />
          <SearchIcon
            size={18}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search text"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Faceted Grid Layout */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left Column: Faceted Filter Console */}
        <div className="col-span-12 lg:col-span-4 sticky top-4">
          <FacetedFilterSidebar
            filters={currentFilters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            totalResults={total}
          />
        </div>

        {/* Right Column: Active Chips & Results Stream */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Active Chips Bar */}
          <ActiveFilterChips
            filters={currentFilters}
            onRemoveCategory={handleRemoveCategory}
            onRemoveReadingTime={handleRemoveReadingTime}
            onRemoveDateRange={handleRemoveDateRange}
            onClearAll={handleResetFilters}
          />

          {/* Query Error Notice */}
          {isError && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono rounded-lg">
              Unable to validate search criteria. Please adjust filters.
            </div>
          )}

          {/* Results Stream */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-4">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="bg-white border border-border-subtle rounded-xl p-5 hover:border-slate-700 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent-crimson">
                        {article.categorySlug?.replace(/-/g, ' ') || 'General Desk'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <Link to={`/articles/${article.slug}`}>
                      <h2 className="text-lg font-serif font-bold text-ink-primary group-hover:text-accent-crimson leading-snug transition-colors">
                        {article.title}
                      </h2>
                    </Link>

                    {article.description && (
                      <p className="text-xs text-ink-secondary mt-1.5 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-ink-secondary">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-primary">
                        {article.authorName || 'Staff Writer'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-500">
                        <Clock size={11} />
                        <span>{article.readingTimeMinutes || 3} min read</span>
                      </span>
                    </div>

                    <Link
                      to={`/articles/${article.slug}`}
                      className="text-xs font-serif font-bold text-ink-primary group-hover:text-accent-crimson flex items-center gap-1 transition-colors"
                    >
                      <span>Read Story</span>
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-dashed border-border-subtle rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <SearchIcon size={20} />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-primary">
                No stories match these active filters
              </h3>
              <p className="text-xs text-ink-secondary max-w-md mx-auto leading-relaxed">
                Try deselecting some desks or broadening your reading time and timeline settings.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors mt-2"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SearchPage;
