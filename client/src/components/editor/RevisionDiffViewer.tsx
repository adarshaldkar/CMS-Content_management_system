import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitCommit,
  Columns,
  AlignLeft,
  RotateCcw,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  GitCompare,
} from 'lucide-react';
import { computeWordDiff, extractPlainTextFromHtml } from '../../utils/diffEngine';
import { getArticleRevisions } from '../../api/articles.api';
import type { ArticleRevision } from '../../types';

export interface RevisionSnapshot {
  id: string;
  version: number;
  title: string;
  content: string;
  authorName?: string;
  createdAt: string;
  wordCount?: number;
}

export interface RevisionDiffViewerProps {
  baseRevision?: RevisionSnapshot; // older snapshot (v1)
  targetRevision?: RevisionSnapshot; // newer snapshot (v2)
  articleId?: string;
  articleTitle?: string;
  currentContent?: string;
  currentTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onRollback?: (targetVersion: RevisionSnapshot) => Promise<void>;
  onRestoreRevision?: (revisionId: string, versionNumber: number) => Promise<void>;
}

export const RevisionDiffViewer: React.FC<RevisionDiffViewerProps> = ({
  baseRevision: initialBase,
  targetRevision: initialTarget,
  articleId,
  articleTitle = 'Manuscript',
  currentContent = '',
  currentTitle = '',
  isOpen,
  onClose,
  onRollback,
  onRestoreRevision,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [revisions, setRevisions] = useState<RevisionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('current');
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [isRollbackPending, setIsRollbackPending] = useState(false);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);

  // Fetch revisions if articleId is provided
  useEffect(() => {
    if (isOpen && articleId) {
      setLoading(true);
      getArticleRevisions(articleId)
        .then((data: ArticleRevision[]) => {
          const mapped: RevisionSnapshot[] = data.map((r) => ({
            id: r.id,
            version: r.version,
            title: r.title || 'Untitled',
            content: r.content || '',
            createdAt: r.createdAt,
            wordCount: (r as any).wordCount || 0,
          }));
          setRevisions(mapped);
          if (mapped.length > 0) {
            // Default base is previous snapshot or first snapshot
            setSelectedBaseId(mapped[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, articleId]);

  // Derive active base snapshot
  const activeBase: RevisionSnapshot = useMemo(() => {
    if (initialBase) return initialBase;
    if (selectedBaseId) {
      const found = revisions.find((r) => r.id === selectedBaseId);
      if (found) return found;
    }
    if (revisions.length > 0) return revisions[0];
    return {
      id: 'base-empty',
      version: 0,
      title: 'Original',
      content: '',
      createdAt: new Date().toISOString(),
    };
  }, [initialBase, selectedBaseId, revisions]);

  // Derive active target snapshot
  const activeTarget: RevisionSnapshot = useMemo(() => {
    if (initialTarget) return initialTarget;
    if (selectedTargetId === 'current') {
      return {
        id: 'current-draft',
        version: activeBase.version > 0 ? activeBase.version + 1 : 1,
        title: currentTitle || articleTitle,
        content: currentContent,
        createdAt: new Date().toISOString(),
      };
    }
    const found = revisions.find((r) => r.id === selectedTargetId);
    if (found) return found;
    return {
      id: 'target-current',
      version: 1,
      title: currentTitle || articleTitle,
      content: currentContent,
      createdAt: new Date().toISOString(),
    };
  }, [initialTarget, selectedTargetId, currentTitle, articleTitle, currentContent, revisions, activeBase.version]);

  const baseText = useMemo(
    () => extractPlainTextFromHtml(activeBase.content),
    [activeBase.content]
  );
  const targetText = useMemo(
    () => extractPlainTextFromHtml(activeTarget.content),
    [activeTarget.content]
  );

  const diffResult = useMemo(
    () => computeWordDiff(baseText, targetText),
    [baseText, targetText]
  );

  const handleRollbackConfirm = async () => {
    setIsRollbackPending(true);
    try {
      if (onRestoreRevision && activeBase.id && activeBase.id !== 'base-empty') {
        await onRestoreRevision(activeBase.id, activeBase.version);
      } else if (onRollback) {
        await onRollback(activeBase);
      }
      setRollbackSuccess(true);
      setTimeout(() => {
        setRollbackSuccess(false);
        setShowRollbackConfirm(false);
        onClose();
      }, 1000);
    } catch {
      // handled by caller
    } finally {
      setIsRollbackPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editorial Revision Diff Viewer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Main Diff Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-6xl max-h-[90vh] bg-white border border-border-subtle shadow-2xl flex flex-col z-10 font-sans overflow-hidden"
        style={{ borderRadius: 2 }}
      >
        {/* Header Bar */}
        <div className="p-4 bg-canvas-paper border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare size={18} className="text-accent-crimson" />
              <h2 className="font-editorial text-lg font-bold text-ink-primary">
                Editorial Visual Revision Diff
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 bg-canvas-subtle border border-border-subtle text-ink-secondary rounded-sm">
                {articleTitle}
              </span>
            </div>

            {/* Version Selectors */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-secondary mt-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink-primary">Base Version:</span>
                {revisions.length > 0 ? (
                  <select
                    value={selectedBaseId}
                    onChange={(e) => setSelectedBaseId(e.target.value)}
                    className="p-1 text-xs font-mono bg-white border border-border-subtle focus:outline-none focus:border-ink-primary"
                    style={{ borderRadius: 2 }}
                  >
                    {revisions.map((rev) => (
                      <option key={rev.id} value={rev.id}>
                        v{rev.version} — {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({rev.title})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold">v{activeBase.version}</span>
                )}
              </div>

              <span className="text-border-subtle font-mono">→</span>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-accent-crimson">Compared Against:</span>
                {revisions.length > 0 ? (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="p-1 text-xs font-mono bg-white border border-border-subtle focus:outline-none focus:border-ink-primary"
                    style={{ borderRadius: 2 }}
                  >
                    <option value="current">Current Active Manuscript / Draft</option>
                    {revisions.map((rev) => (
                      <option key={rev.id} value={rev.id}>
                        v{rev.version} ({new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold">v{activeTarget.version} (Active)</span>
                )}
              </div>
            </div>
          </div>

          {/* Action & View Mode Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded border border-border-subtle p-0.5 bg-canvas-subtle">
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-2.5 py-1 text-xs font-mono flex items-center gap-1 transition-colors ${
                  viewMode === 'unified'
                    ? 'bg-ink-primary text-white font-bold'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <AlignLeft size={12} /> Unified
              </button>

              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 text-xs font-mono flex items-center gap-1 transition-colors ${
                  viewMode === 'split'
                    ? 'bg-ink-primary text-white font-bold'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <Columns size={12} /> Side-by-Side
              </button>
            </div>

            {/* Non-Destructive Rollback Button */}
            {(onRestoreRevision || onRollback) && activeBase.version > 0 && (
              <button
                type="button"
                onClick={() => setShowRollbackConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono bg-white border border-border-subtle text-ink-primary hover:border-accent-crimson hover:text-accent-crimson transition-colors shadow-xs"
                style={{ borderRadius: 2 }}
              >
                <RotateCcw size={12} />
                <span>Revert to v{activeBase.version}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-ink-secondary hover:text-ink-primary p-1.5 ml-1 transition-colors"
              title="Close diff viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Delta Statistics Strip */}
        <div className="px-4 py-2.5 bg-canvas-subtle border-b border-border-subtle flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-emerald-700 font-bold">
              +{diffResult.addedWords} words added
            </span>
            <span className="text-accent-crimson font-bold">
              -{diffResult.removedWords} words removed
            </span>
            <span className="text-ink-secondary">
              Net Delta:{' '}
              <strong className={diffResult.wordCountDelta >= 0 ? 'text-emerald-700' : 'text-accent-crimson'}>
                {diffResult.wordCountDelta > 0 ? `+${diffResult.wordCountDelta}` : diffResult.wordCountDelta} words
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-ink-secondary">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 inline-block" /> Insertions
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-400 inline-block" /> Deletions
            </span>
          </div>
        </div>

        {/* Diff Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 font-serif text-base leading-relaxed select-text bg-white">
          {loading ? (
            <div className="py-24 text-center text-xs font-mono text-ink-secondary flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-ink-primary" /> Loading snapshot records…
            </div>
          ) : viewMode === 'unified' ? (
            /* Unified Inline Diff View */
            <div className="prose prose-slate max-w-none whitespace-pre-wrap font-serif text-ink-primary">
              {diffResult.tokens.map((token, idx) => {
                if (token.type === 'added') {
                  return (
                    <ins
                      key={idx}
                      className="bg-emerald-50 text-emerald-900 border-b border-emerald-500 no-underline px-0.5"
                    >
                      <span className="sr-only">[Added: ]</span>
                      {token.value}
                    </ins>
                  );
                } else if (token.type === 'removed') {
                  return (
                    <del
                      key={idx}
                      className="bg-rose-50 text-rose-900 border-b border-rose-400 line-through opacity-75 px-0.5"
                    >
                      <span className="sr-only">[Deleted: ]</span>
                      {token.value}
                    </del>
                  );
                } else {
                  return <span key={idx}>{token.value}</span>;
                }
              })}
            </div>
          ) : (
            /* Split Side-by-Side Diff View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
              {/* Left: Previous Revision Base */}
              <div className="space-y-2 pr-0 md:pr-4">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-ink-secondary border-b border-border-subtle pb-1">
                  <span>SNAPSHOT v{activeBase.version}</span>
                  <span>{new Date(activeBase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm text-ink-secondary leading-relaxed font-serif">
                  {baseText || 'Empty draft.'}
                </div>
              </div>

              {/* Right: Target Revision */}
              <div className="space-y-2 pt-4 md:pt-0 md:pl-4">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-accent-crimson border-b border-border-subtle pb-1">
                  <span>{selectedTargetId === 'current' ? 'CURRENT MANUSCRIPT (ACTIVE)' : `SNAPSHOT v${activeTarget.version}`}</span>
                  <span>{new Date(activeTarget.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm text-ink-primary leading-relaxed font-serif">
                  {targetText || 'Empty draft.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Non-Destructive Rollback Confirmation Modal */}
        <AnimatePresence>
          {showRollbackConfirm && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-border-subtle p-6 max-w-md w-full shadow-2xl space-y-4 text-xs font-sans"
                style={{ borderRadius: 2 }}
              >
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>Confirm Non-Destructive Rollback</span>
                </div>

                <p className="text-ink-secondary leading-relaxed font-sans">
                  This will generate a brand-new draft revision cloning the content from Snapshot <strong>v{activeBase.version}</strong>.
                </p>

                <p className="text-[11px] text-ink-secondary font-mono">
                  All intermediate versions remain permanently preserved in the immutable revision audit log.
                </p>

                {rollbackSuccess ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-2 font-mono">
                    <CheckCircle2 size={16} />
                    <span>Rollback revision created successfully!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setShowRollbackConfirm(false)}
                      disabled={isRollbackPending}
                      className="px-3.5 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRollbackConfirm}
                      disabled={isRollbackPending}
                      className="px-4 py-1.5 bg-accent-crimson hover:bg-rose-900 text-white text-xs font-semibold tracking-wide transition-colors"
                      style={{ borderRadius: 2 }}
                    >
                      {isRollbackPending ? 'Creating Snapshot…' : 'Confirm Rollback'}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
