import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, BookOpen, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Skeleton, ArticleCardSkeleton } from '../components/common/SkeletonLoader';
import type { Article, PaginatedResult } from '../types';

const CAT_LABELS: Record<string, { title: string; tagline: string }> = {
  technology: {
    title: 'Technology',
    tagline: 'Developments, systems, and the machines shaping our digital world.',
  },
  ai: {
    title: 'Artificial Intelligence',
    tagline: 'Machine learning, autonomous reasoning, and the frontier of intelligent computing.',
  },
  'artificial-intelligence': {
    title: 'Artificial Intelligence',
    tagline: 'Machine learning, autonomous reasoning, and the frontier of intelligent computing.',
  },
  cybersecurity: {
    title: 'Cybersecurity',
    tagline: 'Threat intelligence, defense protocols, and cryptography in practice.',
  },
  'editorial-design': {
    title: 'Editorial Design',
    tagline: 'Visual hierarchy, typography, and craftsmanship in digital publishing.',
  },
  'software-architecture': {
    title: 'Software Architecture',
    tagline: 'Distributed systems, zero-buffer continuity, and backend resilience.',
  },
  'media-culture': {
    title: 'Media & Society',
    tagline: 'How information networks shape discourse, sociology, and modern culture.',
  },
  'media-society': {
    title: 'Media & Society',
    tagline: 'How information networks shape discourse, sociology, and modern culture.',
  },
  science: {
    title: 'Science',
    tagline: 'Empirical discovery, mathematical methods, and natural phenomena.',
  },
  governance: {
    title: 'Governance',
    tagline: 'Regulatory dynamics, platform ethics, and technological policy.',
  },
  'policy-governance': {
    title: 'Governance',
    tagline: 'Regulatory dynamics, platform ethics, and technological policy.',
  },
  news: {
    title: 'News & Wire',
    tagline: 'Global reporting, live despatches, and current affairs.',
  },
  sports: {
    title: 'Sports & Competition',
    tagline: 'Analysis, live coverage, and athletic features.',
  },
  money: {
    title: 'Financial Markets',
    tagline: 'Capital flows, macroeconomic trends, and market analysis.',
  },
  lifestyle: {
    title: 'Culture & Living',
    tagline: 'Perspectives on modern lifestyle, craft, and culture.',
  },
  entertainment: {
    title: 'Arts & Entertainment',
    tagline: 'Film, music, literature, and visual culture.',
  },
  'health-fitness': {
    title: 'Health & Wellness',
    tagline: 'Medical research, fitness science, and longevity.',
  },
  'food-drink': {
    title: 'Gastronomy',
    tagline: 'Culinary traditions, food science, and regional cuisine.',
  },
  travel: {
    title: 'Travel & Dispatches',
    tagline: 'Exploration, field reporting, and destination analysis.',
  },
  autos: {
    title: 'Automotive & Transit',
    tagline: 'Engineering, transit networks, and mobility systems.',
  },
  video: {
    title: 'Video & Media',
    tagline: 'Visual journalism, interviews, and broadcast features.',
  },
};

const cleanTitle = (t: string) => t.replace(/\s\d{10,}/g, '').trim();

const categoryDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  return categoryDateFormatter.format(new Date(iso));
};

/* ─── Lead story card (large, left-aligned) ──── */
const LeadCard: React.FC<{ article: Article }> = ({ article }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link to={`/articles/${article.slug}`} className="group block space-y-3">
      {article.coverImage && !imgErr ? (
        <div className="aspect-[16/10] overflow-hidden bg-slate-900 mb-4 relative">
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          />
          <span className="absolute top-3 left-3 bg-accent-crimson text-white text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1">
            Featured in Section
          </span>
        </div>
      ) : (
        <div className="aspect-[16/10] bg-slate-900 flex items-center justify-center mb-4 p-8">
          <span className="font-editorial text-2xl text-white font-bold text-center leading-snug">
            {cleanTitle(article.title)}
          </span>
        </div>
      )}
      <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-ink-primary leading-tight group-hover:text-accent-crimson transition-colors">
        {cleanTitle(article.title)}
      </h2>
      <p className="text-sm text-ink-secondary leading-relaxed line-clamp-3">
        {article.description || 'An architectural and investigative deep dive from the editorial desk.'}
      </p>
      <div className="flex items-center gap-3 text-xs font-mono text-ink-secondary border-t border-border-subtle pt-3">
        <span className="font-semibold text-ink-primary">
          {(article as any).author?.name || 'The Gazette Staff'}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {article.readingTimeMinutes || 3} min read
        </span>
        <span>·</span>
        <span>{fmtDate(article.publishedAt || article.createdAt)}</span>
      </div>
    </Link>
  );
};

