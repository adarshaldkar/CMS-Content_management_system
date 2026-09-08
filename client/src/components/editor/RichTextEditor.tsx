import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Check,
  Unlink,
  Copy,
  Edit2,
  X,
  Link as LinkIcon,
  Plus,
  Trash2,
  Table as TableIcon,
} from 'lucide-react';
import { MediaPickerModal } from './MediaPickerModal';
import { RichEmbedModal } from './RichEmbedModal';
import { VideoUploadModal } from './VideoUploadModal';
import { DocumentImportModal } from './DocumentImportModal';
import { TableBuilderModal } from './TableBuilderModal';
import { EditorialRibbon } from './EditorialRibbon';
import { SlashCommandPalette } from './SlashCommandPalette';
import { FloatingSelectionMiniToolbar } from './FloatingSelectionMiniToolbar';
import { EditorContextMenu } from './EditorContextMenu';
import { ImageResizerOverlay } from './ImageResizerOverlay';
import {
  EDITORIAL_COMMANDS,
  type EditorialCommand,
  type CommandExecutionContext,
} from './commandRegistry';
import { embedsApi, type EmbedMetadataResponse } from '../../api/embeds.api';
import { formatEmbedHtml } from '../../utils/embedFormatter';
import { isValidUrl, detectEmbedInfo } from '../../utils/embedParser';
import { isWordOrDocsHtml, cleanWordHtml } from '../../utils/wordPasteParser';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onTitleDetected?: (title: string) => void;
  placeholder?: string;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  onSetWorkspaceMode?: (mode: 'write' | 'review' | 'preview') => void;
  onOpenRevisionHistory?: () => void;
  onOpenDiffViewer?: () => void;
}

interface ActiveLinkBubble {
  url: string;
  anchorEl: HTMLAnchorElement;
  top: number;
  left: number;
}

