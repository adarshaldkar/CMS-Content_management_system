// client/src/components/inbox/GazetteInbox.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { InboxSidebar, type InboxFolder } from './InboxSidebar';
import { ConversationList, type ConversationItem } from './ConversationList';
import { ConversationView } from './ConversationView';
import { MessageComposer } from './MessageComposer';
import { BroadcastAnnouncement, type BroadcastItem } from './BroadcastAnnouncement';

interface GazetteInboxProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const GazetteInbox: React.FC<GazetteInboxProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [activeFolder, setActiveFolder] = useState<InboxFolder>('all');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversationDetail, setActiveConversationDetail] = useState<any | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch unread count & broadcasts
  const fetchOverview = useCallback(async () => {
    try {
      const [countRes, bcRes] = await Promise.all([
        fetch('/api/messages/unread-count', {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }).then((r) => (r.ok ? r.json() : { unreadCount: 0 })),
        fetch('/api/messages/broadcasts', {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }).then((r) => (r.ok ? r.json() : { items: [] })),
      ]);

      setUnreadCount(countRes.unreadCount || 0);
      setBroadcasts(bcRes.items || []);
    } catch {}
  }, []);

  // Fetch selected conversation detail
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/messages/conversations/${id}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversationDetail(data);
        // Refresh unread count
        fetchOverview();
      }
    } catch {
    } finally {
      setLoadingDetail(false);
    }
  }, [fetchOverview]);

  // Fetch conversation list based on target folder
  const fetchConversations = useCallback(async (targetFolder: InboxFolder = activeFolder, preferredConvId?: string | null) => {
    if (targetFolder === 'broadcasts') {
      setConversations([]);
      setSelectedConvId(null);
      setActiveConversationDetail(null);
      return;
    }

    setLoadingList(true);
    try {
      let url = '/api/messages/conversations?';
      if (targetFolder === 'direct') url += 'type=DIRECT&';
      if (targetFolder === 'editorial') url += 'type=EDITORIAL_INQUIRY&';
      if (targetFolder === 'archive') url += 'isArchived=true&';
      else url += 'isArchived=false&';

      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        setConversations(items);

        if (items.length > 0) {
          const targetId = preferredConvId || (items.some((c: any) => c.id === selectedConvId) ? selectedConvId : items[0].id);
          setSelectedConvId(targetId);
          fetchDetail(targetId);
        } else {
          setSelectedConvId(null);
          setActiveConversationDetail(null);
        }
      }
    } catch {
    } finally {
      setLoadingList(false);
    }
  }, [activeFolder, selectedConvId, fetchDetail]);

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
      fetchConversations(activeFolder);
    }
  }, [isOpen]);

  const handleSelectFolder = (folder: InboxFolder) => {
    setActiveFolder(folder);
    setIsComposing(false);
    setSelectedConvId(null);
    setActiveConversationDetail(null);
    fetchConversations(folder, null);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    setIsComposing(false);
    fetchDetail(id);
  };

  if (!isOpen) return null;

  const handleSendMessage = async (body: string, actionUrl?: string, actionLabel?: string) => {
    if (!selectedConvId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/messages/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ body, actionUrl, actionLabel }),
      });
      if (res.ok) {
        await fetchDetail(selectedConvId);
        await fetchConversations(activeFolder, selectedConvId);
      }
    } catch {
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateConversation = async (data: any) => {
    setSendingMessage(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setIsComposing(false);
        const nextFolder: InboxFolder = data.type === 'EDITORIAL_INQUIRY' ? 'editorial' : data.type === 'DIRECT' ? 'direct' : 'all';
        setActiveFolder(nextFolder);
        setSelectedConvId(created.id);
        await fetchConversations(nextFolder, created.id);
        await fetchDetail(created.id);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to dispatch');
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!selectedConvId) return;
    try {
      const isArchived = activeFolder !== 'archive';
      await fetch(`/api/messages/conversations/${selectedConvId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ isArchived }),
      });
      setSelectedConvId(null);
      setActiveConversationDetail(null);
      await fetchConversations(activeFolder, null);
      await fetchOverview();
    } catch {}
  };

  const handleMarkBroadcastRead = async (id: string) => {
    try {
      await fetch(`/api/messages/broadcasts/${id}/read`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isRead: true } : b)),
      );
      fetchOverview();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-6xl h-[88vh] bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 text-stone-100 border-b border-stone-800 select-none">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-serif font-black tracking-widest text-sm">
              THE GAZETTE
            </span>
            <span className="text-stone-500 font-mono text-xs">|</span>
            <span className="font-serif text-xs tracking-wide text-stone-300">
              Editorial Correspondence & Inquiries Desk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchOverview();
                fetchConversations(activeFolder, selectedConvId);
              }}
              title="Refresh Inboxes"
              className="p-1 text-stone-400 hover:text-stone-200 rounded cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-200 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desk Body: Split Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* 1. Folder Navigation Sidebar */}
          <InboxSidebar
            activeFolder={activeFolder}
            onSelectFolder={handleSelectFolder}
            unreadCount={unreadCount}
            broadcastsCount={broadcasts.filter((b) => !b.isRead).length}
            onNewMessage={() => {
              setIsComposing(true);
              setActiveConversationDetail(null);
            }}
          />

          {/* 2. Main Desk Panel */}
          {activeFolder === 'broadcasts' ? (
            <BroadcastAnnouncement
              broadcasts={broadcasts}
              onMarkRead={handleMarkBroadcastRead}
              loading={loadingList}
            />
          ) : isComposing ? (
            <MessageComposer
              onCancel={() => {
                setIsComposing(false);
                if (selectedConvId) fetchDetail(selectedConvId);
              }}
              onSubmit={handleCreateConversation}
              loading={sendingMessage}
            />
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConvId}
                onSelect={handleSelectConversation}
                loading={loadingList}
              />

              {loadingDetail ? (
                <div className="flex-1 flex items-center justify-center p-8 bg-stone-50/20 dark:bg-stone-900/30">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700" />
                </div>
              ) : activeConversationDetail ? (
                <ConversationView
                  conversation={activeConversationDetail}
                  currentUserId={currentUserId}
                  onSendMessage={handleSendMessage}
                  onToggleArchive={handleToggleArchive}
                  isArchivedFolder={activeFolder === 'archive'}
                  sending={sendingMessage}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50/20 dark:bg-stone-900/30 text-stone-400 font-serif">
                  <div className="text-base text-stone-600 dark:text-stone-300 font-medium mb-1">
                    Select a correspondence file from the list
                  </div>
                  <div className="text-xs text-stone-400 italic">
                    Read threads, reply to dispatches, or compose a new message.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
