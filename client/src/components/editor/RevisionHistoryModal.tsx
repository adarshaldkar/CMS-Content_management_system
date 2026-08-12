import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { getArticleRevisions, restoreArticleRevision } from '../../api/articles.api';
import type { ArticleRevision } from '../../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Revision History</h2>
              <p className="text-xs text-slate-400">
                Inspect immutable version snapshots and roll back safely
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Revision Timeline */}
          <div className="w-1/3 border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/30">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Loading history...
              </div>
            ) : revisions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12">No revision history found.</p>
            ) : (
              revisions.map((rev) => (
                <div
                  key={rev.id}
                  onClick={() => setSelectedRevision(rev)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedRevision?.id === rev.id
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/20">
                      v{rev.version}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(rev.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">{rev.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {rev.changeSummary || 'Snapshot recorded'}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Revision Snapshot Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/60 p-6">
            {selectedRevision ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Version {selectedRevision.version}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Immutable Snapshot
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Created: {new Date(selectedRevision.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestore(selectedRevision)}
                    disabled={restoring}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow transition"
                  >
                    {restoring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> Restore This Version
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Title
                    </label>
                    <h1 className="text-lg font-serif text-white font-bold mt-1">
                      {selectedRevision.title}
                    </h1>
                  </div>

                  {selectedRevision.description && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Excerpt
                      </label>
                      <p className="text-xs text-slate-300 italic mt-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                        {selectedRevision.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Snapshot Content
                    </label>
                    <div
                      className="mt-2 text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedRevision.content }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Select a revision from the left to view its snapshot.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
