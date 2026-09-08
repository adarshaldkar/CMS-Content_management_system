import React, { useState, useEffect, useMemo } from 'react';
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
  GitCompare,
  PanelRightClose,
  PanelRightOpen,
  CloudOff,
  Eye,
  PenTool,
  Send,
  ChevronDown,
  ListTree,
  Search,
  Share2,
  Calendar,
  Compass,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import {
  getArticleById,
  createArticle,
  updateArticle,
  transitionArticleWorkflow,
  restoreArticleRevision,
} from '../api/articles.api';
import { publishingSlotsApi, type AuthorClearanceInfo } from '../api/publishing-slots.api';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { WorkflowActionBar } from '../components/editor/WorkflowActionBar';
import { MediaPickerModal } from '../components/editor/MediaPickerModal';
import { RevisionHistoryModal } from '../components/editor/RevisionHistoryModal';
import { RevisionDiffViewer } from '../components/editor/RevisionDiffViewer';
import { PrePublishChecklistModal, type PrePublishAuditData } from '../components/editor/PrePublishChecklistModal';
import { tourService } from '../services/tour.service';
import { apiClient } from '../api/client';
import { UnsavedChangesModal } from '../components/editor/UnsavedChangesModal';
import type { Article, ArticleStatus, Category } from '../types';

type WorkspaceMode = 'write' | 'review' | 'preview';

interface HeadingItem {
  id: string;
  text: string;
  level: string;
}

