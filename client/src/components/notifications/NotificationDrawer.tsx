import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  MessageSquare,
  Settings,
  ShieldAlert,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import {
  notificationsApi,
  NotificationType,
  type NotificationItem,
} from '../../api/notifications.api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getEventIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.ARTICLE_PUBLISHED:
      return <Sparkles size={14} className="text-emerald-600" />;
    case NotificationType.ARTICLE_FEEDBACK:
    case NotificationType.ARTICLE_REJECTED:
      return <ShieldAlert size={14} className="text-amber-600" />;
    case NotificationType.ARTICLE_LIKED:
    case NotificationType.COMMENT_LIKED:
      return <Heart size={14} className="text-rose-500 fill-rose-500" />;
    case NotificationType.COMMENT_RECEIVED:
    case NotificationType.COMMENT_REPLY:
      return <MessageSquare size={14} className="text-sky-600" />;
    case NotificationType.NEW_FOLLOWER:
      return <UserPlus size={14} className="text-indigo-600" />;
    default:
      return <Bell size={14} className="text-ink-secondary" />;
  }
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  unreadCount,
}) => {
  const [mounted, setMounted] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Inbox Items
  const { data: inboxData, isLoading, refetch } = useQuery({
    queryKey: ['notificationsInbox', filterUnread],
    queryFn: () => notificationsApi.getInbox({ unreadOnly: filterUnread, limit: 30 }),
    enabled: isOpen,
  });

  // 2. Fetch Preferences
  const { data: preferences, refetch: refetchPrefs } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: isOpen && showPreferences,
  });

  // 3. Mark Single Read Mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsInbox'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });

  // 4. Mark All Read Mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsInbox'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });

  // 5. Update Preferences Mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: any) => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      refetchPrefs();
    },
  });

  if (!isOpen || !mounted || typeof document === 'undefined' || !document.body) return null;

  const items = inboxData?.items || [];

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    onClose();

    if (item.resourceType === 'article' && item.resourceSlug) {
      navigate(`/articles/${item.resourceSlug}`);
    } else if (item.resourceType === 'comment' && item.resourceSlug) {
      navigate(`/articles/${item.resourceSlug}#comments`);
    } else if (item.resourceType === 'user' && item.resourceId) {
      navigate(`/authors/${item.resourceId}`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-ink-primary/30 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white border-l border-border-subtle shadow-2xl flex flex-col animate-slide-left z-10">
          {/* Header */}
          <div className="p-5 border-b border-border-subtle bg-canvas-paper flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold">
                <Bell size={12} />
                <span>The Gazette Desk</span>
              </div>
              <h2 className="text-lg font-editorial font-bold text-ink-primary mt-0.5">
                Notification Center
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className={`p-2 rounded-lg border transition-colors ${
                  showPreferences
                    ? 'bg-ink-primary text-white border-ink-primary'
                    : 'bg-white hover:bg-slate-100 border-border-subtle text-ink-secondary hover:text-ink-primary'
                }`}
                title="Delivery Preferences"
              >
                <Settings size={15} />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white hover:bg-slate-100 border border-border-subtle rounded-lg text-ink-secondary hover:text-ink-primary transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Preferences Sub-Panel */}
          {showPreferences && preferences && (
            <div className="p-4 bg-slate-50 border-b border-border-subtle space-y-3 font-mono text-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="font-bold text-ink-primary uppercase tracking-wider text-[11px]">
                  Delivery Channels
                </span>
                <span className="text-[10px] text-ink-secondary">Auto-saved</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 bg-white p-2 border border-border-subtle rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.channels?.inApp}
                    onChange={(e) =>
                      updatePrefsMutation.mutate({
                        channels: { ...preferences.channels, inApp: e.target.checked },
                      })
                    }
                    className="accent-accent-crimson"
                  />
                  <span className="text-[11px] font-sans font-medium">In-App Desk</span>
                </label>

                <label className="flex items-center gap-2 bg-white p-2 border border-border-subtle rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.channels?.email}
                    onChange={(e) =>
                      updatePrefsMutation.mutate({
                        channels: { ...preferences.channels, email: e.target.checked },
                      })
                    }
                    className="accent-accent-crimson"
                  />
                  <span className="text-[11px] font-sans font-medium">Email Alerts</span>
                </label>
              </div>

              <div className="border-t border-border-subtle pt-2">
                <span className="font-bold text-ink-primary uppercase tracking-wider text-[10px] block mb-1.5">
                  Event Toggles
                </span>
                <div className="space-y-1.5 text-[11px] font-sans">
                  <label className="flex items-center justify-between">
                    <span>Story published & feedback</span>
                    <input
                      type="checkbox"
                      checked={preferences.events?.onArticlePublished}
                      onChange={(e) =>
                        updatePrefsMutation.mutate({
                          events: { ...preferences.events, onArticlePublished: e.target.checked, onArticleFeedback: e.target.checked },
                        })
                      }
                      className="accent-accent-crimson"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>Story likes & engagement</span>
                    <input
                      type="checkbox"
                      checked={preferences.events?.onArticleLiked}
                      onChange={(e) =>
                        updatePrefsMutation.mutate({
                          events: { ...preferences.events, onArticleLiked: e.target.checked },
                        })
                      }
                      className="accent-accent-crimson"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>Comments & discussion replies</span>
                    <input
                      type="checkbox"
                      checked={preferences.events?.onCommentReceived}
                      onChange={(e) =>
                        updatePrefsMutation.mutate({
                          events: { ...preferences.events, onCommentReceived: e.target.checked, onCommentReply: e.target.checked },
                        })
                      }
                      className="accent-accent-crimson"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>New dispatch followers</span>
                    <input
                      type="checkbox"
                      checked={preferences.events?.onNewFollower}
                      onChange={(e) =>
                        updatePrefsMutation.mutate({
                          events: { ...preferences.events, onNewFollower: e.target.checked },
                        })
                      }
                      className="accent-accent-crimson"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar & Actions */}
          <div className="px-5 py-3 border-b border-border-subtle bg-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setFilterUnread(false)}
                className={`px-3 py-1 font-medium rounded-md transition-all ${
                  !filterUnread
                    ? 'bg-white text-ink-primary shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                All Dispatches
              </button>
              <button
                onClick={() => setFilterUnread(true)}
                className={`px-3 py-1 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  filterUnread
                    ? 'bg-white text-ink-primary shadow-xs'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-accent-crimson text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 text-[11px] font-mono text-ink-secondary hover:text-ink-primary transition-colors font-medium"
              >
                <CheckCheck size={13} className="text-emerald-600" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {isLoading ? (
              <div className="py-16 text-center text-xs font-mono text-ink-secondary">
                Retrieving dispatches from persistence mesh...
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 px-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-ink-secondary mx-auto flex items-center justify-center">
                  <Check size={20} className="text-emerald-600" />
                </div>
                <h3 className="font-editorial font-bold text-ink-primary text-base">
                  All Caught Up
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed max-w-xs mx-auto">
                  No unread dispatches at the desk. You will receive real-time alerts when readers engage or editors review your stories.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 relative group ${
                    !item.isRead ? 'bg-amber-50/40' : 'bg-white'
                  }`}
                >
                  {/* Unread Indicator Bar */}
                  {!item.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-crimson" />
                  )}

                  {/* Icon Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-border-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getEventIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-semibold">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-ink-secondary font-mono flex items-center gap-1 flex-shrink-0">
                        <Clock size={10} />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </span>
                    </div>

                    <p className="text-xs text-ink-primary leading-relaxed mt-1 font-sans">
                      {item.message}
                    </p>

                    {item.actorCount > 1 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-accent-crimson font-medium">
                        <Flame size={11} />
                        <span>{item.actorCount} readers engaged</span>
                      </div>
                    )}
                  </div>

                  {/* Hover Arrow */}
                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-ink-secondary">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-canvas-paper border-t border-border-subtle text-center text-[10px] font-mono text-ink-secondary">
            The Gazette Editorial Network &middot; Live Dispatches
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
