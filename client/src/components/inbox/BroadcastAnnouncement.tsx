// client/src/components/inbox/BroadcastAnnouncement.tsx
import React from 'react';
import { Bell, Check, ExternalLink, Clock } from 'lucide-react';

export interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  authorName: string;
  targetRole: string;
  priority: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  isRead: boolean;
  readAt?: string | Date | null;
  createdAt: string | Date;
}

interface BroadcastAnnouncementProps {
  broadcasts: BroadcastItem[];
  onMarkRead: (id: string) => Promise<void>;
  loading: boolean;
}

export const BroadcastAnnouncement: React.FC<BroadcastAnnouncementProps> = ({
  broadcasts,
  onMarkRead,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 border border-stone-200 dark:border-stone-800 rounded bg-stone-50 dark:bg-stone-850">
            <div className="h-5 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
        <Bell className="w-10 h-10 mb-3 stroke-[1.2] opacity-60" />
        <div className="font-serif text-base text-stone-600 dark:text-stone-300 font-medium">
          No active bulletins or site-wide notices
        </div>
        <div className="text-xs text-stone-400 mt-1 max-w-xs">
          Important announcements from the Gazette Editorial Board will be published here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/40 dark:bg-stone-900/40">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-3 mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Gazette Administrative Bulletins & Announcements
          </h2>
          <p className="text-xs text-stone-500 font-serif italic">
            Official platform notices, editorial policy updates, and scheduled maintenance bulletins
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 rounded">
          {broadcasts.filter((b) => !b.isRead).length} Unread
        </span>
      </div>

      <div className="space-y-4">
        {broadcasts.map((b) => (
          <article
            key={b.id}
            className={`p-5 rounded-lg border transition-all ${
              b.isRead
                ? 'bg-white/80 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800'
                : 'bg-white dark:bg-stone-900 border-l-4 border-l-amber-700 border-stone-300 dark:border-stone-700 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 rounded font-bold">
                  [BULLETIN]
                </span>
                <span className="text-[10px] font-mono text-stone-500 uppercase">
                  Target: {b.targetRole}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-stone-400">
                <Clock className="w-3 h-3" />
                <span>{new Date(b.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
              {b.title}
            </h3>

            <p className="text-sm font-serif text-stone-700 dark:text-stone-300 leading-relaxed mb-4 whitespace-pre-line">
              {b.body}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs font-serif text-stone-500 italic">
                Issued by: <span className="font-semibold text-stone-700 dark:text-stone-300">{b.authorName}</span>
              </span>

              <div className="flex items-center gap-2">
                {b.actionUrl && (
                  <a
                    href={b.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-serif rounded transition-colors"
                  >
                    <span>{b.actionLabel || 'Details'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {!b.isRead ? (
                  <button
                    onClick={() => onMarkRead(b.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-xs font-serif rounded transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-600" />
                    <span>Read</span>
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