export const ArticleEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const isAdminOrSuperAdmin =
    hasRole('admin') ||
    hasRole('super_admin') ||
    user?.role?.toUpperCase() === 'ADMIN' ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN';

  // Workspace Mode: WRITE, REVIEW, PREVIEW
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('write');

  const [categories, setCategories] = useState<Category[]>([]);
  const [slotClearance, setSlotClearance] = useState<AuthorClearanceInfo | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [article, setArticle] = useState<Partial<Article>>({
    title: '',
    slug: '',
    description: '',
    content: '',
    categoryId: '',
    tagIds: [],
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

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inspector Sidebar Toggle & Accordion States
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    settings: true,
    cover: true,
    metrics: true,
    seo: false,
    toc: true,
  });

  // Modals
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [diffViewerOpen, setDiffViewerOpen] = useState(false);
  const [prePublishModalOpen, setPrePublishModalOpen] = useState(false);
  const [leaveConfirmModalOpen, setLeaveConfirmModalOpen] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  // Recovered Local Draft State
  const [recoveredDraft, setRecoveredDraft] = useState<{
    data: any;
    savedAt: string;
  } | null>(null);

  // Autosave State Tracking
  const [autosaveStatus, setAutosaveStatus] = useState<
    'saved' | 'saving' | 'dirty' | 'offline' | 'error'
  >('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  const [timeAgoText, setTimeAgoText] = useState('Saved just now');

  const storageDraftKey = `gazette_draft_backup_${id || 'new'}`;

  // ─── 1. Continuous LocalStorage Draft Auto-Backup (Debounced) ────────────
  useEffect(() => {
    if (autosaveStatus !== 'dirty') return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          article: {
            title: article.title,
            slug: article.slug,
            description: article.description,
            content: article.content,
            categoryId: article.categoryId,
            tagIds: article.tagIds,
            coverImage: article.coverImage,
            seoTitle: article.seoTitle,
            seoDescription: article.seoDescription,
            status: article.status,
            showAuthorName: article.showAuthorName,
          },
          tags,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageDraftKey, JSON.stringify(payload));
      } catch (e) {
        console.warn('Draft localStorage auto-backup failed', e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [article, tags, autosaveStatus, storageDraftKey]);

  // ─── 2. Check for Recoverable Local Draft on Initial Mount ────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageDraftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.savedAt && (parsed.article?.title || parsed.article?.content)) {
          const draftTime = new Date(parsed.savedAt).getTime();
          const serverTime = lastSavedTime ? lastSavedTime.getTime() : 0;
          if (!id || draftTime > serverTime + 2000) {
            setRecoveredDraft({
              data: parsed,
              savedAt: parsed.savedAt,
            });
          }
        }
      }
    } catch {
      // ignore json parse error
    }
  }, [id, storageDraftKey, lastSavedTime]);

  const handleRestoreLocalDraft = () => {
    if (!recoveredDraft?.data) return;
    const { article: recoveredArticle, tags: recoveredTags } = recoveredDraft.data;
    if (recoveredArticle) {
      setArticle((prev) => ({
        ...prev,
        ...recoveredArticle,
      }));
    }
    if (Array.isArray(recoveredTags)) {
      setTags(recoveredTags);
    }
    setAutosaveStatus('dirty');
    setRecoveredDraft(null);
    setSuccessMessage('Restored unsaved manuscript backup from browser cache.');
  };

  const handleDiscardLocalDraft = () => {
    try {
      localStorage.removeItem(storageDraftKey);
    } catch {}
    setRecoveredDraft(null);
  };

  // ─── 3. Browser Back / Tab Close Native & PopState Guards ─────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosaveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your story.';
        return 'You have unsaved changes in your story.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autosaveStatus]);

  useEffect(() => {
    if (autosaveStatus === 'dirty') {
      window.history.pushState({ gazetteGuard: true }, '', window.location.href);

      const handlePopState = () => {
        if (autosaveStatus === 'dirty') {
          // Push history back to prevent immediate navigation
          window.history.pushState({ gazetteGuard: true }, '', window.location.href);
          setPendingNavigationPath('/stories');
          setLeaveConfirmModalOpen(true);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [autosaveStatus]);

  const handleGuardedNavigate = (targetPath: string = '/stories') => {
    if (autosaveStatus === 'dirty') {
      setPendingNavigationPath(targetPath);
      setLeaveConfirmModalOpen(true);
    } else {
      navigate(targetPath);
    }
  };

  const handleConfirmDiscardAndLeave = () => {
    try {
      localStorage.removeItem(storageDraftKey);
    } catch {}
    setAutosaveStatus('saved');
    setLeaveConfirmModalOpen(false);
    const dest = pendingNavigationPath || '/stories';
    navigate(dest);
  };

  const handleConfirmSaveAndLeave = async () => {
    const saved = await handleSaveDraft();
    if (saved) {
      try {
        localStorage.removeItem(storageDraftKey);
      } catch {}
      setAutosaveStatus('saved');
      setLeaveConfirmModalOpen(false);
      const dest = pendingNavigationPath || '/stories';
      navigate(dest);
    }
  };

  useEffect(() => {
    apiClient
      .get<Category[] | { items: Category[] }>('/categories')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setCategories(data);
      })
      .catch(() => {});

    publishingSlotsApi
      .getMyClearance()
      .then((clearance) => {
        if (clearance?.hasSlot) {
          setSlotClearance(clearance);
        }
      })
      .catch(() => {});

    if (id) {
      void fetchArticle(id);
    }

    const tourTimer = setTimeout(() => {
      tourService.startEditorTour(false);
    }, 600);

    return () => clearTimeout(tourTimer);
  }, [id]);

  // Relative time tracker for autosave
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastSavedTime) return;
      const secondsAgo = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
      if (secondsAgo < 15) {
        setTimeAgoText('Saved just now');
      } else if (secondsAgo < 60) {
        setTimeAgoText(`Saved ${secondsAgo}s ago`);
      } else {
        const mins = Math.floor(secondsAgo / 60);
        setTimeAgoText(`Saved ${mins}m ago`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSavedTime]);

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const data = await getArticleById(articleId);
      if (data) {
        setArticle(data);
        setLastSavedTime(new Date(data.updatedAt || Date.now()));
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

  // Dynamic Headings TOC extraction from content
  const tableOfContents = useMemo<HeadingItem[]>(() => {
    if (!article.content || typeof window === 'undefined') return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(article.content, 'text/html');
      const headings = Array.from(doc.querySelectorAll('h2, h3, h4'));
      return headings.map((h, i) => ({
        id: `section-heading-${i}`,
        text: h.textContent?.trim() || `Section ${i + 1}`,
        level: h.tagName.toLowerCase(),
      }));
    } catch {
      return [];
    }
  }, [article.content]);

  const handleTitleChange = (newTitle: string) => {
    setArticle((prev) => {
      const updated = { ...prev, title: newTitle };
      if (!prev.slug || prev.slug === slugify(prev.title || '')) {
        updated.slug = slugify(newTitle);
      }
      return updated;
    });
    setAutosaveStatus('dirty');
  };

  const handleContentChange = (contentHtml: string) => {
    const { wordCount, readingTimeMinutes } = calculateMetrics(contentHtml);
    setArticle((prev) => ({
      ...prev,
      content: contentHtml,
      wordCount,
      readingTimeMinutes,
    }));
    setAutosaveStatus('dirty');
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
        setTagInput('');
        setAutosaveStatus('dirty');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
    setAutosaveStatus('dirty');
  };

  const handleSaveDraft = async (): Promise<Article | null> => {
    if (!article.title?.trim()) {
      setErrorMessage('Please provide an article title.');
      return null;
    }

    try {
      setSaving(true);
      setAutosaveStatus('saving');
      setErrorMessage(null);
      setSuccessMessage(null);

      if (id) {
        const updated = await updateArticle(id, {
          ...article,
          expectedVersion: article.version,
          changeSummary: 'Manual draft save',
        });
        setArticle(updated);
        setLastSavedTime(new Date());
        setAutosaveStatus('saved');
        try {
          localStorage.removeItem(storageDraftKey);
        } catch {}
        setSuccessMessage(
          article.status === 'published'
            ? 'Story changes saved and updated successfully.'
            : 'Draft saved successfully.',
        );
        return updated;
      } else {
        const created = await createArticle(article);
        setArticle(created);
        setLastSavedTime(new Date());
        setAutosaveStatus('saved');
        try {
          localStorage.removeItem(storageDraftKey);
        } catch {}
        navigate(`/write/${created.id}`, { replace: true });
        setSuccessMessage('Story draft created.');
        return created;
      }
    } catch (err: any) {
      setAutosaveStatus('error');
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
    // If target is published, show automated pre-publish checklist gate first
    if (targetStatus === 'published' && !prePublishModalOpen) {
      setPrePublishModalOpen(true);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      let targetId = id;
      let currentVersion = article.version || 1;

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
      setLastSavedTime(new Date());
      setAutosaveStatus('saved');
      try {
        localStorage.removeItem(storageDraftKey);
      } catch {}
      setSuccessMessage(`Story successfully transitioned to ${targetStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Workflow transition failed.');
    } finally {
      setSaving(false);
    }
  };

  // Pre-Publish Audit Data
  const prePublishAuditData: PrePublishAuditData = {
    title: article.title || '',
    slug: article.slug || '',
    content: article.content || '',
    excerpt: article.description || article.seoDescription || '',
    featuredImageUrl: article.coverImage || '',
    categoryIds: article.categoryId ? [article.categoryId] : [],
    tags,
    wordCount: article.wordCount || 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center text-ink-secondary gap-2 font-mono text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-ink-primary" /> Opening editorial manuscript…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF9] text-ink-primary flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      {/* ─── Top Master Header with Mode Switcher ─────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-border-subtle px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleGuardedNavigate('/stories')}
            className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
            title="Return to Stories"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-crimson font-bold">
              The Gazette
            </span>
            <span className="text-border-subtle font-mono text-[11px]">/</span>
            <span className="text-xs font-serif font-semibold text-ink-primary max-w-xs truncate">
              {article.title?.trim() || 'Untitled Manuscript'}
            </span>
          </div>

          {/* Autosave Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-mono text-ink-secondary">
            {autosaveStatus === 'saving' ? (
              <>
                <Loader2 size={11} className="animate-spin text-accent-crimson" />
                <span>Saving manuscript…</span>
              </>
            ) : autosaveStatus === 'dirty' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved edits</span>
              </>
            ) : autosaveStatus === 'error' ? (
              <>
                <CloudOff size={11} className="text-rose-600" />
                <span className="text-rose-700 font-semibold">Save failed (Offline)</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{timeAgoText}</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Dynamic 3-Mode Workspace Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-border-subtle text-xs font-mono">
          <button
            type="button"
            onClick={() => setWorkspaceMode('write')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              workspaceMode === 'write'
                ? 'bg-white text-ink-primary font-bold shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <PenTool size={12} />
            <span>Write</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (id) {
                setDiffViewerOpen(true);
              } else {
                setWorkspaceMode('review');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              workspaceMode === 'review'
                ? 'bg-white text-ink-primary font-bold shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <GitCompare size={12} />
            <span>Review</span>
          </button>

          <button
            type="button"
            onClick={() => setWorkspaceMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
              workspaceMode === 'preview'
                ? 'bg-white text-accent-crimson font-bold shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Eye size={12} />
            <span>Preview</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => tourService.startEditorTour(true)}
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white shadow-2xs"
            title="Take Author Studio Tour"
          >
            <Compass className="w-3.5 h-3.5 text-accent-crimson" />
            <span className="hidden lg:inline">Tour</span>
          </button>

          {id && (
            <button
              type="button"
              onClick={() => setRevisionModalOpen(true)}
              className="px-2.5 py-1.5 border border-border-subtle text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">v{article.version || 1}</span>
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold rounded-xs tracking-wide flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {saving
                ? 'Saving…'
                : article.status === 'published'
                ? 'Save Changes'
                : 'Save Draft'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPrePublishModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-accent-crimson hover:bg-accent-crimson/90 text-white text-xs font-semibold rounded-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>

          {/* Toggle Inspector Panel */}
          <button
            type="button"
            onClick={() => setInspectorOpen((prev) => !prev)}
            className={`p-1.5 border border-border-subtle rounded-xs text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer ${
              inspectorOpen ? 'bg-slate-100 text-ink-primary' : 'bg-white'
            }`}
            title={inspectorOpen ? 'Hide Inspector (Ctrl+\\)' : 'Show Inspector (Ctrl+\\)'}
          >
            {inspectorOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </header>

      {/* ─── READER PREVIEW MODE SIMULATION ──────────────────────────────── */}
      {workspaceMode === 'preview' ? (
        <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 space-y-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
            <span className="font-mono text-xs uppercase tracking-wider text-accent-crimson font-bold">
              Reader Simulation Mode
            </span>
            <button
              type="button"
              onClick={() => setWorkspaceMode('write')}
              className="flex items-center gap-1 px-3 py-1 text-xs font-mono bg-slate-900 text-white rounded cursor-pointer"
            >
              <PenTool size={12} />
              <span>Back to Manuscript</span>
            </button>
          </div>

          <article className="space-y-6">
            {/* Category Tag */}
            {article.categoryId && (
              <span className="inline-block font-mono text-xs uppercase tracking-widest text-accent-crimson font-bold px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-xs">
                {categories.find((c) => c.id === article.categoryId)?.name || 'Dispatch'}
              </span>
            )}

            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-primary leading-tight tracking-tight">
              {article.title || 'Untitled Dispatch'}
            </h1>

            {/* Subtitle / Dek */}
            {article.description && (
              <p className="font-serif italic text-xl text-ink-secondary leading-relaxed">
                {article.description}
              </p>
            )}

            {/* Byline & Metadata */}
            <div className="flex items-center gap-4 py-3 border-y border-border-subtle font-mono text-xs text-ink-secondary">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-primary">
                  {article.showAuthorName !== false ? user?.name || 'Author' : 'The Gazette Editorial Desk'}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar size={13} />
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <span>•</span>
              <span>~{article.readingTimeMinutes || 1} min read</span>
            </div>

            {/* Cover Visual */}
            {article.coverImage && (
              <figure className="my-8">
                <img
                  src={article.coverImage}
                  alt={article.title || 'Cover'}
                  className="w-full rounded border border-border-subtle max-h-[500px] object-cover"
                />
              </figure>
            )}

            {/* Main Content Render */}
            <div
              className="prose prose-lg max-w-none font-sans text-ink-primary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-ink-secondary">No story manuscript entered yet.</p>' }}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="pt-8 border-t border-border-subtle flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-xs px-2.5 py-1 bg-slate-100 text-ink-primary rounded border border-border-subtle"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
      ) : (
        /* ─── MAIN WRITE WORKSPACE CONTAINER ────────────────────────────── */
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left/Center Canvas (8 cols or 12 cols) */}
          <div className={`${inspectorOpen ? 'lg:col-span-8' : 'lg:col-span-12 max-w-4xl mx-auto w-full'} space-y-6 transition-all duration-200`}>
            {/* Recovered Unsaved Local Draft Banner */}
            {recoveredDraft && (
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-300 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-full shrink-0 border border-amber-300">
                    <Sparkles size={16} className="text-amber-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-amber-950 flex items-center gap-2">
                      <span>Unsaved Manuscript Backup Recovered</span>
                      <span className="font-mono text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded font-medium">
                        {new Date(recoveredDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      We found uncommitted edits cached in your browser from an earlier session. Would you like to restore them to your canvas?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleDiscardLocalDraft}
                    className="px-3 py-1.5 text-xs font-mono text-amber-900 hover:text-amber-950 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                  >
                    Discard Backup
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreLocalDraft}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>Restore Draft</span>
                  </button>
                </div>
              </div>
            )}

            {/* Notifications */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Rejection Note */}
            {article.status === 'rejected' && article.reviewNote && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-sm space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Editorial Changes Requested:
                </div>
                <p className="italic text-ink-secondary pl-5">{article.reviewNote}</p>
              </div>
            )}

            {/* VIP Publishing Slot Clearance Alert */}
            {slotClearance?.hasSlot && slotClearance.slot && (
              <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 text-white p-4 rounded-sm shadow-xs border border-purple-500/30 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 text-purple-300 rounded-sm shrink-0">
                    <Sparkles size={16} className="text-amber-300 animate-pulse" />
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
                      Submitting this story will automatically enqueue it in <strong>{slotClearance.slot.name}</strong> without manual delays!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Clean Borderless Headline & Dek Inputs */}
            <div className="space-y-3 pt-2">
              <div id="tour-editor-title">
                <input
                  type="text"
                  value={article.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Title of your story…"
                  className="w-full bg-transparent text-3xl sm:text-4xl font-serif font-bold text-ink-primary placeholder:text-slate-300 focus:outline-hidden leading-tight tracking-tight border-none"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={article.description || ''}
                  onChange={(e) => setArticle((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a subtitle or editorial dek (optional)…"
                  className="w-full bg-transparent text-base font-sans text-ink-secondary placeholder:text-slate-400 focus:outline-hidden border-none"
                />
              </div>
            </div>

            {/* Workflow Action Bar */}
            <WorkflowActionBar
              status={article.status || 'draft'}
              version={article.version || 1}
              wordCount={article.wordCount || 0}
              readingTimeMinutes={article.readingTimeMinutes || 1}
              loading={saving}
              onTransition={handleWorkflowTransition}
            />

            {/* Rich Manuscript Writing Canvas */}
            <RichTextEditor
              value={article.content || ''}
              onChange={handleContentChange}
              onTitleDetected={(detectedTitle) => {
                if (!article.title || article.title === 'Untitled Manuscript') {
                  handleTitleChange(detectedTitle);
                }
              }}
              isInspectorOpen={inspectorOpen}
              onToggleInspector={() => setInspectorOpen((prev) => !prev)}
              onSetWorkspaceMode={(mode) => setWorkspaceMode(mode)}
              onOpenRevisionHistory={() => setRevisionModalOpen(true)}
              onOpenDiffViewer={() => setDiffViewerOpen(true)}
            />
          </div>

          {/* ─── CONTEXTUAL ACCORDION INSPECTOR (4 cols) ───────────────────── */}
          {inspectorOpen && (
            <aside className="lg:col-span-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-150 font-sans select-none">
              {/* 1. Story Publishing & Taxonomy */}
              <div className="bg-white border border-border-subtle rounded-md shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('settings')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border-subtle text-left cursor-pointer"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-bold">
                    Story Taxonomy &amp; URL
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-ink-secondary transition-transform ${
                      expandedSections.settings ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSections.settings && (
                  <div className="p-4 space-y-3.5 text-xs">
                    {/* Category Selection */}
                    <div>
                      <label className="font-mono text-[11px] text-ink-secondary block mb-1">
                        Editorial Section / Category
                      </label>
                      <select
                        value={article.categoryId || ''}
                        onChange={(e) => setArticle((prev) => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full bg-slate-50 border border-border-subtle px-2.5 py-1.5 text-xs rounded text-ink-primary focus:outline-hidden focus:border-accent-crimson cursor-pointer"
                      >
                        <option value="">-- Select Section --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="font-mono text-[11px] text-ink-secondary block mb-1">
                        Story Permalink
                      </label>
                      <div className="flex items-center bg-slate-50 border border-border-subtle px-2.5 py-1.5 font-mono text-xs rounded">
                        <span className="text-slate-400 select-none text-[11px]">/articles/</span>
                        <input
                          type="text"
                          value={article.slug || ''}
                          onChange={(e) => setArticle((prev) => ({ ...prev, slug: e.target.value }))}
                          placeholder="story-slug"
                          className="bg-transparent text-xs text-ink-primary focus:outline-hidden flex-1 ml-1"
                        />
                      </div>
                    </div>

                    {/* Topic Tags */}
                    <div>
                      <label className="font-mono text-[11px] text-ink-secondary block mb-1">
                        Topic Tags (Press Enter)
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-ink-primary font-mono text-[11px] rounded border border-border-subtle"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Type tag and press Enter…"
                        className="w-full bg-slate-50 border border-border-subtle px-2.5 py-1.5 text-xs rounded text-ink-primary focus:outline-hidden focus:border-accent-crimson font-mono"
                      />
                    </div>

                    {/* Author Byline Visibility */}
                    <div className="pt-2 border-t border-slate-100 flex items-start gap-2">
                      <input
                        type="checkbox"
                        id="showAuthorName"
                        checked={article.showAuthorName !== false}
                        disabled={!isAdminOrSuperAdmin}
                        onChange={(e) => setArticle((prev) => ({ ...prev, showAuthorName: e.target.checked }))}
                        className="mt-0.5 cursor-pointer rounded text-accent-crimson focus:ring-accent-crimson"
                      />
                      <div>
                        <label htmlFor="showAuthorName" className="text-xs font-semibold text-ink-primary cursor-pointer select-none">
                          Display Author Byline
                        </label>
                        <p className="text-[10px] text-ink-secondary mt-0.5 leading-relaxed">
                          {isAdminOrSuperAdmin
                            ? "If turned off, this story publishes under 'The Gazette Staff'."
                            : 'Configurable by editorial desk administrators.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Cover Visual Asset */}
              <div className="bg-white border border-border-subtle rounded-md shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('cover')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border-subtle text-left cursor-pointer"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-accent-crimson" />
                    <span>Featured Cover Visual</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-ink-secondary transition-transform ${
                      expandedSections.cover ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSections.cover && (
                  <div className="p-4 space-y-3">
                    {article.coverImage ? (
                      <div className="space-y-2">
                        <div className="relative border border-border-subtle aspect-video group overflow-hidden bg-slate-100 rounded">
                          <img
                            src={article.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setMediaPickerOpen(true)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity font-mono cursor-pointer"
                          >
                            Change Asset
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={article.coverImage}
                            onChange={(e) => setArticle((prev) => ({ ...prev, coverImage: e.target.value }))}
                            placeholder="Image URL…"
                            className="flex-1 px-2 py-1 text-xs font-mono bg-slate-50 border border-border-subtle rounded text-ink-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setArticle((prev) => ({ ...prev, coverImage: null }))}
                            className="px-2 py-1 text-xs font-mono text-rose-600 hover:bg-rose-50 border border-rose-200 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMediaPickerOpen(true)}
                        className="w-full aspect-video border border-dashed border-border-subtle hover:border-accent-crimson/50 bg-slate-50/60 hover:bg-slate-50 rounded flex flex-col items-center justify-center text-ink-secondary hover:text-ink-primary transition-colors group cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-400 group-hover:text-accent-crimson transition-colors" />
                        <span className="text-xs font-mono font-medium">Select from Media Library</span>
                        <span className="text-[10px] text-ink-secondary/70 mt-0.5">Cloudinary storage / local upload</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Live Reading Metrics & Dynamic Table of Contents */}
              <div className="bg-white border border-border-subtle rounded-md shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('metrics')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border-subtle text-left cursor-pointer"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-bold">
                    Reading Intelligence &amp; TOC
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-ink-secondary transition-transform ${
                      expandedSections.metrics ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSections.metrics && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                        <span className="text-[10px] font-mono text-ink-secondary block">Word Count</span>
                        <span className="text-sm font-mono font-bold text-ink-primary">
                          {(article.wordCount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded">
                        <span className="text-[10px] font-mono text-ink-secondary block">Est. Read Time</span>
                        <span className="text-sm font-mono font-bold text-ink-primary">
                          ~{article.readingTimeMinutes || 1} min
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Table of Contents */}
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-secondary uppercase tracking-wider mb-2">
                        <ListTree size={12} className="text-accent-crimson" />
                        <span>Document Outline ({tableOfContents.length})</span>
                      </div>

                      {tableOfContents.length > 0 ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto pl-1 border-l-2 border-slate-100">
                          {tableOfContents.map((item, idx) => (
                            <div
                              key={idx}
                              className={`text-xs text-ink-primary truncate ${
                                item.level === 'h3' ? 'pl-3 text-[11px]' : item.level === 'h4' ? 'pl-6 text-[11px]' : 'font-medium'
                              }`}
                            >
                              <span>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink-secondary italic">
                          Add Headings (H1, H2, H3) to automatically build story outline.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Live Search & Social Card Simulator (SERP) */}
              <div className="bg-white border border-border-subtle rounded-md shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('seo')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border-subtle text-left cursor-pointer"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent-crimson" />
                    <span>Search &amp; Social Simulator</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-ink-secondary transition-transform ${
                      expandedSections.seo ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSections.seo && (
                  <div className="p-4 space-y-4">
                    {/* Live Google Search Preview Card */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-sans truncate">
                        <Search size={11} className="text-slate-400" />
                        <span>gazette.press › articles › {article.slug || 'story-slug'}</span>
                      </div>
                      <div className="font-serif text-sm font-semibold text-blue-800 line-clamp-1">
                        {article.seoTitle || article.title || 'Story Title — The Gazette'}
                      </div>
                      <p className="font-sans text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {article.seoDescription || article.description || 'Comprehensive analysis and investigative reporting from The Gazette newsroom.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-ink-secondary mb-1 block">Custom SEO Title</label>
                      <input
                        type="text"
                        value={article.seoTitle || ''}
                        onChange={(e) => setArticle((prev) => ({ ...prev, seoTitle: e.target.value }))}
                        placeholder="Optimized headline for search engines…"
                        className="w-full bg-slate-50 border border-border-subtle p-2 text-xs text-ink-primary focus:outline-hidden focus:border-accent-crimson rounded"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-ink-secondary mb-1 block">SEO Meta Description</label>
                      <textarea
                        rows={3}
                        value={article.seoDescription || ''}
                        onChange={(e) => setArticle((prev) => ({ ...prev, seoDescription: e.target.value }))}
                        placeholder="Snippet summary for Google & social previews (120-160 chars)…"
                        className="w-full bg-slate-50 border border-border-subtle p-2 text-xs text-ink-primary focus:outline-hidden focus:border-accent-crimson rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </main>
      )}

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <UnsavedChangesModal
        isOpen={leaveConfirmModalOpen}
        onKeepEditing={() => setLeaveConfirmModalOpen(false)}
        onDiscardAndLeave={handleConfirmDiscardAndLeave}
        onSaveAndLeave={handleConfirmSaveAndLeave}
        isSaving={saving}
        articleTitle={article.title || 'Untitled Manuscript'}
      />

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => setArticle((prev) => ({ ...prev, coverImage: url }))}
      />

      <PrePublishChecklistModal
        isOpen={prePublishModalOpen}
        onClose={() => setPrePublishModalOpen(false)}
        onConfirmPublish={() => handleWorkflowTransition('published')}
        data={prePublishAuditData}
        isPublishing={saving}
      />

      {id && (
        <>
          <RevisionHistoryModal
            isOpen={revisionModalOpen}
            articleId={id}
            onClose={() => setRevisionModalOpen(false)}
            onRestored={() => fetchArticle(id)}
          />

          <RevisionDiffViewer
            isOpen={diffViewerOpen}
            articleId={id}
            articleTitle={article.title || 'Untitled Manuscript'}
            currentContent={article.content || ''}
            currentTitle={article.title || ''}
            onClose={() => setDiffViewerOpen(false)}
            onRestoreRevision={async (revId: string) => {
              await restoreArticleRevision(id, revId);
              await fetchArticle(id);
              setDiffViewerOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
};
