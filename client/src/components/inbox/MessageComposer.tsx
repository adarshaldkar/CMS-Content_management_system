// client/src/components/inbox/MessageComposer.tsx
import React, { useState, useEffect } from 'react';
import {
  Send,
  X,
  AlertCircle,
  Search,
  Users,
  CheckSquare,
  Square,
  HelpCircle,
  Filter,
} from 'lucide-react';

export type DispatchType =
  | 'DIRECT'
  | 'EDITORIAL_INQUIRY'
  | 'EDITORIAL_MEMO'
  | 'PLATFORM_ANNOUNCEMENT'
  | 'PEER_REVIEW'
  | 'FACT_CHECK'
  | 'CORRECTION_NOTICE'
  | 'POLICY_UPDATE'
  | 'SUPPORT_TICKET'
  | 'SECURITY_BULLETIN'
  | 'DMCA_DISPUTE';

interface RecipientUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface MessageComposerProps {
  onCancel: () => void;
  onSubmit: (data: {
    type: DispatchType;
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
  const [type, setType] = useState<DispatchType>('DIRECT');
  const [subject, setSubject] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientUser[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'EDITOR' | 'AUTHOR' | 'ADMIN'>('ALL');
  const [availableRecipients, setAvailableRecipients] = useState<RecipientUser[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [showMarkdownTips, setShowMarkdownTips] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recipients list on mount or search query change
  useEffect(() => {
    let active = true;
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const query = recipientSearch.trim() ? `?search=${encodeURIComponent(recipientSearch.trim())}` : '';
        const res = await fetch(`/api/messages/recipients${query}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok && active) {
          const data = await res.json();
          setAvailableRecipients(data || []);
        }
      } catch {
      } finally {
        if (active) setLoadingRecipients(false);
      }
    };

    const timer = setTimeout(fetchRecipients, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [recipientSearch]);

  // Filter available recipients by active role tab
  const filteredRecipients = availableRecipients.filter((u) => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'ADMIN') return u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
    return u.role === roleFilter;
  });

  const handleToggleRecipient = (user: RecipientUser) => {
    const isSelected = selectedRecipients.some((r) => r.id === user.id);
    if (isSelected) {
      setSelectedRecipients((prev) => prev.filter((r) => r.id !== user.id));
    } else {
      setSelectedRecipients((prev) => [...prev, user]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newAdditions = filteredRecipients.filter(
      (u) => !selectedRecipients.some((r) => r.id === u.id),
    );
    setSelectedRecipients((prev) => [...prev, ...newAdditions]);
  };

  const handleSelectGroup = (groupRole: 'ALL' | 'EDITOR' | 'AUTHOR' | 'ADMIN') => {
    let targetUsers = availableRecipients;
    if (groupRole === 'ADMIN') {
      targetUsers = availableRecipients.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    } else if (groupRole !== 'ALL') {
      targetUsers = availableRecipients.filter((u) => u.role === groupRole);
    }
    const newAdditions = targetUsers.filter(
      (u) => !selectedRecipients.some((r) => r.id === u.id),
    );
    setSelectedRecipients((prev) => [...prev, ...newAdditions]);
  };

  const handleClearAllRecipients = () => {
    setSelectedRecipients([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and initial message content.');
      return;
    }

    const recipientIds = selectedRecipients.map((r) => r.id);

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      case 'EDITOR':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'AUTHOR':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-stone-900 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div>
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Compose Editorial Dispatch & Inquiries
          </h2>
          <p className="text-xs text-stone-500 font-serif italic">
            Initiate formal staff inquiries, manuscript review threads, editorial memos, or broadcast notices
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded cursor-pointer"
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

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
        {/* Row 1: Dispatch Type & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
              Dispatch Type ({11} Available Modes)
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2.5 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-600 outline-hidden"
            >
              <optgroup label="Direct & Staff Dialogues">
                <option value="DIRECT">Direct Staff Message</option>
                <option value="EDITORIAL_INQUIRY">Editorial Revision & Feedback Inquiry</option>
                <option value="EDITORIAL_MEMO">Editorial Board Memo (Staff & Editors)</option>
              </optgroup>
              <optgroup label="Platform & Announcements">
                <option value="PLATFORM_ANNOUNCEMENT">Platform Announcement (All Members)</option>
                <option value="POLICY_UPDATE">Terms & Editorial Policy Update</option>
                <option value="SECURITY_BULLETIN">Security Warning & Account Alert</option>
              </optgroup>
              <optgroup label="Review & Journalism Governance">
                <option value="PEER_REVIEW">Peer Review & Manuscript Pitch</option>
                <option value="FACT_CHECK">Fact-Checking & Source Verification</option>
                <option value="CORRECTION_NOTICE">Article Correction / Retraction Notice</option>
                <option value="DMCA_DISPUTE">Copyright / DMCA Dispute</option>
                <option value="SUPPORT_TICKET">Author / Reader Support Ticket</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
              Priority Classification
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full p-2.5 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-600 outline-hidden"
            >
              <option value="LOW">Low (Background & Informational)</option>
              <option value="NORMAL">Normal (Standard Desk Queue)</option>
              <option value="HIGH">High (Review Queue Priority)</option>
              <option value="URGENT">Urgent (Immediate Action Required)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Recipients / Participants Section */}
        <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-stone-50/50 dark:bg-stone-850/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-700 dark:text-amber-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">
                Recipients & Participants
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 rounded-full">
                {selectedRecipients.length} Selected
              </span>
            </div>

            {/* Quick Group Selection Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded font-serif text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Select All Filtered
              </button>
              <button
                type="button"
                onClick={() => handleSelectGroup('EDITOR')}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 rounded font-serif text-[11px] font-medium transition-colors cursor-pointer"
              >
                + All Editors
              </button>
              <button
                type="button"
                onClick={() => handleSelectGroup('AUTHOR')}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 rounded font-serif text-[11px] font-medium transition-colors cursor-pointer"
              >
                + All Authors
              </button>
              <button
                type="button"
                onClick={() => handleSelectGroup('ADMIN')}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-300 rounded font-serif text-[11px] font-medium transition-colors cursor-pointer"
              >
                + Admins
              </button>
              {selectedRecipients.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRecipients}
                  className="px-2 py-1 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 font-mono text-[11px] cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Selected Chips Bar */}
          {selectedRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg max-h-24 overflow-y-auto">
              {selectedRecipients.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 rounded-md text-xs font-serif text-stone-800 dark:text-stone-200 shadow-2xs"
                >
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-stone-100 dark:bg-stone-900 text-stone-500 rounded">
                    {r.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleRecipient(r)}
                    className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search Input & Role Tabs Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search staff, editors, authors by name or email..."
                className="w-full pl-9 pr-3 py-2 text-xs font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 outline-hidden focus:ring-1 focus:ring-amber-600"
              />
              {recipientSearch && (
                <button
                  type="button"
                  onClick={() => setRecipientSearch('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Tabs */}
            <div className="sm:col-span-5 flex items-center bg-stone-200/60 dark:bg-stone-800 rounded-lg p-0.5 text-xs font-serif">
              {(['ALL', 'EDITOR', 'AUTHOR', 'ADMIN'] as const).map((tab) => {
                const isActive = roleFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRoleFilter(tab)}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-all text-center cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-semibold'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab === 'ADMIN' ? 'Admins' : tab === 'EDITOR' ? 'Editors' : 'Authors'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive User Cards Selector List */}
          <div className="max-h-44 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800/80">
            {loadingRecipients ? (
              <div className="p-4 text-xs text-stone-400 text-center font-serif">Loading members directory...</div>
            ) : filteredRecipients.length === 0 ? (
              <div className="p-4 text-xs text-stone-400 text-center font-serif">No users match current search and filter.</div>
            ) : (
              filteredRecipients.map((u) => {
                const isSelected = selectedRecipients.some((r) => r.id === u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => handleToggleRecipient(u)}
                    className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/20'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-serif text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-amber-700 text-white'
                            : 'bg-stone-200 dark:bg-stone-750 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {u.name}
                        </div>
                        <div className="text-[10px] font-mono text-stone-500 truncate">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono uppercase rounded border font-semibold ${getRoleBadgeColor(
                          u.role,
                        )}`}
                      >
                        {u.role}
                      </span>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Row 3: Subject Heading */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
            Subject Heading
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Manuscript Revision: Quantum Computing Chapter 4"
            className="w-full p-2.5 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold focus:ring-2 focus:ring-amber-600 outline-hidden"
          />
        </div>

        {/* Row 4: Message Body with Markdown Helper & Character Counter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold">
              Initial Message Dispatch
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowMarkdownTips(!showMarkdownTips)}
                className="flex items-center gap-1 text-stone-500 hover:text-amber-700 dark:hover:text-amber-400 font-serif text-[11px] cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Markdown Formatting</span>
              </button>
              <span className="text-[10px] font-mono text-stone-400">
                {message.length} / 10,000
              </span>
            </div>
          </div>

          {showMarkdownTips && (
            <div className="mb-2 p-2.5 bg-stone-100 dark:bg-stone-800 rounded text-[11px] font-mono text-stone-600 dark:text-stone-400 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>**bold** &rarr; <b>bold</b></div>
              <div>*italic* &rarr; <i>italic</i></div>
              <div># Title &rarr; Heading</div>
              <div>[Link](url) &rarr; hyperlink</div>
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your correspondence, revision directives, or policy notes here (Markdown supported)..."
            rows={5}
            maxLength={10000}
            className="w-full p-3 text-sm font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-y focus:ring-2 focus:ring-amber-600 outline-hidden"
          />
        </div>

        {/* Row 5: Action Link & Button Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
              Action Link (Optional)
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://... or /articles/quantum-computing"
              className="w-full p-2 text-xs font-mono border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
              Action Button Label (Optional)
            </label>
            <input
              type="text"
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              placeholder="e.g. Inspect Manuscript or Review Case"
              className="w-full p-2 text-xs font-serif border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-serif text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-serif text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Dispatch</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
