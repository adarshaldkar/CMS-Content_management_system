import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bookmark,
  Clock,
  Compass,
  Flame,
  Mail,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const HomePage: React.FC = () => {
  // 1. Fetch Latest Published Articles
  const { data: latestData, isLoading: isLatestLoading } = useQuery({
    queryKey: ['publicLatestArticles'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 12, sort: 'latest' },
      });
      return data;
    },
  });

  // 2. Fetch Trending Articles dynamically from API
  const { data: trendingData } = useQuery({
    queryKey: ['publicTrendingArticles'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 5, sort: 'trending' },
      });
      return data;
    },
  });

  const cleanTitle = (t: string) => t.replace(/\s\d{10,}/g, '');

  const articles = latestData?.items || [];
  const trendingArticles = trendingData?.items || articles.slice(0, 5);

  const heroArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);
  const feedArticles = articles.slice(3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SHOWCASE (Asymmetric 3-Column Editorial Grid) */}
      {/* ------------------------------------------------------------- */}
      <section className="border-b border-border-subtle pb-10">
        {isLatestLoading ? (
          <div className="py-20 text-center">
            <LoadingSpinner label="Loading publication edition..." />
          </div>
        ) : heroArticle ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Column 1: Primary Hero Lead Story (6 Cols) */}
            <div className="lg:col-span-6 space-y-4">
              <Link to={`/articles/${heroArticle.slug}`} className="block group">
                <div className="aspect-[16/10] overflow-hidden bg-slate-900 border border-border-subtle mb-4 relative">
                  {heroArticle.coverImage ? (
                    <img
                      src={heroArticle.coverImage}
                      alt={cleanTitle(heroArticle.title)}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-editorial text-2xl font-bold p-6 text-center leading-snug">
                      {cleanTitle(heroArticle.title)}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded text-[10px] font-mono font-bold uppercase tracking-wider text-accent-crimson border border-border-subtle">
                    Lead Editorial
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-editorial font-bold text-ink-primary leading-tight group-hover:text-accent-crimson transition-colors">
                  {cleanTitle(heroArticle.title)}
                </h1>
              </Link>

              <p className="text-sm text-ink-secondary leading-relaxed line-clamp-3">
                {heroArticle.description ||
                  'An architectural and investigative deep dive into zero-buffer state synchronization, verified permissions, and reader trust.'}
              </p>

              <div className="flex items-center gap-3 text-xs font-mono text-ink-secondary pt-1 border-t border-border-subtle/50">
                <span className="font-semibold text-ink-primary">The Gazette Editorial Staff</span>
                <span>·</span>
                <span>{heroArticle.readingTimeMinutes || 4} min read</span>
              </div>
            </div>

            {/* Column 2: Secondary Highlights (3 Cols) */}
            <div className="lg:col-span-3 space-y-6 border-t lg:border-t-0 lg:border-l lg:border-r border-border-subtle lg:px-6 pt-6 lg:pt-0">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-secondary font-semibold pb-2 border-b border-border-subtle">
                <Sparkles size={14} className="text-amber-500" />
                <span>Featured Pieces</span>
              </div>

              {secondaryArticles.map((article) => (
                <article key={article.id} className="space-y-1.5 group">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-semibold">
                    {article.categorySlug || 'Analysis'}
                  </span>
                  <Link to={`/articles/${article.slug}`}>
                    <h2 className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug">
                      {cleanTitle(article.title)}
                    </h2>
                  </Link>
                  <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>
                  <div className="text-[11px] font-mono text-ink-secondary pt-1">
                    {article.readingTimeMinutes || 3} min read
                  </div>
                </article>
              ))}
            </div>

            {/* Column 3: Numbered Trending Sidebar (3 Cols) */}
            <div className="lg:col-span-3 space-y-4 border-t lg:border-t-0 border-border-subtle pt-6 lg:pt-0">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-primary font-bold pb-2 border-b border-border-subtle">
                <TrendingUp size={15} className="text-accent-crimson" />
                <span>Trending on Gazette</span>
              </div>

              <div className="space-y-4 divide-y divide-border-subtle">
                {trendingArticles.map((article, idx) => (
                  <div key={article.id} className="pt-3 first:pt-0 flex items-start gap-4 group">
                    <span className="text-2xl font-editorial font-bold text-accent-crimson/70 shrink-0 font-mono">
                      0{idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <Link
                        to={`/articles/${article.slug}`}
                        className="text-xs font-bold text-ink-primary group-hover:text-accent-crimson transition-colors line-clamp-2 leading-snug block"
                      >
                        {cleanTitle(article.title)}
                      </Link>
                      <p className="text-[11px] font-mono text-ink-secondary">
                        {article.readingTimeMinutes || 2} min read
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center border-b border-border-subtle">
            <p className="text-sm font-bold text-ink-primary">Publication edition in preparation.</p>
            <p className="text-xs text-ink-secondary mt-1 font-mono">
              Publish articles from your desk to feature them on the front page.
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. CATEGORY SHOWCASE SECTIONS */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <h2 className="text-xl font-editorial font-bold text-ink-primary">
            Technology & Systems
          </h2>
          <Link
            to="/category/technology"
            className="text-xs font-semibold text-accent-crimson hover:underline flex items-center gap-1 font-mono"
          >
            <span>View Section →</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
          {articles.slice(0, 3).map((article, idx) => (
            <article key={article.id} className={`space-y-2 group ${idx > 0 ? 'md:pl-6 pt-4 md:pt-0' : ''}`}>
              <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                <span className="text-accent-crimson font-semibold uppercase tracking-wider">
                  Technology
                </span>
                <span>{article.readingTimeMinutes || 3} min read</span>
              </div>
              <Link to={`/articles/${article.slug}`}>
                <h3 className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-2">
                  {cleanTitle(article.title)}
                </h3>
              </Link>
              <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                {article.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. LATEST DISPATCHES & NEWSLETTER STRIP */}
      {/* ------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4 border-t border-border-subtle">
        {/* Latest Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-lg font-editorial font-bold text-ink-primary border-b border-border-subtle pb-3">
            Latest Editorial Dispatches
          </h2>

          <div className="divide-y divide-border-subtle">
            {feedArticles.length > 0 ? (
              feedArticles.map((article) => (
                <article key={article.id} className="py-4 space-y-1.5 group">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-semibold">
                    <span>{article.categorySlug || 'Dispatch'}</span>
                    <span>·</span>
                    <span className="text-ink-secondary">{article.readingTimeMinutes || 3} min read</span>
                  </div>
                  <Link to={`/articles/${article.slug}`}>
                    <h3 className="text-base font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug truncate">
                      {cleanTitle(article.title)}
                    </h3>
                  </Link>
                  <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-xs font-mono text-ink-secondary py-4">All current dispatches showcased above.</p>
            )}
          </div>
        </div>

        {/* Morning Dispatch Newsletter Strip (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 text-white p-6 space-y-4">
            <div className="flex items-center gap-2 text-accent-crimson text-xs font-mono uppercase tracking-wider font-semibold">
              <Mail size={16} />
              <span>Gazette Morning Dispatch</span>
            </div>
            <h3 className="text-base font-editorial font-bold text-white leading-snug">
              Curated essays on software design, resilience, and digital media
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Delivered every Tuesday morning. Zero spam, strictly independent research.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert('Thank you for subscribing to The Gazette Morning Dispatch.');
              }}
              className="space-y-2 pt-2"
            >
              <input
                type="email"
                required
                placeholder="reader@domain.com"
                className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-crimson/50"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-accent-crimson hover:bg-accent-crimson-hover text-white text-xs font-semibold tracking-wide transition-colors"
              >
                <span>Subscribe to Dispatch</span>
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
