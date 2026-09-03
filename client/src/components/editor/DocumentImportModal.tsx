import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Check,
  AlertCircle,
  FileCheck,
  BookOpen,
  Image as ImageIcon,
  Clock,
  Heading,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { documentsApi, type DocumentImportResult } from '../../api/documents.api';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { cn } from '../../lib/utils';

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
  const [activeTab, setActiveTab] = useState<'summary' | 'preview'>('summary');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Importer Config Options
  const [useDetectedTitle, setUseDetectedTitle] = useState(true);
  const [stripStyles, setStripStyles] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setErrorMsg(null);
      setIsParsing(false);
      setActiveTab('summary');
    }
  }, [isOpen]);

  const handleFileSelect = async (file: File) => {
    const validExts = ['.docx', '.md', '.markdown', '.txt', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMsg('Invalid format. Allowed document formats: .docx, .md, .txt, .pdf');
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
      setErrorMsg(err?.response?.data?.message || 'Failed to parse document.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!importResult) return;

    let finalHtml = importResult.htmlContent;

    // Bug #4 fix: use DOM-based style stripping instead of a regex that breaks
    // on nested quotes in attribute values (e.g. style="background: url(&quot;img.png&quot;)")
    if (stripStyles) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(finalHtml, 'text/html');
      doc.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
      finalHtml = doc.body.innerHTML;
    }

    onConfirmImport({
      htmlContent: finalHtml,
      title: useDetectedTitle ? importResult.title : undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-6 bg-white border border-border-subtle shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-ink-primary">
              <FileText size={16} />
            </div>
            <div>
              <DialogTitle className="font-serif font-bold text-base text-ink-primary">
                Import External Document
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-ink-secondary">
                Upload Word (.docx), Markdown (.md), Plain Text (.txt), or PDF (.pdf) manuscripts
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: File Selection */}
        {!importResult && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-200 hover:border-accent-crimson/50 rounded-sm p-8 text-center bg-slate-50/50 transition-colors cursor-pointer"
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
              <label htmlFor="doc-file-input" className="cursor-pointer block space-y-2">
                <Upload size={28} className="mx-auto text-slate-400" />
                <div className="text-xs font-mono text-ink-primary font-medium">
                  {selectedFile ? (
                    <span className="text-accent-crimson font-bold">{selectedFile.name}</span>
                  ) : (
                    'Click to select or drag & drop document file here'
                  )}
                </div>
                <div className="text-[10px] font-mono text-ink-secondary">
                  Word (.docx), Markdown (.md), Text (.txt), PDF (.pdf) up to 25 MB
                </div>
              </label>
            </div>

            {isParsing && (
              <div className="py-4 text-center text-xs font-mono text-ink-secondary flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Extracting typography, headings, tables &amp; media...
              </div>
            )}
          </div>
        )}

        {/* Step 2: Pre-Import Review Modal (shadcn UI Tabs) */}
        {importResult && (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-3">
              <TabsTrigger value="summary" className="flex items-center gap-1.5">
                <FileCheck size={13} />
                <span>Summary &amp; Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1.5">
                <BookOpen size={13} />
                <span>Editorial Preview</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Summary */}
            <TabsContent value="summary" className="space-y-4">
              {/* PDF Warning Alert */}
              {importResult.warnings && importResult.warnings.length > 0 && (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>PDF Layout Extraction Notice</AlertTitle>
                  <AlertDescription>
                    {importResult.warnings[0]}
                  </AlertDescription>
                </Alert>
              )}

              {/* Document Analytics Cards */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Format</span>
                  <span className="text-xs font-mono font-bold uppercase text-ink-primary">
                    .{importResult.format}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Word Count</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    {importResult.wordCount.toLocaleString()} words
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Est. Reading Time</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    ~{importResult.readingTimeMinutes} mins
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Headings</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    {importResult.headingsCount} section headers
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Paragraphs</span>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    {importResult.paragraphsCount} blocks
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase text-ink-secondary">Extracted Images</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {importResult.extractedImages.length} media assets
                  </span>
                </div>
              </div>

              {/* Importer Config Switches (shadcn Switch) */}
              <div className="border-t border-border-subtle pt-3 space-y-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary block">
                  Importer Configurations
                </span>

                <div className="flex items-center justify-between">
                  <Label htmlFor="title-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Auto-detect primary title as Article Headline
                  </Label>
                  <Switch
                    id="title-switch"
                    checked={useDetectedTitle}
                    onCheckedChange={setUseDetectedTitle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="strip-styles-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Strip inline Word font styles &amp; custom colors
                  </Label>
                  <Switch
                    id="strip-styles-switch"
                    checked={stripStyles}
                    onCheckedChange={setStripStyles}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="images-switch" className="text-xs font-sans text-ink-primary cursor-pointer">
                    Upload embedded images into Gazette Media Library
                  </Label>
                  <Switch
                    id="images-switch"
                    checked={includeImages}
                    onCheckedChange={setIncludeImages}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Editorial Preview (shadcn ScrollArea) */}
            <TabsContent value="preview">
              <ScrollArea className="h-64 w-full rounded border border-slate-200 p-4 bg-slate-50/50">
                <div
                  dangerouslySetInnerHTML={{ __html: importResult.htmlContent }}
                  className="prose prose-sm max-w-none text-ink-primary font-sans leading-relaxed text-xs [&_h2]:text-sm [&_h2]:font-serif [&_h2]:font-bold [&_h3]:font-serif [&_h3]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-accent-crimson [&_blockquote]:pl-3 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-4"
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isParsing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isParsing || !importResult}
            className="bg-accent-crimson hover:bg-rose-900 text-white font-mono text-xs flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Confirm &amp; Import</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
