import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { getArticleRevisions, restoreArticleRevision } from '../../api/articles.api';
import type { ArticleRevision } from '../../types';
import { sanitizeHtml } from '../../utils/sanitize';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  articleId: string;
  onClose: () => void;
  onRestored: () => void;
}

export const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  isOpen,
  articleId,
  onClose,
  onRestored,
}) => {
  const [revisions, setRevisions] = useState<ArticleRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<ArticleRevision | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && articleId) {
      void fetchRevisions();
    }
  }, [isOpen, articleId]);

  const fetchRevisions = async () => {
    try {
      setLoading(true);
      const data = await getArticleRevisions(articleId);
      setRevisions(data);
      if (data.length > 0) {
        setSelectedRevision(data[0]);
      }
    } catch {
      // safe ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRestore = async (revision: ArticleRevision) => {
    if (
      !confirm(
        `Are you sure you want to restore Version v${revision.version}? This will safely create a new version snapshot containing this content.`,
      )
    ) {
      return;
    }

    try {
      setRestoring(true);
      await restoreArticleRevision(articleId, revision.id);
      onRestored();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore revision.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-sans">
      <div
        className="bg-white border border-border-subtle w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ borderRadius: 2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas-paper">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-0.5">
              Audit & Version History
            </p>
            <h2 className="font-editorial text-lg font-semibold text-ink-primary">
              Immutable Version Snapshots
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-secondary hover:text-ink-primary p-1.5 transition-colors"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Revisions List */}
          <div className="md:col-span-4 border-r border-border-subtle overflow-y-auto bg-canvas-paper p-3 space-y-1">
            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-ink-secondary flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-ink-primary" /> Loading versions…
              </div>
            ) : revisions.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-secondary font-editorial italic">
                No previous snapshots recorded yet.
              </div>
            ) : (
              revisions.map((rev) => (
                <button
                  key={rev.id}
                  onClick={() => setSelectedRevision(rev)}
                  className={`w-full text-left p-3 border transition-colors ${
                    selectedRevision?.id === rev.id
                      ? 'bg-white border-ink-primary text-ink-primary'
                      : 'bg-transparent border-transparent text-ink-secondary hover:bg-white hover:text-ink-primary'
                  }`}
                  style={{ borderRadius: 2 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-ink-primary">
                      v{rev.version}
                    </span>
                    <span className="text-[10px] font-mono text-ink-secondary">
                      {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary truncate font-serif">
                    {rev.title || 'Untitled Snapshot'}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Revision Preview Details */}
          <div className="md:col-span-8 flex flex-col overflow-hidden bg-white">
            {selectedRevision ? (
              <>
                <div className="p-5 border-b border-border-subtle bg-canvas-paper flex items-center justify-between">
                  <div>
                    <h3 className="font-editorial text-base font-semibold text-ink-primary">
                      v{selectedRevision.version} — {selectedRevision.title}
                    </h3>
                    <p className="text-[11px] font-mono text-ink-secondary mt-0.5">
                      Created {new Date(selectedRevision.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(selectedRevision)}
                    disabled={restoring}
                    className="px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>Restore v{selectedRevision.version}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <h1 className="font-editorial text-2xl font-bold text-ink-primary">
                    {selectedRevision.title}
                  </h1>
                  <div
                    className="prose prose-slate max-w-none text-sm text-ink-primary font-sans leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedRevision.content) }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-ink-secondary font-editorial italic">
                Select a version from the left panel to inspect snapshot.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
