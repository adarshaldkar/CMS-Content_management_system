import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Check,
  AlertCircle,
  BookOpen,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Table as TableIcon,
  Code,
  Sigma,
  ListOrdered,
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  FileCheck,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { documentsApi, type DocumentImportResult, type DocumentPage } from '../../api/documents.api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (importedData: { htmlContent: string; title?: string }) => void;
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<DocumentImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & Page Navigation State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');

  // Ingestion Toggles
  const [useDetectedTitle, setUseDetectedTitle] = useState(true);
  const [importLists, setImportLists] = useState(true);
  const [importTables, setImportTables] = useState(true);
  const [importLinks, setImportLinks] = useState(true);
  const [importMathCode, setImportMathCode] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setErrorMsg(null);
      setIsParsing(false);
      setCurrentPageIndex(0);
      setSelectedPageNumbers([]);
      setViewMode('single');
    }
  }, [isOpen]);

  const handleFileSelect = async (file: File) => {
    const validExts = ['.docx', '.md', '.markdown', '.txt', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMsg('Invalid format. Supported manuscripts: .docx, .md, .txt, .pdf');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Document file exceeds the maximum size limit of 25 MB.');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setIsParsing(true);

    try {
      const result = await documentsApi.importDocument(file);
      setImportResult(result);
      setCurrentPageIndex(0);
      // Select all pages by default
      if (result.pages && result.pages.length > 0) {
        setSelectedPageNumbers(result.pages.map((p) => p.pageNumber));
      } else {
        setSelectedPageNumbers([1]);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to parse document manuscript.');
    } finally {
      setIsParsing(false);
    }
  };

  // Helper to get pages array
  const pages: DocumentPage[] =
    importResult?.pages && importResult.pages.length > 0
      ? importResult.pages
      : importResult
      ? [
          {
            pageNumber: 1,
            title: importResult.title || 'Page 1',
            htmlContent: importResult.htmlContent,
            wordCount: importResult.wordCount,
          },
        ]
      : [];

  const totalPages = pages.length;
  const currentPage = pages[currentPageIndex] || pages[0];

  const togglePageSelection = (pageNum: number) => {
    setSelectedPageNumbers((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b),
    );
  };

  const selectAllPages = () => {
    setSelectedPageNumbers(pages.map((p) => p.pageNumber));
  };

  const deselectAllPages = () => {
    setSelectedPageNumbers([]);
  };

  const handleConfirm = () => {
    if (!importResult) return;

    // Filter by selected pages
    const chosenPages = pages.filter((p) => selectedPageNumbers.includes(p.pageNumber));
    if (chosenPages.length === 0) {
      setErrorMsg('Please select at least one page to import.');
      return;
    }

    let finalHtml = chosenPages
      .map((p, idx) => {
        const pageSeparator =
          idx > 0 && chosenPages.length > 1
            ? '<hr class="cms-page-break my-8 border-t-2 border-dashed border-slate-300" data-page-break="true" />'
            : '';
        return pageSeparator + p.htmlContent;
      })
      .join('');

    // Post-filter according to author selection
    if (!importTables) {
      finalHtml = finalHtml.replace(/<div class="cms-table-container[\s\S]*?<\/div>/gi, '');
      finalHtml = finalHtml.replace(/<table[\s\S]*?<\/table>/gi, '');
    }

    if (!importLists) {
      finalHtml = finalHtml.replace(/<ul[\s\S]*?<\/ul>/gi, '');
      finalHtml = finalHtml.replace(/<ol[\s\S]*?<\/ol>/gi, '');
    }

    if (!importLinks) {
      finalHtml = finalHtml.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
    }

    if (!importMathCode) {
      finalHtml = finalHtml.replace(/<div class="cms-math-block[\s\S]*?<\/div>/gi, '');
      finalHtml = finalHtml.replace(/<pre[\s\S]*?<\/pre>/gi, '');
    }

    onConfirmImport({
      htmlContent: finalHtml,
      title: useDetectedTitle ? importResult.title : undefined,
    });

    onClose();
  };

  const tablesCount = (importResult?.htmlContent.match(/<table/gi) || []).length;
  const listsCount = (importResult?.htmlContent.match(/<ul|<ol/gi) || []).length;
  const linksCount = (importResult?.htmlContent.match(/<a\b/gi) || []).length;
  const mathCount = (importResult?.htmlContent.match(/cms-math/gi) || []).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[94vw] h-[88vh] max-h-[88vh] p-0 bg-white border border-border-subtle rounded-lg shadow-2xl font-sans flex flex-col overflow-hidden">
        {/* ─── Modal Header ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-accent-crimson/10 text-accent-crimson flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <div>
              <DialogTitle className="font-serif font-bold text-base text-ink-primary flex items-center gap-2">
                <span>Editorial Document Studio &amp; Page Ingestion</span>
                {importResult && (
                  <span className="px-2 py-0.5 rounded-xs bg-slate-200 text-ink-primary text-[11px] font-mono font-bold uppercase">
                    .{importResult.format}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-ink-secondary">
                Inspect manuscript pages, extract structured headings, tables &amp; typography
              </DialogDescription>
            </div>
          </div>

          {importResult && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-ink-primary font-semibold">
                {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
              </span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-ink-primary">
                {importResult.wordCount} Words
              </span>
            </div>
          )}
        </div>

        {/* ─── Body Area ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Step 1: Upload Dropzone (When no document selected) */}
          {!importResult && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className="w-full max-w-xl border-2 border-dashed border-slate-300 hover:border-accent-crimson/60 rounded-lg p-12 text-center bg-slate-50/70 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <input
                  type="file"
                  accept=".docx,.md,.markdown,.txt,.pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="doc-file-input"
                />
                <label htmlFor="doc-file-input" className="cursor-pointer block space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-accent-crimson flex items-center justify-center">
                    <Upload size={28} />
                  </div>
                  <div className="text-base font-serif font-bold text-ink-primary">
                    {selectedFile ? selectedFile.name : 'Upload PDF or Word Document'}
                  </div>
                  <div className="text-xs font-sans text-ink-secondary max-w-md mx-auto">
                    Click to browse or drag &amp; drop manuscript. Automatically detects page boundaries, headings, bullet lists, math equations, tables, and hyperlinks.
                  </div>
                  <div className="pt-2 text-[11px] font-mono text-slate-400">
                    Supported: PDF (.pdf), Microsoft Word (.docx), Markdown (.md), Text (.txt) • Up to 25 MB
                  </div>
                </label>
              </div>

              {isParsing && (
                <div className="mt-6 text-xs font-mono text-ink-primary flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full animate-pulse">
                  <LoadingSpinner size="sm" /> Slicing pages and extracting document structure…
                </div>
              )}

              {errorMsg && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono rounded max-w-md">
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Paginated Document Studio (When document is parsed) */}
          {importResult && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              {/* ─── Left Sidebar: Page Navigator & Ingestion Settings (4 Cols) ─ */}
              <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/60 overflow-hidden">
                {/* Pages List Header */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-primary flex items-center gap-1.5">
                    <Layers size={14} className="text-accent-crimson" />
                    <span>Pages ({totalPages})</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={selectAllPages}
                      className="text-accent-crimson hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={deselectAllPages}
                      className="text-slate-500 hover:text-ink-primary hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Page Thumbnails Scroll Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {pages.map((p, idx) => {
                    const isSelected = selectedPageNumbers.includes(p.pageNumber);
                    const isCurrent = currentPageIndex === idx;

                    return (
                      <div
                        key={p.pageNumber}
                        onClick={() => setCurrentPageIndex(idx)}
                        className={`p-3 rounded border text-left transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                          isCurrent
                            ? 'bg-white border-accent-crimson shadow-sm ring-1 ring-accent-crimson/30'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePageSelection(p.pageNumber);
                            }}
                            className="mt-0.5 text-slate-400 hover:text-accent-crimson cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-accent-crimson" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="text-xs font-serif font-bold text-ink-primary truncate">
                              Page {p.pageNumber} {p.title && p.title !== `Page ${p.pageNumber}` ? `: ${p.title}` : ''}
                            </div>
                            <div className="text-[11px] font-mono text-ink-secondary mt-0.5">
                              {p.wordCount} words
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            isCurrent
                              ? 'bg-rose-100 text-accent-crimson font-bold'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          P.{p.pageNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Ingestion Feature Filters (Bottom of Left Panel) */}
                <div className="p-3 border-t border-slate-200 bg-white shrink-0 space-y-2 text-xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-ink-secondary font-bold mb-1">
                    Editorial Feature Filters
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="toggle-title" className="text-xs cursor-pointer text-ink-primary">
                      Use Detected Title
                    </Label>
                    <Switch
                      id="toggle-title"
                      checked={useDetectedTitle}
                      onCheckedChange={setUseDetectedTitle}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="toggle-tables" className="text-xs cursor-pointer text-ink-primary">
                      Import Tables ({tablesCount})
                    </Label>
                    <Switch
                      id="toggle-tables"
                      checked={importTables}
                      onCheckedChange={setImportTables}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="toggle-lists" className="text-xs cursor-pointer text-ink-primary">
                      Import Structured Lists ({listsCount})
                    </Label>
                    <Switch
                      id="toggle-lists"
                      checked={importLists}
                      onCheckedChange={setImportLists}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="toggle-links" className="text-xs cursor-pointer text-ink-primary">
                      Preserve Hyperlinks ({linksCount})
                    </Label>
                    <Switch
                      id="toggle-links"
                      checked={importLinks}
                      onCheckedChange={setImportLinks}
                    />
                  </div>
                </div>
              </div>

              {/* ─── Right Column: A4 Manuscript Page Inspector (8 Cols) ──────── */}
              <div className="md:col-span-8 flex flex-col bg-slate-100/70 overflow-hidden">
                {/* Pagination Toolbar */}
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
                  {/* Prev / Next Page Controls */}
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPageIndex <= 0}
                      onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                      className="h-7 px-2 text-xs"
                    >
                      <ChevronLeft size={14} className="mr-1" /> Prev
                    </Button>

                    <span className="px-2 font-bold text-ink-primary">
                      Page {currentPageIndex + 1} of {totalPages}
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPageIndex >= totalPages - 1}
                      onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                      className="h-7 px-2 text-xs"
                    >
                      Next <ChevronRight size={14} className="ml-1" />
                    </Button>
                  </div>

                  {/* View Mode Switcher & Include Checkbox */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-sans text-ink-primary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedPageNumbers.includes(currentPage.pageNumber)}
                        onChange={() => togglePageSelection(currentPage.pageNumber)}
                        className="rounded text-accent-crimson focus:ring-accent-crimson"
                      />
                      <span>Include in import</span>
                    </label>

                    <div className="h-4 w-px bg-slate-200" />

                    <div className="flex items-center border border-slate-200 rounded p-0.5 bg-slate-50 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => setViewMode('single')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          viewMode === 'single'
                            ? 'bg-white text-accent-crimson shadow-xs font-bold'
                            : 'text-slate-500 hover:text-ink-primary'
                        }`}
                      >
                        Single Page
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('continuous')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          viewMode === 'continuous'
                            ? 'bg-white text-accent-crimson shadow-xs font-bold'
                            : 'text-slate-500 hover:text-ink-primary'
                        }`}
                      >
                        Continuous
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manuscript Sheet Canvas Viewport */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                  {viewMode === 'single' ? (
                    /* Single Page Mode */
                    <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-sm shadow-md p-10 font-sans min-h-[520px] flex flex-col justify-between">
                      <div>
                        {/* Page Top Header Bar */}
                        <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="uppercase tracking-wider">{importResult.filename}</span>
                          <span>Page {currentPage.pageNumber} of {totalPages}</span>
                        </div>

                        {/* Page HTML Content */}
                        <div
                          className="prose prose-slate max-w-none text-ink-primary text-base leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: currentPage.htmlContent }}
                        />
                      </div>

                      {/* Page Bottom Footer Bar */}
                      <div className="pt-6 mt-8 border-t border-slate-100 text-center text-[10px] font-mono text-slate-400">
                        — Page {currentPage.pageNumber} ({currentPage.wordCount} words) —
                      </div>
                    </div>
                  ) : (
                    /* Continuous Mode (All Pages with Dividers) */
                    <div className="w-full max-w-3xl space-y-6">
                      {pages.map((p) => {
                        const isIncluded = selectedPageNumbers.includes(p.pageNumber);
                        return (
                          <div
                            key={p.pageNumber}
                            className={`bg-white border rounded-sm shadow-md p-10 font-sans transition-all ${
                              isIncluded ? 'border-slate-200 opacity-100' : 'border-slate-200 opacity-50 bg-slate-50/50'
                            }`}
                          >
                            <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span className="font-bold text-accent-crimson">PAGE {p.pageNumber}</span>
                              <span>{p.wordCount} words</span>
                            </div>
                            <div
                              className="prose prose-slate max-w-none text-ink-primary text-base leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: p.htmlContent }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Modal Footer ─────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="text-xs font-mono text-ink-secondary">
            {importResult && (
              <span>
                Selected{' '}
                <strong className="text-accent-crimson">{selectedPageNumbers.length}</strong> of{' '}
                {totalPages} pages for manuscript insertion
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-mono"
            >
              Cancel
            </Button>

            {importResult && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={selectedPageNumbers.length === 0}
                className="bg-accent-crimson hover:bg-rose-900 text-white text-xs font-mono flex items-center gap-1.5"
              >
                <FileCheck size={14} />
                <span>
                  Import {selectedPageNumbers.length === totalPages ? 'All Pages' : `${selectedPageNumbers.length} Pages`}
                </span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
