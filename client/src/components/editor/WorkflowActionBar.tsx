import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  Globe,
  Calendar,
  Archive,
  RotateCcw,
  Loader2,
  FileEdit,
} from 'lucide-react';
import type { ArticleStatus } from '../../types';

interface WorkflowActionBarProps {
  status: ArticleStatus;
  version: number;
  wordCount: number;
  readingTimeMinutes: number;
  loading: boolean;
  onTransition: (targetStatus: ArticleStatus, note?: string, scheduledAt?: string) => Promise<void>;
}

export const WorkflowActionBar: React.FC<WorkflowActionBarProps> = ({
  status,
  version,
  wordCount,
  readingTimeMinutes,
  loading,
  onTransition,
}) => {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const statusBadges: Record<ArticleStatus, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-slate-700/40 border-slate-600/50', text: 'text-slate-300' },
    pending_review: {
      label: 'Pending Review',
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
    },
    approved: {
      label: 'Approved',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
    },
    scheduled: {
      label: 'Scheduled',
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-400',
    },
    published: {
      label: 'Published',
      bg: 'bg-green-500/10 border-green-500/30',
      text: 'text-green-400',
    },
    archived: {
      label: 'Archived',
      bg: 'bg-slate-800/80 border-slate-700',
      text: 'text-slate-400',
    },
    rejected: {
      label: 'Changes Requested',
      bg: 'bg-rose-500/10 border-rose-500/30',
      text: 'text-rose-400',
    },
  };

  const currentBadge = statusBadges[status] || statusBadges.draft;

  const handleConfirmReject = async () => {
    if (!rejectNote.trim()) {
      alert('Please enter a feedback note for the author.');
      return;
    }
    await onTransition('rejected', rejectNote);
    setRejectModalOpen(false);
    setRejectNote('');
  };

  const handleConfirmSchedule = async () => {
    if (!scheduledDate) {
      alert('Please choose a valid future release date.');
      return;
    }
    await onTransition('scheduled', undefined, scheduledDate);
    setScheduleModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md shadow-xl">
        {/* Status Pill & Telemetry */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${currentBadge.bg} ${currentBadge.text}`}
            >
              {currentBadge.label}
            </span>
            <span className="text-xs font-semibold text-slate-400">v{version}</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 border-l border-slate-800 pl-4">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{readingTimeMinutes} min read</span>
          </div>
        </div>

        {/* Workflow Transition Actions */}
        <div className="flex items-center gap-2">
          {status === 'draft' && (
            <button
              onClick={() => onTransition('pending_review')}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit for Review
            </button>
          )}

          {status === 'pending_review' && (
            <>
              <button
                onClick={() => onTransition('approved')}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={loading}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}

          {status === 'approved' && (
            <>
              <button
                onClick={() => onTransition('published')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Publish Now
              </button>
              <button
                onClick={() => setScheduleModalOpen(true)}
                disabled={loading}
                className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </button>
            </>
          )}

          {status === 'published' && (
            <button
              onClick={() => onTransition('archived')}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          )}

          {status === 'archived' && (
            <button
              onClick={() => onTransition('draft')}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore to Draft
            </button>
          )}

          {status === 'rejected' && (
            <button
              onClick={() => onTransition('draft')}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition"
            >
              <FileEdit className="w-3.5 h-3.5" /> Edit Draft & Resubmit
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Editorial Feedback & Rejection Note</h3>
            <p className="text-xs text-slate-400">
              Provide feedback for the author detailing required changes before resubmission.
            </p>
            <textarea
              rows={4}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Please verify citations and clarify paragraph 3..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Schedule Release Date</h3>
            <p className="text-xs text-slate-400">
              Select the date and time when the publishing worker should automatically release this article.
            </p>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
