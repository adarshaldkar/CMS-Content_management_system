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

const statusConfig: Record<ArticleStatus, { label: string; dot: string }> = {
  draft: { label: 'Draft', dot: 'bg-slate-400' },
  pending_review: { label: 'Pending Review', dot: 'bg-amber-400' },
  approved: { label: 'Approved', dot: 'bg-sky-500' },
  scheduled: { label: 'Scheduled', dot: 'bg-violet-500' },
  published: { label: 'Published', dot: 'bg-emerald-500' },
  archived: { label: 'Archived', dot: 'bg-slate-400' },
  rejected: { label: 'Changes Requested', dot: 'bg-rose-500' },
};

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

  const current = statusConfig[status] || statusConfig.draft;

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
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-white border border-border-subtle" style={{ borderRadius: 2 }}>
        {/* Status & Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${current.dot}`} />
            <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-semibold">
              {current.label}
            </span>
            <span className="font-mono text-[11px] text-ink-secondary tabular-nums">v{version}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-ink-secondary border-l border-border-subtle pl-3">
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>{readingTimeMinutes} min read</span>
          </div>
        </div>

        {/* Workflow Transition Actions */}
        <div className="flex items-center gap-2">
          {status === 'draft' && (
            <button
              onClick={() => onTransition('pending_review')}
              disabled={loading}
              className="px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
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
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                style={{ borderRadius: 2 }}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
              <button
                onClick={() => setRejectModalOpen(true)}
                disabled={loading}
                className="px-3.5 py-1.5 text-rose-700 border border-rose-300 hover:bg-rose-50 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                style={{ borderRadius: 2 }}
              >
                <XCircle className="w-3.5 h-3.5" /> Request Changes
              </button>
            </>
          )}

          {status === 'approved' && (
            <>
              <button
                onClick={() => onTransition('published')}
                disabled={loading}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                style={{ borderRadius: 2 }}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Publish Now
              </button>
              <button
                onClick={() => setScheduleModalOpen(true)}
                disabled={loading}
                className="px-3.5 py-1.5 border border-border-subtle text-ink-primary hover:bg-slate-50 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                style={{ borderRadius: 2 }}
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </button>
            </>
          )}

          {status === 'published' && (
            <button
              onClick={() => onTransition('archived')}
              disabled={loading}
              className="px-3.5 py-1.5 border border-border-subtle text-ink-secondary hover:text-ink-primary text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <Archive className="w-3.5 h-3.5" /> Archive Story
            </button>
          )}

          {status === 'archived' && (
            <button
              onClick={() => onTransition('draft')}
              disabled={loading}
              className="px-3.5 py-1.5 border border-border-subtle text-ink-primary hover:bg-slate-50 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-open Draft
            </button>
          )}

          {status === 'rejected' && (
            <button
              onClick={() => onTransition('draft')}
              disabled={loading}
              className="px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <FileEdit className="w-3.5 h-3.5" /> Edit Draft & Resubmit
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white border border-border-subtle w-full max-w-md p-6 shadow-xl space-y-4" style={{ borderRadius: 2 }}>
            <h3 className="font-editorial text-lg font-bold text-ink-primary">Editorial Feedback Note</h3>
            <p className="text-xs text-ink-secondary">
              Provide specific guidance for the author detailing required changes before publication.
            </p>
            <textarea
              rows={4}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Please clarify citations in section 2 and provide a stronger lead paragraph..."
              className="w-full bg-white border border-border-subtle p-3 text-xs text-ink-primary focus:outline-none focus:border-ink-primary transition-colors"
              style={{ borderRadius: 2 }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                style={{ borderRadius: 2 }}
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white border border-border-subtle w-full max-w-md p-6 shadow-xl space-y-4" style={{ borderRadius: 2 }}>
            <h3 className="font-editorial text-lg font-bold text-ink-primary">Schedule Publication</h3>
            <p className="text-xs text-ink-secondary">
              Select date and time for automated release.
            </p>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-white border border-border-subtle p-2 text-xs text-ink-primary focus:outline-none focus:border-ink-primary"
              style={{ borderRadius: 2 }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                style={{ borderRadius: 2 }}
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
