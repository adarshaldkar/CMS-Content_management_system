import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  Check,
  Clock,
  Copy,
  Heart,
  Linkedin,
  Mail,
  MessageSquare,
  Send,
  Share2,
  Twitter,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, Comment } from '../types';

export const ArticleReaderPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);
  const [hasBookmarked, setHasBookmarked] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [commentText, setCommentText] = useState('');

  // 1. Fetch Article by Slug
  const { data: article, isLoading } = useQuery({
    queryKey: ['articleReader', slug],
    queryFn: async () => {
      const { data } = await apiClient.get<Article>(`/articles/slug/${slug}`);
      return data;
    },
    enabled: Boolean(slug),
  });

  // 2. Fetch Comments for Article
  const { data: comments = [] } = useQuery({
    queryKey: ['articleComments', article?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<Comment[]>(`/articles/${article?.id}/comments`);
      return data;
    },
    enabled: Boolean(article?.id),
  });

  // 3. Post Comment Mutation
  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post<Comment>(`/articles/${article?.id}/comments`, {
        content,
      });
      return data;
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(['articleComments', article?.id], (old: Comment[] = []) => [
        newComment,
        ...old,
      ]);
      setCommentText('');
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

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to like stories and interact with authors.');
      return;
    }

    if (hasLiked) {
      setHasLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setHasLiked(true);
      setLikeCount((prev) => prev + 1);
      try {
        await apiClient.post(`/articles/${article?.id}/like`);
      } catch {
        // Safe fallback
      }
    }
  };

  const handleBookmarkToggle = () => {
    setHasBookmarked(!hasBookmarked);
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
        // Fall back to menu if user cancelled
      }
    }
    setShareDropdownOpen(!shareDropdownOpen);
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
    postCommentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-24 text-center">
        <LoadingSpinner label="Opening editorial manuscript..." />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">Story Not Found</h1>
        <p className="text-xs text-ink-secondary mt-2">
          The requested article manuscript is unavailable or has been archived.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block px-4 py-2 bg-ink-primary text-white text-xs font-semibold rounded-lg"
        >
          Return to Front Page
        </Link>
      </div>
    );
  }

  return (
    <div className="font-sans text-ink-primary relative">
      {/* 1. Viewport-Pinned Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-accent-crimson z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Category Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono text-ink-secondary uppercase tracking-wider">
          <Link to="/" className="hover:text-ink-primary">
            Home
          </Link>
          <span>/</span>
          <Link to={`/category/${article.categorySlug || 'technology'}`} className="text-accent-crimson font-semibold hover:underline">
            {article.categorySlug || 'Technology'}
          </Link>
        </div>

        {/* Article Headline & Excerpt */}
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-ink-primary leading-tight">
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
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                {article.authorName?.charAt(0) || 'A'}
              </div>
              <div>
                <span className="font-bold text-ink-primary block font-sans text-xs">
                  {article.authorName || 'The Gazette Staff'}
                </span>
                <span className="text-[11px]">
                  Published {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                <span>{article.readingTimeMinutes || 4} min read</span>
              </span>
              <span>·</span>
              <span>{article.wordCount || 1200} words</span>
            </div>
          </div>
        </header>

        {/* 2. Floating Social Engagement Bar */}
        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {/* Like Action */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                hasLiked
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-100 text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Heart size={15} className={hasLiked ? 'fill-rose-600 text-rose-600' : ''} />
              <span>{likeCount}</span>
            </button>

            {/* Bookmark Action */}
            <button
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                hasBookmarked
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <Bookmark size={15} className={hasBookmarked ? 'fill-current' : ''} />
              <span>{hasBookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {/* Comments Jump */}
            <a
              href="#comments"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <MessageSquare size={15} />
              <span>{comments.length}</span>
            </a>
          </div>

          {/* Share Action */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <Share2 size={15} />
              <span>Share</span>
            </button>

            {/* Share Dropdown */}
            {shareDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-border-subtle py-1.5 z-30 animate-in fade-in">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors text-left"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                >
                  <Twitter size={14} />
                  <span>Share on X</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                >
                  <Linkedin size={14} />
                  <span>Share on LinkedIn</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(window.location.href)}`}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-primary hover:bg-slate-50 transition-colors"
                >
                  <Mail size={14} />
                  <span>Share via Email</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 3. Hero Visual Image */}
        {article.coverImage && (
          <figure className="my-6">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full rounded-xl object-cover max-h-[460px] border border-border-subtle"
            />
            <figcaption className="text-center text-[11px] font-mono text-ink-secondary mt-2 italic">
              Editorial visual reference · The Gazette Archives
            </figcaption>
          </figure>
        )}

        {/* 4. Sanitized Content Body */}
        <div
          className="prose prose-slate max-w-none text-base sm:text-lg leading-relaxed font-sans text-ink-primary space-y-6 pt-4"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* 5. Author Biography Card */}
        <div className="bg-slate-50 border border-border-subtle rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 my-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg uppercase font-mono shrink-0">
              {article.authorName?.charAt(0) || 'A'}
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink-primary font-sans">
                Written by {article.authorName || 'Adarsh Aldkar'}
              </h4>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed max-w-md">
                Editorial contributor covering decentralized systems, database architectures, and digital media resilience.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsFollowingAuthor(!isFollowingAuthor)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors shrink-0 ${
              isFollowingAuthor
                ? 'bg-slate-200 text-ink-primary'
                : 'bg-ink-primary text-white hover:bg-slate-800'
            }`}
          >
            {isFollowingAuthor ? (
              <>
                <UserCheck size={14} />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Follow Author</span>
              </>
            )}
          </button>
        </div>

        {/* 6. Comments Section */}
        <section id="comments" className="pt-8 border-t border-border-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-editorial font-bold text-ink-primary">
              Reader Discussion ({comments.length})
            </h3>
          </div>

          {/* Comment Composer */}
          {isAuthenticated ? (
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Join the conversation..."
                rows={3}
                className="w-full p-3.5 text-xs bg-white border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || postCommentMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
              >
                <span>Post Comment</span>
                <Send size={13} />
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 border border-border-subtle rounded-xl text-center space-y-2">
              <p className="text-xs text-ink-secondary">
                Sign in to participate in the editorial discussion.
              </p>
              <Link
                to="/login"
                className="inline-block px-4 py-1.5 bg-ink-primary text-white rounded-lg text-xs font-medium"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4 divide-y divide-border-subtle pt-2">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-4 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink-primary">{comment.authorName}</span>
                  <span className="text-[11px] font-mono text-ink-secondary">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-ink-secondary leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
};
