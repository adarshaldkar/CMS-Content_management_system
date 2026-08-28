import React, { useEffect, useState } from 'react';
import { RotateCcw, Filter, Clock, Calendar, ArrowUpDown, Tag } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Category } from '../../types';

export interface FacetedFilterState {
  search?: string;
  categorySlugs?: string[];
  readingTime?: 'all' | 'quick' | 'medium' | 'deep';
  dateRange?: 'all' | '24h' | '7d' | '30d' | '365d';
  sortBy?: 'latest' | 'trending' | 'most_read' | 'most_discussed';
}

interface FacetedFilterSidebarProps {
  filters: FacetedFilterState;
  onFilterChange: (newFilters: FacetedFilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export const FacetedFilterSidebar: React.FC<FacetedFilterSidebarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available active categories
  useEffect(() => {
    let active = true;
    apiClient
      .get<{ items?: Category[] } | Category[]>('/categories', { params: { status: 'active', limit: 50 } })
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setCategories(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedSlugs = filters.categorySlugs || [];

  // Toggle individual category checkbox
  const handleCategoryToggle = (slug: string) => {
    const isSelected = selectedSlugs.includes(slug);
    const updated = isSelected
      ? selectedSlugs.filter((s) => s !== slug)
      : [...selectedSlugs, slug];
    onFilterChange({ ...filters, categorySlugs: updated });
  };

  const handleSelectAllCategories = () => {
    onFilterChange({ ...filters, categorySlugs: [] });
  };

  return (
    <aside className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs space-y-6 text-xs">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2 font-serif font-bold text-ink-primary text-sm">
          <Filter size={15} className="text-slate-700" />
          <span>Faceted Filters</span>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] font-mono text-ink-secondary hover:text-accent-crimson transition-colors"
          title="Reset all filters"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      {/* Section 1: Editorial Topic Desks (Multi-Select Checkboxes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary flex items-center gap-1.5">
            <Tag size={12} />
            <span>Coverage Desks</span>
          </label>
          {selectedSlugs.length > 0 && (
            <button
              onClick={handleSelectAllCategories}
              className="text-[10px] text-ink-secondary hover:text-ink-primary font-mono"
            >
              Clear Desks
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 py-2 text-ink-secondary text-[11px]">
            <div className="h-4 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 bg-slate-100 rounded animate-pulse w-4/5" />
            <div className="h-4 bg-slate-100 rounded animate-pulse w-3/5" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-[11px] text-ink-secondary">No desks found.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isChecked = selectedSlugs.includes(cat.slug);
              return (
                <label
                  key={cat.id || cat.slug}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-slate-100 text-ink-primary font-medium'
                      : 'hover:bg-slate-50 text-ink-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCategoryToggle(cat.slug)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-400 h-3.5 w-3.5"
                    />
                    <span className="truncate text-xs font-serif">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 pl-2">
                    /{cat.slug.slice(0, 10)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Reading Duration & Depth */}
      <div className="space-y-3 pt-4 border-t border-border-subtle">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary flex items-center gap-1.5">
          <Clock size={12} />
          <span>Reading Duration</span>
        </label>

        <div className="space-y-1.5">
          {[
            { id: 'all', label: 'All Durations' },
            { id: 'quick', label: 'Quick Reads (< 3 min)' },
            { id: 'medium', label: 'Standard Feature (3 to 7 min)' },
            { id: 'deep', label: 'In-Depth Analysis (> 7 min)' },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                (filters.readingTime || 'all') === opt.id
                  ? 'bg-slate-100 text-ink-primary font-medium'
                  : 'hover:bg-slate-50 text-ink-secondary'
              }`}
            >
              <input
                type="radio"
                name="readingTimeOption"
                checked={(filters.readingTime || 'all') === opt.id}
                onChange={() => onFilterChange({ ...filters, readingTime: opt.id as any })}
                className="text-slate-900 focus:ring-slate-400 h-3.5 w-3.5"
              />
              <span className="text-xs">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Section 3: Publication Timeline */}
      <div className="space-y-3 pt-4 border-t border-border-subtle">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary flex items-center gap-1.5">
          <Calendar size={12} />
          <span>Published Within</span>
        </label>

        <select
          value={filters.dateRange || 'all'}
          onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value as any })}
          className="w-full px-3 py-2 bg-slate-50 border border-border-subtle rounded-lg text-xs font-serif focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="all">All Historical Archives</option>
          <option value="24h">Past 24 Hours</option>
          <option value="7d">Past 7 Days</option>
          <option value="30d">Past 30 Days</option>
          <option value="365d">Past 12 Months</option>
        </select>
      </div>

      {/* Section 4: Sort Ordering */}
      <div className="space-y-3 pt-4 border-t border-border-subtle">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary flex items-center gap-1.5">
          <ArrowUpDown size={12} />
          <span>Sort By</span>
        </label>

        <select
          value={filters.sortBy || 'latest'}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
          className="w-full px-3 py-2 bg-slate-50 border border-border-subtle rounded-lg text-xs font-serif focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="latest">Latest Published (Chronological)</option>
          <option value="trending">Trending Now</option>
          <option value="most_read">Most Read</option>
          <option value="most_discussed">Most Discussed</option>
        </select>
      </div>

      {/* Results Telemetry Counter */}
      <div className="pt-4 border-t border-border-subtle text-center text-ink-secondary font-mono text-[11px]">
        <span>{totalResults} stories match active criteria</span>
      </div>
    </aside>
  );
};
