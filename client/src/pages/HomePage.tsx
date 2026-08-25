import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, ArrowRight, Send, BookOpen, Flame } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

/* ─── helpers ─────────────────────────────────────────────────────── */
const cleanTitle = (t: string) => t.replace(/\s\d{10,}/g, '').trim();

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
};

const CAT_MAP: Record<string, string> = {
  technology: 'Technology',
  ai: 'Artificial Intelligence',
  cybersecurity: 'Cybersecurity',
  'editorial-design': 'Editorial Design',
  'software-architecture': 'Software Architecture',
  'media-culture': 'Media & Society',
  science: 'Science',
  'policy-governance': 'Governance',
};
const catLabel = (slug?: string) =>
  slug ? (CAT_MAP[slug] ?? slug.replace(/-/g, ' ')) : 'Analysis';

/* ─── RuleLabel ────────────────────────────────────────────────────── */
const RuleLabel: React.FC<{ label: string; to?: string }> = ({ label, to }) => (
  <div className="flex items-baseline gap-4 border-t-2 border-ink-primary pt-2 mb-5">
    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-primary">{label}</span>
    {to && (
      <Link
        to={to}
        className="ml-auto text-[11px] font-mono text-ink-secondary hover:text-accent-crimson transition-colors flex items-center gap-1 group"
      >
        More <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )}
  </div>
);

/* ─── TrendItem ────────────────────────────────────────────────────── */
const TrendItem: React.FC<{ article: Article; idx: number }> = ({ article, idx }) => (
  <Link
    to={`/articles/${article.slug}`}
    className="group flex items-start gap-3 py-3 border-b border-border-subtle last:border-b-0"
  >
    <span className="text-3xl font-serif font-bold text-slate-200 select-none leading-none mt-0.5 shrink-0 w-8">
      {String(idx + 1).padStart(2, '0')}
    </span>
    <div className="min-w-0">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-accent-crimson mb-1">
        {catLabel(article.categorySlug)}
      </span>
      <span className="block text-[13px] font-serif font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-3">
        {cleanTitle(article.title)}
      </span>
      <span className="block text-[11px] font-mono text-ink-secondary mt-1">
        {article.readingTimeMinutes || 3} min
      </span>
    </div>
  </Link>
);

/* ─── StripCard ────────────────────────────────────────────────────── */
const StripCard: React.FC<{ article: Article }> = ({ article }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex-1 min-w-[190px] max-w-xs flex flex-col gap-2 border-l border-border-subtle first:border-l-0 pl-5 first:pl-0"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-crimson">
        {catLabel(article.categorySlug)}
      </span>
      {article.coverImage && !imgErr ? (
        <div className="aspect-[3/2] overflow-hidden bg-slate-100">
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="aspect-[3/2] bg-slate-100 flex items-center justify-center">
          <BookOpen size={24} className="text-slate-300" />
        </div>
      )}
      <h3 className="font-serif text-[15px] font-bold text-ink-primary leading-snug group-hover:text-accent-crimson transition-colors line-clamp-3">
        {cleanTitle(article.title)}
      </h3>
      <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-2 hidden sm:block">
        {article.description}
      </p>
      <span className="text-[11px] font-mono text-ink-secondary mt-auto">
        {article.readingTimeMinutes || 3} min read
      </span>
    </Link>
  );
};

