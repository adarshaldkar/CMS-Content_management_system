import React, { useState, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  MessageSquareQuote,
  Link as LinkIcon,
  Table,
  Minus,
  ImageIcon,
  Film,
  Video,
  FileText,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Bookmark,
  History,
  GitCompare,
  PanelRight,
  Eye,
  ChevronDown,
  Undo2,
  Redo2,
  Type,
  Pilcrow,
} from 'lucide-react';
import {
  type CommandExecutionContext,
  type CommandCategory,
  type EditorialCommand,
  EDITORIAL_COMMANDS,
  toggleSemanticHighlight,
} from './commandRegistry';

interface EditorialRibbonProps {
  executionContext: CommandExecutionContext;
  activeBlockType: string;
  isInspectorOpen?: boolean;
}

const CATEGORIES: { id: CommandCategory; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'format', label: 'Format' },
  { id: 'insert', label: 'Insert' },
  { id: 'media', label: 'Media' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'review', label: 'Review' },
  { id: 'view', label: 'View' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  RemoveFormatting,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  MessageSquareQuote,
  LinkIcon,
  Table,
  Minus,
  ImageIcon,
  Film,
  Video,
  FileText,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Bookmark,
  History,
  GitCompare,
  PanelRight,
  Eye,
  Pilcrow,
  Type,
};

