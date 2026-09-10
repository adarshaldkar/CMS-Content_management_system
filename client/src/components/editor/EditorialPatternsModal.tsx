import React, { useState } from 'react';
import { Blocks, X, Plus, Sparkles, Filter } from 'lucide-react';
import { EDITORIAL_PATTERNS, type EditorialPattern } from './editorialPatterns';
import { sanitizeHtml } from '../../utils/sanitize';

interface EditorialPatternsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPattern: (html: string) => void;
}

export const EditorialPatternsModal: React.FC<EditorialPatternsModalProps> = ({
  isOpen,
  onClose,
  onInsertPattern,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPatternId, setSelectedPatternId] = useState<string>(EDITORIAL_PATTERNS[0].id);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Patterns' },
    { id: 'editorial', label: 'Editorial Notices' },
    { id: 'legal', label: 'Legal & Advisory' },
    { id: 'disclosure', label: 'Disclosures & Ethics' },
    { id: 'promotion', label: 'Reader Engagement' },
  ];

  const filteredPatterns = selectedCategory === 'all'
    ? EDITORIAL_PATTERNS
    : EDITORIAL_PATTERNS.filter((p) => p.category === selectedCategory);

  const selectedPattern = EDITORIAL_PATTERNS.find((p) => p.id === selectedPatternId) || filteredPatterns[0] || EDITORIAL_PATTERNS[0];

  const renderPattern = (pattern: EditorialPattern) =>
    pattern.renderContent ? pattern.renderContent() : pattern.htmlContent;

  const handleInsert = () => {
    if (selectedPattern) {
      onInsertPattern(renderPattern(selectedPattern));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                Editorial Patterns &amp; Standard Components
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insert pre-structured newsroom notices, corrections, disclosures, and subscriber modules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 bg-slate-50/40 dark:bg-slate-900/30 overflow-x-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                const firstInCat = (cat.id === 'all' ? EDITORIAL_PATTERNS : EDITORIAL_PATTERNS.filter((p) => p.category === cat.id))[0];
                if (firstInCat) setSelectedPatternId(firstInCat.id);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-rose-800 text-white dark:bg-rose-700'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Pattern Picker (Left) */}
          <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-2">
            {filteredPatterns.map((pattern) => {
              const isSelected = pattern.id === selectedPatternId;
              return (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => setSelectedPatternId(pattern.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-rose-800 bg-rose-50/60 dark:border-rose-600 dark:bg-rose-950/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xl pt-0.5">{pattern.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold ${isSelected ? 'text-rose-900 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
                      {pattern.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {pattern.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pattern Preview (Right) */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-slate-50/30 dark:bg-slate-950/20">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selectedPattern.icon}</span>
                <div>
                  <h4 className="font-serif text-base font-bold text-slate-900 dark:text-white">
                    {selectedPattern.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPattern.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-3">
                  Live Component Preview:
                </span>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert font-serif"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderPattern(selectedPattern)) }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="inline-flex items-center gap-2 rounded bg-rose-800 px-5 py-2 text-xs font-bold text-white hover:bg-rose-900 dark:bg-rose-700 dark:hover:bg-rose-800 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" /> Insert Into Manuscript
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
