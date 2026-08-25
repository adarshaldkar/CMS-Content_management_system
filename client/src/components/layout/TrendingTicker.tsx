import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Pause, Play, TrendingUp } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Article, PaginatedResult } from '../../types';

interface CategoryBadgeConfig {
  icon: string;
  borderColor: string;
  badgeBg: string;
  textColor: string;
}

const CATEGORY_STYLE_MAP: Record<string, CategoryBadgeConfig> = {
  'artificial-intelligence': {
    icon: '🔥',
    borderColor: 'border-l-rose-500',
    badgeBg: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  ai: {
    icon: '🔥',
    borderColor: 'border-l-rose-500',
    badgeBg: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  cybersecurity: {
    icon: '⚡',
    borderColor: 'border-l-indigo-500',
    badgeBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
  },
  'software-architecture': {
    icon: '🏛️',
    borderColor: 'border-l-sky-500',
    badgeBg: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  science: {
    icon: '🔬',
    borderColor: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  'editorial-design': {
    icon: '🖋️',
    borderColor: 'border-l-amber-500',
    badgeBg: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  money: {
    icon: '📈',
    borderColor: 'border-l-emerald-600',
    badgeBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  technology: {
    icon: '💻',
    borderColor: 'border-l-blue-500',
    badgeBg: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  governance: {
    icon: '⚖️',
    borderColor: 'border-l-purple-500',
    badgeBg: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  'media-culture': {
    icon: '🗞️',
    borderColor: 'border-l-slate-700',
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-800',
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryBadgeConfig = {
  icon: '✨',
  borderColor: 'border-l-accent-crimson',
  badgeBg: 'bg-rose-50',
  textColor: 'text-accent-crimson',
};

export const TrendingTicker: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  // Dynamically fetch published trending articles from the backend
  const { data } = useQuery({
    queryKey: ['trendingTickerArticles'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: {
          status: 'published',
          sortBy: 'trending',
          limit: 12,
        },
      });
      return data?.items || [];
    },
    staleTime: 1000 * 60 * 2, // Refresh every 2 minutes for live updates
    refetchInterval: 1000 * 60 * 3, // Polling background refresh
  });

  const articles: Article[] = data || [];

  if (articles.length === 0) {
    return null;
  }

  // Duplicate items to make the continuous loop infinite & seamless
  const tickerItems = [...articles, ...articles];

  return (
    <div
      className={`border-b border-border-subtle bg-slate-50/90 dark:bg-stone-900/90 overflow-hidden relative select-none pause-on-hover ${
        isPaused ? 'ticker-paused' : ''
      }`}
      aria-label="Trending Stories Ticker"
    >
      <div className="flex items-center">
        {/* Left Fixed Badge: TRENDING DISPATCH */}
        <div className="flex items-center gap-1.5 px-3.5 py-2 bg-ink-primary text-white text-[11px] font-mono font-semibold tracking-wider uppercase whitespace-nowrap z-20 shrink-0 shadow-sm">
          <Flame size={13} className="text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">Trending</span>
          <span className="sm:hidden">Hot</span>
        </div>

        {/* Marquee Scrolling Container */}
        <div className="flex-1 overflow-hidden relative py-1.5">
          <div className="animate-ticker flex items-center gap-3">
            {tickerItems.map((article, idx) => {
              const catSlug = article.categorySlug || 'general';
              const style = CATEGORY_STYLE_MAP[catSlug] || DEFAULT_CATEGORY_STYLE;
              const categoryName = (article.categorySlug || 'Trending')
                .replace(/-/g, ' ')
                .toUpperCase();

              return (
                <Link
                  key={`${article.id}-${idx}`}
                  to={`/articles/${article.slug}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-800/90 border border-border-subtle border-l-[3px] ${style.borderColor} rounded-md shadow-xs hover:shadow-md hover:border-ink-primary transition-all group shrink-0 whitespace-nowrap cursor-pointer`}
                  title={article.title}
                >
                  {/* Category Topic Pill */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded ${style.badgeBg} ${style.textColor}`}
                  >
                    <span>{style.icon}</span>
                    <span>{categoryName}</span>
                  </span>

                  {/* Article Title */}
                  <span className="text-xs font-serif font-medium text-ink-primary dark:text-stone-100 group-hover:text-accent-crimson transition-colors max-w-[280px] sm:max-w-[340px] truncate">
                    {article.title}
                  </span>

                  {/* Author Byline / Reading Time */}
                  {article.authorName && (
                    <span className="hidden md:inline-flex items-center text-[10px] font-mono text-ink-secondary dark:text-stone-400">
                      <span className="mx-1 text-stone-300">·</span>
                      <span className="truncate max-w-[120px]">{article.authorName}</span>
                    </span>
                  )}

                  {/* Live Activity Metric */}
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 font-medium">
                    <TrendingUp size={11} />
                    <span>{article.readingTimeMinutes || 2}m</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Manual Play/Pause Control Button */}
        <div className="px-2.5 z-20 shrink-0 bg-slate-50/95 dark:bg-stone-900/95 border-l border-border-subtle py-1.5">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 text-ink-secondary hover:text-ink-primary hover:bg-slate-200/70 dark:hover:bg-stone-800 rounded transition-colors"
            title={isPaused ? 'Resume live ticker' : 'Pause ticker'}
            aria-label={isPaused ? 'Resume live ticker' : 'Pause ticker'}
          >
            {isPaused ? <Play size={13} className="text-emerald-600" /> : <Pause size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
};
