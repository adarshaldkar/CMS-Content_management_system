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
  Laptop,
  Smartphone,
  Mail,
  Printer,
  BookOpen,
  Blocks,
  LayoutTemplate,
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
import { StoryTemplatesModal } from '../components/editor/StoryTemplatesModal';
import { EditorialPatternsModal } from '../components/editor/EditorialPatternsModal';
import { DocumentMapDrawer, type DocumentSection } from '../components/editor/DocumentMapDrawer';
import { type StoryTemplate } from '../components/editor/editorialPatterns';
import { tourService } from '../services/tour.service';
import { apiClient } from '../api/client';
import { UnsavedChangesModal } from '../components/editor/UnsavedChangesModal';
import { draftStorageService, type LocalDraftSnapshot } from '../services/draft-storage.service';
import { multiTabService } from '../services/multi-tab.service';
import type { Article, ArticleStatus, Category } from '../types';

type WorkspaceMode = 'write' | 'review' | 'preview';
type PreviewDevice = 'desktop' | 'mobile' | 'social' | 'newsletter' | 'print';

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

  // Modals & Drawers
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [diffViewerOpen, setDiffViewerOpen] = useState(false);
  const [prePublishModalOpen, setPrePublishModalOpen] = useState(false);
  const [leaveConfirmModalOpen, setLeaveConfirmModalOpen] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  // Journalistic Templates, Patterns & Document Map
  const [storyTemplatesOpen, setStoryTemplatesOpen] = useState(false);
  const [editorialPatternsOpen, setEditorialPatternsOpen] = useState(false);
  const [documentMapOpen, setDocumentMapOpen] = useState(false);

  // Multi-State Preview Mode Device
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');


  // Multi-Tab Collision State
  const [hasMultiTabConflict, setHasMultiTabConflict] = useState(false);

  // Recovered Local Draft State
  const [recoveredDraft, setRecoveredDraft] = useState<LocalDraftSnapshot | null>(null);

  // Autosave State Tracking
  const [autosaveStatus, setAutosaveStatus] = useState<
    'saved' | 'saving' | 'dirty' | 'offline' | 'error'
  >('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());
  const [timeAgoText, setTimeAgoText] = useState('Saved just now');
  const [clientSeq, setClientSeq] = useState(1);

  // ─── 1. Multi-Tab Session Probing via BroadcastChannel ───────────────────
  useEffect(() => {
    const cleanup = multiTabService.startProbing(id || 'new', (conflict) => {
      setHasMultiTabConflict(conflict);
    });
    return cleanup;
  }, [id]);

  // ─── 2. Continuous IndexedDB Draft Auto-Backup (Debounced) ───────────────
  useEffect(() => {
    if (autosaveStatus !== 'dirty') return;

    const timer = setTimeout(() => {
      const nextSeq = clientSeq + 1;
      setClientSeq(nextSeq);

      const snapshot: LocalDraftSnapshot = {
        articleId: id || 'new',
        baseVersion: article.version || 1,
        seq: nextSeq,
        title: article.title || '',
        slug: article.slug || '',
        description: article.description || '',
        content: article.content || '',
        categoryId: article.categoryId || '',
        tagIds: article.tagIds || [],
        tags,
        coverImage: article.coverImage || null,
        seoTitle: article.seoTitle || '',
        seoDescription: article.seoDescription || '',
        status: article.status || 'draft',
        showAuthorName: article.showAuthorName,
        wordCount: article.wordCount || 0,
        readingTimeMinutes: article.readingTimeMinutes || 1,
        savedAt: new Date().toISOString(),
      };

      void draftStorageService.saveSnapshot(snapshot);
    }, 1000);

    return () => clearTimeout(timer);
  }, [article, tags, autosaveStatus, id, clientSeq]);

  // ─── 3. Check for Recoverable Local Draft on Initial Mount ────────────────
  useEffect(() => {
    void draftStorageService.getSnapshot(id || 'new').then((snapshot) => {
      if (snapshot && snapshot.savedAt && (snapshot.title || snapshot.content)) {
        const draftTime = new Date(snapshot.savedAt).getTime();
        const serverTime = lastSavedTime ? lastSavedTime.getTime() : 0;
        if (!id || draftTime > serverTime + 2000) {
          setRecoveredDraft(snapshot);
        }
      }
    });
  }, [id, lastSavedTime]);

  const handleRestoreLocalDraft = () => {
    if (!recoveredDraft) return;
    setArticle((prev) => ({
      ...prev,
      title: recoveredDraft.title,
      slug: recoveredDraft.slug,
      description: recoveredDraft.description,
      content: recoveredDraft.content,
      categoryId: recoveredDraft.categoryId,
      tagIds: recoveredDraft.tagIds,
      coverImage: recoveredDraft.coverImage,
      seoTitle: recoveredDraft.seoTitle,
      seoDescription: recoveredDraft.seoDescription,
      status: (recoveredDraft.status as ArticleStatus) || prev.status,
      showAuthorName: recoveredDraft.showAuthorName,
    }));
    if (Array.isArray(recoveredDraft.tags)) {
      setTags(recoveredDraft.tags);
    }
    setAutosaveStatus('dirty');
    setRecoveredDraft(null);
    setSuccessMessage('Restored unsaved manuscript backup from IndexedDB storage.');
  };

  const handleDiscardLocalDraft = () => {
    void draftStorageService.deleteSnapshot(id || 'new');
    setRecoveredDraft(null);
  };

  const handleApplyStoryTemplate = (template: StoryTemplate) => {
    setArticle((prev) => ({
      ...prev,
      title: template.defaultTitle,
      description: template.defaultDescription,
      content: template.htmlContent,
      readingTimeMinutes: template.readingEstimateMinutes,
    }));
    setAutosaveStatus('dirty');
    setSuccessMessage(`Loaded ${template.title} story format into manuscript.`);
  };

  const handleInsertEditorialPattern = (patternHtml: string) => {
    setArticle((prev) => ({
      ...prev,
      content: `${prev.content || ''}\n\n${patternHtml}\n\n<p><br></p>`,
    }));
    setAutosaveStatus('dirty');
    setSuccessMessage('Inserted editorial component into manuscript.');
  };

  const handleJumpToSection = (section: DocumentSection) => {
    const editorCanvas = document.querySelector('.manuscript-editor') as HTMLElement | null;
    if (!editorCanvas) return;

    const headingsAndBlocks = editorCanvas.querySelectorAll('h1, h2, h3, aside.cms-callout, blockquote.cms-pull-quote, table');
    const targetElement = headingsAndBlocks[section.domIndex] as HTMLElement | undefined;

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-rose-500/60', 'transition-all');
      setTimeout(() => {
        targetElement.classList.remove('ring-2', 'ring-rose-500/60');
      }, 2000);
    }
    setDocumentMapOpen(false);
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
    void draftStorageService.deleteSnapshot(id || 'new');
    setAutosaveStatus('saved');
    setLeaveConfirmModalOpen(false);
    const dest = pendingNavigationPath || '/stories';
    navigate(dest);
  };

  const handleConfirmSaveAndLeave = async () => {
    const saved = await handleSaveDraft();
    if (saved) {
      void draftStorageService.deleteSnapshot(id || 'new');
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
        void draftStorageService.deleteSnapshot(id || 'new');
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
        void draftStorageService.deleteSnapshot('new');
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
      void draftStorageService.deleteSnapshot(targetId || 'new');
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
        <div id="tour-editor-mode-switcher" className="flex items-center bg-slate-100 p-0.5 rounded-md border border-border-subtle text-xs font-mono">
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
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white shadow-2xs cursor-pointer"
            title="Take Author Studio Tour"
          >
            <Compass className="w-3.5 h-3.5 text-accent-crimson" />
            <span className="hidden lg:inline">Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setStoryTemplatesOpen(true)}
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Choose Story Archetype Format"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-rose-800" />
            <span className="hidden md:inline">Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorialPatternsOpen(true)}
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Insert Reusable Newsroom Pattern"
          >
            <Blocks className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden md:inline">Patterns</span>
          </button>

          <button
            type="button"
            onClick={() => setDocumentMapOpen(true)}
            className="px-2.5 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs flex items-center gap-1.5 transition-colors bg-white hover:bg-slate-50 shadow-2xs cursor-pointer"
            title="Open Document Map &amp; Outline Navigator (Ctrl+Shift+O)"
          >
            <Compass className="w-3.5 h-3.5 text-rose-800" />
            <span className="hidden sm:inline">Map</span>
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

            <div id="tour-editor-save-exit" className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirmSaveAndLeave}
                disabled={saving}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary text-xs font-mono rounded-xs transition-colors bg-white shadow-2xs cursor-pointer"
                title="Save changes and return to stories overview"
              >
                <Save className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save &amp; Exit</span>
              </button>

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
            </div>

            <button
              type="button"
              id="tour-editor-publish"
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

        {/* ─── MULTI-STATE EDITORIAL PREVIEW SIMULATOR ───────────────────────── */}
        {workspaceMode === 'preview' ? (
          <div className="flex-1 w-full mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200 flex flex-col items-center">
            {/* Viewport & Device Preset Bar */}
            <div className="w-full max-w-5xl bg-white border border-slate-200 p-2.5 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop size={13} />
                  <span>Desktop (1200px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Mobile (375px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('social')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                    previewDevice === 'social'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Share2 size={13} />
                  <span>Social Card (OG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('newsletter')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                    previewDevice === 'newsletter'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail size={13} />
                  <span>Newsletter (600px)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice('print')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${
                    previewDevice === 'print'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer size={13} />
                  <span>Print Press (A4)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Shared Public Parity Renderer
                </span>
                <button
                  type="button"
                  onClick={() => setWorkspaceMode('write')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-white rounded cursor-pointer shadow-2xs"
                >
                  <PenTool size={12} />
                  <span>Back to Manuscript</span>
                </button>
              </div>
            </div>

            {/* ─── 1. SOCIAL CARD (OG CARD) PREVIEW ────────────────────────── */}
            {previewDevice === 'social' ? (
              <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
                <span className="text-xs font-mono uppercase font-bold text-rose-800 tracking-wider">
                  OpenGraph Social Distribution Preview (1200 × 630 Simulation)
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-slate-900 text-white">
                  {article.coverImage ? (
                    <img src={article.coverImage} alt="Cover" className="w-full h-56 object-cover" />
                  ) : (
                    <div className="w-full h-56 bg-slate-800 flex items-center justify-center font-serif text-slate-400 text-xl font-bold">
                      THE GAZETTE DISPATCH
                    </div>
                  )}
                  <div className="p-5 space-y-1.5 bg-slate-900">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                      GAZETTE.PRESS • {article.categoryId ? categories.find((c) => c.id === article.categoryId)?.name : 'GENERAL'}
                    </span>
                    <h3 className="font-serif text-lg font-bold leading-snug line-clamp-2">
                      {article.seoTitle || article.title || 'Untitled Dispatch Headline'}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {article.seoDescription || article.description || 'Comprehensive investigative reporting and daily analysis from The Gazette newsroom.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : previewDevice === 'mobile' ? (
              /* ─── 2. MOBILE SMARTPHONE PREVIEW (375px Frame) ─────────────── */
              <div className="w-[375px] bg-white border-8 border-slate-900 rounded-[36px] shadow-2xl p-6 min-h-[680px] overflow-y-auto space-y-4 font-sans text-slate-900">
                <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto mb-3" />
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between text-xs font-mono">
                  <span className="font-serif font-bold text-base text-rose-800 tracking-tight">THE GAZETTE</span>
                  <span className="text-slate-400">MOBILE WEB</span>
                </div>

                <article className="space-y-4">
                  {article.categoryId && (
                    <span className="inline-block font-mono text-[10px] uppercase font-bold text-rose-800 px-2 py-0.5 bg-rose-50 rounded">
                      {categories.find((c) => c.id === article.categoryId)?.name || 'News'}
                    </span>
                  )}

                  <h1 className="font-serif text-2xl font-bold leading-tight text-slate-900">
                    {article.title || 'Untitled Dispatch'}
                  </h1>

                  {article.description && (
                    <p className="font-serif italic text-sm text-slate-600 leading-relaxed">
                      {article.description}
                    </p>
                  )}

                  <div className="text-[11px] font-mono text-slate-400 py-2 border-y border-slate-100 flex items-center justify-between">
                    <span>By {article.showAuthorName !== false ? user?.name || 'Author' : 'The Gazette Desk'}</span>
                    <span>~{article.readingTimeMinutes || 1} min read</span>
                  </div>

                  {article.coverImage && (
                    <img src={article.coverImage} alt="Cover" className="w-full rounded-md object-cover" />
                  )}

                  <div
                    className="prose prose-sm font-sans text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-slate-400">No story content yet.</p>' }}
                  />
                </article>
              </div>
            ) : previewDevice === 'newsletter' ? (
              /* ─── 3. NEWSLETTER EMAIL DIGEST (600px) ─────────────────────── */
              <div className="w-full max-w-[600px] bg-white border border-slate-200 rounded-lg shadow-xl p-8 space-y-6 font-sans">
                <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                  <span className="font-serif text-2xl font-bold tracking-tight text-rose-800">THE GAZETTE</span>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Morning Dispatch Newsletter Edition</p>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                  {article.title || 'Untitled Dispatch'}
                </h1>

                {article.description && (
                  <p className="font-serif italic text-base text-slate-600 leading-relaxed">
                    {article.description}
                  </p>
                )}

                {article.coverImage && (
                  <img src={article.coverImage} alt="Cover" className="w-full rounded object-cover max-h-[300px]" />
                )}

                <div
                  className="prose prose-slate max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-slate-400">No content.</p>' }}
                />

                <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                  <p>© 2026 The Gazette Publishing Guild. All rights reserved.</p>
                </div>
              </div>
            ) : previewDevice === 'print' ? (
              /* ─── 4. PRINT PRESS READY (A4) ──────────────────────────────── */
              <div className="w-full max-w-[794px] bg-white border border-slate-300 shadow-2xl p-14 min-h-[1123px] font-serif text-slate-900 space-y-6 print:p-0 print:border-none print:shadow-none">
                <div className="border-b-2 border-slate-900 pb-3 flex items-end justify-between">
                  <span className="font-serif text-3xl font-extrabold tracking-tight">THE GAZETTE</span>
                  <span className="font-mono text-xs text-slate-600 uppercase">PRESS PROOF • {new Date().toLocaleDateString()}</span>
                </div>

                <h1 className="font-serif text-4xl font-extrabold leading-tight">
                  {article.title || 'Untitled Dispatch'}
                </h1>

                {article.description && (
                  <p className="font-serif italic text-lg text-slate-700 leading-relaxed">
                    {article.description}
                  </p>
                )}

                <div className="font-mono text-xs text-slate-500 py-1.5 border-y border-slate-200">
                  BYLINE: {article.showAuthorName !== false ? user?.name?.toUpperCase() || 'EDITORIAL STAFF' : 'THE GAZETTE DESK'}
                </div>

                {article.coverImage && (
                  <img src={article.coverImage} alt="Cover" className="w-full max-h-[320px] object-cover grayscale" />
                )}

                <div
                  className="prose prose-neutral max-w-none font-serif text-sm leading-relaxed columns-2 gap-8 text-justify"
                  dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-slate-400">No content.</p>' }}
                />
              </div>
            ) : (
              /* ─── 5. DESKTOP PUBLIC ARTICLE PAGE SIMULATOR (1200px) ──────── */
              <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-lg shadow-xl p-8 sm:p-12 space-y-8">
                <article className="space-y-6">
                  {article.categoryId && (
                    <span className="inline-block font-mono text-xs uppercase tracking-widest text-accent-crimson font-bold px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-xs">
                      {categories.find((c) => c.id === article.categoryId)?.name || 'Dispatch'}
                    </span>
                  )}

                  <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-primary leading-tight tracking-tight">
                    {article.title || 'Untitled Dispatch'}
                  </h1>

                  {article.description && (
                    <p className="font-serif italic text-xl text-ink-secondary leading-relaxed">
                      {article.description}
                    </p>
                  )}

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

                  {article.coverImage && (
                    <figure className="my-8">
                      <img
                        src={article.coverImage}
                        alt={article.title || 'Cover'}
                        className="w-full rounded border border-border-subtle max-h-[500px] object-cover"
                      />
                    </figure>
                  )}

                  <div
                    className="prose prose-lg max-w-none font-sans text-ink-primary leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: article.content || '<p class="italic text-ink-secondary">No story manuscript entered yet.</p>' }}
                  />

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
            )}
          </div>
        ) : (

        /* ─── MAIN WRITE WORKSPACE CONTAINER ────────────────────────────── */
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left/Center Canvas (8 cols or 12 cols) */}
          <div className={`${inspectorOpen ? 'lg:col-span-8' : 'lg:col-span-12 max-w-4xl mx-auto w-full'} space-y-6 transition-all duration-200`}>
            {/* Multi-Tab Conflict Alert Banner */}
            {hasMultiTabConflict && (
              <div className="p-3.5 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 text-white rounded-sm border border-purple-500/40 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-800 text-purple-200 rounded-full shrink-0">
                    <AlertCircle size={15} className="text-amber-300" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-purple-200">Multi-Tab Session Active:</span> This manuscript is currently open in another browser tab. Simultaneous edits may collide.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    multiTabService.claimOwnership(id || 'new');
                    setHasMultiTabConflict(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono bg-purple-600 hover:bg-purple-500 text-white rounded cursor-pointer shrink-0 shadow-2xs"
                >
                  Take Over Session
                </button>
              </div>
            )}

            {/* Recovered Unsaved Local Draft Banner */}
            {recoveredDraft && (
              <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-300 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-full shrink-0 border border-amber-300">
                    <Sparkles size={16} className="text-amber-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-amber-950 flex items-center gap-2">
                      <span>Unsaved Manuscript Backup Found</span>
                      <span className="font-mono text-[10px] text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded font-medium">
                        {new Date(recoveredDraft.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {recoveredDraft.wordCount > (article.wordCount || 0) && (
                        <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          +{recoveredDraft.wordCount - (article.wordCount || 0)} words newer
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      We found uncommitted edits ({recoveredDraft.wordCount} words) cached in your browser IndexedDB from an earlier session. Would you like to restore them?
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
            <div id="tour-editor-workflow">
              <WorkflowActionBar
                status={article.status || 'draft'}
                version={article.version || 1}
                wordCount={article.wordCount || 0}
                readingTimeMinutes={article.readingTimeMinutes || 1}
                loading={saving}
                onTransition={handleWorkflowTransition}
              />
            </div>

            {/* Rich Manuscript Writing Canvas */}
            <div id="tour-editor-canvas">
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
                onOpenStoryTemplates={() => setStoryTemplatesOpen(true)}
                onOpenEditorialPatterns={() => setEditorialPatternsOpen(true)}
                onShowOutline={() => setDocumentMapOpen(true)}
              />
            </div>
          </div>


          {/* ─── CONTEXTUAL ACCORDION INSPECTOR (4 cols) ───────────────────── */}
          {inspectorOpen && (
            <aside id="tour-editor-inspector" className="lg:col-span-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-150 font-sans select-none">
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

      {/* ─── MODALS & DRAWERS ────────────────────────────────────────────── */}
      <UnsavedChangesModal
        isOpen={leaveConfirmModalOpen}
        onKeepEditing={() => setLeaveConfirmModalOpen(false)}
        onDiscardAndLeave={handleConfirmDiscardAndLeave}
        onSaveAndLeave={handleConfirmSaveAndLeave}
        isSaving={saving}
        articleTitle={article.title || 'Untitled Manuscript'}
      />

      <StoryTemplatesModal
        isOpen={storyTemplatesOpen}
        onClose={() => setStoryTemplatesOpen(false)}
        onApplyTemplate={handleApplyStoryTemplate}
        hasExistingContent={Boolean(article.content && article.content.trim().length > 20)}
      />

      <EditorialPatternsModal
        isOpen={editorialPatternsOpen}
        onClose={() => setEditorialPatternsOpen(false)}
        onInsertPattern={handleInsertEditorialPattern}
      />

      <DocumentMapDrawer
        isOpen={documentMapOpen}
        onClose={() => setDocumentMapOpen(false)}
        contentHtml={article.content || ''}
        onJumpToSection={handleJumpToSection}
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