export const EditorialRibbon: React.FC<EditorialRibbonProps> = ({
  executionContext,
  activeBlockType,
  isInspectorOpen = true,
}) => {
  const [openDropdown, setOpenDropdown] = useState<CommandCategory | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    highlight: false,
    ul: false,
    ol: false,
    align: 'left',
  });

  const ribbonRef = useRef<HTMLDivElement>(null);

  // Dynamic active state polling on cursor selection change
  useEffect(() => {
    const updateActiveStates = () => {
      try {
        if (typeof document !== 'undefined') {
          const sel = window.getSelection();
          let isInsideMark = false;
          if (sel && sel.anchorNode) {
            let node: Node | null = sel.anchorNode;
            while (node && node !== document.body) {
              if (
                node instanceof HTMLElement &&
                (node.tagName === 'MARK' || node.classList.contains('cms-semantic-highlight'))
              ) {
                isInsideMark = true;
                break;
              }
              node = node.parentNode;
            }
          }

          setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strike: document.queryCommandState('strikeThrough'),
            highlight: isInsideMark,
            ul: document.queryCommandState('insertUnorderedList'),
            ol: document.queryCommandState('insertOrderedList'),
            align: document.queryCommandState('justifyCenter')
              ? 'center'
              : document.queryCommandState('justifyRight')
              ? 'right'
              : document.queryCommandState('justifyFull')
              ? 'justify'
              : 'left',
          });
        }
      } catch (e) {
        // Silently handle if queryCommandState is unavailable
      }
    };

    document.addEventListener('selectionchange', updateActiveStates);
    return () => document.removeEventListener('selectionchange', updateActiveStates);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecute = (cmd: EditorialCommand) => {
    cmd.execute(executionContext);
    setOpenDropdown(null);
  };

  const getCommandsForCategory = (cat: CommandCategory) => {
    return EDITORIAL_COMMANDS.filter((c) => c.category === cat);
  };

  return (
    <div
      ref={ribbonRef}
      id="tour-editor-ribbon"
      className="sticky top-0 z-30 w-full border-b border-border-subtle bg-white/95 backdrop-blur-md font-sans select-none"
    >
      {/* ─── Top Category Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 border-b border-slate-100 h-8">
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => {
            const isOpen = openDropdown === cat.id;
            return (
              <div key={cat.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                    isOpen
                      ? 'bg-slate-100 text-accent-crimson font-semibold'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 rounded-md border border-border-subtle bg-white shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-ink-secondary border-b border-border-subtle mb-1">
                      {cat.label} Tools
                    </div>
                    <div className="space-y-0.5 px-1">
                      {getCommandsForCategory(cat.id).map((cmd) => {
                        const Icon = ICON_MAP[cmd.icon] || Type;
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            onClick={() => handleExecute(cmd)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs text-ink-primary hover:bg-rose-50/80 hover:text-accent-crimson transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="h-3.5 w-3.5 text-ink-secondary group-hover:text-accent-crimson shrink-0" />
                              <span className="truncate">{cmd.title}</span>
                            </div>
                            {cmd.shortcut && (
                              <span className="font-mono text-[10px] text-ink-secondary bg-slate-100 px-1 py-0.5 rounded ml-2 shrink-0">
                                {cmd.shortcut}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Global Right Action / Status */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-ink-secondary hidden sm:inline">
            Press <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-border-subtle font-mono text-[10px]">/</kbd> for quick menu
          </span>
        </div>
      </div>

      {/* ─── Fast Quick-Action Tool Strip ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {/* History Undo / Redo */}
          <button
            type="button"
            title="Undo (Ctrl+Z)"
            onClick={() => executionContext.executeCommand('undo')}
            className="p-1.5 rounded text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Redo (Ctrl+Y)"
            onClick={() => executionContext.executeCommand('redo')}
            className="p-1.5 rounded text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Quick Block Type Selector */}
          <select
            value={activeBlockType}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'p') executionContext.executeCommand('formatBlock', '<p>');
              else if (val === 'h2') executionContext.executeCommand('formatBlock', '<h2>');
              else if (val === 'h3') executionContext.executeCommand('formatBlock', '<h3>');
              else if (val === 'h4') executionContext.executeCommand('formatBlock', '<h4>');
              else if (val === 'blockquote') executionContext.executeCommand('formatBlock', '<blockquote>');
              else if (val === 'pre') executionContext.executeCommand('formatBlock', '<pre>');
            }}
            className="h-7 text-xs font-serif bg-slate-50 border border-border-subtle rounded px-2 text-ink-primary focus:outline-hidden focus:border-accent-crimson cursor-pointer"
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading 1 (H1)</option>
            <option value="h3">Heading 2 (H2)</option>
            <option value="h4">Heading 3 (H3)</option>
            <option value="blockquote">Blockquote</option>
            <option value="pre">Code Block</option>
          </select>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Typography Formats */}
          <button
            type="button"
            title="Bold (Ctrl+B)"
            onClick={() => executionContext.executeCommand('bold')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.bold
                ? 'bg-rose-100 text-accent-crimson font-bold'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Italic (Ctrl+I)"
            onClick={() => executionContext.executeCommand('italic')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.italic
                ? 'bg-rose-100 text-accent-crimson'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Underline (Ctrl+U)"
            onClick={() => executionContext.executeCommand('underline')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.underline
                ? 'bg-rose-100 text-accent-crimson'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Semantic Highlight (Toggle)"
            onClick={() => {
              toggleSemanticHighlight(executionContext);
              setActiveFormats((prev) => ({ ...prev, highlight: !prev.highlight }));
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.highlight
                ? 'bg-rose-100 text-accent-crimson font-medium ring-1 ring-accent-crimson/40'
                : 'text-ink-secondary hover:text-accent-crimson hover:bg-rose-50'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            title="Align Left"
            onClick={() => executionContext.executeCommand('justifyLeft')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.align === 'left'
                ? 'bg-slate-200 text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align Center"
            onClick={() => executionContext.executeCommand('justifyCenter')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.align === 'center'
                ? 'bg-slate-200 text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align Right"
            onClick={() => executionContext.executeCommand('justifyRight')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.align === 'right'
                ? 'bg-slate-200 text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Lists */}
          <button
            type="button"
            title="Bullet List"
            onClick={() => executionContext.executeCommand('insertUnorderedList')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.ul
                ? 'bg-slate-200 text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => executionContext.executeCommand('insertOrderedList')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              activeFormats.ol
                ? 'bg-slate-200 text-ink-primary'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100'
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Core Inserts */}
          <button
            type="button"
            title="Insert Link (Ctrl+K)"
            onClick={() => executionContext.openModal('link')}
            className="p-1.5 rounded text-ink-secondary hover:text-accent-crimson hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Insert Table"
            onClick={() => executionContext.openModal('table')}
            className="p-1.5 rounded text-ink-secondary hover:text-accent-crimson hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Table className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            id="tour-editor-media"
            title="Insert Image"
            onClick={() => executionContext.openModal('mediaPicker')}
            className="p-1.5 rounded text-ink-secondary hover:text-accent-crimson hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Embed Video (YouTube, Vimeo, Spotify)"
            onClick={() => executionContext.openModal('richEmbed')}
            className="p-1.5 rounded text-ink-secondary hover:text-accent-crimson hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <Video className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            id="tour-editor-doc-import"
            title="Import Document (.docx, .pdf)"
            onClick={() => executionContext.openModal('docImport')}
            className="p-1.5 rounded text-ink-secondary hover:text-accent-crimson hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title="Toggle Right Inspector (Ctrl+\)"
            onClick={() => executionContext.toggleInspector && executionContext.toggleInspector()}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
              isInspectorOpen
                ? 'bg-slate-100 text-ink-primary font-medium'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
            }`}
          >
            <PanelRight className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Inspector</span>
          </button>
        </div>
      </div>
    </div>
  );
};
