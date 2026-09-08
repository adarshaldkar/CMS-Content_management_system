import React, { useState, useMemo } from 'react';
import { Compass, X, Search, FileText, ChevronRight, Hash, Quote, Table, HelpCircle } from 'lucide-react';

export interface DocumentSection {
  id: string;
  type: 'h1' | 'h2' | 'h3' | 'callout' | 'quote' | 'table';
  title: string;
  wordCount: number;
  domIndex: number;
}

interface DocumentMapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contentHtml: string;
  onJumpToSection: (section: DocumentSection) => void;
}

export const DocumentMapDrawer: React.FC<DocumentMapDrawerProps> = ({
  isOpen,
  onClose,
  contentHtml,
  onJumpToSection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Parse sections dynamically from manuscript HTML
  const sections: DocumentSection[] = useMemo(() => {
    if (!contentHtml) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const nodes = doc.body.querySelectorAll('h1, h2, h3, aside.cms-callout, blockquote.cms-pull-quote, table');

    const result: DocumentSection[] = [];
    nodes.forEach((node, index) => {
      const tagName = node.tagName.toLowerCase();
      let type: DocumentSection['type'] = 'h2';
      let title = '';

      if (tagName === 'h1') {
        type = 'h1';
        title = node.textContent?.trim() || 'Untitled Heading 1';
      } else if (tagName === 'h2') {
        type = 'h2';
        title = node.textContent?.trim() || 'Untitled Section';
      } else if (tagName === 'h3') {
        type = 'h3';
        title = node.textContent?.trim() || 'Subsection';
      } else if (tagName === 'aside') {
        type = 'callout';
        title = node.querySelector('strong')?.textContent?.trim() || 'Editorial Callout';
      } else if (tagName === 'blockquote') {
        type = 'quote';
        const quoteText = node.querySelector('p')?.textContent?.trim() || node.textContent?.trim() || 'Pull Quote';
        title = `“${quoteText.slice(0, 45)}…”`;
      } else if (tagName === 'table') {
        type = 'table';
        title = 'Data Table';
      }

      // Estimate section words until next heading
      let sectionWords = 0;
      let nextSibling = node.nextElementSibling;
      while (nextSibling && !['H1', 'H2', 'H3'].includes(nextSibling.tagName)) {
        sectionWords += (nextSibling.textContent || '').trim().split(/\s+/).filter(Boolean).length;
        nextSibling = nextSibling.nextElementSibling;
      }

      result.push({
        id: `sec-${index}`,
        type,
        title,
        wordCount: Math.max(sectionWords, (node.textContent || '').trim().split(/\s+/).filter(Boolean).length),
        domIndex: index,
      });
    });

    return result;
  }, [contentHtml]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    return sections.filter((sec) =>
      sec.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sections, searchQuery]);

  if (!isOpen) return null;

  const getSectionIcon = (type: DocumentSection['type']) => {
    switch (type) {
      case 'h1':
        return <Hash className="h-3.5 w-3.5 text-rose-800 dark:text-rose-400 font-bold" />;
      case 'h2':
        return <Hash className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />;
      case 'h3':
        return <Hash className="h-3 w-3 text-slate-400 dark:text-slate-500" />;
      case 'callout':
        return <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case 'quote':
        return <Quote className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'table':
        return <Table className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-rose-800 dark:text-rose-400" />
          <h3 className="font-serif font-bold text-sm text-slate-900 dark:text-white">
            Document Map &amp; Navigator
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sections, callouts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-800 dark:focus:ring-rose-400 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Sections Outline List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredSections.length === 0 ? (
          <div className="text-center py-10 px-4">
            <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No headings or structured blocks found.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Add H2 subheadings, pull-quotes, or callout boxes to generate an outline.
            </p>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onJumpToSection(sec)}
              className={`w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between group ${
                sec.type === 'h1' ? 'font-bold text-slate-900 dark:text-white pl-2' : ''
              } ${sec.type === 'h2' ? 'font-semibold text-slate-800 dark:text-slate-200 pl-3' : ''} ${
                sec.type === 'h3' ? 'font-normal text-slate-600 dark:text-slate-400 pl-6' : ''
              } ${['callout', 'quote', 'table'].includes(sec.type) ? 'text-xs text-slate-600 dark:text-slate-400 pl-4 italic' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                {getSectionIcon(sec.type)}
                <span className="text-xs truncate">{sec.title}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                  {sec.wordCount}w
                </span>
                <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{sections.length} document landmarks</span>
        <span className="font-mono">{sections.reduce((acc, s) => acc + s.wordCount, 0)} total words</span>
      </div>
    </div>
  );
};
