import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowRight,
  Sparkles,
  Compass,
  PenTool,
  Shield,
  Server,
  FileText,
  Clock,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette, type CommandAction } from '../../hooks/useCommandPalette';
import { apiClient } from '../../api/client';
import type { Article, PaginatedResult } from '../../types';

export const CommandPaletteModal: React.FC = () => {
  const {
    isOpen,
    setIsOpen,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    getAvailableCommands,
  } = useCommandPalette();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiArticles, setApiArticles] = useState<Article[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const navigate = useNavigate();

  const availableCommands = useMemo(() => getAvailableCommands(), [getAvailableCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setApiArticles([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced API Search for Articles
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setApiArticles([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    const handler = setTimeout(async () => {
      try {
        const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
          params: { search: query.trim(), limit: 5 },
        });
        setApiArticles(data.items || []);
      } catch {
        setApiArticles([]);
      } finally {
        setIsSearchingApi(false);
      }
    }, 220);

    return () => clearTimeout(handler);
  }, [query]);

  // Filter local static & contextual commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return availableCommands;
    const lower = query.toLowerCase();
    return availableCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lower) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(lower))
    );
  }, [availableCommands, query]);

  // Combine commands with API article results
  const allItems = useMemo(() => {
    const list: Array<
      | { type: 'command'; item: CommandAction }
      | { type: 'article'; item: Article }
    > = [];

    // Local commands first
    filteredCommands.forEach((cmd) => list.push({ type: 'command', item: cmd }));

    // API search results
    apiArticles.forEach((art) => list.push({ type: 'article', item: art }));

    return list;
  }, [filteredCommands, apiArticles]);

  // Reset selected index if list length shrinks
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, allItems.length - 1)));
  }, [allItems.length]);

  // Execute selected item
  const executeItem = (index: number) => {
    const target = allItems[index];
    if (!target) return;

    if (query.trim()) {
      addRecentSearch(query.trim());
    }

    setIsOpen(false);

    if (target.type === 'command') {
      target.item.perform();
    } else {
      navigate(`/articles/${target.item.slug}`);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIndex);
    }
  };

  // Grouping for clean rendering
  const categoryIcons: Record<string, any> = {
    contextual: Sparkles,
    navigation: Compass,
    author: PenTool,
    editorial: FileText,
    admin: Server,
    recent: Clock,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Universal Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-primary/50 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-border-strong shadow-2xl overflow-hidden z-10 font-sans"
            style={{ borderRadius: 2 }}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-canvas-paper">
              <Search size={18} className="text-ink-secondary shrink-0" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
                aria-controls="cmd-palette-list"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command, search articles, desks, or author actions... (ESC to close)"
                className="w-full bg-transparent text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none font-mono"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-ink-muted hover:text-ink-primary p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Recent Searches Strip */}
            {!query && recentSearches.length > 0 && (
              <div className="px-4 py-2 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-ink-muted shrink-0 flex items-center gap-1">
                    <Clock size={11} /> Recent:
                  </span>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="px-2 py-0.5 bg-white dark:bg-zinc-900 border border-border-subtle hover:border-ink-primary text-ink-secondary hover:text-ink-primary rounded text-[11px] whitespace-nowrap"
                    >
                      {term}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[10px] text-accent-crimson hover:underline shrink-0 ml-2"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Results List */}
            <ul
              ref={listRef}
              id="cmd-palette-list"
              role="listbox"
              className="max-h-96 overflow-y-auto divide-y divide-border-subtle p-1.5 focus:outline-none"
            >
              {allItems.length === 0 ? (
                <li className="p-8 text-center text-xs font-mono text-ink-muted">
                  {isSearchingApi ? 'Searching journalism archives...' : 'No matching commands or articles found.'}
                </li>
              ) : (
                allItems.map((entry, index) => {
                  const isSelected = selectedIndex === index;

                  if (entry.type === 'command') {
                    const cmd = entry.item;
                    const Icon = categoryIcons[cmd.category] || Compass;

                    return (
                      <li
                        key={cmd.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeItem(index)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-ink-primary text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-ink-primary'
                        }`}
                        style={{ borderRadius: 2 }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            size={16}
                            className={
                              isSelected
                                ? 'text-accent-crimson'
                                : cmd.category === 'contextual'
                                ? 'text-accent-crimson'
                                : cmd.category === 'admin'
                                ? 'text-indigo-600'
                                : 'text-ink-secondary'
                            }
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-xs font-editorial block truncate">
                              {cmd.title}
                            </span>
                            {cmd.subtitle && (
                              <span
                                className={`text-[11px] font-mono block truncate ${
                                  isSelected ? 'text-slate-300' : 'text-ink-muted'
                                }`}
                              >
                                {cmd.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {cmd.shortcut && (
                            <kbd
                              className={`px-1.5 py-0.5 text-[10px] font-mono border rounded ${
                                isSelected
                                  ? 'bg-zinc-800 border-zinc-700 text-slate-200'
                                  : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-ink-muted'
                              }`}
                            >
                              {cmd.shortcut}
                            </kbd>
                          )}
                          {isSelected && <CornerDownLeft size={12} className="text-slate-300" />}
                        </div>
                      </li>
                    );
                  } else {
                    const art = entry.item;
                    return (
                      <li
                        key={art.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeItem(index)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-ink-primary text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900 text-ink-primary'
                        }`}
                        style={{ borderRadius: 2 }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText
                            size={16}
                            className={isSelected ? 'text-accent-crimson' : 'text-amber-700'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-accent-crimson font-bold">
                                Article
                              </span>
                              <span className="text-[11px] font-mono text-ink-muted">
                                {art.readingTimeMinutes || 3} min
                              </span>
                            </div>
                            <span className="font-editorial font-bold text-xs block truncate">
                              {art.title.replace(/\s\d{10,}/g, '')}
                            </span>
                          </div>
                        </div>

                        {isSelected && <CornerDownLeft size={12} className="text-slate-300 shrink-0" />}
                      </li>
                    );
                  }
                })
              )}
            </ul>

            {/* Footer Shortcut Legend */}
            <div className="px-4 py-2 bg-canvas-subtle border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Dismiss</span>
              </div>
              <span className="text-accent-crimson font-bold">The Gazette Fast Nav</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
