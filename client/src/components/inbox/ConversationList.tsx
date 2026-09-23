// client/src/components/inbox/ConversationList.tsx
import React from 'react';
import { Clock, AlertCircle, FileText, MessageSquare, ShieldAlert } from 'lucide-react';

export interface ConversationItem {
  id: string;
  type:
    | 'DIRECT'
    | 'EDITORIAL_INQUIRY'
    | 'SUPPORT_TICKET'
    | 'SECURITY_BULLETIN'
    | 'DMCA_DISPUTE'
    | 'PLATFORM_ANNOUNCEMENT'
    | 'EDITORIAL_MEMO'
    | 'PEER_REVIEW'
    | 'FACT_CHECK'
    | 'CORRECTION_NOTICE'
    | 'POLICY_UPDATE';
  subject: string;
  createdByName?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  unreadCount?: number;
  lastMessage?: {
    body: string;
    senderName: string;
    createdAt: string | Date;
  } | null;
  lastMessageAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  loading,
}) => {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'EDITORIAL_INQUIRY':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 rounded font-semibold">Editorial</span>;
      case 'PLATFORM_ANNOUNCEMENT':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 rounded font-semibold">All Users</span>;
      case 'EDITORIAL_MEMO':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded font-semibold">Board Memo</span>;
      case 'PEER_REVIEW':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 rounded font-semibold">Peer Review</span>;
      case 'FACT_CHECK':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400 rounded font-semibold">Fact Check</span>;
      case 'CORRECTION_NOTICE':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-400 rounded font-semibold">Correction</span>;
      case 'POLICY_UPDATE':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 rounded font-semibold">Policy</span>;
      case 'SECURITY_BULLETIN':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 rounded font-semibold">Security</span>;
      case 'DMCA_DISPUTE':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 rounded font-semibold">Legal</span>;
      case 'SUPPORT_TICKET':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-400 rounded font-semibold">Support</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded font-semibold">Direct</span>;
    }
  };

  const getPriorityIndicator = (priority: string) => {
    if (priority === 'URGENT') {
      return <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Urgent Priority" />;
    }
    if (priority === 'HIGH') {
      return <span className="w-2 h-2 rounded-full bg-amber-500" title="High Priority" />;
    }
    return null;
  };

  const formatDate = (dateInput?: string | Date) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="w-80 shrink-0 border-r border-stone-200 dark:border-stone-800 flex flex-col bg-white dark:bg-stone-900/20 p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse space-y-2 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-3/4" />
            <div className="h-3 bg-stone-100 dark:bg-stone-850 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="w-80 shrink-0 border-r border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-white dark:bg-stone-900/20">
        <MessageSquare className="w-10 h-10 mb-3 stroke-[1.2] opacity-60" />
        <div className="font-serif text-sm text-stone-600 dark:text-stone-300 font-medium">No correspondence in this file</div>
        <div className="text-[11px] text-stone-400 mt-1 max-w-xs">New inquiries and thread dispatches will appear here.</div>
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 border-r border-stone-200 dark:border-stone-800 overflow-y-auto divide-y divide-stone-200/60 dark:divide-stone-800/60 bg-white dark:bg-stone-900/20">
      {conversations.map((c) => {
        const isSelected = selectedId === c.id;
        const hasUnread = (c.unreadCount ?? 0) > 0;

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`p-3.5 cursor-pointer transition-all border-l-3 text-left ${
              isSelected
                ? 'bg-amber-50/70 dark:bg-stone-800/80 border-l-amber-700'
                : hasUnread
                ? 'bg-white dark:bg-stone-900 border-l-amber-500 font-medium'
                : 'hover:bg-stone-50 dark:hover:bg-stone-850/40 border-l-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {getPriorityIndicator(c.priority)}
                {getTypeBadge(c.type)}
                <span className="text-xs font-serif text-stone-700 dark:text-stone-300 truncate max-w-[120px]">
                  {c.createdByName || 'Gazette Staff'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-stone-400">
                <Clock className="w-3 h-3" />
                <span>{formatDate(c.lastMessageAt || c.updatedAt)}</span>
              </div>
            </div>

            <div className={`text-sm font-serif truncate mb-1 ${hasUnread ? 'font-bold text-stone-950 dark:text-stone-50' : 'text-stone-800 dark:text-stone-200'}`}>
              {c.subject}
            </div>

            {c.lastMessage && (
              <div className="text-xs text-stone-500 dark:text-stone-400 truncate line-clamp-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">{c.lastMessage.senderName}: </span>
                {c.lastMessage.body}
              </div>
            )}

            {hasUnread && (
              <div className="mt-2 flex justify-end">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-600 text-white rounded">
                  NEW ({c.unreadCount})
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
