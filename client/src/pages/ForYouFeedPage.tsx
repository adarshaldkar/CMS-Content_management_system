import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  Flame,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Clock,
  BookOpen,
  ArrowRight,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult, User } from '../types';

const cleanTitle = (t: string) => t.replace(/\s\d{10,}/g, '').trim();

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
};

const CAT_LABELS: Record<string, string> = {
  technology: 'Technology',
  ai: 'Artificial Intelligence',
  cybersecurity: 'Cybersecurity',
  'editorial-design': 'Editorial Design',
  'software-architecture': 'Software Architecture',
  'media-culture': 'Media & Society',
  science: 'Science',
  'policy-governance': 'Governance',
};

/* ─── Recommended Author Card with Interactive Follow ─── */
const AuthorFollowRow: React.FC<{
  targetUser: User;
  currentUserId?: string;
}> = ({ targetUser, currentUserId }) => {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // Fetch follow status for this target user
  const { data: followStats } = useQuery({
    queryKey: ['userStats', targetUser.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ userId: string; followersCount: number; followingCount: number }>(
        `/users/${targetUser.id}/stats`,
      );
      return data;
    },
    enabled: Boolean(targetUser.id),
  });

  const { data: followingData } = useQuery({
    queryKey: ['myFollowing', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return { items: [] };
      const { data } = await apiClient.get<PaginatedResult<{ targetId: string }>>(`/users/${currentUserId}/following`);
      return data;
    },
    enabled: Boolean(currentUserId),
  });

  const isFollowing = followingData?.items?.some((f) => f.targetId === targetUser.id) ?? false;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await apiClient.delete(`/users/${targetUser.id}/follow`);
      } else {
        await apiClient.post(`/users/${targetUser.id}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['userStats', targetUser.id] });
      queryClient.invalidateQueries({ queryKey: ['userStats', currentUserId] });
    },
  });

  if (targetUser.id === currentUserId) return null;

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-editorial font-bold text-xs uppercase shrink-0 overflow-hidden border border-border-subtle">
          {targetUser.avatarUrl ? (
            <img
              src={targetUser.avatarUrl}
              alt={targetUser.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            targetUser.name.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-editorial font-bold text-ink-primary truncate">
            {targetUser.name}
          </p>
          <p className="text-[10px] font-mono text-ink-secondary truncate">
            {targetUser.role.replace('_', ' ')} · {followStats?.followersCount || 0} followers
          </p>
        </div>
      </div>

      <button
        onClick={() => followMutation.mutate()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={followMutation.isPending}
        className={`px-3 py-1 text-[11px] font-mono font-medium rounded transition-all duration-200 shrink-0 flex items-center gap-1 ${
          isFollowing
            ? isHovered
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-slate-900 text-white border border-slate-900'
            : 'bg-white text-ink-primary border border-border-subtle hover:border-ink-primary hover:bg-slate-50'
        }`}
      >
        {isFollowing ? (
          isHovered ? (
            'Unfollow'
          ) : (
            <>
              <Check size={11} />
              <span>Following</span>
            </>
          )
        ) : (
          <>
            <UserPlus size={11} />
            <span>Follow</span>
          </>
        )}
      </button>
    </div>
  );
};

/* ─── Editorial Feed Story Card ─── */
const FeedArticleRow: React.FC<{ article: Article }> = ({ article }) => {
  const [imgErr, setImgErr] = useState(false);
  const categoryName = article.categorySlug
    ? CAT_LABELS[article.categorySlug] || article.categorySlug.replace(/-/g, ' ')
    : 'Technology';

  return (
    <article className="group grid grid-cols-1 sm:grid-cols-12 gap-6 py-6 border-b border-border-subtle items-start">
      {/* Content */}
      <div className="sm:col-span-8 space-y-2 min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold text-accent-crimson">
          <Link
            to={article.categorySlug ? `/category/${article.categorySlug}` : '/articles'}
            className="hover:underline"
          >
            {categoryName}
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-ink-secondary font-normal flex items-center gap-1">
            <Clock size={10} />
            {article.readingTimeMinutes || 3} min read
          </span>
        </div>

        <Link to={`/articles/${article.slug}`}>
          <h2 className="font-editorial text-lg sm:text-xl font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug">
            {cleanTitle(article.title)}
          </h2>
        </Link>

        <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed font-sans">
          {article.description || 'In-depth investigative review and analysis from the editorial desk.'}
        </p>

        <div className="flex items-center gap-2.5 text-[11px] font-mono text-ink-secondary pt-1">
          <span className="font-semibold text-ink-primary">
            {(article as any).author?.name || 'The Gazette Staff'}
          </span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>

      {/* Cover Image Thumbnail */}
      <div className="sm:col-span-4 aspect-[16/10] overflow-hidden bg-slate-900 rounded-sm">
        {article.coverImage && !imgErr ? (
          <img
            src={article.coverImage}
            alt={cleanTitle(article.title)}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center p-4">
            <span className="font-editorial text-xs text-white/50 text-center line-clamp-3">
              {cleanTitle(article.title)}
            </span>
          </div>
        )}
      </div>
    </article>
  );
};

export const ForYouFeedPage: React.FC = () => {
  const { user } = useAuthStore();

  const userTopics = user?.preferredTopics && user.preferredTopics.length > 0
    ? user.preferredTopics
    : ['technology', 'ai', 'cybersecurity', 'editorial-design'];

  // 1. Fetch articles
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['forYouFeed', userTopics.join(',')],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 20, sort: 'latest' },
      });
      return data;
    },
  });

  // 2. Fetch recommended active authors
  const { data: authorsData } = useQuery({
    queryKey: ['recommendedAuthors'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<User>>('/users', {
        params: { limit: 6 },
      });
      return data;
    },
  });

  const articles = articlesData?.items || [];
  const authors = (authorsData?.items || []).filter((a) => a.id !== user?.id).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* ── Editorial Masthead Header ──────────────────── */}
      <div className="border-b-2 border-ink-primary pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-accent-crimson font-bold mb-1">
            <Flame size={14} />
            <span>Personalized Dispatch Stream</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-ink-primary">
            For You
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-ink-secondary">Curated for your followed topics:</span>
            {userTopics.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-0.5 bg-slate-100 border border-border-subtle rounded text-[11px] font-mono text-ink-primary uppercase tracking-wider font-semibold"
              >
                {CAT_LABELS[topic] || topic}
              </span>
            ))}
          </div>
        </div>

        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-border-subtle hover:border-ink-primary text-ink-primary rounded text-xs font-mono font-semibold transition-colors self-start md:self-auto shadow-sm"
        >
          <Sparkles size={13} className="text-accent-crimson" />
          <span>Customize Topics</span>
        </Link>
      </div>

      {/* ── Main Content Grid (8 cols Feed + 4 cols Sidebar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Stream of Stories */}
        <div className="lg:col-span-8">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-primary border-b border-border-subtle pb-2 mb-2">
            Latest Publications & Dispatches
          </div>

          {isLoading ? (
            <div className="py-24 text-center">
              <LoadingSpinner label="Curating your personal reading feed..." />
            </div>
          ) : articles.length > 0 ? (
            <div>
              {articles.map((article) => (
                <FeedArticleRow key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-border-subtle rounded-xl space-y-3">
              <Compass size={28} className="mx-auto text-ink-secondary" />
              <p className="font-editorial text-lg font-bold text-ink-primary">
                No matching stories in this cycle
              </p>
              <p className="text-xs text-ink-secondary font-mono">
                Explore the public front page or adjust your topic preferences.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Recommended Authors & Sections */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Recommended Authors */}
          <div className="bg-white border border-border-subtle rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-primary font-bold">
                <Users size={14} className="text-accent-crimson" />
                <span>Featured Journalists</span>
              </div>
              <span className="text-[10px] font-mono text-ink-secondary">Network</span>
            </div>

            {authors.length > 0 ? (
              <div className="divide-y divide-border-subtle">
                {authors.map((author) => (
                  <AuthorFollowRow
                    key={author.id}
                    targetUser={author}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-ink-secondary py-3 text-center">
                All network authors connected.
              </p>
            )}
          </div>

          {/* Explore Sections Card */}
          <div className="bg-white border border-border-subtle rounded-lg p-5 shadow-sm space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-ink-primary font-bold pb-2 border-b border-border-subtle">
              Explore Editorial Sections
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CAT_LABELS).map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/category/${slug}`}
                  className="text-xs font-mono text-ink-secondary hover:text-accent-crimson transition-colors border-b border-border-subtle/60 pb-1.5 flex items-center justify-between group"
                >
                  <span className="truncate">{name}</span>
                  <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

