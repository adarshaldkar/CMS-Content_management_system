import React, { useState } from 'react';
import {
  Table,
  X,
  Plus,
  AlignLeft,
  DollarSign,
  Minimize2,
} from 'lucide-react';

interface TableBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (tableHtml: string) => void;
}

type TableTheme = 'classic' | 'matrix' | 'compact';

export const TableBuilderModal: React.FC<TableBuilderModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);
  const [hasHeader, setHasHeader] = useState(true);
  const [theme, setTheme] = useState<TableTheme>('classic');
  const [caption, setCaption] = useState('');

  if (!isOpen) return null;

  const activeRows = hoverRows || rows;
  const activeCols = hoverCols || cols;

  const handleGenerate = () => {
    let html = `<div class="cms-table-container my-6 overflow-x-auto rounded border border-border-subtle shadow-xs">`;
    html += `<table class="cms-table w-full border-collapse text-sm" data-theme="${theme}">`;

    if (caption.trim()) {
      html += `<caption class="p-2 text-left font-mono text-xs text-ink-secondary bg-slate-50 border-b border-border-subtle">${caption.trim()}</caption>`;
    }

    if (hasHeader) {
      html += `<thead class="bg-slate-100/80 border-b-2 border-border-subtle text-ink-primary font-mono text-xs uppercase tracking-wider"><tr>`;
      for (let c = 0; c < cols; c++) {
        html += `<th class="p-3 text-left font-semibold border-r border-border-subtle last:border-r-0"><br></th>`;
      }
      html += `</tr></thead>`;
    }

    html += `<tbody class="divide-y divide-border-subtle bg-white">`;
    for (let r = 0; r < rows; r++) {
      const rowBg = theme === 'matrix' && r % 2 === 1 ? 'bg-slate-50/50' : '';
      html += `<tr class="${rowBg} hover:bg-slate-50/80 transition-colors">`;
      for (let c = 0; c < cols; c++) {
        const cellClass = theme === 'compact' ? 'p-2 font-mono text-xs' : 'p-3 font-sans';
        html += `<td class="${cellClass} text-ink-primary border-r border-border-subtle last:border-r-0"><br></td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div><p><br></p>`;

    onInsertTable(html);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border-subtle bg-white shadow-xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-200/80 text-ink-primary">
              <Table className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-ink-primary">Insert Interactive Table</h3>
              <p className="text-xs text-ink-secondary">Select dimensions and editorial style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-ink-secondary hover:bg-slate-200 hover:text-ink-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Quick Interactive Grid Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
                Grid Size ({activeCols} × {activeRows})
              </label>
              <div className="flex items-center gap-2 font-mono text-xs text-ink-secondary">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="w-12 px-1.5 py-0.5 border border-border-subtle rounded text-center"
                />
                <span>×</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-12 px-1.5 py-0.5 border border-border-subtle rounded text-center"
                />
              </div>
            </div>

            {/* Visual 8x8 hover grid */}
            <div
              className="inline-grid grid-cols-8 gap-1 p-2 bg-slate-50 border border-border-subtle rounded-md"
              onMouseLeave={() => {
                setHoverRows(0);
                setHoverCols(0);
              }}
            >
              {Array.from({ length: 64 }).map((_, idx) => {
                const r = Math.floor(idx / 8) + 1;
                const c = (idx % 8) + 1;
                const isSelected = c <= activeCols && r <= activeRows;

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`h-5 w-5 rounded-xs border transition-colors ${
                      isSelected
                        ? 'bg-accent-crimson/20 border-accent-crimson'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                    onMouseEnter={() => {
                      setHoverRows(r);
                      setHoverCols(c);
                    }}
                    onClick={() => {
                      setRows(r);
                      setCols(c);
                      setHoverRows(0);
                      setHoverCols(0);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Table Style Presets */}
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-ink-secondary block mb-2">
              Visual Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme('classic')}
                className={`flex flex-col items-start p-3 rounded border text-left transition-all ${
                  theme === 'classic'
                    ? 'border-accent-crimson bg-rose-50/30 text-ink-primary ring-1 ring-accent-crimson'
                    : 'border-border-subtle hover:border-slate-300 text-ink-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs text-ink-primary mb-1">
                  <AlignLeft className="h-3.5 w-3.5 text-accent-crimson" />
                  <span>Classic Hairline</span>
                </div>
                <span className="text-[11px] text-ink-secondary">Standard editorial layout</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('matrix')}
                className={`flex flex-col items-start p-3 rounded border text-left transition-all ${
                  theme === 'matrix'
                    ? 'border-accent-crimson bg-rose-50/30 text-ink-primary ring-1 ring-accent-crimson'
                    : 'border-border-subtle hover:border-slate-300 text-ink-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs text-ink-primary mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-accent-crimson" />
                  <span>Financial Matrix</span>
                </div>
                <span className="text-[11px] text-ink-secondary">Zebra-striped data rows</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('compact')}
                className={`flex flex-col items-start p-3 rounded border text-left transition-all ${
                  theme === 'compact'
                    ? 'border-accent-crimson bg-rose-50/30 text-ink-primary ring-1 ring-accent-crimson'
                    : 'border-border-subtle hover:border-slate-300 text-ink-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs text-ink-primary mb-1">
                  <Minimize2 className="h-3.5 w-3.5 text-accent-crimson" />
                  <span>Compact Data</span>
                </div>
                <span className="text-[11px] text-ink-secondary">Dense monospace metrics</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-primary cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="rounded border-border-subtle text-accent-crimson focus:ring-accent-crimson h-4 w-4"
                />
                Include Table Header Row
              </label>
            </div>

            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-ink-secondary block mb-1">
                Optional Caption / Source Note
              </label>
              <input
                type="text"
                placeholder="e.g. Table 1: Quarterly Telemetry Benchmarks"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-border-subtle focus:outline-hidden focus:border-accent-crimson"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border-subtle px-5 py-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-accent-crimson hover:bg-accent-crimson/90 rounded shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
};
