// client/src/components/inbox/InboxSidebar.tsx
import React from 'react';
import {
  Inbox,
  Send,
  Bell,
  Archive,
  AlertCircle,
  FileText,
  ShieldAlert,
  MessageSquare,
  Plus,
} from 'lucide-react';

export type InboxFolder = 'all' | 'direct' | 'editorial' | 'broadcasts' | 'archive';

interface InboxSidebarProps {
  activeFolder: InboxFolder;
  onSelectFolder: (folder: InboxFolder) => void;
  unreadCount: number;
  broadcastsCount: number;
  onNewMessage: () => void;
}

export const InboxSidebar: React.FC<InboxSidebarProps> = ({
  activeFolder,
  onSelectFolder,
  unreadCount,
  broadcastsCount,
  onNewMessage,
}) => {
  const folders: Array<{
    id: InboxFolder;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    description: string;
  }> = [
    {
      id: 'all',
      label: 'All Correspondence',
      icon: <Inbox className="w-4 h-4" />,
      badge: unreadCount,
      description: 'Incoming inquiries and threads',
    },
    {
      id: 'direct',
      label: 'Direct Dialogs',
      icon: <MessageSquare className="w-4 h-4" />,
      description: 'Author and staff conversations',
    },
    {
      id: 'editorial',
      label: 'Editorial Desk',
      icon: <FileText className="w-4 h-4" />,
      description: 'Manuscript reviews & disputes',
    },
    {
      id: 'broadcasts',
      label: 'Bulletins & Alerts',
      icon: <Bell className="w-4 h-4" />,
      badge: broadcastsCount,
      description: 'Site-wide announcements',
    },
    {
      id: 'archive',
      label: 'Archived Files',
      icon: <Archive className="w-4 h-4" />,
      description: 'Resolved correspondence records',
    },
  ];

  return (
    <aside className="w-64 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-4 flex flex-col justify-between select-none">
      <div>
        <div className="mb-4">
          <button
            onClick={onNewMessage}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-serif font-medium tracking-wide rounded border border-amber-800 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Dispatch</span>
          </button>
        </div>

        <div className="text-[11px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500 px-3 py-1 mb-1">
          Correspondence Folders
        </div>

        <nav className="space-y-1">
          {folders.map((f) => {
            const isActive = activeFolder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFolder(f.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-all text-left ${
                  isActive
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-amber-700 dark:text-amber-500' : 'text-stone-400'}>
                    {f.icon}
                  </span>
                  <span className="font-serif tracking-tight">{f.label}</span>
                </div>
                {Boolean(f.badge && f.badge > 0) && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-700 text-white rounded-full">
                    {f.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-stone-200 dark:border-stone-800 pt-3 text-[11px] text-stone-500 dark:text-stone-500 font-serif italic text-center">
        The Gazette Editorial Dispatch • Desk v4.0
      </div>
    </aside>
  );
};
