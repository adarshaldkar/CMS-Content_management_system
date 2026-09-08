import React from 'react';
import { AlertTriangle, Save, LogOut, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscardAndLeave: () => void;
  onSaveAndLeave: () => Promise<void> | void;
  isSaving?: boolean;
  articleTitle?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onKeepEditing,
  onDiscardAndLeave,
  onSaveAndLeave,
  isSaving = false,
  articleTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl border border-border-subtle overflow-hidden font-sans">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent border-b border-amber-200/70 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-2xs shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-800 font-bold block">
                Editorial Protection
              </span>
              <h3 className="font-serif text-base font-bold text-ink-primary">
                Unsaved Manuscript Edits
              </h3>
            </div>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-amber-100/80 text-amber-800 border border-amber-300 font-medium">
            Action Required
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-sm text-ink-primary">
          <p className="text-ink-secondary leading-relaxed">
            You have unsaved changes in <strong className="text-ink-primary">"{articleTitle || 'Untitled Manuscript'}"</strong>.
            If you navigate away without saving, these changes will not be committed to the newsroom database.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-ink-secondary space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-ink-primary">
              <Sparkles size={13} className="text-accent-crimson" />
              <span>Gazette Auto-Recovery Protected</span>
            </div>
            <p>
              A local snapshot of your edits is cached in your browser so you won't lose your work if closed accidentally.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 border-t border-border-subtle px-6 py-4 bg-slate-50/80">
          <button
            type="button"
            onClick={onKeepEditing}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-slate-200/70 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Keep Editing</span>
          </button>

          <button
            type="button"
            onClick={onDiscardAndLeave}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Discard & Leave</span>
          </button>

          <button
            type="button"
            onClick={onSaveAndLeave}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-accent-crimson hover:bg-accent-crimson/90 rounded shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving Draft…</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save & Leave</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
