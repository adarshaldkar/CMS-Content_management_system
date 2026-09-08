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
import { documentsApi, type DocumentImportResult } from '../../api/documents.api';
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

  // Ingestion Toggles
  const [useDetectedTitle, setUseDetectedTitle] = useState(true);
  const [importLists, setImportLists] = useState(true);
  const [importTables, setImportTables] = useState(true);
  const [importLinks, setImportLinks] = useState(true);
  const [importMathCode, setImportMathCode] = useState(true);
  const [stripPageNoise, setStripPageNoise] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setErrorMsg(null);
      setIsParsing(false);
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
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Failed to parse document manuscript.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!importResult) return;

    let finalHtml = importResult.htmlContent;

    // Post-filter according to author selection
    if (!importTables) {
      finalHtml = finalHtml.replace(/<div class="cms-table-container[\s\S]*?<\/div>/gi, '');
    }
    if (!importMathCode) {
      finalHtml = finalHtml.replace(/<div class="cms-math-block[\s\S]*?<\/div>/gi, '');
      finalHtml = finalHtml.replace(/<pre class="cms-code-block[\s\S]*?<\/pre>/gi, '');
    }

    onConfirmImport({
      htmlContent: finalHtml,
      title: useDetectedTitle ? importResult.title : undefined,
    });

    onClose();
  };

  // Detected feature telemetry
  const linksCount = (importResult?.htmlContent.match(/<a\s/gi) || []).length;
  const tablesCount = (importResult?.htmlContent.match(/<table/gi) || []).length;
  const mathCount = (importResult?.htmlContent.match(/cms-math/gi) || []).length;
  const codeCount = (importResult?.htmlContent.match(/cms-code/gi) || []).length;
  const listsCount = (importResult?.htmlContent.match(/<ul|<ol/gi) || []).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-6 bg-white border border-border-subtle rounded-md shadow-2xl font-sans">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-slate-100 flex items-center justify-center text-ink-primary">
              <FileText size={16} />
            </div>
            <div>
              <DialogTitle className="font-serif font-bold text-base text-ink-primary">
                Universal Document Ingestion &amp; Import
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-ink-secondary">
                Ingest PDF (.pdf), Word (.docx), Markdown (.md), or Plain Text (.txt)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Upload Zone */}
        {!importResult && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-200 hover:border-accent-crimson/60 rounded-md p-10 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer"
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
              <label htmlFor="doc-file-input" className="cursor-pointer block space-y-2.5">
                <Upload size={32} className="mx-auto text-slate-400" />
                <div className="text-sm font-sans text-ink-primary font-medium">
                  {selectedFile ? (
                    <span className="text-accent-crimson font-bold">{selectedFile.name}</span>
                  ) : (
                    'Click to select or drag & drop manuscript file here'
                  )}
                </div>
                <div className="text-xs font-mono text-ink-secondary">
                  Preserves typography, headings, bullet lists, math, tables, hyperlinks, and media
                </div>
              </label>
            </div>

            {isParsing && (
              <div className="py-6 text-center text-xs font-mono text-ink-secondary flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Parsing document structure, headings, lists &amp; links…
              </div>
            )}
          </div>
        )}

        {/* Step 2: Split-Pane Ingestion Quality & Diagnostics Report */}
        {importResult && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-2">
            {/* Left Column: Diagnostics Report & Ingestion Settings (5 cols) */}
            <div className="md:col-span-5 space-y-4 border-r md:border-slate-100 pr-0 md:pr-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-mono font-bold uppercase text-ink-secondary">
                  Ingestion Diagnostics
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-accent-crimson/10 text-accent-crimson text-[11px] font-mono font-bold uppercase">
                  .{importResult.format}
                </span>
              </div>

              {/* Quality Checklist */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 bg-emerald-50/60 border border-emerald-200 rounded-xs text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Headings &amp; Sections</span>
                  </span>
                  <span className="font-bold">{importResult.headingsCount} detected</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-emerald-50/60 border border-emerald-200 rounded-xs text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <ListOrdered size={13} className="text-emerald-600" />
                    <span>Structured Lists</span>
                  </span>
                  <span className="font-bold">{listsCount} list blocks</span>
                </div>

                {linksCount > 0 && (
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xs text-ink-primary">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon size={13} className="text-accent-crimson" />
                      <span>Hyperlinks Linkified</span>
                    </span>
                    <span className="font-bold">{linksCount} links</span>
                  </div>
                )}

                {tablesCount > 0 && (
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xs text-ink-primary">
                    <span className="flex items-center gap-1.5">
                      <TableIcon size={13} className="text-accent-crimson" />
                      <span>Interactive Tables</span>
                    </span>
                    <span className="font-bold">{tablesCount} tables</span>
                  </div>
                )}

                {(mathCount > 0 || codeCount > 0) && (
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xs text-ink-primary">
                    <span className="flex items-center gap-1.5">
                      <Sigma size={13} className="text-accent-crimson" />
                      <span>Math &amp; Code Blocks</span>
                    </span>
                    <span className="font-bold">{mathCount + codeCount} blocks</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xs border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-secondary block">Word Count</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    {importResult.wordCount.toLocaleString()} words
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-secondary block">Read Time</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    ~{importResult.readingTimeMinutes} mins
                  </span>
                </div>
              </div>

              {/* Ingestion Configuration Switches */}
              <div className="pt-2 space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary block font-bold">
                  Ingestion Options
                </span>

                <div className="flex items-center justify-between">
                  <Label htmlFor="title-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Apply detected title to Headline
                  </Label>
                  <Switch
                    id="title-switch"
                    checked={useDetectedTitle}
                    onCheckedChange={setUseDetectedTitle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="lists-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Preserve bullet lists &amp; numbered steps
                  </Label>
                  <Switch
                    id="lists-switch"
                    checked={importLists}
                    onCheckedChange={setImportLists}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="links-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Autolink external URLs &amp; links
                  </Label>
                  <Switch
                    id="links-switch"
                    checked={importLinks}
                    onCheckedChange={setImportLinks}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="noise-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Strip repeating page numbers &amp; footers
                  </Label>
                  <Switch
                    id="noise-switch"
                    checked={stripPageNoise}
                    onCheckedChange={setStripPageNoise}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className="text-xs font-mono text-slate-500 hover:text-ink-primary underline block pt-1 cursor-pointer"
              >
                &larr; Choose a different file
              </button>
            </div>

            {/* Right Column: Live Editorial Preview (7 cols) */}
            <div className="md:col-span-7 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-mono font-bold uppercase text-ink-secondary flex items-center gap-1.5">
                  <BookOpen size={13} className="text-accent-crimson" />
                  <span>Manuscript Preview</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Gazette Editorial Design</span>
              </div>

              <div className="h-88 w-full rounded-md border border-slate-200 p-5 bg-[#FCFBF9] overflow-y-auto font-sans">
                {importResult.title && useDetectedTitle && (
                  <h1 className="text-2xl font-serif font-bold text-ink-primary mb-4 pb-2 border-b border-border-subtle">
                    {importResult.title}
                  </h1>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: importResult.htmlContent }}
                  className="prose prose-sm max-w-none text-ink-primary font-sans leading-relaxed text-xs [&_h2]:text-base [&_h2]:font-bold [&_h2]:font-serif [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:font-serif [&_h3]:mt-3 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-accent-crimson [&_blockquote]:pl-3 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5"
                />
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isParsing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isParsing || !importResult}
            className="bg-accent-crimson hover:bg-rose-900 text-white font-mono text-xs flex items-center gap-1.5 px-4 cursor-pointer"
          >
            <Check size={14} />
            <span>Confirm &amp; Ingest Manuscript</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