/* ─── FeedRow ──────────────────────────────────────────────────────── */
const FeedRow: React.FC<{ article: Article }> = ({ article }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link to={`/articles/${article.slug}`} className="group flex items-start gap-4 py-4">
      {article.coverImage && !imgErr ? (
        <div className="shrink-0 w-24 h-16 overflow-hidden bg-slate-100">
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="shrink-0 w-24 h-16 bg-slate-100 flex items-center justify-center">
          <BookOpen size={16} className="text-slate-300" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-accent-crimson mb-1">
          {catLabel(article.categorySlug)}
        </span>
        <h3 className="font-serif text-[14px] font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-2">
          {cleanTitle(article.title)}
        </h3>
        <p className="text-[12px] text-ink-secondary line-clamp-1 mt-0.5 hidden sm:block">
          {article.description}
        </p>
        <span className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-ink-secondary">
          <Clock size={10} />
          {article.readingTimeMinutes || 3} min &middot; {fmtDate(article.publishedAt)}
        </span>
      </div>
    </Link>
  );
};

/* ─── HomePage ─────────────────────────────────────────────────────── */
export const HomePage: React.FC = () => {
  const [heroImgErr, setHeroImgErr] = useState(false);
  const [email, setEmail] = useState('');

  const { data: latestData, isLoading } = useQuery({
    queryKey: ['homeLatest'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 14, sort: 'latest' },
      });
      return data;
    },
  });

  const { data: trendingData } = useQuery({
    queryKey: ['homeTrending'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 6, sort: 'trending' },
      });
      return data;
    },
  });

  const articles = latestData?.items ?? [];
  const trending = trendingData?.items ?? articles.slice(0, 5);
  const hero  = articles[0];
  const col1  = articles[1];
  const strip = articles.slice(2, 6);
  const feed  = articles.slice(6, 14);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner label="Loading today's edition…" />
      </div>
    );
  }

  if (!hero) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="font-serif text-2xl text-ink-primary">Today's edition is being prepared.</p>
        <p className="text-sm text-ink-secondary mt-2 font-mono">
          Publish articles from your desk to feature them on the front page.
        </p>
      </div>
    );
  }

  const EXPLORE_CATS = [
    { name: 'Technology', slug: 'technology' },
    { name: 'AI', slug: 'ai' },
    { name: 'Cybersecurity', slug: 'cybersecurity' },
    { name: 'Science', slug: 'science' },
    { name: 'Media & Society', slug: 'media-culture' },
    { name: 'Governance', slug: 'policy-governance' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

      {/* ══ HERO GRID ═══════════════════════════════════════════════ */}
      <section className="border-b-2 border-ink-primary pb-8 mt-4">
        <RuleLabel label="Today's Edition" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* Left col – secondary story */}
          {col1 && (
            <div className="lg:col-span-3 pr-0 lg:pr-6 pb-6 lg:pb-0 mb-6 lg:mb-0 border-b lg:border-b-0 lg:border-r border-border-subtle">
              <Link to={`/articles/${col1.slug}`} className="group block space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-crimson">
                  {catLabel(col1.categorySlug)}
                </span>
                {col1.coverImage && (
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={col1.coverImage}
                      alt={cleanTitle(col1.title)}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <h2 className="font-serif text-[18px] font-bold text-ink-primary leading-snug group-hover:text-accent-crimson transition-colors">
                  {cleanTitle(col1.title)}
                </h2>
                <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-3">
                  {col1.description}
                </p>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary">
                  <Clock size={11} />
                  {col1.readingTimeMinutes || 3} min &middot; {fmtDate(col1.publishedAt)}
                </span>
              </Link>
            </div>
          )}

          {/* Center – main hero */}
          <div className="lg:col-span-6 lg:px-7 pb-6 lg:pb-0 mb-6 lg:mb-0 border-b lg:border-b-0 lg:border-r border-border-subtle">
            <Link to={`/articles/${hero.slug}`} className="group block">
              <div
                className="relative overflow-hidden bg-slate-900 mb-4"
                style={{ aspectRatio: '3/2' }}
              >
                {hero.coverImage && !heroImgErr ? (
                  <img
                    src={hero.coverImage}
                    alt={cleanTitle(hero.title)}
                    onError={() => setHeroImgErr(true)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-8">
                    <span className="font-serif text-2xl text-white/80 text-center leading-snug">
                      {cleanTitle(hero.title)}
                    </span>
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-accent-crimson text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">
                  Lead Story
                </span>
              </div>

              <span className="block text-[10px] font-bold uppercase tracking-widest text-accent-crimson mb-1.5">
                {catLabel(hero.categorySlug)}
              </span>
              <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-ink-primary leading-tight group-hover:text-accent-crimson transition-colors">
                {cleanTitle(hero.title)}
              </h1>
              <p className="mt-2 text-[13px] text-ink-secondary leading-relaxed line-clamp-3">
                {hero.description || 'An in-depth investigation from the editorial desk.'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-ink-secondary border-t border-border-subtle pt-3">
                <span className="font-semibold text-ink-primary">
                  {(hero as any).author?.name || 'Editorial Staff'}
                </span>
                <span>&middot;</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {hero.readingTimeMinutes || 5} min read
                </span>
                <span>&middot;</span>
                <span>{fmtDate(hero.publishedAt)}</span>
              </div>
            </Link>
          </div>

          {/* Right – trending list */}
          <div className="lg:col-span-3 pl-0 lg:pl-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-primary border-b-2 border-ink-primary pb-2 mb-0">
              <TrendingUp size={13} />
              Most Read
            </div>
            {trending.slice(0, 5).map((a, i) => (
              <TrendItem key={a.id} article={a} idx={i} />
            ))}
          </div>

        </div>
      </section>

      {/* ══ STORY STRIP ═══════════════════════════════════════════════ */}
      {strip.length > 0 && (
        <section className="border-b border-border-subtle py-8">
          <RuleLabel label="Latest Stories" to="/articles" />
          <div className="flex gap-6 overflow-x-auto pb-2">
            {strip.map((a) => (
              <StripCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* ══ FEED + SIDEBAR ════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">

        {/* Feed */}
        <div className="lg:col-span-8">
          <RuleLabel label="More from The Gazette" to="/articles" />
          <div className="divide-y divide-border-subtle">
            {feed.length > 0
              ? feed.map((a) => <FeedRow key={a.id} article={a} />)
              : (
                <p className="text-[12px] font-mono text-ink-secondary py-6">
                  No additional dispatches in this edition.
                </p>
              )
            }
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">

          {/* Newsletter */}
          <div className="border-t-2 border-ink-primary pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-accent-crimson" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-primary">
                Morning Dispatch
              </span>
            </div>
            <p className="text-[13px] font-serif font-bold text-ink-primary leading-snug mb-1">
              The Gazette Daily Briefing
            </p>
            <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">
              Sharp analysis delivered every Tuesday morning. No noise, just the stories that matter.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("You're subscribed to the Morning Dispatch. Welcome!");
                setEmail('');
              }}
              className="space-y-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 text-[12px] border border-border-subtle bg-white text-ink-primary placeholder-slate-400 focus:outline-none focus:border-ink-primary transition-colors"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 bg-ink-primary hover:bg-slate-800 text-white text-[12px] font-semibold tracking-wide transition-colors"
              >
                <Send size={12} />
                Subscribe to Dispatch
              </button>
            </form>
          </div>

          {/* Also Trending */}
          {trending.length > 5 && (
            <div className="border-t-2 border-ink-primary pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={13} className="text-accent-crimson" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-primary">
                  Also Trending
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {trending.slice(5).map((a, i) => (
                  <TrendItem key={a.id} article={a} idx={i + 5} />
                ))}
              </div>
            </div>
          )}

          {/* Explore Sections */}
          <div className="border-t-2 border-ink-primary pt-4">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-ink-primary mb-3">
              Explore Sections
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {EXPLORE_CATS.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="text-[12px] font-mono text-ink-secondary hover:text-accent-crimson transition-colors border-b border-border-subtle pb-1.5"
                >
                  {cat.name} &rarr;
                </Link>
              ))}
            </div>
          </div>

        </aside>
      </section>
    </main>
  );
};
