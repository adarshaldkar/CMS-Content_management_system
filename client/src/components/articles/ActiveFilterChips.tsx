import React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import type { FacetedFilterState } from './FacetedFilterSidebar';

interface ActiveFilterChipsProps {
  filters: FacetedFilterState;
  onRemoveCategory: (slug: string) => void;
  onRemoveReadingTime: () => void;
  onRemoveDateRange: () => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onRemoveCategory,
  onRemoveReadingTime,
  onRemoveDateRange,
  onClearAll,
}) => {
  const hasCategories = (filters.categorySlugs || []).length > 0;
  const hasReadingTime = filters.readingTime && filters.readingTime !== 'all';
  const hasDateRange = filters.dateRange && filters.dateRange !== 'all';

  const hasAnyFilter = hasCategories || hasReadingTime || hasDateRange;

  if (!hasAnyFilter) return null;

  const getReadingTimeLabel = (rt?: string) => {
    switch (rt) {
      case 'quick':
        return 'Under 3 min';
      case 'medium':
        return '3 to 7 min';
      case 'deep':
        return 'Over 7 min';
      default:
        return rt;
    }
  };

  const getDateRangeLabel = (dr?: string) => {
    switch (dr) {
      case '24h':
        return 'Past 24 Hours';
      case '7d':
        return 'Past 7 Days';
      case '30d':
        return 'Past 30 Days';
      case '365d':
        return 'Past 12 Months';
      default:
        return dr;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-2 border-b border-border-subtle text-xs animate-fadeIn">
      <div className="flex items-center gap-1.5 text-ink-secondary text-[11px] font-mono uppercase tracking-wider shrink-0 mr-1">
        <SlidersHorizontal size={12} />
        <span>Active Filters:</span>
      </div>

      {/* Category Chips */}
      {(filters.categorySlugs || []).map((slug) => (
        <span
          key={slug}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-md text-[11px] font-serif font-medium shadow-2xs"
        >
          <span>Desk: {slug.replace(/-/g, ' ')}</span>
          <button
            onClick={() => onRemoveCategory(slug)}
            className="hover:text-rose-300 transition-colors"
            title={`Remove ${slug}`}
            aria-label={`Remove filter for ${slug}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}

      {/* Reading Duration Chip */}
      {hasReadingTime && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-border-subtle text-ink-primary rounded-md text-[11px] font-serif font-medium">
          <span>Length: {getReadingTimeLabel(filters.readingTime)}</span>
          <button
            onClick={onRemoveReadingTime}
            className="text-slate-400 hover:text-ink-primary transition-colors"
            aria-label="Remove reading duration filter"
          >
            <X size={11} />
          </button>
        </span>
      )}

      {/* Date Range Chip */}
      {hasDateRange && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-border-subtle text-ink-primary rounded-md text-[11px] font-serif font-medium">
          <span>Date: {getDateRangeLabel(filters.dateRange)}</span>
          <button
            onClick={onRemoveDateRange}
            className="text-slate-400 hover:text-ink-primary transition-colors"
            aria-label="Remove date range filter"
          >
            <X size={11} />
          </button>
        </span>
      )}

      {/* Clear All Action */}
      <button
        onClick={onClearAll}
        className="text-[11px] font-mono text-accent-crimson hover:underline font-semibold ml-2 transition-all"
      >
        Clear All
      </button>
    </div>
  );
};
