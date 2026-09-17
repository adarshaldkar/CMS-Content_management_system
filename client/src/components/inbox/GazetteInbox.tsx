// client/src/components/inbox/GazetteInbox.tsx
import React, { useState, useEffect } from 'react';
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
  const fetchOverview = async () => {
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
  };

  // Fetch conversation list based on active folder
  const fetchConversations = async () => {
    if (activeFolder === 'broadcasts') return;
    setLoadingList(true);
    try {
      let url = '/api/messages/conversations?';
      if (activeFolder === 'direct') url += 'type=DIRECT&';
      if (activeFolder === 'editorial') url += 'type=EDITORIAL_INQUIRY&';
      if (activeFolder === 'archive') url += 'isArchived=true&';
      else url += 'isArchived=false&';

      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.items || []);
        if (data.items?.length > 0 && !selectedConvId && !isComposing) {
          setSelectedConvId(data.items[0].id);
        }
      }
    } catch {
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch selected conversation detail
  const fetchDetail = async (id: string) => {
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
  };

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
      fetchConversations();
    }
  }, [isOpen, activeFolder]);

  useEffect(() => {
    if (selectedConvId && !isComposing && activeFolder !== 'broadcasts') {
      fetchDetail(selectedConvId);
    }
  }, [selectedConvId]);

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
        fetchConversations();
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
        await fetchConversations();
        setSelectedConvId(created.id);
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
      fetchConversations();
      setSelectedConvId(null);
      setActiveConversationDetail(null);
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
                fetchConversations();
              }}
              title="Refresh Inboxes"
              className="p-1 text-stone-400 hover:text-stone-200 rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-200 rounded"
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
            onSelectFolder={(folder) => {
              setActiveFolder(folder);
              setIsComposing(false);
            }}
            unreadCount={unreadCount}
            broadcastsCount={broadcasts.filter((b) => !b.isRead).length}
            onNewMessage={() => setIsComposing(true)}
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
              onCancel={() => setIsComposing(false)}
              onSubmit={handleCreateConversation}
              loading={sendingMessage}
            />
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConvId}
                onSelect={(id) => {
                  setSelectedConvId(id);
                  setIsComposing(false);
                }}
                loading={loadingList}
              />

              {activeConversationDetail ? (
                <ConversationView
                  conversation={activeConversationDetail}
                  currentUserId={currentUserId}
                  onSendMessage={handleSendMessage}
                  onToggleArchive={handleToggleArchive}
                  sending={sendingMessage}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-stone-400 font-serif italic text-sm">
                  Select a correspondence file from the left to read or reply.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
