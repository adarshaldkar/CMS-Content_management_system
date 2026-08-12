import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Save,
  History,
  Image as ImageIcon,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ExternalLink,
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

  const calculateMetrics = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTimeMinutes };
  };

  const handleTitleChange = (newTitle: string) => {
    setArticle((prev) => {
      const updated = { ...prev, title: newTitle };
      if (!prev.slug || prev.slug === slugify(prev.title || '')) {
        updated.slug = slugify(newTitle);
      }
      return updated;
    });
  };

  const handleContentChange = (contentHtml: string) => {
    const { wordCount, readingTimeMinutes } = calculateMetrics(contentHtml);
    setArticle((prev) => ({
      ...prev,
      content: contentHtml,
      wordCount,
      readingTimeMinutes,
    }));
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
        const updated = await updateArticle(id, {
          ...article,
          expectedVersion: article.version,
          changeSummary: 'Manual draft save',
        });
        setArticle(updated);
        setSuccessMessage('Draft saved successfully.');
      } else {
        const created = await createArticle(article);
        setArticle(created);
        navigate(`/write/${created.id}`, { replace: true });
        setSuccessMessage('Story draft created.');
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage(
          'Concurrency Conflict: This story was updated in another session. Please inspect revisions before overwriting.',
        );
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to save story.');
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
      setSuccessMessage(`Story successfully transitioned to ${targetStatus}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Workflow transition failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-paper flex items-center justify-center text-ink-secondary gap-2 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-ink-primary" /> Opening editorial manuscript…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-paper text-ink-primary flex flex-col font-sans">
      {/* Top Editorial Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-border-subtle px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/stories"
            className="p-1.5 text-ink-secondary hover:text-ink-primary transition-colors"
            title="Return to Stories"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-semibold">
              Editorial Desk
            </span>
            <span className="text-border-subtle font-mono text-[11px]">/</span>
            <span className="text-xs font-medium text-ink-secondary">
              {id ? 'Editing Manuscript' : 'New Manuscript'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {id && (
            <button
              onClick={() => setRevisionModalOpen(true)}
              className="px-3 py-1.5 border border-border-subtle text-ink-secondary hover:text-ink-primary text-xs font-mono flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <History className="w-3.5 h-3.5" />
              <span>v{article.version || 1} Revisions</span>
            </button>
          )}

          {article.status === 'published' && article.slug && (
            <Link
              to={`/articles/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-border-subtle text-ink-secondary hover:text-ink-primary text-xs font-mono flex items-center gap-1.5 transition-colors"
              style={{ borderRadius: 2 }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live</span>
            </Link>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
            style={{ borderRadius: 2 }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>
        </div>
      </header>

      {/* Main Editorial Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: Manuscript Canvas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2" style={{ borderRadius: 2 }}>
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2" style={{ borderRadius: 2 }}>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Rejection Note */}
          {article.status === 'rejected' && article.reviewNote && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1" style={{ borderRadius: 2 }}>
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Editorial Changes Requested:
              </div>
              <p className="italic text-ink-secondary pl-5">{article.reviewNote}</p>
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
              placeholder="Title of your story…"
              className="w-full bg-transparent text-3xl sm:text-4xl font-editorial font-semibold text-ink-primary placeholder:text-ink-secondary/40 focus:outline-none border-b border-border-subtle focus:border-ink-primary pb-3 transition-colors"
            />
          </div>

          {/* Manuscript Body Editor */}
          <RichTextEditor
            value={article.content || ''}
            onChange={handleContentChange}
          />
        </div>

        {/* Right: Metadata & Editorial Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cover Image */}
          <div className="bg-white border border-border-subtle p-5 space-y-3" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-accent-crimson" /> Cover Image
            </label>
            {article.coverImage ? (
              <div className="relative border border-border-subtle aspect-video group overflow-hidden" style={{ borderRadius: 2 }}>
                <img
                  src={article.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity"
                >
                  Change Cover
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="w-full aspect-video border border-dashed border-border-subtle hover:border-ink-secondary bg-canvas-paper flex flex-col items-center justify-center text-ink-secondary hover:text-ink-primary transition-colors"
                style={{ borderRadius: 2 }}
              >
                <ImageIcon className="w-6 h-6 mb-1.5 opacity-40" />
                <span className="text-xs font-mono">Select cover asset</span>
              </button>
            )}
          </div>

          {/* URL Slug */}
          <div className="bg-white border border-border-subtle p-5 space-y-2" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold">
              Permalink Slug
            </label>
            <div className="flex items-center bg-canvas-paper border border-border-subtle px-3 py-2 font-mono text-xs" style={{ borderRadius: 2 }}>
              <span className="text-ink-secondary/60 select-none">/articles/</span>
              <input
                type="text"
                value={article.slug || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="article-slug"
                className="bg-transparent text-xs text-ink-primary focus:outline-none flex-1 ml-1"
              />
            </div>
          </div>

          {/* Editorial Excerpt */}
          <div className="bg-white border border-border-subtle p-5 space-y-2" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold">
              Editorial Excerpt
            </label>
            <textarea
              rows={3}
              value={article.description || ''}
              onChange={(e) => setArticle((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short lead summary for editorial feeds…"
              className="w-full bg-canvas-paper border border-border-subtle p-3 text-xs text-ink-primary focus:outline-none focus:border-ink-primary transition-colors font-sans"
              style={{ borderRadius: 2 }}
            />
          </div>

          {/* SEO Metadata */}
          <div className="bg-white border border-border-subtle p-5 space-y-3" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-crimson" /> Search Metadata
            </label>

            <div>
              <label className="text-[11px] font-mono text-ink-secondary mb-1 block">SEO Title Tag</label>
              <input
                type="text"
                value={article.seoTitle || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, seoTitle: e.target.value }))}
                placeholder="Custom title tag for search engines…"
                className="w-full bg-canvas-paper border border-border-subtle p-2 text-xs text-ink-primary focus:outline-none focus:border-ink-primary transition-colors font-sans"
                style={{ borderRadius: 2 }}
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-ink-secondary mb-1 block">SEO Meta Description</label>
              <textarea
                rows={2}
                value={article.seoDescription || ''}
                onChange={(e) => setArticle((prev) => ({ ...prev, seoDescription: e.target.value }))}
                placeholder="Meta summary for indexers (150-160 characters)…"
                className="w-full bg-canvas-paper border border-border-subtle p-2 text-xs text-ink-primary focus:outline-none focus:border-ink-primary transition-colors font-sans"
                style={{ borderRadius: 2 }}
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