interface ActiveTableHandle {
  tableEl: HTMLTableElement;
  cellEl: HTMLTableCellElement;
  top: number;
  left: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onTitleDetected,
  placeholder = 'Begin your manuscript here. Type freely or select text to format…',
  isInspectorOpen = true,
  onToggleInspector,
  onSetWorkspaceMode,
  onOpenRevisionHistory,
  onOpenDiffViewer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedModalUrl, setEmbedModalUrl] = useState('');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [docImportModalOpen, setDocImportModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);

  // Slash Command State
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });

  // Active Block type (p, h2, h3, h4, blockquote, pre)
  const [activeBlockType, setActiveBlockType] = useState('p');

  // Link Popover & Bubble
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTargetBlank, setLinkTargetBlank] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const [activeLinkBubble, setActiveLinkBubble] = useState<ActiveLinkBubble | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dynamic In-Table Context Control Bar
  const [activeTableHandle, setActiveTableHandle] = useState<ActiveTableHandle | null>(null);

  const lastHtmlRef = useRef<string>('');

  // Synchronize incoming external value changes
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      const targetContent = value || '';
      if (currentContent !== targetContent && targetContent !== lastHtmlRef.current) {
        editorRef.current.innerHTML = targetContent;
        lastHtmlRef.current = targetContent;
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  // Execute standard formatting command
  const executeCommand = useCallback(
    (command: string, valueArg: string | undefined = undefined) => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      document.execCommand(command, false, valueArg);
      handleInput();
    },
    [handleInput],
  );

  const insertHtml = useCallback(
    (html: string) => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      document.execCommand('insertHTML', false, html);
      handleInput();
    },
    [handleInput],
  );

  const openModal = useCallback((modalName: string, initialPayload?: any) => {
    if (modalName === 'link') {
      handleOpenLinkPopover();
    } else if (modalName === 'mediaPicker') {
      setMediaPickerOpen(true);
    } else if (modalName === 'richEmbed') {
      setEmbedModalUrl(initialPayload || '');
      setEmbedModalOpen(true);
    } else if (modalName === 'videoUpload') {
      setVideoModalOpen(true);
    } else if (modalName === 'docImport') {
      setDocImportModalOpen(true);
    } else if (modalName === 'table') {
      setTableModalOpen(true);
    } else if (modalName === 'revisionHistory') {
      onOpenRevisionHistory && onOpenRevisionHistory();
    } else if (modalName === 'diffViewer') {
      onOpenDiffViewer && onOpenDiffViewer();
    }
  }, [onOpenRevisionHistory, onOpenDiffViewer]);

  // Dynamic Command Execution Context
  const executionContext: CommandExecutionContext = {
    editorRef,
    executeCommand,
    insertHtml,
    openModal,
    toggleInspector: onToggleInspector,
    setWorkspaceMode: onSetWorkspaceMode,
  };

  // ─── Slash Command Caret Tracker ──────────────────────────────────────────
  const checkSlashCommand = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setSlashMenuOpen(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const textBefore = node.textContent?.slice(0, range.startOffset) || '';
      const slashIndex = textBefore.lastIndexOf('/');

      if (slashIndex !== -1 && (slashIndex === 0 || /\s/.test(textBefore[slashIndex - 1]))) {
        const query = textBefore.slice(slashIndex + 1);
        if (!query.includes(' ') && query.length < 15) {
          const rect = range.getBoundingClientRect();
          setSlashQuery(query);
          setSlashPosition({
            top: rect.bottom + 8,
            left: rect.left,
          });
          setSlashMenuOpen(true);
          return;
        }
      }
    }

    setSlashMenuOpen(false);
  };

  const handleSelectSlashCommand = (cmd: EditorialCommand) => {
    // Erase the typed /query
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          node.textContent = text.slice(0, slashIndex) + text.slice(range.startOffset);
        }
      }
    }

    setSlashMenuOpen(false);
    cmd.execute(executionContext);
  };

  // ─── Keydown & Dynamic Shortcuts ─────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeCommand('bold');
      } else if (key === 'i') {
        e.preventDefault();
        executeCommand('italic');
      } else if (key === 'u') {
        e.preventDefault();
        executeCommand('underline');
      } else if (key === 'k') {
        e.preventDefault();
        handleOpenLinkPopover();
      } else if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          executeCommand('redo');
        } else {
          executeCommand('undo');
        }
      } else if (key === 'y') {
        e.preventDefault();
        executeCommand('redo');
      } else if (key === '\\') {
        e.preventDefault();
        onToggleInspector && onToggleInspector();
      }
    }
  };

  // ─── Dynamic Click & In-Table Handle Detection ────────────────────────────
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Detect link click
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      const href = anchor.getAttribute('href') || anchor.href;
      if (href) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }

        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const anchorRect = anchor.getBoundingClientRect();
          const top = anchorRect.bottom - containerRect.top + 6;
          const left = Math.max(10, anchorRect.left - containerRect.left);

          setActiveLinkBubble({
            url: href,
            anchorEl: anchor,
            top,
            left,
          });
          setCopiedUrl(false);
          setActiveTableHandle(null);
          return;
        }
      }
    } else if (!target.closest('.cms-link-bubble')) {
      setActiveLinkBubble(null);
    }

    // Detect table cell click
    const tableCell = target.closest('td, th') as HTMLTableCellElement | null;
    const table = target.closest('table') as HTMLTableElement | null;
    if (tableCell && table && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const cellRect = tableCell.getBoundingClientRect();
      setActiveTableHandle({
        tableEl: table,
        cellEl: tableCell,
        top: cellRect.top - containerRect.top - 36,
        left: Math.max(10, cellRect.left - containerRect.left),
      });
    } else if (!target.closest('.cms-table-handle-bar')) {
      setActiveTableHandle(null);
    }
  };

  // ─── Dynamic Table Operations (Add Row/Column, Delete Row/Column) ─────────
  const handleAddTableRow = () => {
    if (!activeTableHandle) return;
    const { tableEl, cellEl } = activeTableHandle;
    const currentRow = cellEl.closest('tr');
    if (!currentRow) return;

    const newRow = document.createElement('tr');
    newRow.className = 'hover:bg-slate-50/80 transition-colors';
    const colCount = currentRow.children.length;

    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement('td');
      newCell.className = 'p-3 font-sans text-ink-primary border-r border-border-subtle last:border-r-0';
      newCell.innerHTML = '<br>';
      newRow.appendChild(newCell);
    }

    currentRow.after(newRow);
    handleInput();
  };

  const handleAddTableColumn = () => {
    if (!activeTableHandle) return;
    const { tableEl, cellEl } = activeTableHandle;
    const cellIndex = cellEl.cellIndex;

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    rows.forEach((row) => {
      const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = isHeader
        ? 'p-3 text-left font-semibold border-r border-border-subtle last:border-r-0'
        : 'p-3 font-sans text-ink-primary border-r border-border-subtle last:border-r-0';
      newCell.innerHTML = '<br>';

      const targetCell = row.children[cellIndex];
      if (targetCell) {
        targetCell.after(newCell);
      } else {
        row.appendChild(newCell);
      }
    });

    handleInput();
  };

  const handleDeleteTableRow = () => {
    if (!activeTableHandle) return;
    const { cellEl } = activeTableHandle;
    const currentRow = cellEl.closest('tr');
    if (currentRow) {
      currentRow.remove();
      setActiveTableHandle(null);
      handleInput();
    }
  };

  const handleDeleteTableColumn = () => {
    if (!activeTableHandle) return;
    const { tableEl, cellEl } = activeTableHandle;
    const cellIndex = cellEl.cellIndex;

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    rows.forEach((row) => {
      const cell = row.children[cellIndex];
      if (cell) cell.remove();
    });

    setActiveTableHandle(null);
    handleInput();
  };

  // ─── Link Popover Management ──────────────────────────────────────────────
  const handleOpenLinkPopover = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      const node = sel.anchorNode;
      const parentLink = node?.parentElement?.closest('a') as HTMLAnchorElement | null;
      if (parentLink) {
        setLinkUrl(parentLink.getAttribute('href') || '');
        setLinkTargetBlank(parentLink.getAttribute('target') === '_blank');
      } else {
        const text = sel.toString().trim();
        if (isValidUrl(text)) {
          setLinkUrl(text);
        } else {
          setLinkUrl('');
        }
        setLinkTargetBlank(true);
      }
    } else {
      savedRangeRef.current = null;
      setLinkUrl('');
    }
    setLinkError(null);
    setActiveLinkBubble(null);
    setLinkPopoverOpen(true);
  };

  const handleApplyLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setLinkError('Please enter a destination URL.');
      return;
    }

    const isSafe =
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('/');

    if (!isSafe) {
      setLinkError('Invalid URL protocol. Allowed: https://, http://, mailto:, tel:');
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }

    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    if (sel && sel.toString().length === 0 && savedRangeRef.current) {
      const targetAttr = linkTargetBlank ? ' target="_blank" rel="noopener noreferrer"' : '';
      const anchorHtml = `<a href="${trimmed}"${targetAttr} class="text-accent-crimson font-serif underline hover:text-rose-900 transition-colors">${trimmed}</a>`;
      executeCommand('insertHTML', anchorHtml);
    } else {
      executeCommand('createLink', trimmed);
      if (linkTargetBlank && editorRef.current) {
        const links = editorRef.current.querySelectorAll('a');
        links.forEach((a) => {
          if (a.getAttribute('href') === trimmed) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.className = 'text-accent-crimson font-serif underline hover:text-rose-900 transition-colors';
          }
        });
      }
    }

    setLinkPopoverOpen(false);
    handleInput();
  };

  const handleRemoveLink = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    executeCommand('unlink');
    setLinkPopoverOpen(false);
    setActiveLinkBubble(null);
    handleInput();
  };

  const handleUnlinkFromBubble = (anchorEl: HTMLAnchorElement) => {
    const parent = anchorEl.parentNode;
    while (anchorEl.firstChild) {
      parent?.insertBefore(anchorEl.firstChild, anchorEl);
    }
    parent?.removeChild(anchorEl);
    setActiveLinkBubble(null);
    handleInput();
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  // ─── Media & Document Handlers ────────────────────────────────────────────
  const handleMediaSelected = (url: string) => {
    executeCommand('insertImage', url);
  };

  const handleEmbedInsert = (embedData: EmbedMetadataResponse) => {
    const embedHtml = formatEmbedHtml(embedData, {
      width: 'wide',
      caption: embedData.caption,
      displayMode: embedData.displayMode || 'embed',
      includeTranscript: Boolean(embedData.transcript),
    });
    executeCommand('insertHTML', embedHtml + '<p><br></p>');
  };

  const handleNativeVideoInsert = (videoData: {
    url: string;
    posterUrl?: string;
    caption?: string;
    width: 'standard' | 'wide' | 'full';
    autoplay: boolean;
    loop: boolean;
  }) => {
    const widthStyle =
      videoData.width === 'full'
        ? 'width:100%;max-width:100%;margin:2rem 0;'
        : videoData.width === 'wide'
        ? 'max-width:56rem;margin:1.75rem auto;'
        : 'max-width:42rem;margin:1.5rem auto;';

    const widthClass =
      videoData.width === 'full'
        ? 'w-full max-w-full my-8'
        : videoData.width === 'wide'
        ? 'max-w-4xl mx-auto my-7'
        : 'max-w-2xl mx-auto my-6';

    const captionHtml = videoData.caption
      ? `<figcaption class="cms-embed-caption text-center text-xs font-serif text-ink-secondary italic mt-2.5">${videoData.caption}</figcaption>`
      : '';

    const videoHtml = `
<figure class="cms-native-video-block ${widthClass} clear-both select-none" style="${widthStyle}" data-video-url="${videoData.url}" data-width="${videoData.width}" data-autoplay="${videoData.autoplay}" data-loop="${videoData.loop}">
  <div class="cms-native-video-wrapper aspect-video w-full rounded-sm overflow-hidden bg-slate-950 border border-slate-800 relative" style="position:relative;aspect-ratio:16/9;width:100%;border-radius:0.125rem;overflow:hidden;background:#020617;">
    <video
      src="${videoData.url}"
      ${videoData.posterUrl ? `poster="${videoData.posterUrl}"` : ''}
      ${videoData.autoplay ? 'autoplay muted' : ''}
      ${videoData.loop ? 'loop' : ''}
      controls
      class="w-full h-full object-contain"
      style="width:100%;height:100%;object-fit:contain;"
    ></video>
  </div>
  ${captionHtml}
</figure>
    `.trim();

    executeCommand('insertHTML', videoHtml + '<p><br></p>');
  };

  const handleDocumentImported = (importedData: { htmlContent: string; title?: string }) => {
    if (onTitleDetected && importedData.title) {
      onTitleDetected(importedData.title);
    }

    if (editorRef.current) {
      const current = editorRef.current.innerHTML.trim();
      let newContent = '';
      if (!current || current === '<p><br></p>' || current === '<br>' || current === '<p></p>' || current === '') {
        newContent = importedData.htmlContent;
      } else {
        newContent = current + '<p><br></p>' + importedData.htmlContent;
      }
      editorRef.current.innerHTML = newContent;
      lastHtmlRef.current = newContent;
      onChange(newContent);
      editorRef.current.focus();
    }
  };

  // ─── Intelligent Clipboard Paste Handler (Word / Docs / Links) ───────────
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain')?.trim();

    // 1. If pasting Microsoft Word or Google Docs HTML
    if (clipboardHtml && isWordOrDocsHtml(clipboardHtml)) {
      e.preventDefault();
      const cleanHtml = cleanWordHtml(clipboardHtml);
      executeCommand('insertHTML', cleanHtml);
      return;
    }

    // 2. If pasting an external media URL (YouTube, Vimeo, Spotify, etc.)
    if (pastedText && isValidUrl(pastedText)) {
      const detected = detectEmbedInfo(pastedText);
      if (detected) {
        e.preventDefault();
        try {
          const scraped = await embedsApi.scrape(pastedText);
          handleEmbedInsert(scraped);
        } catch {
          const fallbackData: EmbedMetadataResponse = {
            url: pastedText,
            provider: detected.provider,
            providerName: detected.providerName,
            videoId: detected.videoId,
            embedUrl: detected.embedUrl || pastedText,
            title: `${detected.providerName} Media`,
            aspectRatio: '16:9',
            displayMode: detected.isMedia ? 'embed' : 'card',
            snapshottedAt: new Date().toISOString(),
          };
          handleEmbedInsert(fallbackData);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-white border border-border-subtle rounded-md focus-within:border-ink-primary transition-colors shadow-xs font-sans"
    >
      {/* ─── Microsoft Word-Grade 7-Category Sticky Ribbon ──────────────── */}
      <EditorialRibbon
        executionContext={executionContext}
        activeBlockType={activeBlockType}
        isInspectorOpen={isInspectorOpen}
      />

      {/* ─── Microsoft Word-Style Floating Selection Mini-Toolbar ─────── */}
      <FloatingSelectionMiniToolbar
        editorRef={editorRef}
        executionContext={executionContext}
      />

      {/* ─── Microsoft Word-Style Right-Click Context Menu ─────────────── */}
      <EditorContextMenu
        editorRef={editorRef}
        executionContext={executionContext}
      />

      {/* ─── Slash Command (/) Interactive Palette ───────────────────────── */}
      <SlashCommandPalette
        isOpen={slashMenuOpen}
        query={slashQuery}
        position={slashPosition}
        onClose={() => setSlashMenuOpen(false)}
        onSelectCommand={handleSelectSlashCommand}
      />

      {/* ─── Floating Dynamic Table Action Handle ───────────────────────── */}
      {activeTableHandle && (
        <div
          className="cms-table-handle-bar absolute z-30 flex items-center gap-1 p-1 bg-slate-900 text-white border border-slate-700 rounded-sm shadow-xl text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${activeTableHandle.top}px`, left: `${activeTableHandle.left}px` }}
        >
          <span className="text-[10px] text-slate-400 px-1.5 font-bold flex items-center gap-1">
            <TableIcon size={12} />
            <span>Table</span>
          </span>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleAddTableRow}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 rounded-xs transition-colors cursor-pointer"
            title="Insert row below"
          >
            <Plus size={11} />
            <span>Row</span>
          </button>

          <button
            type="button"
            onClick={handleAddTableColumn}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 rounded-xs transition-colors cursor-pointer"
            title="Insert column right"
          >
            <Plus size={11} />
            <span>Col</span>
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleDeleteTableRow}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Delete this row"
          >
            <Trash2 size={12} />
          </button>

          <button
            type="button"
            onClick={handleDeleteTableColumn}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Delete this column"
          >
            <Trash2 size={12} className="rotate-90" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTableHandle(null)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ─── Floating Active Link Action Bubble ──────────────────────────── */}
      {activeLinkBubble && (
        <div
          className="cms-link-bubble absolute z-30 flex items-center gap-1.5 p-1.5 bg-slate-900 text-white border border-slate-700 rounded-sm shadow-xl text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
          style={{ top: `${activeLinkBubble.top}px`, left: `${activeLinkBubble.left}px` }}
        >
          <a
            href={activeLinkBubble.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-accent-crimson hover:bg-rose-700 text-white rounded-xs transition-colors font-bold text-[11px]"
            title="Open in new browser tab"
          >
            <span>Open Link</span>
            <ExternalLink size={12} />
          </a>

          <div className="max-w-[180px] sm:max-w-[240px] truncate text-slate-300 px-1 text-[11px]" title={activeLinkBubble.url}>
            {activeLinkBubble.url}
          </div>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => handleCopyUrl(activeLinkBubble.url)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Copy URL"
          >
            {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setLinkUrl(activeLinkBubble.url);
              setLinkTargetBlank(activeLinkBubble.anchorEl.getAttribute('target') === '_blank');
              setActiveLinkBubble(null);
              setLinkPopoverOpen(true);
            }}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Edit URL"
          >
            <Edit2 size={13} />
          </button>

          <button
            type="button"
            onClick={() => handleUnlinkFromBubble(activeLinkBubble.anchorEl)}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
            title="Remove Link"
          >
            <Unlink size={13} />
          </button>

          <button
            type="button"
            onClick={() => setActiveLinkBubble(null)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ─── Floating Link Insert / Edit Popover Dialog ──────────────────── */}
      {linkPopoverOpen && (
        <div className="absolute top-14 left-6 z-30 w-80 sm:w-96 p-4 bg-white border border-border-subtle rounded-md shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-serif font-bold text-ink-primary flex items-center gap-1.5">
              <LinkIcon size={13} className="text-accent-crimson" />
              <span>Editorial Hyperlink</span>
            </span>
            <button
              type="button"
              onClick={() => setLinkPopoverOpen(false)}
              className="p-1 text-slate-400 hover:text-ink-primary rounded-xs cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-3 pt-3">
            <div>
              <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                Destination URL <span className="text-accent-crimson">*</span>
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink();
                  } else if (e.key === 'Escape') {
                    setLinkPopoverOpen(false);
                  }
                }}
                placeholder="https://youtu.be/... or https://example.com"
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs font-sans border border-slate-200 rounded-xs focus:border-accent-crimson focus:outline-hidden bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-sans text-ink-primary cursor-pointer flex items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={linkTargetBlank}
                  onChange={(e) => setLinkTargetBlank(e.target.checked)}
                  className="rounded-xs text-accent-crimson focus:ring-accent-crimson w-3.5 h-3.5"
                />
                <span>Open link in new window (Tab)</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">rel="noopener noreferrer"</span>
            </div>

            {linkError && (
              <div className="text-[11px] font-mono text-rose-600 bg-rose-50 border border-rose-200 p-1.5 rounded-xs">
                {linkError}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRemoveLink}
                className="text-xs font-mono text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Unlink size={12} />
                <span>Remove</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLinkPopoverOpen(false)}
                  className="px-2.5 py-1 text-xs font-mono text-ink-secondary hover:text-ink-primary border border-slate-200 rounded-xs bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-3 py-1 text-xs font-mono text-white bg-accent-crimson hover:bg-rose-900 rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check size={12} />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Image Resizer Overlay (Mouse Drag + Arrow Keys) ── */}
      <ImageResizerOverlay
        editorRef={editorRef}
        containerRef={containerRef}
        onContentChange={handleInput}
      />

      {/* ─── Editable Manuscript Canvas ─────────────────────────────────── */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        spellCheck={true}
        onClick={handleEditorClick}
        onInput={() => {
          handleInput();
          checkSlashCommand();
        }}
        onBlur={handleInput}
        onKeyUp={() => {
          handleInput();
          checkSlashCommand();
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{ minHeight: '520px', outline: 'none' }}
        className="manuscript-editor w-full p-8 text-ink-primary text-base sm:text-lg leading-relaxed font-sans cursor-text focus:outline-hidden"
      />

      {/* ─── Modals ─────────────────────────────────────────────────────── */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelected}
      />

      <RichEmbedModal
        isOpen={embedModalOpen}
        initialUrl={embedModalUrl}
        onClose={() => setEmbedModalOpen(false)}
        onInsert={handleEmbedInsert}
      />

      <VideoUploadModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        onInsert={handleNativeVideoInsert}
      />

      <DocumentImportModal
        isOpen={docImportModalOpen}
        onClose={() => setDocImportModalOpen(false)}
        onConfirmImport={handleDocumentImported}
      />

      <TableBuilderModal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        onInsertTable={(tableHtml) => insertHtml(tableHtml)}
      />
    </div>
  );
};
