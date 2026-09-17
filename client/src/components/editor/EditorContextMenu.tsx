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
  Trash2,
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
  const [targetLabel, setTargetLabel] = useState<string>('Block');
  const targetElementRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (!editorRef.current || !editorRef.current.contains(e.target as Node)) {
        setVisible(false);
        return;
      }

      e.preventDefault();

      const rawTarget = e.target as HTMLElement;
      const mediaBlock = rawTarget.closest<HTMLElement>(
        'figure.cms-video-block, figure.cms-embed-block, figure.cms-native-video-block, figure, details.cms-embed-transcript, details, table, blockquote, img, iframe, .cms-callout-note, div[data-node]'
      );

      const block =
        mediaBlock ||
        rawTarget.closest<HTMLElement>('p, h1, h2, h3, h4, h5, h6, ul, ol, li, div') ||
        rawTarget;

      targetElementRef.current = block;

      // Determine human-friendly label for delete action
      if (block.classList.contains('cms-video-block') || block.querySelector('iframe, video') || block.tagName === 'VIDEO' || block.tagName === 'IFRAME') {
        setTargetLabel('Video Block');
      } else if (block.classList.contains('cms-embed-transcript') || block.tagName === 'DETAILS') {
        setTargetLabel('Transcript Reference');
      } else if (block.classList.contains('cms-embed-block')) {
        setTargetLabel('Rich Embed');
      } else if (block.tagName === 'IMG' || block.querySelector('img')) {
        setTargetLabel('Image');
      } else if (block.tagName === 'TABLE' || block.querySelector('table')) {
        setTargetLabel('Table');
      } else if (block.tagName === 'BLOCKQUOTE') {
        setTargetLabel('Quote');
      } else if (block.classList.contains('cms-callout-note')) {
        setTargetLabel('Editor Note');
      } else {
        setTargetLabel('Block / Element');
      }

      // Clamp position within window bounds
      const top = Math.min(e.clientY, window.innerHeight - 380);
      const left = Math.min(e.clientX, window.innerWidth - 250);

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

  const handleDeleteTarget = () => {
    handleAction(() => {
      const target = targetElementRef.current;
      if (target && editorRef.current?.contains(target) && target !== editorRef.current) {
        target.remove();
        editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      // Fallback: delete current selection or nearest block
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const enclosing = (node instanceof HTMLElement ? node : node?.parentElement)?.closest<HTMLElement>(
          'figure, details, table, blockquote, img, p, div'
        );
        if (enclosing && editorRef.current?.contains(enclosing) && enclosing !== editorRef.current) {
          enclosing.remove();
          editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        document.execCommand('delete');
        editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-50 w-60 rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur-md text-slate-100 shadow-2xl p-1.5 font-sans text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
        <span>Editorial Actions</span>
        <span className="text-[9px] text-rose-400 font-bold">{targetLabel}</span>
      </div>

      <div className="space-y-0.5">
        {/* Copy */}
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
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RemoveFormatting size={13} className="text-slate-400" />
          <span>Clear Formatting</span>
        </button>

        <div className="w-full h-px bg-slate-800 my-1" />

        {/* ─── PROMINENT DELETE SHORTCUT ACTION ─────────────────────────── */}
        <button
          type="button"
          onClick={handleDeleteTarget}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white transition-colors cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2">
            <Trash2 size={13} className="text-rose-400 group-hover:text-white" />
            <span>Delete {targetLabel}</span>
          </div>
          <span className="font-mono text-[10px] text-rose-400/80 font-normal">Del / ⌫</span>
        </button>
      </div>
    </div>
  );
};
