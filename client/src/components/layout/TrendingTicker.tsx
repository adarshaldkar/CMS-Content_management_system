import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Pause, Play, TrendingUp } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Article, PaginatedResult } from '../../types';

export const TrendingTicker: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Dynamically fetch published trending articles from the backend
  const { data } = useQuery({
    queryKey: ['trendingTickerArticles'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: {
          status: 'published',
          sortBy: 'trending',
          limit: 10,
        },
      });
      return data?.items || [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const articles = data || [];

  // Automated gentle rotation every 5 seconds if not paused
  useEffect(() => {
    if (articles.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [articles.length, isPaused]);

  if (articles.length === 0) return null;

  const currentArticle = articles[currentIndex] || articles[0];
  const total = articles.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  return (
    <div
      className="border-b border-border-subtle bg-slate-50/80 transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 text-xs">
          {/* Left: Monospaced Label + Current Rotated Story */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono font-bold tracking-widest uppercase shrink-0">
              <TrendingUp size={12} className="text-emerald-400" />
              <span>Trending</span>
            </div>

            <div className="h-3.5 w-px bg-border-subtle shrink-0 hidden sm:block" />

            {/* Current Item with Smooth Transition */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {currentArticle.categorySlug && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-crimson shrink-0 hidden sm:inline">
                  {currentArticle.categorySlug.replace(/-/g, ' ')}
                </span>
              )}

              <Link
                to={`/articles/${currentArticle.slug}`}
                className="font-serif text-ink-primary hover:text-accent-crimson transition-colors truncate font-medium text-xs sm:text-sm"
                title={currentArticle.title}
              >
                {currentArticle.title}
              </Link>

              {currentArticle.authorName && (
                <span className="text-[11px] text-ink-secondary hidden md:inline shrink-0">
                  — by {currentArticle.authorName}
                </span>
              )}

              <span className="text-[10px] font-mono text-slate-500 shrink-0 hidden lg:inline">
                ({currentArticle.readingTimeMinutes || 2} min read)
              </span>
            </div>
          </div>

          {/* Right: Stepper Controls & Counter */}
          <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-border-subtle">
            <span className="text-[10px] font-mono text-ink-secondary font-medium">
              {currentIndex + 1}/{total}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                onClick={handlePrev}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                title="Previous story"
                aria-label="Previous trending story"
              >
                <ChevronLeft size={13} />
              </button>

              <button
                onClick={handleNext}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
                title="Next story"
                aria-label="Next trending story"
              >
                <ChevronRight size={13} />
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors ml-1"
                title={isPaused ? 'Resume auto-rotation' : 'Pause rotation'}
                aria-label={isPaused ? 'Resume auto-rotation' : 'Pause rotation'}
              >
                {isPaused ? <Play size={11} className="text-emerald-700" /> : <Pause size={11} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
