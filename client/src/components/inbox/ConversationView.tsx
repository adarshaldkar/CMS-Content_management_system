// client/src/components/inbox/ConversationView.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Send,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Shield,
  User,
  ArrowLeft,
} from 'lucide-react';

interface Participant {
  userId: string;
  userName?: string;
  userRole?: string;
  role?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt: string | Date;
}

interface ConversationDetail {
  id: string;
  type: string;
  subject: string;
  status: string;
  priority: string;
  participants: Participant[];
  messages: Message[];
  createdAt: string | Date;
}

interface ConversationViewProps {
  conversation: ConversationDetail;
  currentUserId: string;
  onSendMessage: (body: string, actionUrl?: string, actionLabel?: string) => Promise<void>;
  onToggleArchive: () => Promise<void>;
  isArchivedFolder?: boolean;
  onBack?: () => void;
  sending: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  currentUserId,
  onSendMessage,
  onToggleArchive,
  isArchivedFolder = false,
  onBack,
  sending,
}) => {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || sending) return;
    const text = replyText.trim();
    setReplyText('');
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Safe text renderer that converts line breaks and safe markdown links without innerHTML vulnerability
   */
  const renderSafeContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-stone-800 dark:text-stone-200 text-sm leading-relaxed font-serif">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-2" />;
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-50/20 dark:bg-stone-900/30 overflow-hidden">
      {/* Editorial Header */}
      <header className="p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded font-semibold">
                {conversation.type.replace(/_/g, ' ')}
              </span>
              {conversation.priority === 'URGENT' && (
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 rounded font-bold">
                  Urgent Priority
                </span>
              )}
            </div>
            <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {conversation.subject}
            </h2>
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5">
              <span>Participants:</span>
              <div className="flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300 flex-wrap">
                {conversation.participants.map((p, i) => (
                  <span key={p.userId}>
                    {p.userName || 'Staff'} ({p.userRole || 'Member'}){i < conversation.participants.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleArchive}
            title={isArchivedFolder ? 'Restore conversation to active inbox' : 'Archive conversation'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded transition-colors cursor-pointer"
          >
            {isArchivedFolder ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" />
                <span>Restore to Active</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Message Chain Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {conversation.messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <article
              key={m.id}
              className={`flex flex-col border rounded-lg p-4 transition-all shadow-xs ${
                isMe
                  ? 'bg-amber-50/40 dark:bg-stone-850/60 border-amber-200/70 dark:border-stone-700 ml-6 md:ml-16'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 mr-6 md:mr-16'
              }`}
            >
              <div className="flex items-center justify-between border-b border-stone-200/50 dark:border-stone-800/60 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-serif font-bold text-stone-700 dark:text-stone-300">
                    {m.senderName ? m.senderName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="font-serif font-semibold text-sm text-stone-900 dark:text-stone-100">
                    {m.senderName}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1 py-0.2 bg-stone-100 dark:bg-stone-800 text-stone-500 rounded">
                    {m.senderRole}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-400">
                  {new Date(m.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              {renderSafeContent(m.body)}

              {m.actionUrl && (
                <div className="mt-3 pt-3 border-t border-stone-200/40 dark:border-stone-800/40 flex justify-end">
                  <a
                    href={m.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-xs font-serif rounded hover:bg-stone-900 transition-colors"
                  >
                    <span>{m.actionLabel || 'Inspect Resource'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </article>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Composer */}
      <footer className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your correspondence dispatch (Markdown supported)... Press Ctrl+Enter to send"
            rows={2}
            className="flex-1 p-2.5 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50/50 dark:bg-stone-800 focus:outline-hidden focus:ring-1 focus:ring-amber-700 resize-none text-stone-900 dark:text-stone-100"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || sending}
            className="px-4 bg-amber-700 hover:bg-amber-800 text-white rounded font-serif text-sm font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
};
