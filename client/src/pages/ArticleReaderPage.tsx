import React, { useState, useEffect } from 'react';
import { sanitizeHtml } from '../utils/sanitize';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  Check,
  Clock,
  Copy,
  CornerDownRight,
  Flag,
  Heart,
  Linkedin,
  Mail,
  MessageSquare,
  Reply,
  Send,
  Share2,
  Trash2,
  Twitter,
  UserPlus,
  UserCheck,
  X,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ArticleReaderSkeleton } from '../components/common/SkeletonLoader';
import { ReadingPaywallGate } from '../components/articles/ReadingPaywallGate';
import { ReadingProgressBar } from '../components/articles/ReadingProgressBar';
import {
  ReaderPreferencesMenu,
  getStoredReaderPrefs,
  type ReaderPreferences,
} from '../components/articles/ReaderPreferencesMenu';
import { ArticleTableOfContents } from '../components/articles/ArticleTableOfContents';
import type { Article } from '../types';

const DataJournalismCanvas = React.lazy(() =>
  import('../components/canvas/DataJournalismCanvas').then((m) => ({
    default: m.DataJournalismCanvas,
  }))
);

interface CommentItem {
  id: string;
  articleId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  body?: string;
  content?: string; // fallback
  status?: string;
  createdAt: string;
}

