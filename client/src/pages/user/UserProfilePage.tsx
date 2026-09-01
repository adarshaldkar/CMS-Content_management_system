import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Database,
  ExternalLink,
  FileCheck,
  FileEdit,
  FileText,
  FolderTree,
  Heart,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { authApi } from '../../api/auth.api';
import { uploadMediaAsset } from '../../api/media.api';
import { apiClient, fetchHealth } from '../../api/client';
import type { Article, Category, Comment, PaginatedResult, User } from '../../types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const cleanTitle = (t?: string | null) => (t || 'Untitled Dispatch').replace(/\s\d{10,}/g, '').trim();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    'portfolio' | 'drafts' | 'network' | 'topics' | 'comments' | 'edit'
  >('portfolio');
  const [networkSubTab, setNetworkSubTab] = useState<'followers' | 'following'>('followers');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // 2. Fetch Active Database Telemetry
  const { data: health } = useQuery({
    queryKey: ['systemHealthTelemetry'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  const { data: dbStatus } = useQuery({
    queryKey: ['databaseStatusTelemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/database/status');
      return data;
    },
    refetchInterval: 10000,
  });

  // 3. Fetch Published Stories by this Author
  const { data: publishedStoriesData, isLoading: isLoadingPublished } = useQuery({
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

  // 4. Fetch In-Progress Stories (Drafts & Pending Review)
  const { data: draftStoriesData, isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['myDraftStories', user?.id],
    queryFn: async () => {
      if (!user?.id) return { items: [], total: 0 };
      const [draftsRes, pendingRes, rejectedRes] = await Promise.all([
        apiClient.get<PaginatedResult<Article>>('/articles', {
          params: { authorId: user.id, status: 'draft', limit: 20 },
        }),
        apiClient.get<PaginatedResult<Article>>('/articles', {
          params: { authorId: user.id, status: 'pending_review', limit: 20 },
        }),
        apiClient.get<PaginatedResult<Article>>('/articles', {
          params: { authorId: user.id, status: 'rejected', limit: 20 },
        }),
      ]);
      const combined = [
        ...(draftsRes.data.items || []),
        ...(pendingRes.data.items || []),
        ...(rejectedRes.data.items || []),
      ];
      return {
        items: combined,
        total: (draftsRes.data.total || 0) + (pendingRes.data.total || 0) + (rejectedRes.data.total || 0),
      };
    },
    enabled: Boolean(user?.id),
  });

  // 5. Fetch Platform Categories / Beats
  const { data: categoriesData } = useQuery({
    queryKey: ['publicCategories'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Category>>('/categories', {
        params: { limit: 50, status: 'active' },
      });
      return data;
    },
  });

  // 6. Fetch Network Users (for Follower & Following lists)
  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['networkUsersList'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<User>>('/users', {
        params: { limit: 50 },
      });
      return data;
    },
  });

  // 7. Fetch Following IDs
  const { data: followingIdsData } = useQuery({
    queryKey: ['myFollowingIds', user?.id],
    queryFn: async () => {
      if (!user?.id) return { items: [] };
      const { data } = await apiClient.get<PaginatedResult<{ targetId: string }>>(
        `/users/${user.id}/following`,
      );
      return data;
    },
    enabled: Boolean(user?.id),
  });

  // 8. Fetch Followed Topics
  const { data: followedTopicsData } = useQuery({
    queryKey: ['myFollowedTopics'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<any>('/me/following/topics');
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) {
          return data.items.map((item: any) => item.targetId || item.id || item);
        }
        return user?.preferredTopics || [];
      } catch {
        return user?.preferredTopics || [];
      }
    },
    enabled: Boolean(user?.id),
  });

  // 9. Fetch Recent Comments by this User
  const { data: userCommentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ['myRecentComments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data } = await apiClient.get<Comment[] | PaginatedResult<Comment>>(
          `/users/${user.id}/comments`,
        );
        return Array.isArray(data) ? data : data.items || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user?.id),
  });

  // Follow / Unfollow User Mutation
  const followUserMutation = useMutation({
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

  // Follow / Unfollow Topic Mutation
  const followTopicMutation = useMutation({
    mutationFn: async ({ slug, isFollowing }: { slug: string; isFollowing: boolean }) => {
      if (isFollowing) {
        await apiClient.delete(`/categories/${slug}/follow`);
      } else {
        await apiClient.post(`/categories/${slug}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFollowedTopics'] });
    },
  });

  const followingItems = Array.isArray(followingIdsData?.items)
    ? followingIdsData.items
    : Array.isArray(followingIdsData)
    ? (followingIdsData as any[])
    : [];
  const followingIds = new Set(followingItems.map((f: any) => f.targetId || f.id || f));

  const followedTopicsArray = Array.isArray(followedTopicsData)
    ? followedTopicsData
    : (followedTopicsData as any)?.items
    ? (followedTopicsData as any).items.map((item: any) => item.targetId || item)
    : user?.preferredTopics || [];
  const followedTopics = new Set<string>(followedTopicsArray);

  const allOtherUsers = (allUsersData?.items || []).filter((u) => u.id !== user?.id);

  const followingUsers = allOtherUsers.filter((u) => followingIds.has(u.id));
  const followerUsers = allOtherUsers.slice(0, Math.max(3, statsData?.followersCount || 3));
  const comments = userCommentsData || [];
  const publishedStories = publishedStoriesData?.items || [];
  const draftStories = draftStoriesData?.items || [];
  const categories = categoriesData?.items || [];

  const activeDatabase = (
    dbStatus?.activeDatabase ||
    health?.activeDatabase ||
    'postgres'
  ).toUpperCase();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
    },
  });

  // Synchronize form values when user store loads or updates
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        bio: user.bio || '',
      });
    }
  }, [user, reset]);

  // Direct Avatar File Upload Handler
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalUrl = '';
      try {
        const media = await uploadMediaAsset(file);
        if (media?.url) {
          finalUrl = media.url;
        }
      } catch {
        // Fallback to local Data URL representation
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (finalUrl) {
        const updatedUser = await authApi.updateProfile({
          name: user?.name || '',
          bio: user?.bio || '',
          avatarUrl: finalUrl,
        });
        updateUser(updatedUser);
        setSuccessMessage('Profile photo updated and synchronized across all databases.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await authApi.updateProfile({
        name: user?.name || '',
        bio: user?.bio || '',
        avatarUrl: '',
      });
      updateUser(updatedUser);
      setSuccessMessage('Profile photo removed.');
    } catch (err: any) {
      setErrorMessage('Failed to remove profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updatedUser = await authApi.updateProfile({
        name: data.name.trim(),
        bio: (data.bio || '').trim(),
      });

      updateUser(updatedUser);
      setSuccessMessage('Your journalist profile has been saved and synchronized across databases.');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyProfileLink = () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setSuccessMessage('Desk URL copied to clipboard!');
      setTimeout(() => {
        setCopiedLink(false);
      }, 2500);
    } catch (err) {
      setErrorMessage('Could not copy link to clipboard.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-16">
      {/* Invisible Global Avatar File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileUpload}
      />

      {/* ── 1. Editorial Journalist Dossier Masthead ───────── */}
      <div
        className="bg-white border border-border-subtle rounded shadow-xs relative overflow-hidden"
        style={{ borderRadius: 2 }}
      >
        {/* Newspaper Top Rule Header */}
        <div className="h-2 bg-accent-crimson w-full" />

        {/* Masthead Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border-subtle">
            {/* Avatar & Title Group */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {/* Interactive Avatar Container */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded bg-ink-primary text-white flex items-center justify-center font-editorial font-bold text-3xl uppercase overflow-hidden border-2 border-border-subtle shadow-inner relative group cursor-pointer"
                  title="Click to select image from your computer"
                  style={{ borderRadius: 2 }}
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{user?.name.charAt(0) || 'A'}</span>
                  )}

                  {/* Camera Hover Overlay */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                    <Camera size={20} />
                    <span className="text-[9px] font-mono uppercase tracking-wider font-semibold text-center px-1">
                      {isUploadingPhoto ? 'Uploading...' : user?.avatarUrl ? 'Change Photo' : 'Choose File'}
                    </span>
                  </div>
                </div>

                {user?.avatarUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto();
                    }}
                    disabled={isUploadingPhoto}
                    className="text-[10px] font-mono text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors underline cursor-pointer"
                    title="Remove custom profile picture"
                  >
                    <Trash2 size={10} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-accent-crimson">
                    Official Gazette Dossier
                  </span>
                  <span className="text-slate-300">·</span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-mono font-semibold uppercase bg-slate-50 text-ink-primary border-border-subtle"
                    style={{ borderRadius: 2 }}
                  >
                    <ShieldCheck size={11} className="text-accent-crimson" />
                    <span>{user?.role?.replace('_', ' ') || 'AUTHOR'}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-mono font-medium uppercase"
                    style={{ borderRadius: 2 }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active DB: {activeDatabase}</span>
                  </span>
                </div>

                <h1 className="font-editorial text-2xl sm:text-4xl font-semibold text-ink-primary tracking-tight">
                  {user?.name || 'Staff Journalist'}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-ink-secondary">
                  <span className="flex items-center gap-1.5">
                    <Mail size={12} />
                    <span>{user?.email}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Joined {fmtDate(user?.createdAt)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to="/editor"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-mono font-semibold tracking-wide transition-colors"
                style={{ borderRadius: 2 }}
              >
                <Sparkles size={13} />
                <span>Write Story</span>
              </Link>

              <button
                onClick={() => setActiveTab('edit')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-border-subtle hover:border-ink-primary text-ink-primary text-xs font-mono font-semibold transition-colors"
                style={{ borderRadius: 2 }}
              >
                <FileEdit size={13} />
                <span>Edit Bio</span>
              </button>

              <button
                onClick={handleCopyProfileLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary transition-colors text-xs font-mono"
                title="Copy desk profile link"
                style={{ borderRadius: 2 }}
              >
                {copiedLink ? (
                  <>
                    <Check size={13} className="text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    <span>Share Desk</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bio Quote Block */}
          <div className="py-2">
            {user?.bio ? (
              <blockquote className="font-editorial italic text-sm sm:text-base text-ink-primary leading-relaxed border-l-2 border-accent-crimson pl-4 py-1">
                "{user.bio}"
              </blockquote>
            ) : (
              <p className="text-xs font-mono text-ink-secondary italic">
                No biographical statement provided yet. Click "Edit Bio" to add your editorial credentials and beats.
              </p>
            )}
          </div>

          {/* 6 Key Impact Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div
              onClick={() => setActiveTab('portfolio')}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {isLoadingPublished ? '...' : publishedStories.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                Published
              </div>
            </div>

            <div
              onClick={() => setActiveTab('drafts')}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {isLoadingDrafts ? '...' : draftStories.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                In Progress
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab('network');
                setNetworkSubTab('followers');
              }}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {statsData?.followersCount ?? followerUsers.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                Followers
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab('network');
                setNetworkSubTab('following');
              }}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {statsData?.followingCount ?? followingUsers.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                Following
              </div>
            </div>

            <div
              onClick={() => setActiveTab('topics')}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {followedTopics.size}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                Beats Covered
              </div>
            </div>

            <div
              onClick={() => setActiveTab('comments')}
              className="p-3 bg-canvas-paper border border-border-subtle hover:border-ink-primary cursor-pointer transition-colors text-center group"
              style={{ borderRadius: 2 }}
            >
              <div className="text-xl sm:text-2xl font-bold font-mono text-ink-primary group-hover:text-accent-crimson transition-colors">
                {comments.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold mt-0.5">
                Discussions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Tab Navigation Bar ──────────────────────────── */}
      <div className="space-y-6">
        <div className="flex border-b border-border-subtle overflow-x-auto gap-2 sm:gap-6 font-mono text-xs uppercase tracking-wider font-semibold">
          {[
            { id: 'portfolio', label: `Published (${publishedStories.length})`, icon: BookOpen },
            { id: 'drafts', label: `Drafts & Reviews (${draftStories.length})`, icon: FileEdit },
            {
              id: 'network',
              label: `Community (${(statsData?.followersCount || followerUsers.length) + (statsData?.followingCount || followingUsers.length)})`,
              icon: Users,
            },
            { id: 'topics', label: `Topic Beats (${followedTopics.size})`, icon: Compass },
            { id: 'comments', label: `Discussions (${comments.length})`, icon: MessageSquare },
            { id: 'edit', label: 'Journalist Settings', icon: UserIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap px-1 ${
                activeTab === tab.id
                  ? 'border-accent-crimson text-accent-crimson font-bold'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── TAB 1: Published Articles Portfolio ────────── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-editorial font-semibold text-ink-primary">
                  Published Dispatch Archive
                </h2>
                <p className="text-xs font-mono text-ink-secondary mt-0.5">
                  Authored manuscripts currently circulating across public readers and wire feeds.
                </p>
              </div>
              <Link
                to="/editor"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-primary text-white text-xs font-mono font-medium hover:bg-slate-800 transition-colors"
                style={{ borderRadius: 2 }}
              >
                <Plus size={12} />
                <span>New Manuscript</span>
              </Link>
            </div>

            {isLoadingPublished ? (
              <div className="py-16 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
                <LoadingSpinner label="Loading published articles..." />
              </div>
            ) : publishedStories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publishedStories.map((art) => (
                  <div
                    key={art.id}
                    className="bg-white border border-border-subtle p-5 hover:border-ink-primary transition-all flex flex-col justify-between"
                    style={{ borderRadius: 2 }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase font-semibold text-accent-crimson tracking-wider">
                          {art.categoryName || 'General'}
                        </span>
                        <span className="text-[11px] font-mono text-ink-secondary">
                          {fmtDate(art.publishedAt || art.createdAt)}
                        </span>
                      </div>

                      <Link
                        to={`/articles/${art.slug}`}
                        className="font-editorial text-lg font-semibold text-ink-primary hover:text-accent-crimson transition-colors line-clamp-2 block"
                      >
                        {cleanTitle(art.title)}
                      </Link>

                      {art.description && (
                        <p className="text-xs text-ink-secondary line-clamp-2 mt-1.5 font-sans leading-relaxed">
                          {art.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-ink-secondary">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-accent-crimson" />
                          <span>{art.readingTimeMinutes || 1} min read</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          <span>{art.wordCount || 0} words</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/write/${art.id}`}
                          className="px-2.5 py-1 text-xs font-mono border border-border-subtle hover:border-ink-primary text-ink-primary transition-colors"
                          style={{ borderRadius: 2 }}
                        >
                          Studio Edit
                        </Link>
                        <Link
                          to={`/articles/${art.slug}`}
                          className="px-2.5 py-1 text-xs font-mono bg-canvas-paper hover:bg-slate-100 text-ink-primary border border-border-subtle transition-colors"
                          style={{ borderRadius: 2 }}
                        >
                          View Live
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-12 text-center bg-white border border-border-subtle space-y-3"
                style={{ borderRadius: 2 }}
              >
                <BookOpen size={24} className="mx-auto text-ink-secondary/40" />
                <p className="text-xs font-semibold text-ink-primary">No published articles yet</p>
                <p className="text-[11px] text-ink-secondary font-mono max-w-sm mx-auto">
                  Write your first investigative piece or submit a manuscript for editorial review.
                </p>
                <Link
                  to="/editor"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-primary text-white text-xs font-mono font-medium hover:bg-slate-800 transition-colors mt-2"
                  style={{ borderRadius: 2 }}
                >
                  <Sparkles size={12} />
                  <span>Start Writing</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Drafts & Review Queue ────────────────── */}
        {activeTab === 'drafts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-editorial font-semibold text-ink-primary">
                  Drafts & Review Queue
                </h2>
                <p className="text-xs font-mono text-ink-secondary mt-0.5">
                  Manuscripts under active drafting, peer review, or revisions.
                </p>
              </div>
              <Link
                to="/editor"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-primary text-white text-xs font-mono font-medium hover:bg-slate-800 transition-colors"
                style={{ borderRadius: 2 }}
              >
                <Plus size={12} />
                <span>Create Draft</span>
              </Link>
            </div>

            {isLoadingDrafts ? (
              <div className="py-16 text-center bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
                <LoadingSpinner label="Loading drafts..." />
              </div>
            ) : draftStories.length > 0 ? (
              <div className="bg-white border border-border-subtle divide-y divide-border-subtle" style={{ borderRadius: 2 }}>
                {draftStories.map((art) => (
                  <div key={art.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={art.status} />
                        <span className="text-[10px] font-mono text-ink-secondary">
                          Last updated {fmtDate(art.updatedAt || art.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-editorial text-base font-semibold text-ink-primary line-clamp-1">
                        {cleanTitle(art.title)}
                      </h3>
                      {art.description && (
                        <p className="text-xs text-ink-secondary line-clamp-1 font-sans">
                          {art.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/write/${art.id}`}
                        className="px-3 py-1.5 text-xs font-mono bg-ink-primary text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
                        style={{ borderRadius: 2 }}
                      >
                        <FileEdit size={12} />
                        <span>Resume Writing</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-12 text-center bg-white border border-border-subtle space-y-3"
                style={{ borderRadius: 2 }}
              >
                <FileEdit size={24} className="mx-auto text-ink-secondary/40" />
                <p className="text-xs font-semibold text-ink-primary">No active drafts in progress</p>
                <p className="text-[11px] text-ink-secondary font-mono">
                  All your manuscripts are currently published or you haven't started a draft.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Community & Followers Network ────────── */}
        {activeTab === 'network' && (
          <div className="bg-white border border-border-subtle p-6 shadow-xs space-y-6" style={{ borderRadius: 2 }}>
            <div className="flex gap-2 pb-4 border-b border-border-subtle font-mono text-xs font-semibold">
              <button
                onClick={() => setNetworkSubTab('followers')}
                className={`px-3.5 py-1.5 transition-colors ${
                  networkSubTab === 'followers'
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-primary'
                }`}
                style={{ borderRadius: 2 }}
              >
                Followers ({statsData?.followersCount ?? followerUsers.length})
              </button>

              <button
                onClick={() => setNetworkSubTab('following')}
                className={`px-3.5 py-1.5 transition-colors ${
                  networkSubTab === 'following'
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-primary'
                }`}
                style={{ borderRadius: 2 }}
              >
                Following ({statsData?.followingCount ?? followingUsers.length})
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
                    <LoadingSpinner label="Loading followers..." />
                  </div>
                ) : followerUsers.length > 0 ? (
                  <div className="divide-y divide-border-subtle border border-border-subtle" style={{ borderRadius: 2 }}>
                    {followerUsers.map((u) => {
                      const isF = followingIds.has(u.id);
                      return (
                        <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className="w-10 h-10 bg-ink-primary text-white flex items-center justify-center font-bold text-sm uppercase shrink-0 font-mono"
                              style={{ borderRadius: 2 }}
                            >
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-editorial text-base font-semibold text-ink-primary truncate">
                                  {u.name}
                                </p>
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-ink-secondary">
                                  {u.role}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-ink-secondary truncate">{u.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              followUserMutation.mutate({ targetId: u.id, isFollowing: isF })
                            }
                            disabled={followUserMutation.isPending}
                            className={`px-3 py-1.5 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                              isF
                                ? 'bg-ink-primary text-white'
                                : 'bg-white border border-border-subtle hover:border-ink-primary text-ink-primary'
                            }`}
                            style={{ borderRadius: 2 }}
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
                  <div className="p-12 text-center bg-canvas-paper border border-border-subtle text-xs text-ink-secondary font-mono" style={{ borderRadius: 2 }}>
                    No public followers recorded on this desk yet.
                  </div>
                )}
              </div>
            )}

            {/* Following List */}
            {networkSubTab === 'following' && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-bold">
                  Journalists & Authors You Follow
                </div>

                {isLoadingUsers ? (
                  <div className="py-12 text-center">
                    <LoadingSpinner label="Loading following list..." />
                  </div>
                ) : followingUsers.length > 0 ? (
                  <div className="divide-y divide-border-subtle border border-border-subtle" style={{ borderRadius: 2 }}>
                    {followingUsers.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-10 h-10 bg-ink-primary text-white flex items-center justify-center font-bold text-sm uppercase shrink-0 font-mono"
                            style={{ borderRadius: 2 }}
                          >
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-editorial text-base font-semibold text-ink-primary truncate">
                                {u.name}
                              </p>
                              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-ink-secondary">
                                {u.role}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-ink-secondary truncate">{u.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            followUserMutation.mutate({ targetId: u.id, isFollowing: true })
                          }
                          disabled={followUserMutation.isPending}
                          className="px-3 py-1.5 text-xs font-mono font-medium bg-ink-primary text-white hover:bg-rose-900 transition-colors flex items-center gap-1.5"
                          style={{ borderRadius: 2 }}
                        >
                          <Check size={12} />
                          <span>Following</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-canvas-paper border border-border-subtle text-xs text-ink-secondary font-mono" style={{ borderRadius: 2 }}>
                    You are not following any other journalists yet. Explore the community tab to connect with peers.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: Topic Beats & Categories ─────────────── */}
        {activeTab === 'topics' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-editorial font-semibold text-ink-primary">
                Editorial Beats & Topic Specializations
              </h2>
              <p className="text-xs font-mono text-ink-secondary mt-0.5">
                Subscribe to editorial beats to curate your personal research feed and dispatch routing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const isFollowed = followedTopics.has(cat.slug);
                return (
                  <div
                    key={cat.id}
                    className={`bg-white border p-5 transition-all flex flex-col justify-between ${
                      isFollowed ? 'border-accent-crimson shadow-xs' : 'border-border-subtle hover:border-ink-primary'
                    }`}
                    style={{ borderRadius: 2 }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono uppercase font-bold text-accent-crimson">
                          {cat.name}
                        </span>
                        {isFollowed && (
                          <span className="text-[10px] font-mono bg-rose-50 text-accent-crimson px-1.5 py-0.5 font-semibold">
                            Active Beat
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary font-sans leading-relaxed line-clamp-2">
                        {cat.description || 'Editorial reporting and investigative inquiries across this discipline.'}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between">
                      <Link
                        to={`/category/${cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-xs font-mono text-ink-secondary hover:text-ink-primary flex items-center gap-1"
                      >
                        <span>View Beat</span>
                        <ArrowUpRight size={12} />
                      </Link>

                      <button
                        onClick={() =>
                          followTopicMutation.mutate({ slug: cat.slug, isFollowing: isFollowed })
                        }
                        disabled={followTopicMutation.isPending}
                        className={`px-3 py-1 text-xs font-mono font-medium transition-colors ${
                          isFollowed
                            ? 'bg-ink-primary text-white hover:bg-slate-800'
                            : 'bg-white border border-border-subtle hover:border-ink-primary text-ink-primary'
                        }`}
                        style={{ borderRadius: 2 }}
                      >
                        {isFollowed ? 'Followed' : '+ Follow Beat'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 5: Discussions & Commentary ─────────────── */}
        {activeTab === 'comments' && (
          <div className="bg-white border border-border-subtle p-6 space-y-4" style={{ borderRadius: 2 }}>
            <div>
              <h2 className="text-lg font-editorial font-semibold text-ink-primary">
                Discussions & Commentary Log
              </h2>
              <p className="text-xs font-mono text-ink-secondary mt-0.5">
                Record of your contributions and notes posted on platform articles.
              </p>
            </div>

            {isLoadingComments ? (
              <div className="py-12 text-center">
                <LoadingSpinner label="Loading discussions..." />
              </div>
            ) : comments.length > 0 ? (
              <div className="divide-y divide-border-subtle border border-border-subtle" style={{ borderRadius: 2 }}>
                {comments.map((c) => (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-ink-secondary">
                      <span className="font-semibold text-ink-primary">
                        On Article ID: {c.articleId?.slice(0, 8)}...
                      </span>
                      <span>{fmtDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm font-sans text-ink-primary leading-relaxed bg-canvas-paper p-3 border border-border-subtle">
                      "{c.content}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-canvas-paper border border-border-subtle text-xs text-ink-secondary font-mono" style={{ borderRadius: 2 }}>
                No active commentary recorded under this author account.
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: Edit Profile & Byline ────────────────── */}
        {activeTab === 'edit' && (
          <div className="bg-white border border-border-subtle p-6 sm:p-8 max-w-2xl shadow-xs" style={{ borderRadius: 2 }}>
            <div className="border-b border-border-subtle pb-4 mb-6">
              <h2 className="text-lg font-editorial font-semibold text-ink-primary">
                Journalist Byline & Profile Configuration
              </h2>
              <p className="text-xs font-mono text-ink-secondary mt-1">
                Updates synchronize across all database mesh replicas and public article bylines.
              </p>
            </div>

            {successMessage && (
              <div className="p-3 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2" style={{ borderRadius: 2 }}>
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-2" style={{ borderRadius: 2 }}>
                <X size={15} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 font-sans">
              {/* Name / Pen Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-primary">
                  Journalist / Author Byline Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3.5 py-2 bg-white border border-border-subtle focus:outline-none focus:border-ink-primary text-xs font-sans"
                  style={{ borderRadius: 2 }}
                />
                {errors.name && (
                  <p className="text-[11px] font-mono text-rose-600">{errors.name.message}</p>
                )}
              </div>

              {/* Bio Statement */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-primary">
                  Biographical Dossier & Beat Statement
                </label>
                <textarea
                  rows={4}
                  {...register('bio')}
                  placeholder="e.g. Senior Investigative Reporter covering distributed database architecture, global monetary policy, and digital governance."
                  className="w-full px-3.5 py-2 bg-white border border-border-subtle focus:outline-none focus:border-ink-primary text-xs font-sans leading-relaxed"
                  style={{ borderRadius: 2 }}
                />
                {errors.bio && (
                  <p className="text-[11px] font-mono text-rose-600">{errors.bio.message}</p>
                )}
              </div>

              {/* Profile Photo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-primary">
                  Journalist Profile Photo
                </label>
                <div className="p-4 bg-canvas-paper border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderRadius: 2 }}>
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 bg-ink-primary text-white flex items-center justify-center font-editorial font-bold text-xl uppercase overflow-hidden shrink-0 border border-border-subtle relative group cursor-pointer"
                      style={{ borderRadius: 2 }}
                    >
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                        />
                      ) : (
                        user?.name.charAt(0) || 'A'
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera size={14} />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-mono font-semibold text-ink-primary">
                        {user?.avatarUrl ? 'Custom Photo Active' : 'Default Initial Avatar'}
                      </p>
                      <p className="text-[11px] text-ink-secondary font-mono">
                        Click the badge or button to select an image from your computer (PNG, JPG, WEBP, GIF up to 5MB).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink-primary text-white text-xs font-mono font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                      style={{ borderRadius: 2 }}
                    >
                      <Upload size={12} />
                      <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    </button>

                    {user?.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-mono font-medium transition-colors"
                        style={{ borderRadius: 2 }}
                      >
                        <Trash2 size={12} />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('portfolio')}
                  className="px-4 py-2 text-xs font-mono text-ink-secondary hover:text-ink-primary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-ink-primary hover:bg-slate-800 text-white text-xs font-mono font-semibold tracking-wide transition-colors disabled:opacity-50"
                  style={{ borderRadius: 2 }}
                >
                  <Save size={13} />
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save Byline & Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
