import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  X,
  Send,
  Info,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { EditorialValidationEngine } from '../../services/editorial-validation.service';

export interface PrePublishAuditData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  categoryIds: string[];
  tags: string[];
  wordCount: number;
}

interface PrePublishChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void;
  data: PrePublishAuditData;
  isPublishing?: boolean;
}

export const PrePublishChecklistModal: React.FC<PrePublishChecklistModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  data,
  isPublishing = false,
}) => {
  const auditReport = useMemo(() => {
    return EditorialValidationEngine.audit({
      title: data.title,
      description: data.excerpt,
      content: data.content,
      slug: data.slug,
      categoryId: data.categoryIds[0] || '',
      coverImage: data.featuredImageUrl,
    });
  }, [data]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Quality Score */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              auditReport.isPublishable ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
            }`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                  Pre-Publish Editorial Gate
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {auditReport.score}% Quality Score
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {auditReport.isPublishable
                  ? 'All mandatory journalistic requirements passed'
                  : `${auditReport.blockingCount} blocking item(s) require resolution before publishing`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>{auditReport.metrics.wordCount} words</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>~{auditReport.metrics.readingTimeMinutes} min read</span>
          </div>
          <div>
            <span>{auditReport.metrics.headingsCount} headings</span>
          </div>
          <div>
            <span>{auditReport.metrics.imagesCount} images</span>
          </div>
        </div>

        {/* Validation Items List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {auditReport.items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all ${
                item.passed
                  ? 'bg-emerald-50/30 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                  : item.severity === 'BLOCKING'
                  ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
                  : item.severity === 'WARNING'
                  ? 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40'
                  : 'bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : item.severity === 'BLOCKING' ? (
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                ) : item.severity === 'WARNING' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Info className="h-4 w-4 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                      item.passed
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : item.severity === 'BLOCKING'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : item.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.passed ? 'PASSED' : item.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {item.description}
                </p>
                {!item.passed && item.remediation && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
                    → {item.remediation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            Back to Manuscript
          </button>

          <button
            type="button"
            disabled={!auditReport.isPublishable || isPublishing}
            onClick={() => {
              onConfirmPublish();
              onClose();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer ${
              auditReport.isPublishable
                ? 'bg-rose-800 text-white hover:bg-rose-900 dark:bg-rose-700 dark:hover:bg-rose-800'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {isPublishing ? (
              <span>Publishing…</span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Confirm &amp; Publish Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
