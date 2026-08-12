import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Compass,
  Flame,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const ForYouFeedPage: React.FC = () => {
  const { user } = useAuthStore();

  const userTopics = user?.preferredTopics || ['technology', 'ai', 'cybersecurity'];

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['forYouFeed', userTopics.join(',')],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 20, sort: 'latest' },
      });
      return data;
    },
  });

  const articles = articlesData?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-border-subtle pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-600 font-semibold mb-1">
            <Flame size={15} />
            <span>Personalized For You</span>
          </div>
          <h1 className="text-3xl font-editorial font-bold text-ink-primary">
            Curated Publication Stream
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Stories selected based on your verified reading topics:{' '}
            <span className="font-mono text-ink-primary font-medium">
              {userTopics.join(', ')}
            </span>
          </p>
        </div>

        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
        >
          <Sparkles size={13} className="text-accent-crimson" />
          <span>Edit Preferences</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Stream of Stories (8 cols) */}
        <div className="lg:col-span-8 space-y-4 divide-y divide-border-subtle">
          {isLoading ? (
            <div className="py-20 text-center">
              <LoadingSpinner label="Curating your personal feed..." />
            </div>
          ) : articles.length > 0 ? (
            articles.map((article) => (
              <article key={article.id} className="pt-6 first:pt-0 space-y-2 group">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-semibold">
                  <span>{article.categorySlug || 'Technology'}</span>
                  <span>·</span>
                  <span className="text-ink-secondary">{article.readingTimeMinutes || 3} min read</span>
                </div>

                <Link to={`/articles/${article.slug}`}>
                  <h2 className="text-xl font-editorial font-bold text-ink-primary group-hover:text-accent-crimson transition-colors leading-snug">
                    {article.title}
                  </h2>
                </Link>

                <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                  {article.description}
                </p>

                <div className="flex items-center gap-2 text-[11px] font-mono text-ink-secondary pt-1">
                  <span>By {article.authorName || 'The Gazette Staff'}</span>
                  <span>·</span>
                  <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="p-12 text-center bg-white border border-border-subtle rounded-xl">
              <Compass size={24} className="mx-auto text-ink-secondary mb-2" />
              <p className="text-xs font-semibold text-ink-primary">No matching stories found</p>
              <p className="text-xs text-ink-secondary mt-1">
                Explore the public front page or adjust your topic preferences.
              </p>
            </div>
          )}
        </div>

        {/* Recommended Authors Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-primary font-bold pb-2 border-b border-border-subtle">
              <Users size={14} className="text-accent-crimson" />
              <span>Recommended Authors</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    A
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary">Adarsh Aldkar</p>
                    <p className="text-[10px] text-ink-secondary">Systems Architecture</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded text-[11px] font-medium transition-colors">
                  Follow
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                    E
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-primary">Eleanor Vance</p>
                    <p className="text-[10px] text-ink-secondary">Editorial Design</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded text-[11px] font-medium transition-colors">
                  Follow
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
