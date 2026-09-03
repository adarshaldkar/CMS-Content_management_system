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
  User,
  Compass,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  getArticleById,
  createArticle,
  updateArticle,
  transitionArticleWorkflow,
} from '../api/articles.api';
import { publishingSlotsApi, type AuthorClearanceInfo } from '../api/publishing-slots.api';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { WorkflowActionBar } from '../components/editor/WorkflowActionBar';
import { MediaPickerModal } from '../components/editor/MediaPickerModal';
import { RevisionHistoryModal } from '../components/editor/RevisionHistoryModal';
import { tourService } from '../services/tour.service';
import { apiClient } from '../api/client';
import type { Article, ArticleStatus, Category } from '../types';

export const ArticleEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const isAdminOrSuperAdmin =
    hasRole('admin') ||
    hasRole('super_admin') ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN';

  const [categories, setCategories] = useState<Category[]>([]);
  const [slotClearance, setSlotClearance] = useState<AuthorClearanceInfo | null>(null);
  const [article, setArticle] = useState<Partial<Article>>({
    title: '',
    slug: '',
    description: '',
    content: '',
    categoryId: '',
    coverImage: null,
    status: 'draft',
    version: 1,
    wordCount: 0,
    readingTimeMinutes: 1,
    seoTitle: '',
    seoDescription: '',
    reviewNote: null,
    showAuthorName: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);

  useEffect(() => {
    // Fetch categories and author slot clearance in parallel
    apiClient.get<Category[] | { items: Category[] }>('/categories').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setCategories(data);
    }).catch(() => {});

    publishingSlotsApi.getMyClearance().then((clearance) => {
      if (clearance?.hasSlot) {
        setSlotClearance(clearance);
      }
    }).catch(() => {});

    if (id) {
      void fetchArticle(id);
    }

    // Auto-launch guided author studio tour on first visit
    const tourTimer = setTimeout(() => {
      tourService.startEditorTour(false);
    }, 600);

    return () => clearTimeout(tourTimer);
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

  const handleSaveDraft = async (): Promise<Article | null> => {
    if (!article.title?.trim()) {
      setErrorMessage('Please provide an article title.');
      return null;
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
        setSuccessMessage(
          article.status === 'published'
            ? 'Story changes saved and updated successfully.'
            : 'Draft saved successfully.'
        );
        return updated;
      } else {
        const created = await createArticle(article);
        setArticle(created);
        navigate(`/write/${created.id}`, { replace: true });
        setSuccessMessage('Story draft created.');
        return created;
      }
    } catch (err: any) {
      if (err.response?.status === 409 && id) {
        setErrorMessage(
          'Concurrency Conflict: This story was updated in another session. Please inspect revisions before overwriting.',
        );
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to save story.');
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowTransition = async (
    targetStatus: ArticleStatus,
    note?: string,
    scheduledAt?: string,
  ) => {
    try {
      setSaving(true);
      setErrorMessage(null);

      let targetId = id;
      let currentVersion = article.version || 1;

      // Auto-save if it's a new manuscript
      if (!targetId) {
        if (!article.title?.trim()) {
          setErrorMessage('Please provide an article title before submitting.');
          return;
        }
        const created = await createArticle(article);
        targetId = created.id;
        currentVersion = created.version;
        setArticle(created);
        navigate(`/write/${created.id}`, { replace: true });
      }

      const updated = await transitionArticleWorkflow(targetId, {
        targetStatus,
        reviewNote: note,
        scheduledAt,
        expectedVersion: currentVersion,
      });
      setArticle(updated);
      setSuccessMessage(`Story successfully transitioned to ${targetStatus.replace('_', ' ')}.`);
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
          <button
            type="button"
            onClick={() => tourService.startEditorTour(true)}
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono flex items-center gap-1.5 transition-colors bg-white"
            style={{ borderRadius: 2 }}
            title="Take Author Studio Tour"
          >
            <Compass className="w-3.5 h-3.5 text-accent-crimson" />
            <span className="hidden sm:inline">Guided Tour</span>
          </button>

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
            id="tour-editor-publish"
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
            style={{ borderRadius: 2 }}
            aria-live="polite"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>
              {saving
                ? 'Saving…'
                : article.status === 'published'
                  ? 'Save Changes'
                  : article.status === 'pending_review'
                    ? 'Update Submission'
                    : 'Save Draft'}
            </span>
          </button>
        </div>

        {/* Screen Reader Status Announcement */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {saving ? 'Saving manuscript draft...' : successMessage || ''}
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

          {/* VIP Publishing Slot Clearance Alert */}
          {slotClearance?.hasSlot && slotClearance.slot && (
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 text-white p-4 rounded-xl shadow-xs border border-purple-500/30 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-lg shrink-0">
                  <Sparkles size={18} className="text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold tracking-wider text-purple-100 uppercase">
                      VIP Auto-Publishing Clearance Active
                    </h4>
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-mono font-bold">
                      {slotClearance.slot.dispatchTime.slice(0, 5)} {slotClearance.slot.timezone}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200/80 mt-0.5">
                    Submitting this story will automatically enqueue it in the <strong>{slotClearance.slot.name}</strong> to go live automatically without manual review delays!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div id="tour-editor-title">
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
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-accent-crimson" /> Cover Image
              </label>
              {article.coverImage && (
                <button
                  type="button"
                  onClick={() => setArticle((prev) => ({ ...prev, coverImage: null }))}
                  className="text-[11px] font-mono text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {article.coverImage ? (
              <div className="space-y-2">
                <div className="relative border border-border-subtle aspect-video group overflow-hidden bg-slate-100" style={{ borderRadius: 2 }}>
                  <img
                    src={article.coverImage}
                    alt="Cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity font-mono"
                  >
                    Change Cover
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={article.coverImage}
                    onChange={(e) => setArticle((prev) => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://res.cloudinary.com/... or image URL"
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-canvas-paper border border-border-subtle focus:border-ink-primary focus:outline-none text-ink-primary"
                    style={{ borderRadius: 2 }}
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="px-2.5 py-1.5 bg-white border border-border-subtle hover:border-ink-primary text-xs font-mono text-ink-secondary hover:text-ink-primary transition-colors shrink-0"
                    style={{ borderRadius: 2 }}
                  >
                    Browse…
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="w-full aspect-video border border-dashed border-border-subtle hover:border-ink-secondary bg-canvas-paper flex flex-col items-center justify-center text-ink-secondary hover:text-ink-primary transition-colors group"
                  style={{ borderRadius: 2 }}
                >
                  <ImageIcon className="w-6 h-6 mb-1.5 opacity-40 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-mono">Select or upload cover asset</span>
                  <span className="text-[10px] text-ink-secondary/60 mt-0.5">Supports Cloudinary, Unsplash, or local upload</span>
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        setArticle((prev) => ({ ...prev, coverImage: e.target.value.trim() }));
                      }
                    }}
                    placeholder="Or paste Cloudinary / Web image URL…"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-canvas-paper border border-border-subtle focus:border-ink-primary focus:outline-none text-ink-primary"
                    style={{ borderRadius: 2 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Author Byline Visibility (Admin Control) */}
          <div className="bg-white border border-border-subtle p-5 space-y-3" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Author Byline
            </label>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="showAuthorName"
                checked={article.showAuthorName !== false}
                disabled={!isAdminOrSuperAdmin}
                onChange={(e) => setArticle((prev) => ({ ...prev, showAuthorName: e.target.checked }))}
                className="mt-0.5 cursor-pointer disabled:cursor-not-allowed"
              />
              <div>
                <label htmlFor="showAuthorName" className="text-xs font-semibold text-ink-primary cursor-pointer select-none">
                  Display Author Name
                </label>
                <p className="text-[10px] text-ink-secondary mt-0.5 leading-relaxed">
                  {isAdminOrSuperAdmin
                    ? "If turned off, this story publishes under 'Editorial Staff' instead of the author's name."
                    : "Only administrators can configure this story's public byline visibility."}
                </p>
              </div>
            </div>
          </div>

          {/* Editorial Section / Category */}
          <div className="bg-white border border-border-subtle p-5 space-y-2" style={{ borderRadius: 2 }}>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-secondary font-semibold">
              Editorial Section
            </label>
            <select
              value={article.categoryId || ''}
              onChange={(e) => setArticle((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="w-full bg-canvas-paper border border-border-subtle px-3 py-2 text-xs font-mono text-ink-primary focus:outline-none focus:border-ink-primary transition-colors cursor-pointer"
              style={{ borderRadius: 2 }}
            >
              <option value="">-- Select Editorial Section --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.slug})
                </option>
              ))}
            </select>
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
