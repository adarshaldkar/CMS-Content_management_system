import React, { useEffect, useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Link as LinkIcon,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  RemoveFormatting,
} from 'lucide-react';
import type { CommandExecutionContext } from './commandRegistry';

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
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
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
      const left = Math.max(10, Math.min(window.innerWidth - 320, rect.left + rect.width / 2 - 140));

      setPosition({ top, left });
      setVisible(true);

      try {
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
        });
      } catch {
        // Ignore
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
      className="fixed z-50 flex items-center gap-0.5 p-1 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700 rounded-md shadow-2xl animate-in fade-in zoom-in-95 duration-100 select-none font-sans"
    >
      {/* Quick Style Selector */}
      <button
        type="button"
        title="Heading 1 (H1)"
        onClick={() => executionContext.executeCommand('formatBlock', '<h2>')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Heading1 size={14} />
      </button>

      <button
        type="button"
        title="Heading 2 (H2)"
        onClick={() => executionContext.executeCommand('formatBlock', '<h3>')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Heading2 size={14} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Formatting Tools */}
      <button
        type="button"
        title="Bold (Ctrl+B)"
        onClick={() => executionContext.executeCommand('bold')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.bold ? 'bg-accent-crimson text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Bold size={14} />
      </button>

      <button
        type="button"
        title="Italic (Ctrl+I)"
        onClick={() => executionContext.executeCommand('italic')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.italic ? 'bg-accent-crimson text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Italic size={14} />
      </button>

      <button
        type="button"
        title="Underline (Ctrl+U)"
        onClick={() => executionContext.executeCommand('underline')}
        className={`p-1.5 rounded-xs transition-colors cursor-pointer ${
          activeFormats.underline ? 'bg-accent-crimson text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
      >
        <Underline size={14} />
      </button>

      <button
        type="button"
        title="Semantic Highlight"
        onClick={() => {
          const sel = window.getSelection();
          if (sel && sel.toString()) {
            executionContext.insertHtml(
              `<mark class="bg-rose-50 text-accent-crimson px-1.5 py-0.5 rounded-xs font-medium">${sel.toString()}</mark>`,
            );
          }
        }}
        className="p-1.5 text-slate-300 hover:text-accent-crimson hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Highlighter size={14} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Lists & Quote */}
      <button
        type="button"
        title="Bullet List"
        onClick={() => executionContext.executeCommand('insertUnorderedList')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <List size={14} />
      </button>

      <button
        type="button"
        title="Blockquote"
        onClick={() => executionContext.executeCommand('formatBlock', '<blockquote>')}
        className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <Quote size={14} />
      </button>

      <div className="w-px h-4 bg-slate-700 mx-0.5" />

      {/* Insert Link */}
      <button
        type="button"
        title="Hyperlink (Ctrl+K)"
        onClick={() => executionContext.openModal('link')}
        className="p-1.5 text-slate-300 hover:text-accent-crimson hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <LinkIcon size={14} />
      </button>

      {/* Clear Formatting */}
      <button
        type="button"
        title="Clear Formatting"
        onClick={() => executionContext.executeCommand('removeFormat')}
        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xs transition-colors cursor-pointer"
      >
        <RemoveFormatting size={14} />
      </button>
    </div>
  );
};
