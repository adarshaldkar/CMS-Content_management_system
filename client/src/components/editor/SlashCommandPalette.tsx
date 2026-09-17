import React, { useState, useEffect, useRef } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table,
  ImageIcon,
  Video,
  FileText,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Minus,
  Film,
  Type,
  BarChart2,
  Clock,
  Newspaper,
  BookmarkCheck,
  MessageSquareQuote,
  Bookmark,
  Code,
  List,
  ListOrdered,
  Highlighter,
  Link as LinkIcon,
} from 'lucide-react';
import { EDITORIAL_COMMANDS, type EditorialCommand } from './commandRegistry';

interface SlashCommandPaletteProps {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  onClose: () => void;
  onSelectCommand: (command: EditorialCommand) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table,
  ImageIcon,
  Video,
  FileText,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  Minus,
  Film,
  Type,
  BarChart2,
  Clock,
  Newspaper,
  BookmarkCheck,
  MessageSquareQuote,
  Bookmark,
  Code,
  List,
  ListOrdered,
  Highlighter,
  LinkIcon,
};

export const SlashCommandPalette: React.FC<SlashCommandPaletteProps> = ({
  isOpen,
  query,
  position,
  onClose,
  onSelectCommand,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on typed query (e.g., /h1, /table, /quote)
  const filteredCommands = EDITORIAL_COMMANDS.filter((cmd) => {
    // Only show actionable blocks in slash menu
    if (cmd.category === 'review' || cmd.category === 'view') return false;
    if (!query) return true;
    const cleanQuery = query.toLowerCase().replace('/', '').trim();
    if (!cleanQuery) return true;
    return (
      cmd.title.toLowerCase().includes(cleanQuery) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(cleanQuery))
    );
  });

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation for popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelectCommand(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredCommands, selectedIndex, onSelectCommand, onClose]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || filteredCommands.length === 0) return null;

  // Clamp position within window bounds
  const clampedTop = Math.min(position.top, window.innerHeight - 340);
  const clampedLeft = Math.min(position.left, window.innerWidth - 320);

  return (
    <div
      ref={containerRef}
      style={{ top: `${clampedTop}px`, left: `${clampedLeft}px` }}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto rounded-lg border border-border-subtle bg-white shadow-2xl p-1.5 font-sans animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-secondary border-b border-border-subtle mb-1 flex items-center justify-between">
        <span>Insert Block</span>
        <span>Esc to dismiss</span>
      </div>

      <div className="space-y-0.5">
        {filteredCommands.map((cmd, idx) => {
          const Icon = ICON_MAP[cmd.icon] || Type;
          const isSelected = idx === selectedIndex;

          return (
            <button
              key={cmd.id}
              data-active={isSelected ? 'true' : 'false'}
              type="button"
              onClick={() => onSelectCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-rose-50/80 text-ink-primary'
                  : 'text-ink-primary hover:bg-slate-50'
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
                  isSelected ? 'bg-accent-crimson text-white' : 'bg-slate-100 text-ink-secondary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{cmd.title}</span>
                  {cmd.shortcut && (
                    <span className="font-mono text-[10px] text-ink-secondary bg-slate-100 px-1 py-0.5 rounded ml-2">
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
                {cmd.description && (
                  <p className="text-[11px] text-ink-secondary truncate">{cmd.description}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
