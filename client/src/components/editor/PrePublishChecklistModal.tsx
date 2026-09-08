import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  X,
  Send,
} from 'lucide-react';

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

interface CheckItem {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warn' | 'fail';
}

export const PrePublishChecklistModal: React.FC<PrePublishChecklistModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  data,
  isPublishing = false,
}) => {
  if (!isOpen) return null;

  // Dynamic checks evaluation
  const checks: CheckItem[] = [
    {
      id: 'title',
      title: 'Article Headline',
      description:
        data.title.trim().length > 10
          ? `Strong headline (${data.title.trim().length} chars)`
          : data.title.trim().length > 0
          ? 'Headline is somewhat short'
          : 'Headline is missing',
      status: data.title.trim().length > 10 ? 'pass' : data.title.trim().length > 0 ? 'warn' : 'fail',
    },
    {
      id: 'cover',
      title: 'Featured Cover Visual',
      description: data.featuredImageUrl ? 'Lead visual asset attached' : 'No lead image assigned (recommended for social cards)',
      status: data.featuredImageUrl ? 'pass' : 'warn',
    },
    {
      id: 'content',
      title: 'Manuscript Length',
      description:
        data.wordCount >= 100
          ? `Comprehensive story length (${data.wordCount} words)`
          : data.wordCount > 20
          ? `Short piece (${data.wordCount} words)`
          : 'Manuscript has very little or no content',
      status: data.wordCount >= 100 ? 'pass' : data.wordCount > 20 ? 'warn' : 'fail',
    },
    {
      id: 'excerpt',
      title: 'SEO Excerpt & Social Deck',
      description:
        data.excerpt && data.excerpt.length >= 50
          ? `SEO summary configured (${data.excerpt.length} chars)`
          : data.excerpt
          ? 'SEO summary is brief (<50 chars)'
          : 'No custom excerpt provided (will fallback to auto-slice)',
      status: data.excerpt && data.excerpt.length >= 50 ? 'pass' : 'warn',
    },
    {
      id: 'taxonomy',
      title: 'Category & Story Taxonomy',
      description:
        data.categoryIds.length > 0
          ? `Assigned to ${data.categoryIds.length} editorial category`
          : 'No category assigned (will default to General)',
      status: data.categoryIds.length > 0 ? 'pass' : 'warn',
    },
    {
      id: 'tags',
      title: 'Topic Tags & Indexing',
      description:
        data.tags.length > 0
          ? `${data.tags.length} topic tags attached`
          : 'No tags attached (recommended for related story discovery)',
      status: data.tags.length > 0 ? 'pass' : 'warn',
    },
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const canPublish = failCount === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border-subtle bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-rose-100 text-accent-crimson">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-ink-primary">Pre-Publish Quality Gate</h3>
              <p className="text-xs text-ink-secondary">
                {passCount} of {checks.length} quality standards passed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-ink-secondary hover:bg-slate-200 hover:text-ink-primary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Checklist */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                check.status === 'pass'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : check.status === 'warn'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {check.status === 'pass' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : check.status === 'warn' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-primary">{check.title}</span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-medium ${
                      check.status === 'pass'
                        ? 'bg-emerald-100 text-emerald-800'
                        : check.status === 'warn'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <p className="text-[11px] text-ink-secondary mt-0.5">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3.5 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary cursor-pointer"
          >
            Back to Manuscript
          </button>

          <button
            type="button"
            disabled={!canPublish || isPublishing}
            onClick={() => {
              onConfirmPublish();
              onClose();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded shadow-xs transition-colors cursor-pointer ${
              canPublish
                ? 'bg-accent-crimson text-white hover:bg-accent-crimson/90'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isPublishing ? (
              <span>Publishing...</span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Confirm & Publish Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
