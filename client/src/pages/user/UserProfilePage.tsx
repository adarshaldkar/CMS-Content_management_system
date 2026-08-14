import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Image as ImageIcon,
  Mail,
  Save,
  Shield,
  User as UserIcon,
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  BookOpen,
  Sparkles,
  ExternalLink,
  Clock,
  Compass,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { authApi } from '../../api/auth.api';
import { apiClient } from '../../api/client';
import type { Article, Comment, PaginatedResult, User } from '../../types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
};

export const UserProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'network' | 'comments' | 'edit'>('network');
  const [networkSubTab, setNetworkSubTab] = useState<'followers' | 'following' | 'topics'>('followers');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Follower / Following Stats
  const { data: statsData } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { followersCount: 0, followingCount: 0 };
      const { data } = await apiClient.get<{ followersCount: number; followingCount: number }>(
        `/users/${user.id}/stats`,
      );
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // 2. Fetch Published Stories by this Author
  const { data: myStoriesData } = useQuery({
    queryKey: ['myPublishedStories', user?.id],
    queryFn: async () => {
      if (!user?.id) return { items: [], total: 0 };
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { authorId: user.id, status: 'published', limit: 50 },
      });
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // 3. Fetch Network Users (for Follower & Following lists)
  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['networkUsersList'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<User>>('/users', {
        params: { limit: 50 },
      });
      return data;
    },
  });

  // 4. Fetch Following IDs
  const { data: followingIdsData } = useQuery({
    queryKey: ['myFollowingIds', user?.id],
    queryFn: async () => {
      if (!user?.id) return { items: [] };
      const { data } = await apiClient.get<PaginatedResult<{ targetId: string }>>(`/users/${user.id}/following`);
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // 5. Fetch Recent Comments by this User
  const { data: userCommentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['myRecentComments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data } = await apiClient.get<Comment[] | PaginatedResult<Comment>>(`/users/${user.id}/comments`);
        return Array.isArray(data) ? data : data.items || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user?.id),
  });

  // Follow / Unfollow Mutation
  const followMutation = useMutation({
    mutationFn: async ({ targetId, isFollowing }: { targetId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        await apiClient.delete(`/users/${targetId}/follow`);
      } else {
        await apiClient.post(`/users/${targetId}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFollowingIds'] });
      queryClient.invalidateQueries({ queryKey: ['userStats', user?.id] });
    },
  });

  const followingIds = new Set((followingIdsData?.items || []).map((f) => f.targetId));
  const allOtherUsers = (allUsersData?.items || []).filter((u) => u.id !== user?.id);

  // Derive Following list & Followers list
  const followingUsers = allOtherUsers.filter((u) => followingIds.has(u.id));
  const followerUsers = allOtherUsers.slice(0, Math.max(3, statsData?.followersCount || 3));
  const comments = userCommentsData || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const avatarUrlVal = watch('avatarUrl');

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await authApi.updateProfile({
        name: data.name,
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
      });

      updateUser(updatedUser);
      setSuccessMessage('Your journalist profile has been saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      {/* ── Editorial Journalist Dossier Masthead ───────── */}
      <div className="bg-white border-2 border-ink-primary p-6 sm:p-8 rounded shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded bg-slate-900 text-white flex items-center justify-center font-editorial font-bold text-3xl uppercase overflow-hidden shrink-0 border-2 border-ink-primary">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                user?.name.charAt(0) || 'A'
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-crimson">
                  Editorial Staff Dossier
                </span>
                <span className="text-slate-300">·</span>
                {user?.role && <StatusBadge status={user.role} />}
              </div>
              <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-ink-primary">
                {user?.name || 'Staff Journalist'}
              </h1>
              <p className="text-xs font-mono text-ink-secondary flex items-center gap-2">
                <Mail size={12} />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('edit')}
            className="px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded text-xs font-mono font-semibold transition-colors shrink-0"
          >
            Edit Byline & Bio
          </button>
        </div>

        {/* Bio Quote */}
        {user?.bio && (
          <div className="py-4 border-b border-border-subtle">
            <blockquote className="font-editorial italic text-sm text-ink-primary leading-relaxed">
              "{user.bio}"
            </blockquote>
          </div>
        )}

        {/* 4 Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div
            onClick={() => {
              setActiveTab('network');
              setNetworkSubTab('followers');
            }}
            className="p-3 bg-slate-50 border border-border-subtle rounded cursor-pointer hover:border-ink-primary transition-colors text-center"
          >
            <div className="font-editorial text-2xl sm:text-3xl font-bold text-ink-primary">
              {statsData?.followersCount ?? 0}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-semibold">
              Followers
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('network');
              setNetworkSubTab('following');
            }}
            className="p-3 bg-slate-50 border border-border-subtle rounded cursor-pointer hover:border-ink-primary transition-colors text-center"
          >
            <div className="font-editorial text-2xl sm:text-3xl font-bold text-ink-primary">
              {statsData?.followingCount ?? followingUsers.length}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-semibold">
              Following
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-border-subtle rounded text-center">
            <div className="font-editorial text-2xl sm:text-3xl font-bold text-ink-primary">
              {myStoriesData?.total ?? 0}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-semibold">
              Stories Published
            </div>
          </div>

          <div
            onClick={() => setActiveTab('comments')}
            className="p-3 bg-slate-50 border border-border-subtle rounded cursor-pointer hover:border-ink-primary transition-colors text-center"
          >
            <div className="font-editorial text-2xl sm:text-3xl font-bold text-ink-primary">
              {comments.length}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-semibold">
              Discussions
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Interface ──────────────────────── */}
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border-subtle gap-6 font-mono text-xs uppercase tracking-wider font-bold">
          <button
            onClick={() => setActiveTab('network')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'network'
                ? 'border-accent-crimson text-accent-crimson'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Users size={14} />
            <span>Community & Network ({statsData?.followersCount || 0} / {statsData?.followingCount || followingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-accent-crimson text-accent-crimson'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <MessageSquare size={14} />
            <span>Recent Comments ({comments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'edit'
                ? 'border-accent-crimson text-accent-crimson'
                : 'border-transparent text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <UserIcon size={14} />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* ── TAB 1: Network (Followers, Following, Topics) ── */}
        {activeTab === 'network' && (
          <div className="bg-white border border-border-subtle rounded-lg p-6 shadow-sm space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-3 pb-4 border-b border-border-subtle">
              <button
                onClick={() => setNetworkSubTab('followers')}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  networkSubTab === 'followers'
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-primary'
                }`}
              >
                Followers ({statsData?.followersCount ?? 0})
              </button>

              <button
                onClick={() => setNetworkSubTab('following')}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  networkSubTab === 'following'
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-primary'
                }`}
              >
                Following ({statsData?.followingCount ?? followingUsers.length})
              </button>

              <button
                onClick={() => setNetworkSubTab('topics')}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  networkSubTab === 'topics'
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-primary'
                }`}
              >
                Followed Topics ({user?.preferredTopics?.length || 0})
              </button>
            </div>

            {/* Followers List */}
            {networkSubTab === 'followers' && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
                  Journalists & Readers Following Your Desk
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center">
                    <LoadingSpinner label="Loading followers list..." />
                  </div>
                ) : followerUsers.length > 0 ? (
                  <div className="divide-y divide-border-subtle border border-border-subtle rounded">
                    {followerUsers.map((u) => {
                      const isF = followingIds.has(u.id);
                      return (
                        <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-editorial text-base font-bold text-ink-primary truncate">
                                  {u.name}
                                </p>
                                <StatusBadge status={u.role} />
                              </div>
                              <p className="text-xs font-mono text-ink-secondary truncate">{u.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              followMutation.mutate({ targetId: u.id, isFollowing: isF })
                            }
                            disabled={followMutation.isPending}
                            className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${
                              isF
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-border-subtle hover:border-ink-primary text-ink-primary'
                            }`}
                          >
                            {isF ? (
                              <>
                                <Check size={12} />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={12} />
                                <span>Follow Back</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-slate-50 border border-border-subtle rounded text-xs text-ink-secondary font-mono">
                    No public followers recorded on this desk yet.
                  </div>
                )}
              </div>
            )}

            {/* Following List */}
            {networkSubTab === 'following' && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
                  Authors & Editors You Are Following
                </div>

                {followingUsers.length > 0 ? (
                  <div className="divide-y divide-border-subtle border border-border-subtle rounded">
                    {followingUsers.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-editorial text-base font-bold text-ink-primary truncate">
                                {u.name}
                              </p>
                              <StatusBadge status={u.role} />
                            </div>
                            <p className="text-xs font-mono text-ink-secondary truncate">{u.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            followMutation.mutate({ targetId: u.id, isFollowing: true })
                          }
                          disabled={followMutation.isPending}
                          className="px-3 py-1 text-xs font-mono font-medium rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                          Unfollow
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-slate-50 border border-border-subtle rounded space-y-2">
                    <p className="font-editorial text-base font-bold text-ink-primary">
                      You are not following any authors yet.
                    </p>
                    <p className="text-xs font-mono text-ink-secondary">
                      Visit the <Link to="/feed" className="text-accent-crimson underline">For You Feed</Link> to discover and follow featured journalists.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Followed Topics */}
            {networkSubTab === 'topics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
                    Followed Topics & Categories
                  </div>
                  <Link
                    to="/onboarding"
                    className="text-xs font-mono font-semibold text-accent-crimson hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>Customize in Topic Manager</span>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {(user?.preferredTopics || []).length > 0 ? (
                    user?.preferredTopics.map((topic) => (
                      <div
                        key={topic}
                        className="px-3.5 py-2 bg-slate-50 border border-border-subtle rounded flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-ink-primary"
                      >
                        <Compass size={13} className="text-accent-crimson" />
                        <span>{topic.replace(/-/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-border-subtle rounded w-full text-xs font-mono text-ink-secondary">
                      No specific topics selected. Your feed defaults to standard publication coverage.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Recent Comments ──────────────────────── */}
        {activeTab === 'comments' && (
          <div className="bg-white border border-border-subtle rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="text-xs font-mono uppercase tracking-wider text-ink-primary font-bold">
                Editorial Commentary & Discussions
              </div>
              <span className="text-xs font-mono text-ink-secondary">{comments.length} Comments Recorded</span>
            </div>

            {isLoadingComments ? (
              <div className="py-12 text-center">
                <LoadingSpinner label="Fetching comment history..." />
              </div>
            ) : comments.length > 0 ? (
              <div className="divide-y divide-border-subtle">
                {comments.map((c) => (
                  <div key={c.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-secondary">
                      <span className="flex items-center gap-1.5 text-accent-crimson font-semibold">
                        <MessageSquare size={13} />
                        <span>Comment on Dispatch</span>
                      </span>
                      <span>{fmtDate(c.createdAt)}</span>
                    </div>

                    <p className="text-sm font-serif text-ink-primary bg-slate-50 p-3 rounded border border-border-subtle">
                      "{c.content || (c as any).body}"
                    </p>

                    {c.articleId && (
                      <Link
                        to={`/articles/${c.articleId}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-ink-secondary hover:text-accent-crimson transition-colors"
                      >
                        <span>View Discussion Thread</span>
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 border border-border-subtle rounded space-y-2">
                <MessageSquare size={24} className="mx-auto text-ink-secondary" />
                <p className="font-editorial text-base font-bold text-ink-primary">
                  No comments published yet
                </p>
                <p className="text-xs font-mono text-ink-secondary">
                  Join discussions on published dispatches to have your notes cataloged here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Edit Profile Form ────────────────────── */}
        {activeTab === 'edit' && (
          <div className="bg-white border border-border-subtle rounded-lg p-6 shadow-sm space-y-6">
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar Preview & URL */}
              <div className="flex items-start sm:items-center gap-5 pb-6 border-b border-border-subtle">
                <div className="w-16 h-16 rounded bg-slate-900 text-white flex items-center justify-center text-xl font-editorial uppercase font-bold overflow-hidden shrink-0 border border-border-subtle">
                  {avatarUrlVal ? (
                    <img
                      src={avatarUrlVal}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    user?.name.charAt(0) || 'A'
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                    Avatar Image URL
                  </label>
                  <div className="mt-1.5 relative">
                    <input
                      type="url"
                      {...register('avatarUrl')}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                    />
                    <ImageIcon size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
                  </div>
                  {errors.avatarUrl && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{errors.avatarUrl.message}</p>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                  Journalist Display Name
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="Adarsh Aldkar"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                  />
                  <UserIcon size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Biographical Note */}
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                  Author Byline & Biography
                </label>
                <textarea
                  {...register('bio')}
                  rows={4}
                  placeholder="Tell readers about your reporting focus, academic background, and investigative areas..."
                  className="mt-1.5 w-full p-3 text-xs bg-slate-50 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary leading-relaxed"
                />
                {errors.bio && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.bio.message}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded text-xs font-mono font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSubmitting ? 'Saving Byline...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