/* ─── Secondary story (compact card in right column) ─── */
const SecondaryCard: React.FC<{ article: Article }> = ({ article }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex items-start gap-4 py-4 border-b border-border-subtle last:border-b-0"
    >
      {article.coverImage && !imgErr ? (
        <div className="shrink-0 w-24 h-16 overflow-hidden bg-slate-900">
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="shrink-0 w-24 h-16 bg-slate-100 flex items-center justify-center">
          <BookOpen size={16} className="text-slate-400" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-editorial text-sm font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug line-clamp-2">
          {cleanTitle(article.title)}
        </h3>
        <p className="text-xs text-ink-secondary line-clamp-1">
          {article.description}
        </p>
        <div className="text-[11px] font-mono text-ink-secondary flex items-center gap-1.5 pt-0.5">
          <Clock size={10} />
          <span>{article.readingTimeMinutes || 3} min</span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
};

/* ─── Feed row (full-width list item) ─── */
const FeedRow: React.FC<{ article: Article; index: number }> = ({ article, index }) => {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex items-start gap-6 py-5 border-b border-border-subtle last:border-b-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded"
    >
      <span className="text-2xl font-editorial font-bold text-accent-crimson/70 font-mono w-8 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-editorial text-base sm:text-lg font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug">
          {cleanTitle(article.title)}
        </h3>
        <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
          {article.description}
        </p>
        <div className="flex items-center gap-2.5 text-[11px] font-mono text-ink-secondary pt-1">
          <Clock size={11} />
          <span>{article.readingTimeMinutes || 3} min read</span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>

      {article.coverImage && !imgErr && (
        <div className="shrink-0 hidden sm:block w-32 aspect-[16/10] overflow-hidden bg-slate-900">
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
    </Link>
  );
};

/* ─── Main CategoryArchivePage ─── */
export const CategoryArchivePage: React.FC = () => {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug
    ? decodeURIComponent(rawSlug)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    : '';

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['categoryArchive', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', categorySlug: slug, limit: 24, sort: 'latest' },
      });
      return data;
    },
    enabled: Boolean(slug),
  });

  const articles = articlesData?.items || [];
  const catInfo = slug
    ? (CAT_LABELS[slug] ?? {
        title: slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        tagline: `Curated dispatches and architectural analysis filed under this section.`,
      })
    : { title: 'Section', tagline: '' };

  const leadArticle = articles[0];
  const secondaryArticles = articles.slice(1, 4);
  const feedArticles = articles.slice(4);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-sans">
      {/* ── Section Masthead ────────────────────────────── */}
      <div className="border-b-2 border-ink-primary pb-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-crimson mb-1">
              Editorial Department
            </div>
            <h1 className="font-editorial text-3xl sm:text-5xl font-bold text-ink-primary tracking-tight">
              {catInfo.title}
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1.5 max-w-2xl leading-relaxed">
              {catInfo.tagline}
            </p>
          </div>
          <div className="text-xs font-mono text-ink-secondary border border-border-subtle px-3 py-1.5 self-start md:self-auto bg-white">
            {articles.length} {articles.length === 1 ? 'Dispatch' : 'Dispatches'} Published
          </div>
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="w-full h-80 rounded" />
              <Skeleton className="w-2/3 h-8" />
              <Skeleton className="w-full h-4" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              <Skeleton className="w-full h-36 rounded" />
              <Skeleton className="w-full h-36 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border-subtle">
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
          </div>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-20 text-center bg-white border border-border-subtle p-8 space-y-2">
          <p className="font-editorial text-xl font-bold text-ink-primary">
            No published stories in this section yet.
          </p>
          <p className="text-xs text-ink-secondary font-mono">
            Editorial manuscripts in this category are currently in review or preparation.
          </p>
          <div className="pt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-crimson hover:underline"
            >
              <span>Return to Front Page</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* ── Hero Showcase Grid ──────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-border-subtle pb-10">
            {/* Lead Story (7 cols) */}
            {leadArticle && (
              <div className="lg:col-span-7">
                <LeadCard article={leadArticle} />
              </div>
            )}

            {/* Secondary Stories Stack (5 cols) */}
            {secondaryArticles.length > 0 && (
              <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border-subtle lg:pl-8 pt-6 lg:pt-0 space-y-1">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-primary border-b border-border-subtle pb-2 mb-2">
                  Section Highlights
                </div>
                {secondaryArticles.map((a) => (
                  <SecondaryCard key={a.id} article={a} />
                ))}
              </div>
            )}
          </section>

          {/* ── Chronological Feed ──────────────────────── */}
          {feedArticles.length > 0 && (
            <section className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary border-b border-border-subtle pb-2">
                All Archives & Dispatches
              </div>
              <div className="divide-y divide-border-subtle">
                {feedArticles.map((a, idx) => (
                  <FeedRow key={a.id} article={a} index={idx + 4} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
};

