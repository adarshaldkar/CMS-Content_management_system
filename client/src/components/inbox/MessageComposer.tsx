// client/src/components/inbox/MessageComposer.tsx
import React, { useState } from 'react';
import { Send, X, AlertCircle } from 'lucide-react';

interface MessageComposerProps {
  onCancel: () => void;
  onSubmit: (data: {
    type: 'DIRECT' | 'EDITORIAL_INQUIRY' | 'SUPPORT_TICKET' | 'SECURITY_BULLETIN' | 'DMCA_DISPUTE';
    subject: string;
    recipientIds: string[];
    initialMessage: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
    actionLabel?: string;
  }) => Promise<void>;
  loading: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onCancel,
  onSubmit,
  loading,
}) => {
  const [type, setType] = useState<'DIRECT' | 'EDITORIAL_INQUIRY' | 'SUPPORT_TICKET' | 'SECURITY_BULLETIN' | 'DMCA_DISPUTE'>('DIRECT');
  const [subject, setSubject] = useState('');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and initial message content.');
      return;
    }

    const recipientIds = recipientsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setError(null);
      await onSubmit({
        type,
        subject: subject.trim(),
        recipientIds,
        initialMessage: message.trim(),
        priority,
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch conversation.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-stone-900 p-6 overflow-y-auto">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Compose Editorial Dispatch
          </h2>
          <p className="text-xs text-stone-500 font-serif italic">
            Initiate formal staff inquiries, manuscript review threads, or support cases
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
              Dispatch Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="DIRECT">Direct Staff Message</option>
              <option value="EDITORIAL_INQUIRY">Editorial Revision Inquiry</option>
              <option value="SUPPORT_TICKET">Author Support Ticket</option>
              <option value="SECURITY_BULLETIN">Security Warning / Alert</option>
              <option value="DMCA_DISPUTE">Copyright / DMCA Dispute</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
              Priority Classification
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            >
              <option value="LOW">Low (Background)</option>
              <option value="NORMAL">Normal (Standard Desk)</option>
              <option value="HIGH">High (Review Queue Priority)</option>
              <option value="URGENT">Urgent (Immediate Attention)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
            Recipient User ID(s)
          </label>
          <input
            type="text"
            value={recipientsInput}
            onChange={(e) => setRecipientsInput(e.target.value)}
            placeholder="Recipient UUID (comma separated for multiple participants)"
            className="w-full p-2 text-sm font-mono border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
            Subject Heading
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Manuscript Revision: Quantum Computing Chapter 4"
            className="w-full p-2 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
            Initial Correspondence Content (Markdown Supported)
          </label>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Draft your message..."
            className="w-full p-3 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
              Action URL (Optional)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://gazette.io/articles/..."
              className="w-full p-2 text-xs font-mono border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-stone-500 mb-1">
              Action Button Label (Optional)
            </label>
            <input
              type="text"
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              placeholder="e.g. Inspect Article Diff"
              className="w-full p-2 text-xs font-serif border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-serif text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded font-serif text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Dispatch Correspondence</span>
          </button>
        </div>
      </form>
    </div>
  );
};
