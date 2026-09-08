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
  Blocks,
  Copy,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { documentsApi, type DocumentImportResult, type DocumentPage, type GutenbergParseResult } from '../../api/documents.api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (importedData: { htmlContent: string; title?: string }) => void;
  currentGazetteHtml?: string;
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  currentGazetteHtml = '',
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'gutenberg'>('file');

  // File Ingestion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<DocumentImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & Page Navigation State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');

  // Gutenberg State
  const [gutenbergInput, setGutenbergInput] = useState('');
  const [gutenbergResult, setGutenbergResult] = useState<GutenbergParseResult | null>(null);
  const [isGutenbergLoading, setIsGutenbergLoading] = useState(false);
  const [gutenbergExportOutput, setGutenbergExportOutput] = useState('');
  const [isExportingGutenberg, setIsExportingGutenberg] = useState(false);
  const [copiedGutenberg, setCopiedGutenberg] = useState(false);

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
      setGutenbergInput('');
      setGutenbergResult(null);
      setGutenbergExportOutput('');
      setCopiedGutenberg(false);
    }
  }, [isOpen]);

  // Handle Gutenberg Parse
  const handleParseGutenberg = async () => {
    if (!gutenbergInput.trim()) return;
    setIsGutenbergLoading(true);
    setErrorMsg(null);
    try {
      const res = await documentsApi.parseGutenberg(gutenbergInput);
      setGutenbergResult(res);
    } catch {
      setErrorMsg('Failed to parse WordPress Gutenberg blocks.');
    } finally {
      setIsGutenbergLoading(false);
    }
  };

  // Handle Gutenberg Export
  const handleExportGutenberg = async () => {
    setIsExportingGutenberg(true);
    try {
      const res = await documentsApi.serializeGutenberg(currentGazetteHtml || '');
      setGutenbergExportOutput(res.gutenbergHtml);
    } catch {
      setErrorMsg('Failed to serialize Gazette manuscript into Gutenberg format.');
    } finally {
      setIsExportingGutenberg(false);
    }
  };

  const handleCopyGutenberg = () => {
    if (!gutenbergExportOutput) return;
    navigator.clipboard.writeText(gutenbergExportOutput);
    setCopiedGutenberg(true);
    setTimeout(() => setCopiedGutenberg(false), 2000);
  };

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
      const total = result.totalPages || (result.pages ? result.pages.length : 1);
      const allNums = Array.from({ length: total }, (_, i) => i + 1);
      setSelectedPageNumbers(allNums);
    } catch {
      setErrorMsg('Document extraction failed. Ensure file is not password-protected.');
    } finally {
      setIsParsing(false);
    }
  };

  const pages: DocumentPage[] = importResult?.pages || [
    {
      pageNumber: 1,
      title: importResult?.title,
      htmlContent: importResult?.htmlContent || '',
      wordCount: importResult?.wordCount || 0,
    },
  ];

  const totalPages = importResult?.totalPages || pages.length || 1;
  const currentPage = pages[currentPageIndex] || pages[0];

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPageNumbers((prev) =>
      prev.includes(pageNumber) ? prev.filter((p) => p !== pageNumber) : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const handleSelectAllPages = () => {
    const allNums = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPageNumbers(allNums);
  };

  const handleDeselectAllPages = () => {
    setSelectedPageNumbers([]);
  };

  const handleConfirm = () => {
    if (activeTab === 'gutenberg' && gutenbergResult) {
      onConfirmImport({
        htmlContent: gutenbergResult.html,
        title: gutenbergResult.title || undefined,
      });
      onClose();
      return;
    }

    if (!importResult) return;
    const selectedPages = pages.filter((p) => selectedPageNumbers.includes(p.pageNumber));
    const combinedHtml = selectedPages.map((p) => p.htmlContent).join('\n\n<hr class="cms-page-break my-6" />\n\n');

    onConfirmImport({
      htmlContent: combinedHtml,
      title: useDetectedTitle ? importResult.title : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 font-sans">
        {/* Header */}
        <DialogHeader className="px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 text-accent-crimson rounded-md border border-rose-100">
              <FileText size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-serif font-bold text-ink-primary">
                Universal Manuscript Ingestion &amp; Gutenberg Interoperability
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary">
                Import formatted Word (.docx), PDF, Markdown, or WordPress Gutenberg blocks
              </DialogDescription>
            </div>
          </div>

          {/* Top Segmented Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                activeTab === 'file'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload size={13} />
              <span>Document File Ingestion</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('gutenberg');
                if (currentGazetteHtml && !gutenbergExportOutput) {
                  handleExportGutenberg();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                activeTab === 'gutenberg'
                  ? 'bg-white text-rose-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Blocks size={13} />
              <span>WordPress Gutenberg Adapter</span>
            </button>
          </div>
        </DialogHeader>

        {/* ─── TAB 2: WORDPRESS GUTENBERG ADAPTER ────────────────────────────── */}
        {activeTab === 'gutenberg' ? (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-200">
            {/* Left: Gutenberg Ingestion */}
            <div className="p-6 flex flex-col justify-between overflow-y-auto bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Blocks className="h-4 w-4 text-rose-800" />
                    <span>Import from WordPress Gutenberg</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Parse &lt;!-- wp:block --&gt;
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Paste raw WordPress post content with block comment delimiters. Gazette will convert them into clean semantic nodes without data loss.
                </p>

                <textarea
                  rows={8}
                  value={gutenbergInput}
                  onChange={(e) => setGutenbergInput(e.target.value)}
                  placeholder="<!-- wp:paragraph -->&#10;<p>Paste your WordPress Gutenberg block code here…</p>&#10;<!-- /wp:paragraph -->"
                  className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-800 text-slate-900"
                />

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleParseGutenberg}
                    disabled={isGutenbergLoading || !gutenbergInput.trim()}
                    className="bg-rose-800 hover:bg-rose-900 text-white text-xs font-mono"
                  >
                    {isGutenbergLoading ? 'Parsing Blocks…' : 'Parse Gutenberg Content'}
                  </Button>
                  {gutenbergResult && (
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      ✓ {gutenbergResult.blocksCount} blocks parsed ({gutenbergResult.unsupportedBlocksCount} preserved)
                    </span>
                  )}
                </div>

                {gutenbergResult && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4 max-h-[160px] overflow-y-auto">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                      Parsed Preview:
                    </span>
                    <div
                      className="prose prose-sm max-w-none text-xs"
                      dangerouslySetInnerHTML={{ __html: gutenbergResult.html }}
                    />
                  </div>
                )}
              </div>

              {gutenbergResult && (
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirm}
                    className="bg-accent-crimson text-white text-xs font-mono"
                  >
                    Insert Parsed WordPress Content
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Export to Gutenberg */}
            <div className="p-6 flex flex-col justify-between overflow-y-auto bg-slate-50/40">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Download className="h-4 w-4 text-rose-800" />
                    <span>Export to WordPress Gutenberg</span>
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportGutenberg}
                    disabled={isExportingGutenberg}
                    className="text-xs font-mono"
                  >
                    {isExportingGutenberg ? 'Serializing…' : 'Refresh Export'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Convert your current Gazette manuscript into standard WordPress Gutenberg block comments, ready to paste directly into WordPress Core editor.
                </p>

                <textarea
                  rows={12}
                  readOnly
                  value={gutenbergExportOutput || 'Click "Refresh Export" to serialize current manuscript.'}
                  className="w-full font-mono text-[11px] p-3 bg-slate-900 text-slate-100 border border-slate-700 rounded-md"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-400">100% WordPress Gutenberg Compliant</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyGutenberg}
                  disabled={!gutenbergExportOutput}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono flex items-center gap-1.5"
                >
                  {copiedGutenberg ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedGutenberg ? 'Copied to Clipboard!' : 'Copy Gutenberg Code'}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── TAB 1: FILE INGESTION (WORD, PDF, MD) ─────────────────────── */
          <div className="flex-1 overflow-hidden flex flex-col">
            {!importResult && !isParsing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-accent-crimson flex items-center justify-center mb-4 border border-rose-100 shadow-2xs">
                  <Upload size={28} />
                </div>
                <h3 className="font-serif text-lg font-bold text-ink-primary mb-1">
                  Upload Journalistic Manuscript
                </h3>
                <p className="text-xs text-ink-secondary max-w-md mb-6 leading-relaxed">
                  Support for Microsoft Word (.docx), Adobe Acrobat (.pdf), Markdown (.md), and plain text dispatches with full pagination.
                </p>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".docx,.md,.markdown,.txt,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <span className="px-5 py-2.5 bg-accent-crimson hover:bg-rose-900 text-white text-xs font-mono font-medium rounded shadow-xs transition-colors">
                    Browse Local File (25 MB max)
                  </span>
                </label>

                {errorMsg && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>
            )}

            {isParsing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
                <LoadingSpinner />
                <h4 className="font-serif text-base font-bold text-ink-primary mt-4">
                  Parsing Document Pages &amp; Typography…
                </h4>
                <p className="text-xs text-ink-secondary mt-1 font-mono">
                  Reconstructing wrapped PDF lines and extracting tables…
                </p>
              </div>
            )}

            {importResult && !isParsing && (
              <div className="flex-1 overflow-hidden flex divide-x divide-slate-200">
                {/* Left: Sidebar Controls */}
                <div className="w-80 bg-white p-5 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Ingested File</span>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{importResult.filename}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {importResult.wordCount} words • {totalPages} pages • {importResult.readingTimeMinutes} min read
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Page Selection</span>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-rose-800">
                          <button type="button" onClick={handleSelectAllPages} className="hover:underline">All</button>
                          <span>•</span>
                          <button type="button" onClick={handleDeselectAllPages} className="hover:underline">None</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-slate-50 rounded border border-slate-200">
                        {pages.map((p) => {
                          const isSelected = selectedPageNumbers.includes(p.pageNumber);
                          const isViewing = currentPageIndex === p.pageNumber - 1;
                          return (
                            <button
                              key={p.pageNumber}
                              type="button"
                              onClick={() => {
                                setCurrentPageIndex(p.pageNumber - 1);
                                togglePageSelection(p.pageNumber);
                              }}
                              className={`p-1.5 rounded text-xs font-mono font-bold transition-all border ${
                                isViewing
                                  ? 'border-rose-800 bg-rose-50 text-rose-900 ring-1 ring-rose-800'
                                  : isSelected
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-white text-slate-400'
                              }`}
                            >
                              P.{p.pageNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <Label htmlFor="use-title" className="text-slate-700 font-medium">Use Detected Headline</Label>
                        <Switch id="use-title" checked={useDetectedTitle} onCheckedChange={setUseDetectedTitle} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <Label htmlFor="import-tables" className="text-slate-700 font-medium">Import Tables</Label>
                        <Switch id="import-tables" checked={importTables} onCheckedChange={setImportTables} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Page Preview Sheet */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-100">
                  <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-sm shadow-md p-10 font-sans min-h-[520px] flex flex-col justify-between">
                    <div>
                      <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="uppercase tracking-wider">{importResult.filename}</span>
                        <span>Page {currentPage.pageNumber} of {totalPages}</span>
                      </div>
                      <div
                        className="prose prose-slate max-w-none text-ink-primary text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: currentPage.htmlContent }}
                      />
                    </div>
                    <div className="pt-6 mt-8 border-t border-slate-100 text-center text-[10px] font-mono text-slate-400">
                      — Page {currentPage.pageNumber} ({currentPage.wordCount} words) —
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="text-xs font-mono text-ink-secondary">
            {activeTab === 'file' && importResult && (
              <span>
                Selected <strong className="text-accent-crimson">{selectedPageNumbers.length}</strong> of {totalPages} pages
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-mono">
              Cancel
            </Button>
            {activeTab === 'file' && importResult && (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={selectedPageNumbers.length === 0}
                className="bg-accent-crimson text-white text-xs font-mono"
              >
                Import Selected Pages
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
