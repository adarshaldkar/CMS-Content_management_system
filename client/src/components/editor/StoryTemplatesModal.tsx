import React, { useState } from 'react';
import { LayoutTemplate, X, Check, Clock, Sparkles, BookOpen } from 'lucide-react';
import { STORY_TEMPLATES, type StoryTemplate } from './editorialPatterns';

interface StoryTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: StoryTemplate) => void;
  hasExistingContent: boolean;
}

export const StoryTemplatesModal: React.FC<StoryTemplatesModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  hasExistingContent,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(STORY_TEMPLATES[0].id);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  if (!isOpen) return null;

  const selectedTemplate = STORY_TEMPLATES.find((t) => t.id === selectedTemplateId) || STORY_TEMPLATES[0];

  const handleApply = () => {
    if (hasExistingContent && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    onApplyTemplate(selectedTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                Editorial Story Archetypes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a structured journalistic format designed for modern digital newsrooms
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

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Templates List (Left Column) */}
          <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-2.5">
            {STORY_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setConfirmOverwrite(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-rose-800 bg-rose-50/60 dark:border-rose-600 dark:bg-rose-950/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-2xl pt-0.5">{tmpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold ${isSelected ? 'text-rose-900 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
                        {tmpl.title}
                      </h4>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tmpl.subtitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>~{tmpl.readingEstimateMinutes} min read</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template Preview (Right Column) */}
          <div className="md:col-span-7 p-6 overflow-y-auto flex flex-col justify-between bg-slate-50/30 dark:bg-slate-950/20">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold uppercase tracking-wider font-mono">
                  {selectedTemplate.category}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Est. {selectedTemplate.readingEstimateMinutes} min read
                </span>
              </div>

              <h4 className="font-serif text-lg font-bold text-slate-900 dark:text-white mb-2">
                {selectedTemplate.defaultTitle}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-4">
                {selectedTemplate.defaultDescription}
              </p>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 max-h-[260px] overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert font-serif text-xs leading-relaxed opacity-85"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }}
                />
              </div>

              {hasExistingContent && (
                <div className="mt-4 rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                  {confirmOverwrite ? (
                    <strong className="block font-semibold">
                      ⚠️ Note: Applying this template will replace current canvas contents. Click "Confirm &amp; Load" below to proceed.
                    </strong>
                  ) : (
                    <span>
                      Applying this story template will populate the headline, dek, and structured semantic nodes into your manuscript.
                    </span>
                  )}
                </div>
              )}
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
                onClick={handleApply}
                className="inline-flex items-center gap-2 rounded bg-rose-800 px-5 py-2 text-xs font-bold text-white hover:bg-rose-900 dark:bg-rose-700 dark:hover:bg-rose-800 shadow-sm transition-all"
              >
                {confirmOverwrite ? (
                  <>
                    <Check className="h-4 w-4" /> Confirm &amp; Load Template
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Load {selectedTemplate.title}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
