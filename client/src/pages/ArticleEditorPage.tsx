import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  History,
  Image as ImageIcon,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  getArticleById,
  createArticle,
  updateArticle,
  transitionArticleWorkflow,
} from '../api/articles.api';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { WorkflowActionBar } from '../components/editor/WorkflowActionBar';
import { MediaPickerModal } from '../components/editor/MediaPickerModal';
import { RevisionHistoryModal } from '../components/editor/RevisionHistoryModal';
import type { Article, ArticleStatus } from '../types';

export const ArticleEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Partial<Article>>({
    title: '',
    slug: '',
    description: '',
    content: '',
    coverImage: null,
    status: 'draft',
    version: 1,
    wordCount: 0,
    readingTimeMinutes: 1,
    seoTitle: '',
    seoDescription: '',
    reviewNote: null,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      void fetchArticle(id);
    }
  }, [id]);

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const data = await getArticleById(articleId);
      if (data) {
        setArticle(data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setArticle((prev) => {
      const updated = { ...prev, title: newTitle };
      // Auto-generate slug if it was empty or matched previous slug
      if (!prev.slug || prev.slug === slugify(prev.title || '')) {
        updated.slug = slugify(newTitle);
      }
      return updated;
    });
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleSaveDraft = async () => {
    if (!article.title?.trim()) {
      setErrorMessage('Please provide an article title.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (id) {
        // Update existing article with optimistic concurrency version check
        const updated = await updateArticle(id, {
          ...article,
          expectedVersion: article.version,
          changeSummary: 'Manual draft save',
        });
        setArticle(updated);
        setSuccessMessage('Draft saved successfully!');
      } else {
        // Create new article
        const created = await createArticle(article);
        setArticle(created);
        navigate(`/editor/${created.id}`, { replace: true });
        setSuccessMessage('Article draft created!');
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage(
          'Concurrency Conflict: This article was updated by another editor. Please review the revision history or reload before saving.',
        );
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to save article.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowTransition = async (
    targetStatus: ArticleStatus,
    note?: string,
    scheduledAt?: string,
  ) => {
    if (!id) {
      alert('Please save the draft before initiating workflow transitions.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      const updated = await transitionArticleWorkflow(id, {
        targetStatus,
        reviewNote: note,
        scheduledAt,
        expectedVersion: article.version,
      });
      setArticle(updated);
      setSuccessMessage(`Article successfully transitioned to ${targetStatus}!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Workflow transition failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> Loading editorial workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Studio Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title="Return to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              CMS Studio
            </span>
            <span className="text-sm font-semibold text-slate-300">
              {id ? 'Edit Article' : 'New Article'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {id && (
            <button
              onClick={() => setRevisionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <History className="w-4 h-4 text-indigo-400" />
              Revisions (v{article.version || 1})
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: Editor Canvas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Review Feedback Alert if status === 'rejected' */}
          {article.status === 'rejected' && article.reviewNote && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-2xl space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Editorial Changes Requested:
              </div>
              <p className="italic text-slate-300 pl-5">{article.reviewNote}</p>
            </div>
          )}

          {/* Workflow Action Bar */}
          <WorkflowActionBar
            status={article.status || 'draft'}
            version={article.version || 1}
            wordCount={article.wordCount || 0}
            readingTimeMinutes={article.readingTimeMinutes || 1}
            loading={saving}
            onTransition={handleWorkflowTransition}
          />

          {/* Title Input */}
          <div>
            <input
              type="text"
              value={article.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Article Title..."
              className="w-full bg-transparent text-3xl sm:text-4xl font-serif font-bold text-white placeholder-slate-600 focus:outline-none border-b border-transparent focus:border-slate-800 pb-2 transition"
            />
          </div>

          {/* Rich-Text TipTap Editor */}
          <RichTextEditor
            value={article.content || ''}
            onChange={(content) => setArticle((prev) => ({ ...prev, content }))}
          />
        </div>

        {/* Right: Metadata & Editorial Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cover Image Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-400" /> Cover Image
            </label>
            {article.coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video group">
                <img
                  src={article.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition"
                >
                  Change Cover
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 transition"
              >
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-semibold">Select Cover Image</span>
              </button>
            )}
          </div>

          {/* URL Slug & Permalinks */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Permalink / Slug
            </label>
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
              <span className="text-xs text-slate-600 select-none">/articles/</span>
              <input
                type="text"
                value={article.slug || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="article-url-slug"
                className="bg-transparent text-xs text-slate-200 focus:outline-none flex-1 ml-1"
              />
            </div>
          </div>

          {/* Editorial Excerpt (Distinguished from SEO Description) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Editorial Excerpt (Cards / Previews)
            </label>
            <textarea
              rows={3}
              value={article.description || ''}
              onChange={(e) => setArticle((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short summary displayed on cards and listing feeds..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Search Engine Optimization (SEO Metadata) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Search Engine Optimization
            </label>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">SEO Meta Title</label>
              <input
                type="text"
                value={article.seoTitle || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, seoTitle: e.target.value }))}
                placeholder="Custom title tag for search engines..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">SEO Meta Description</label>
              <textarea
                rows={2}
                value={article.seoDescription || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, seoDescription: e.target.value }))}
                placeholder="Meta description for search engine ranking (150-160 chars)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setArticle((prev) => ({ ...prev, coverImage: url }))}
      />

      {/* Revision History Modal */}
      {id && (
        <RevisionHistoryModal
          isOpen={revisionModalOpen}
          articleId={id}
          onClose={() => setRevisionModalOpen(false)}
          onRestored={() => fetchArticle(id)}
        />
      )}
    </div>
  );
};
