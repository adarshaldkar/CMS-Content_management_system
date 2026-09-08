import React from 'react';

export interface AccessibleDataTableProps {
  caption: string;
  headers: string[];
  rows: Array<Record<string, any> | Array<string | number>>;
  keyExtractor?: (row: any, idx: number) => string;
}

export const AccessibleDataTable: React.FC<AccessibleDataTableProps> = ({
  caption,
  headers,
  rows,
  keyExtractor,
}) => {
  return (
    <div className="overflow-x-auto my-4 border border-border-subtle bg-canvas-paper">
      <table className="w-full text-left text-xs font-mono border-collapse">
        <caption className="text-left font-sans font-bold text-sm text-ink-primary p-3 border-b border-border-subtle bg-canvas-subtle">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border-strong bg-canvas-subtle">
            {headers.map((h, i) => (
              <th key={i} scope="col" className="p-2.5 font-bold uppercase tracking-wider text-ink-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, rowIdx) => {
            const rowKey = keyExtractor ? keyExtractor(row, rowIdx) : `row-${rowIdx}`;
            const values = Array.isArray(row) ? row : Object.values(row);

            return (
              <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors">
                {values.map((val, colIdx) => (
                  <td key={colIdx} className="p-2.5 text-ink-primary whitespace-nowrap">
                    {typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
