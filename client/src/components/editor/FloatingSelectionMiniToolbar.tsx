import React, { useEffect, useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  Link as LinkIcon,
  Quote,
  Heading2,
  Heading3,
  HelpCircle,
  FileCheck2,
  RemoveFormatting,
  Sparkles,
  Trash2,
} from 'lucide-react';

import type { CommandExecutionContext } from './commandRegistry';
import { toggleSemanticHighlight } from './commandRegistry';
import { editorialNodes } from './editorialNodes';
import { queryInlineFormat } from './semanticFormatting';

interface FloatingSelectionMiniToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  executionContext: CommandExecutionContext;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export const FloatingSelectionMiniToolbar: React.FC<FloatingSelectionMiniToolbarProps> = ({
  editorRef,
  executionContext,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    highlight: false,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current) {
        setVisible(false);
        return;
      }

      // Check if selection is within the editor canvas
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !editorRef.current.contains(anchorNode)) {
        setVisible(false);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setVisible(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position above selected text
      const toolbarHeight = 44;
      const top = Math.max(10, rect.top - toolbarHeight - 8);
      const left = Math.max(10, Math.min(window.innerWidth - 440, rect.left + rect.width / 2 - 200));

      setSelectedText(text);
      setPosition({ top, left });
      setVisible(true);

      try {
        let isInsideMark = false;
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node instanceof HTMLElement && (node.tagName === 'MARK' || node.classList.contains('cms-semantic-highlight'))) {
            isInsideMark = true;
            break;
          }
          node = node.parentNode;
        }

        const editor = editorRef.current;
        setActiveFormats({
          bold: editor ? queryInlineFormat(editor, 'bold') : false,
          italic: editor ? queryInlineFormat(editor, 'italic') : false,
          underline: editor ? queryInlineFormat(editor, 'underline') : false,
          highlight: isInsideMark,
        });
      } catch {
        // Ignore
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  const handleMakePullQuote = () => {
    if (!selectedText) return;
    const pullQuoteHtml = editorialNodes.createPullQuote(selectedText);
    executionContext.executeCommand('insertHTML', pullQuoteHtml);
    setVisible(false);
  };

  const handleConvertToCallout = () => {
    if (!selectedText) return;
    const calloutHtml = editorialNodes.createCallout('Editorial Brief', selectedText, 'editorial');
    executionContext.executeCommand('insertHTML', calloutHtml);
    setVisible(false);
  };

  const handleConvertToCorrection = () => {
    if (!selectedText) return;
    const correctionHtml = editorialNodes.createCorrection(selectedText);
    executionContext.executeCommand('insertHTML', correctionHtml);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
      className="fixed z-50 flex items-center gap-0.5 p-1 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700 rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
    >
      {/* Quick Heading Selector */}
      <button
        type="button"
        title="Heading 2 (H2)"
        onClick={() => executionContext.executeCommand('formatBlock', '<h2>')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Heading2 size={13} />
      </button>

      <button
        type="button"
        title="Heading 3 (H3)"
        onClick={() => executionContext.executeCommand('formatBlock', '<h3>')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Heading3 size={13} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Formatting Tools */}
      <button
        type="button"
        title="Bold (Ctrl+B)"
        onClick={() => executionContext.executeCommand('bold')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.bold ? 'bg-rose-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Bold size={13} />
      </button>

      <button
        type="button"
        title="Italic (Ctrl+I)"
        onClick={() => executionContext.executeCommand('italic')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.italic ? 'bg-rose-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Italic size={13} />
      </button>

      <button
        type="button"
        title="Underline (Ctrl+U)"
        onClick={() => executionContext.executeCommand('underline')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.underline ? 'bg-rose-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Underline size={13} />
      </button>

      <button
        type="button"
        title="Semantic Highlight (Ctrl+Shift+H)"
        onClick={() => {
          toggleSemanticHighlight(executionContext);
          setActiveFormats((prev) => ({ ...prev, highlight: !prev.highlight }));
        }}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.highlight
            ? 'bg-rose-900 text-rose-200 ring-1 ring-rose-400/50'
            : 'text-slate-300 hover:text-rose-400 hover:bg-slate-800'
        }`}
      >
        <Highlighter size={13} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Selection-Powered Contextual Editorial Actions */}
      <button
        type="button"
        title="Make Pull Quote from Selection"
        onClick={handleMakePullQuote}
        className="px-2 py-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
      >
        <Quote size={11} />
        <span>Pull Quote</span>
      </button>

      <button
        type="button"
        title="Convert Selection to Editorial Callout"
        onClick={handleConvertToCallout}
        className="px-2 py-1 text-[11px] font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
      >
        <HelpCircle size={11} />
        <span>Callout</span>
      </button>

      <button
        type="button"
        title="Convert Selection to Journalistic Correction"
        onClick={handleConvertToCorrection}
        className="px-2 py-1 text-[11px] font-semibold text-sky-300 bg-sky-950/60 hover:bg-sky-900 border border-sky-800/80 rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
      >
        <FileCheck2 size={11} />
        <span>Correction</span>
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Insert Link */}
      <button
        type="button"
        title="Hyperlink (Ctrl+K)"
        onClick={() => executionContext.openModal('link')}
        className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <LinkIcon size={13} />
      </button>

      {/* Clear Formatting */}
      <button
        type="button"
        title="Clear Formatting"
        onClick={() => executionContext.executeCommand('removeFormat')}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <RemoveFormatting size={13} />
      </button>

      {/* Delete / Remove Selected Node */}
      <button
        type="button"
        title="Delete Selection / Block (Ctrl+Shift+Delete)"
        onClick={() => {
          executionContext.executeCommand('delete');
          setVisible(false);
        }}
        className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-900/80 rounded-xs transition-colors cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

