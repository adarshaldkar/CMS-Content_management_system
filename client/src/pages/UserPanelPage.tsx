import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileEdit, Clock, FileText } from 'lucide-react';
import { PublicLayout } from '@/components/layout/SiteHeader';
import { listArticles } from '../api/articles.api';
import type { Article, ArticleStatus } from '../types';

export function UserPanelPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ArticleStatus | 'all'>('all');

  useEffect(() => {
    void fetchArticles();
  }, [activeFilter]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await listArticles({
        limit: 50,
        status: activeFilter === 'all' ? undefined : activeFilter,
      });
      setArticles(res.items);
    } catch {
      // safe ignore
    } finally {
      setLoading(false);
    }
  };

  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-slate-800 border-slate-700', text: 'text-slate-300' },
    pending_review: { label: 'Pending Review', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
    approved: { label: 'Approved', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
    scheduled: { label: 'Scheduled', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
    published: { label: 'Published', bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400' },
    archived: { label: 'Archived', bg: 'bg-slate-900 border-slate-800', text: 'text-slate-500' },
    rejected: { label: 'Changes Requested', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400' },
  };

  return (
    <PublicLayout>
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              Author Dashboard · Phase 4 Ready
            </span>
            <h1 className="font-editorial text-3xl font-bold text-white mt-2">Editorial Workspace</h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your drafts, review submissions, and published stories.
            </p>
          </div>

          <Link
            to="/editor"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Article
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-slate-800 mb-6">
          {(['all', 'draft', 'pending_review', 'approved', 'published', 'scheduled', 'rejected'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  activeFilter === status
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status === 'all' ? 'All Stories' : status.replace('_', ' ').toUpperCase()}
              </button>
            ),
          )}
        </div>

        {/* Article Cards Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Loading stories...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-8 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-base font-bold text-white">No articles found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start writing your first story in the CMS TipTap Studio with rich text formatting, media uploads, and version control.
            </p>
            <button
              onClick={() => navigate('/editor')}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              Open CMS Studio
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((item) => {
              const badge = statusBadges[item.status] || statusBadges.draft;
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/editor/${item.id}`)}
                  className="group relative bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-5 cursor-pointer transition shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold">v{item.version}</span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-white group-hover:text-indigo-300 transition line-clamp-2">
                      {item.title || 'Untitled Article'}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {item.description || 'No excerpt provided.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.readingTimeMinutes} min read</span>
                    </div>
                    <span className="text-indigo-400 group-hover:underline flex items-center gap-1 font-semibold">
                      <FileEdit className="w-3.5 h-3.5" /> Edit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </PublicLayout>
  );
}
