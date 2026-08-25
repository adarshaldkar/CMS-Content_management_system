import React, { useState } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';

export interface EditorialFilterState {
  categorySlug?: string;
  tagSlugs?: string;
  authorId?: string;
  contentType?: 'all' | 'article' | 'video' | 'series';
  sortBy?: 'latest' | 'trending' | 'most_discussed' | 'most_liked';
  dateRange?: 'all' | '24h' | '7d' | '30d';
  search?: string;
}

interface EditorialFilterBarProps {
  filters: EditorialFilterState;
  onFilterChange: (newFilters: EditorialFilterState) => void;
  onReset: () => void;
  totalResults?: number;
}

export const EditorialFilterBar: React.FC<EditorialFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filters.categorySlug ||
      filters.tagSlugs ||
      filters.authorId ||
      (filters.contentType && filters.contentType !== 'all') ||
      (filters.sortBy && filters.sortBy !== 'latest') ||
      (filters.dateRange && filters.dateRange !== 'all') ||
      filters.search,
  );

  const activeSummaryItems: string[] = [];
  if (filters.categorySlug) activeSummaryItems.push(`Topic: ${filters.categorySlug}`);
  if (filters.tagSlugs) activeSummaryItems.push(`Tag: ${filters.tagSlugs}`);
  if (filters.authorId) activeSummaryItems.push(`Author Filter Active`);
  if (filters.contentType && filters.contentType !== 'all') activeSummaryItems.push(`Format: ${filters.contentType}`);
  if (filters.dateRange && filters.dateRange !== 'all') {
    const rangeLabels: Record<string, string> = {
      '24h': 'Past 24 Hours',
      '7d': 'Past 7 Days',
      '30d': 'Past 30 Days',
    };
    activeSummaryItems.push(rangeLabels[filters.dateRange] || filters.dateRange);
  }
  if (filters.sortBy && filters.sortBy !== 'latest') {
    const sortLabels: Record<string, string> = {
      trending: 'Trending',
      most_discussed: 'Most Discussed',
      most_liked: 'Most Liked',
    };
    activeSummaryItems.push(`Sorted by ${sortLabels[filters.sortBy] || filters.sortBy}`);
  }

  return (
    <div className="w-full border-b border-stone-200 dark:border-stone-800 py-3 my-4 font-sans text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-xs tracking-widest uppercase font-mono text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-stone-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isOpen ? 'Close Filter Panel' : 'Filter & Sort Stories'}</span>
          </button>

          {totalResults !== undefined && (
            <span className="text-xs text-stone-400 font-serif italic">
              ({totalResults} {totalResults === 1 ? 'story' : 'stories'} found)
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline uppercase tracking-wider font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Editorial Active Summary Line */}
      {hasActiveFilters && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-850 text-xs text-stone-600 dark:text-stone-400 font-serif flex items-center gap-2 overflow-x-auto">
          <span className="font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-widest font-mono text-[10px]">
            ACTIVE:
          </span>
          <span>{activeSummaryItems.join(' · ')}</span>
        </div>
      )}

      {/* Expandable Accordion Controls Panel */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          {/* Format Selection */}
          <div>
            <span className="block text-[11px] font-mono tracking-widest uppercase text-stone-400 mb-2">
              Content Format
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {(['all', 'article', 'video', 'series'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => onFilterChange({ ...filters, contentType: fmt })}
                  className={`px-2.5 py-1 uppercase tracking-wider transition-colors ${
                    (filters.contentType || 'all') === fmt
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-medium'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selection */}
          <div>
            <span className="block text-[11px] font-mono tracking-widest uppercase text-stone-400 mb-2">
              Sort Stories By
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'latest', label: 'Latest' },
                { id: 'trending', label: 'Trending' },
                { id: 'most_discussed', label: 'Most Discussed' },
                { id: 'most_liked', label: 'Most Liked' },
              ].map((sortItem) => (
                <button
                  key={sortItem.id}
                  onClick={() => onFilterChange({ ...filters, sortBy: sortItem.id as any })}
                  className={`px-2.5 py-1 uppercase tracking-wider transition-colors ${
                    (filters.sortBy || 'latest') === sortItem.id
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-medium'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
                  }`}
                >
                  {sortItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe Selection */}
          <div>
            <span className="block text-[11px] font-mono tracking-widest uppercase text-stone-400 mb-2">
              Timeframe
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { id: 'all', label: 'All Time' },
                { id: '24h', label: 'Past 24h' },
                { id: '7d', label: 'Past 7 Days' },
                { id: '30d', label: 'Past Month' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => onFilterChange({ ...filters, dateRange: tf.id as any })}
                  className={`px-2.5 py-1 uppercase tracking-wider transition-colors ${
                    (filters.dateRange || 'all') === tf.id
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 font-medium'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-stone-100'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
