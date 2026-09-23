import React, { useState } from 'react';
import { GazetteInbox } from '../../components/inbox/GazetteInbox';
import { useAuthStore } from '../../stores/authStore';
import { MailOpen, Inbox } from 'lucide-react';

export const InboxPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas-paper font-sans">
      {/* Page Header */}
      <div className="bg-ink-primary text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Inbox size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-editorial font-bold text-white">Gazette Inbox</h1>
              <p className="text-stone-300 text-xs mt-0.5">Editorial correspondence, announcements, and direct messages</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isOpen ? (
          <GazetteInbox
            isOpen={true}
            onClose={() => setIsOpen(false)}
            currentUserId={user.id}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MailOpen size={40} className="text-ink-muted mb-4" />
            <h2 className="text-lg font-editorial font-bold text-ink-primary mb-2">Inbox Closed</h2>
            <p className="text-sm text-ink-secondary mb-6">Your correspondence desk has been minimized.</p>
            <button
              onClick={() => setIsOpen(true)}
              className="px-5 py-2.5 bg-ink-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Open Inbox
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
