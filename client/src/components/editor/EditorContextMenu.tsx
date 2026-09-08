import React, { useEffect, useState, useRef } from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  Link as LinkIcon,
  Table as TableIcon,
  ImageIcon,
  Video,
  MessageSquare,
  Heading1,
  Heading2,
  Quote,
  RemoveFormatting,
  Sparkles,
} from 'lucide-react';
import type { CommandExecutionContext } from './commandRegistry';

interface EditorContextMenuProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  executionContext: CommandExecutionContext;
}

interface ContextMenuPosition {
  top: number;
  left: number;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editorRef,
  executionContext,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!editorRef.current || !editorRef.current.contains(e.target as Node)) {
        setVisible(false);
        return;
      }

      e.preventDefault();

      // Clamp position within window bounds
      const top = Math.min(e.clientY, window.innerHeight - 360);
      const left = Math.min(e.clientX, window.innerWidth - 240);

      setPosition({ top, left });
      setVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorRef]);

  if (!visible) return null;

  const handleAction = (callback: () => void) => {
    callback();
    setVisible(false);
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-50 w-56 rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur-md text-slate-100 shadow-2xl p-1.5 font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
        Editorial Actions
      </div>

      <div className="space-y-0.5">
        {/* Cut / Copy */}
        <button
          type="button"
          onClick={() =>
            handleAction(() => {
              document.execCommand('copy');
            })
          }
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Copy size={13} className="text-slate-400" />
            <span>Copy</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">Ctrl+C</span>
        </button>

        {/* Hyperlink */}
        <button
          type="button"
          onClick={() => handleAction(() => executionContext.openModal('link'))}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-rose-950/80 hover:text-accent-crimson transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LinkIcon size={13} className="text-accent-crimson" />
            <span>Insert Link</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">Ctrl+K</span>
        </button>

        <div className="w-full h-px bg-slate-800 my-1" />

        {/* Typography Styles */}
        <button
          type="button"
          onClick={() =>
            handleAction(() => executionContext.executeCommand('formatBlock', '<h2>'))
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <Heading1 size={13} className="text-slate-400" />
          <span>Heading 1 (H1)</span>
        </button>

        <button
          type="button"
          onClick={() =>
            handleAction(() => executionContext.executeCommand('formatBlock', '<h3>'))
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <Heading2 size={13} className="text-slate-400" />
          <span>Heading 2 (H2)</span>
        </button>

        <button
          type="button"
          onClick={() =>
            handleAction(() => executionContext.executeCommand('formatBlock', '<blockquote>'))
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <Quote size={13} className="text-slate-400" />
          <span>Pull Quote</span>
        </button>

        <div className="w-full h-px bg-slate-800 my-1" />

        {/* Insert Objects */}
        <button
          type="button"
          onClick={() => handleAction(() => executionContext.openModal('table'))}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <TableIcon size={13} className="text-slate-400" />
          <span>Interactive Table</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction(() => executionContext.openModal('mediaPicker'))}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <ImageIcon size={13} className="text-slate-400" />
          <span>Media Image</span>
        </button>

        <button
          type="button"
          onClick={() =>
            handleAction(() => {
              executionContext.insertHtml(`
                <div class="cms-callout-note my-5 p-4 bg-amber-50/70 border-l-3 border-amber-600 rounded-xs text-sm font-sans text-ink-primary">
                  <p class="m-0 font-medium text-amber-950"><strong>Editorial Note:</strong> Add insightful takeaway or context…</p>
                </div>
                <p><br></p>
              `);
            })
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <MessageSquare size={13} className="text-amber-500" />
          <span>Editor's Note</span>
        </button>

        <div className="w-full h-px bg-slate-800 my-1" />

        {/* Clear Formatting */}
        <button
          type="button"
          onClick={() =>
            handleAction(() => executionContext.executeCommand('removeFormat'))
          }
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-rose-950/60 hover:text-rose-400 transition-colors cursor-pointer"
        >
          <RemoveFormatting size={13} />
          <span>Clear Formatting</span>
        </button>
      </div>
    </div>
  );
};