export const ArticleReaderPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasBookmarked, setHasBookmarked] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Timed Paywall Lock State for Unauthenticated Guests
  const [isPaywallLocked, setIsPaywallLocked] = useState(false);
  const [coverImgErr, setCoverImgErr] = useState(false);
  const [readerPrefs, setReaderPrefs] = useState<ReaderPreferences>(getStoredReaderPrefs);

  useEffect(() => {
    if (isAuthenticated) {
      setIsPaywallLocked(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsPaywallLocked(true);
    }, 7000); // 7-second complimentary preview

    return () => clearTimeout(timer);
  }, [isAuthenticated, slug]);

  // 1. Fetch Article by Slug
  const { data: article, isLoading } = useQuery({
    queryKey: ['articleReader', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<Article>(`/articles/slug/${slug}`);
      return data;
    },
    enabled: Boolean(slug),
  });

  // Track dynamic reading history
  useEffect(() => {
    if (article?.id && article?.title && article?.slug) {
      try {
        const existing = JSON.parse(localStorage.getItem('gazette_reading_history') || '[]');
        const filtered = existing.filter((item: any) => item.id !== article.id);
        const updated = [
          {
            id: article.id,
            slug: article.slug,
            title: article.title,
            description: article.description,
            categorySlug: article.categorySlug,
            readingTimeMinutes: article.readingTimeMinutes || 3,
            readAt: new Date().toISOString(),
          },
          ...filtered,
        ].slice(0, 50);
        localStorage.setItem('gazette_reading_history', JSON.stringify(updated));
      } catch {}
    }
  }, [article?.id, article?.title, article?.slug, article?.description, article?.categorySlug, article?.readingTimeMinutes]);

  // 2. Fetch Likes Count from real backend
  const { data: likesData } = useQuery({
    queryKey: ['articleLikes', article?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ articleId: string; likesCount: number }>(
        `/articles/${article?.id}/likes/count`,
      );
      return data;
    },
    enabled: Boolean(article?.id),
  });

  const likeCount = likesData?.likesCount ?? 0;

  // 3. Fetch Comments for Article from real backend
  const { data: comments = [] } = useQuery({
    queryKey: ['articleComments', article?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<CommentItem[]>(`/articles/${article?.id}/comments`);
      return data;
    },
    enabled: Boolean(article?.id),
  });

  // 3b. Load the current user's engagement state once, so liked/bookmarked/following
  // buttons reflect reality on first render (not only after a toggle).
  useQuery({
    queryKey: ['articleLikeStatus', article?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ liked: boolean }>(`/articles/${article?.id}/like/status`);
      setHasLiked(data.liked);
      return data;
    },
    enabled: isAuthenticated && Boolean(article?.id),
  });

  useQuery({
    queryKey: ['articleBookmarkStatus', article?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ bookmarked: boolean }>(`/articles/${article?.id}/bookmark/status`);
      setHasBookmarked(data.bookmarked);
      return data;
    },
    enabled: isAuthenticated && Boolean(article?.id),
  });

  useQuery({
    queryKey: ['authorFollowStatus', article?.authorId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ following: boolean }>(`/users/${article?.authorId}/follow/status`);
      setIsFollowingAuthor(data.following);
      return data;
    },
    enabled: isAuthenticated && Boolean(article?.authorId),
  });

  // 4. Like Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ liked: boolean; likesCount: number }>(
        `/articles/${article?.id}/like`,
      );
      return data;
    },
    onSuccess: (res) => {
      setHasLiked(res.liked);
      queryClient.setQueryData(['articleLikes', article?.id], {
        articleId: article?.id,
        likesCount: res.likesCount,
      });
    },
  });

  // 5. Bookmark Mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ bookmarked: boolean; bookmarksCount: number }>(
        `/articles/${article?.id}/bookmark`,
      );
      return data;
    },
    onSuccess: (res) => {
      setHasBookmarked(res.bookmarked);
      queryClient.invalidateQueries({ queryKey: ['myBookmarks'] });
    },
  });

  // 6. Follow Author Mutation
  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (!article?.authorId) return;
      if (isFollowingAuthor) {
        await apiClient.delete(`/users/${article.authorId}/follow`);
        return false;
      } else {
        await apiClient.post(`/users/${article.authorId}/follow`);
        return true;
      }
    },
    onSuccess: (following) => {
      setIsFollowingAuthor(!!following);
      queryClient.invalidateQueries({ queryKey: ['userFollowStats', article?.authorId] });
    },
  });

  // 7. Post Comment / Reply Mutation
  const postCommentMutation = useMutation({
    mutationFn: async ({ bodyText, parentId }: { bodyText: string; parentId?: string | null }) => {
      const { data } = await apiClient.post<CommentItem>(`/articles/${article?.id}/comments`, {
        body: bodyText,
        parentId: parentId || undefined,
      });
      return data;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(['articleComments', article?.id], (old: CommentItem[] = []) => [
        ...old,
        newComment,
      ]);
      setCommentText('');
      setReplyText('');
      setReplyingToId(null);
    },
  });

  // 8. Delete Comment Mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/comments/${commentId}`);
      return commentId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['articleComments', article?.id], (old: CommentItem[] = []) =>
        old.filter((c) => c.id !== deletedId),
      );
    },
  });

  // Scroll Reading Progress Calculation
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const scrollPercent = (totalScroll / windowHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, scrollPercent)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLikeToggle = () => {
    if (!isAuthenticated) {
      alert('Please sign in to like stories and interact with authors.');
      return;
    }
    toggleLikeMutation.mutate();
  };

  const handleBookmarkToggle = () => {
    if (!isAuthenticated) {
      alert('Please sign in to save stories to your personal library.');
      return;
    }
    toggleBookmarkMutation.mutate();
  };

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      alert('Please sign in to follow authors.');
      return;
    }
    toggleFollowMutation.mutate();
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: window.location.href,
        });
        return;
      } catch {
        // Fall back to menu
      }
    }
    setShareDropdownOpen(prev => !prev);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShareDropdownOpen(false);
    }, 2000);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postCommentMutation.mutate({ bodyText: commentText.trim() });
  };

  const handleReplySubmit = (parentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    postCommentMutation.mutate({ bodyText: replyText.trim(), parentId });
  };

  if (isLoading) {
    return <ArticleReaderSkeleton />;
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center font-sans">
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">Story Not Found</h1>
        <p className="text-xs text-ink-secondary mt-2">
          The requested article manuscript is unavailable or has been archived.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block px-4 py-2 bg-ink-primary text-white text-xs font-semibold"
          style={{ borderRadius: 2 }}
        >
          Return to Front Page
        </Link>
      </div>
    );
  }

  const proseTypographyClass =
    readerPrefs.fontFamily === 'newsreader'
      ? 'font-serif'
      : readerPrefs.fontFamily === 'jakarta'
      ? 'font-sans'
      : 'font-mono';

  const proseSizeClass =
    readerPrefs.fontSize === 'small'
      ? 'text-sm sm:text-base leading-relaxed'
      : readerPrefs.fontSize === 'large'
      ? 'text-lg sm:text-xl leading-relaxed'
      : readerPrefs.fontSize === 'xl'
      ? 'text-xl sm:text-2xl leading-relaxed'
      : 'text-base sm:text-lg leading-relaxed';

  const hasToc = React.useMemo(() => {
    if (!article?.content) return false;
    const parser = new DOMParser();
    const doc = parser.parseFromString(article.content, 'text/html');
    const nodes = doc.querySelectorAll('h2, h3');
    let count = 0;
    nodes.forEach((n) => {
      if ((n.textContent?.trim() || '').length > 2) count++;
    });
    return count >= 3;
  }, [article?.content]);

  const containerWidthClass = hasToc
    ? readerPrefs.readingWidth === 'wide'
      ? 'max-w-7xl'
      : 'max-w-6xl'
    : readerPrefs.readingWidth === 'wide'
    ? 'max-w-4xl'
    : 'max-w-3xl';

  return (
    <div className="font-sans text-ink-primary relative bg-canvas-paper min-h-screen">
      {/* 1. Viewport-Pinned Reading Progress Bar (UI Phase 4) */}
      <ReadingProgressBar />

      {/* 2. Timed Paywall Gate for Unauthenticated Guests */}
      <ReadingPaywallGate
        articleTitle={article.title}
        articleSlug={article.slug}
        previewSeconds={7}
      />

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-12 ${containerWidthClass}`}>
        <div className={hasToc ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start' : 'w-full'}>
          {/* Main Article Content Column */}
          <article
            className={`space-y-8 transition-all duration-700 ${
              hasToc ? 'lg:col-span-8' : 'w-full max-w-full mx-auto'
            } ${
              isPaywallLocked && !isAuthenticated
                ? 'filter blur-md select-none pointer-events-none opacity-40 scale-[0.99] max-h-[85vh] overflow-hidden'
                : ''
            }`}
          >
            {/* Category Breadcrumb */}
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary">
              <Link to="/" className="hover:text-ink-primary transition-colors">
                EditorialHub
              </Link>
              <span>/</span>
              <span className="text-accent-crimson font-semibold">
                {article.categorySlug || 'Dispatch'}
              </span>
            </div>

            {/* Article Headline & Excerpt */}
            <header className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-editorial font-semibold text-ink-primary leading-[1.15] tracking-tight">
                {article.title.replace(/\s\d{10,}/g, '')}
              </h1>

              {article.description && (
                <p className="text-lg sm:text-xl text-ink-secondary font-editorial italic leading-relaxed">
                  {article.description}
                </p>
              )}

              {/* Byline & Read Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-b border-border-subtle py-3 text-xs font-mono text-ink-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink-primary text-white flex items-center justify-center font-bold text-xs uppercase font-mono">
                    {article.authorName?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <span className="font-semibold text-ink-primary block font-sans text-xs">
                      {article.authorName || 'Editorial Staff'}
                    </span>
                    <span className="text-[11px] text-ink-secondary">
                      {new Date(article.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{article.readingTimeMinutes || 4} min read</span>
                  </span>
                  <span>·</span>
                  <span>{article.wordCount || 1200} words</span>
                </div>
              </div>
            </header>

            {/* Floating Social & Typography Engagement Bar */}
            <div className="flex items-center justify-between py-2.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                {/* Like Action */}
                <button
                  onClick={handleLikeToggle}
                  disabled={toggleLikeMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors ${
                    hasLiked
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-transparent text-ink-secondary hover:text-ink-primary border-border-subtle'
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  <Heart size={13} className={hasLiked ? 'fill-rose-600 text-rose-600' : ''} />
                  <span className="font-mono text-[11px]">{likeCount}</span>
                </button>

                {/* Bookmark Action */}
                <button
                  onClick={handleBookmarkToggle}
                  disabled={toggleBookmarkMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors ${
                    hasBookmarked
                      ? 'bg-ink-primary text-white border-ink-primary'
                      : 'bg-transparent text-ink-secondary hover:text-ink-primary border-border-subtle'
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  <Bookmark size={13} className={hasBookmarked ? 'fill-current' : ''} />
                  <span>{hasBookmarked ? 'Saved' : 'Save'}</span>
                </button>

                {/* Comments Jump */}
                <a
                  href="#comments"
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-ink-secondary hover:text-ink-primary border border-border-subtle transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  <MessageSquare size={13} />
                  <span className="font-mono text-[11px]">{comments.length}</span>
                </a>
              </div>

              {/* Typography Menu & Share Actions */}
              <div className="flex items-center gap-2">
                {/* Typography Scaler (UI Phase 4) */}
                <ReaderPreferencesMenu
                  preferences={readerPrefs}
                  onPreferencesChange={setReaderPrefs}
                />

                {/* Share Action */}
                <div className="relative">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-ink-secondary hover:text-ink-primary border border-border-subtle transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    <Share2 size={13} />
                    <span>Share</span>
                  </button>

                  {/* Share Dropdown */}
                  {shareDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-white shadow-md border border-border-subtle py-1 z-30 font-sans"
                      style={{ borderRadius: 2 }}
                    >
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors text-left"
                      >
                        {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                      </button>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                      >
                        <Twitter size={13} />
                        <span>Share on X</span>
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                      >
                        <Linkedin size={13} />
                        <span>Share on LinkedIn</span>
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(window.location.href)}`}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                      >
                        <Mail size={13} />
                        <span>Share via Email</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Hero Visual Image with CLS prevention */}
            {article.coverImage && !coverImgErr ? (
              <figure className="my-6 aspect-video overflow-hidden border border-border-subtle bg-slate-100" style={{ borderRadius: 2 }}>
                <img
                  src={article.coverImage}
                  alt={article.title}
                  loading="lazy"
                  decoding="async"
                  onError={() => setCoverImgErr(true)}
                  className="w-full h-full object-cover"
                />
              </figure>
            ) : article.coverImage && coverImgErr ? (
              <div
                className="my-6 w-full aspect-video max-h-[360px] bg-slate-100 border border-border-subtle flex flex-col items-center justify-center p-6 text-center"
                style={{ borderRadius: 2 }}
              >
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                  Cover image unavailable
                </span>
              </div>
            ) : null}

            {/* 4. Sanitized Content Body with Reader Preferences Applied */}
            <div
              className={`prose prose-slate max-w-none w-full space-y-6 pt-4 text-ink-primary ${proseTypographyClass} ${proseSizeClass}`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
            />

            {/* 4b. Special Edition Interactive Data Journalism Canvas (UI Phase 3) */}
            {['software-architecture', 'technology', 'ai', 'science'].includes(article.categorySlug || '') && (
              <React.Suspense
                fallback={
                  <div className="my-8 p-6 bg-canvas-subtle border border-border-subtle text-xs font-mono text-ink-secondary text-center animate-pulse">
                    Loading interactive data matrix graphic...
                  </div>
                }
              >
                <DataJournalismCanvas
                  title={`Interactive System Topology: ${article.title.replace(/\s\d{10,}/g, '')}`}
                  subtitle="Decentralized multi-database mesh consensus, telemetry rollups, and verifiable source relations."
                />
              </React.Suspense>
            )}

            {/* 5. Author Biography Card */}
            <div
              className="bg-white border border-border-subtle p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 my-10"
              style={{ borderRadius: 2 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-ink-primary text-white flex items-center justify-center font-bold text-sm uppercase font-mono shrink-0">
                  {article.authorName?.charAt(0) || 'E'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink-primary font-sans">
                    Written by {article.authorName || 'Editorial Staff'}
                  </h4>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed max-w-md">
                    Editorial contributor covering resilient systems, database architectures, and digital media.
                  </p>
                </div>
              </div>

              {user?.id === article.authorId ? (
                <Link
                  to={`/write/${article.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide bg-white border border-border-subtle hover:border-ink-primary text-ink-primary transition-colors shrink-0 font-mono"
                  style={{ borderRadius: 2 }}
                >
                  <span>Edit Your Story</span>
                </Link>
              ) : article.showAuthorName !== false ? (
                <button
                  onClick={handleFollowToggle}
                  disabled={toggleFollowMutation.isPending}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wide transition-colors shrink-0 ${
                    isFollowingAuthor
                      ? 'bg-slate-200 text-ink-primary'
                      : 'bg-ink-primary text-white hover:bg-slate-800'
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck size={13} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} />
                      <span>Follow Author</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>

            {/* 6. Comments Section */}
            <section id="comments" className="pt-8 border-t border-border-subtle space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-editorial font-semibold text-ink-primary">
                  Discussion ({comments.length})
                </h3>
              </div>

              {/* Comment Composer */}
              {isAuthenticated ? (
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts on this story…"
                    rows={3}
                    className="w-full p-3.5 text-xs bg-white border border-border-subtle focus:outline-none focus:border-ink-primary transition-all font-sans"
                    style={{ borderRadius: 2 }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || postCommentMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-40"
                      style={{ borderRadius: 2 }}
                    >
                      <span>{postCommentMutation.isPending ? 'Posting…' : 'Post Comment'}</span>
                      <Send size={12} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  className="p-5 bg-white border border-border-subtle text-center space-y-2"
                  style={{ borderRadius: 2 }}
                >
                  <p className="text-xs text-ink-secondary">
                    Sign in to join the discussion on this story.
                  </p>
                  <Link
                    to="/login"
                    className="inline-block px-4 py-1.5 bg-ink-primary text-white text-xs font-medium"
                    style={{ borderRadius: 2 }}
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Threaded Comments List */}
              <div className="space-y-4 pt-2">
                {comments.length === 0 ? (
                  <p className="py-6 text-sm text-ink-secondary font-editorial italic">
                    No comments yet. Be the first to share your perspective.
                  </p>
                ) : (
                  (() => {
                    const rootComments = comments.filter((c) => !c.parentId);
                    const getReplies = (parentId: string) =>
                      comments.filter((c) => c.parentId === parentId);

                    return rootComments.map((comment) => {
                      const replies = getReplies(comment.id);
                      const isReplying = replyingToId === comment.id;
                      const canDelete =
                        user?.id === comment.authorId ||
                        Boolean(user?.role && ['admin', 'super_admin', 'editor', 'ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role));

                      return (
                        <div
                          key={comment.id}
                          className="bg-white border border-border-subtle p-4 rounded-sm space-y-3 transition-colors"
                        >
                          {/* Comment Header */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-ink-primary text-white flex items-center justify-center font-bold text-[10px] uppercase font-mono">
                                {comment.authorName?.charAt(0) || 'U'}
                              </div>
                              <span className="font-semibold text-ink-primary font-sans">
                                {comment.authorName}
                              </span>
                              {comment.authorId === article.authorId && (
                                <span className="text-[9px] font-mono uppercase bg-accent-crimson/10 text-accent-crimson px-1.5 py-0.5 rounded font-semibold">
                                  Author
                                </span>
                              )}
                              <span className="text-border-subtle">·</span>
                              <span className="text-[11px] font-mono text-ink-secondary">
                                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete this comment?')) {
                                    deleteCommentMutation.mutate(comment.id);
                                  }
                                }}
                                disabled={deleteCommentMutation.isPending}
                                className="text-ink-secondary hover:text-red-600 transition-colors p-1"
                                title="Delete comment"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>

                          {/* Comment Body */}
                          <p className="text-xs text-ink-primary leading-relaxed pl-8">
                            {comment.body || comment.content}
                          </p>

                          {/* Comment Actions */}
                          <div className="flex items-center gap-4 pl-8 pt-1">
                            {isAuthenticated && (
                              <button
                                onClick={() => {
                                  setReplyingToId(isReplying ? null : comment.id);
                                  setReplyText('');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-ink-secondary hover:text-ink-primary transition-colors"
                              >
                                <Reply size={11} />
                                <span>{isReplying ? 'Cancel' : 'Reply'}</span>
                              </button>
                            )}
                          </div>

                          {/* Inline Reply Composer */}
                          {isReplying && (
                            <form
                              onSubmit={(e) => handleReplySubmit(comment.id, e)}
                              className="ml-8 mt-2 space-y-2 border-l-2 border-accent-crimson pl-3 py-1"
                            >
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Replying to ${comment.authorName}…`}
                                rows={2}
                                autoFocus
                                className="w-full p-2.5 text-xs bg-slate-50 border border-border-subtle focus:outline-none focus:border-ink-primary font-sans rounded-sm"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyingToId(null)}
                                  className="px-3 py-1 text-xs text-ink-secondary hover:text-ink-primary font-mono"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={!replyText.trim() || postCommentMutation.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold font-mono rounded-sm disabled:opacity-40"
                                >
                                  <span>{postCommentMutation.isPending ? 'Sending…' : 'Send Reply'}</span>
                                  <Send size={10} />
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Nested Replies List */}
                          {replies.length > 0 && (
                            <div className="ml-8 mt-3 space-y-3 border-l-2 border-border-subtle pl-4 pt-1">
                              {replies.map((reply) => {
                                const canDeleteReply =
                                  user?.id === reply.authorId ||
                                  Boolean(user?.role && ['admin', 'super_admin', 'editor', 'ADMIN', 'SUPER_ADMIN', 'EDITOR'].includes(user.role));

                                return (
                                  <div key={reply.id} className="space-y-1.5 py-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 text-ink-primary flex items-center justify-center font-bold text-[9px] uppercase font-mono">
                                          {reply.authorName?.charAt(0) || 'U'}
                                        </div>
                                        <span className="font-semibold text-ink-primary font-sans text-xs">
                                          {reply.authorName}
                                        </span>
                                        {reply.authorId === article.authorId && (
                                          <span className="text-[9px] font-mono uppercase bg-accent-crimson/10 text-accent-crimson px-1.5 py-0.5 rounded font-semibold">
                                            Author
                                          </span>
                                        )}
                                        <span className="text-border-subtle">·</span>
                                        <span className="text-[10px] font-mono text-ink-secondary">
                                          {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      </div>

                                      {canDeleteReply && (
                                        <button
                                          onClick={() => {
                                            if (confirm('Delete this reply?')) {
                                              deleteCommentMutation.mutate(reply.id);
                                            }
                                          }}
                                          disabled={deleteCommentMutation.isPending}
                                          className="text-ink-secondary hover:text-red-600 transition-colors p-1"
                                          title="Delete reply"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-xs text-ink-primary leading-relaxed pl-7">
                                      {reply.body || reply.content}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </section>
          </article>

          {/* Sticky Table of Contents Sidebar (UI Phase 4) */}
          {hasToc && (
            <aside className="hidden lg:block lg:col-span-4 sticky top-24">
              <ArticleTableOfContents htmlContent={article.content} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
