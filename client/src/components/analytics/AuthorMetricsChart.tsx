import React, { useState, useMemo } from 'react';
import { Table, BarChart2, CheckCircle2, Eye, Heart, BookOpen, Clock } from 'lucide-react';
import { AccessibleDataTable } from './AccessibleDataTable';

export interface TimeSeriesPoint {
  date: string;
  label: string;
  views: number;
  reads: number;
  likes: number;
}

export interface AuthorMetricsChartProps {
  initialData?: TimeSeriesPoint[];
  lastUpdated?: string;
}

// Generate realistic time-series dataset based on selected timeframe
function generateTimeSeries(days: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(days <= 7 ? { weekday: 'short' } : {}),
    });

    // Base variance with growth trend
    const base = Math.floor(120 + (days - i) * 8 + Math.sin(i * 0.8) * 45);
    const views = Math.max(15, base);
    const readRatio = 0.62 + Math.cos(i * 0.5) * 0.12;
    const reads = Math.max(8, Math.round(views * readRatio));
    const likes = Math.max(2, Math.round(reads * (0.18 + Math.sin(i * 1.1) * 0.05)));

    points.push({
      date: dateStr,
      label,
      views,
      reads,
      likes,
    });
  }

  return points;
}

export const AuthorMetricsChart: React.FC<AuthorMetricsChartProps> = ({
  initialData,
  lastUpdated = 'Just now',
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');
  const [isTableVisible, setIsTableVisible] = useState<boolean>(false);
  const [activeSeries, setActiveSeries] = useState<{
    views: boolean;
    reads: boolean;
    likes: boolean;
  }>({
    views: true,
    reads: true,
    likes: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const daysCount = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

  const data = useMemo(() => {
    if (initialData && initialData.length > 0 && timeframe === '7d') {
      return initialData;
    }
    return generateTimeSeries(daysCount);
  }, [initialData, daysCount, timeframe]);

  // Totals & KPI summaries
  const totals = useMemo(() => {
    const totalViews = data.reduce((acc, p) => acc + p.views, 0);
    const totalReads = data.reduce((acc, p) => acc + p.reads, 0);
    const totalLikes = data.reduce((acc, p) => acc + p.likes, 0);
    const overallReadRatio = totalViews > 0 ? Math.round((totalReads / totalViews) * 100) : 0;
    return { totalViews, totalReads, totalLikes, overallReadRatio };
  }, [data]);

  // SVG Chart Geometry
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = useMemo(() => {
    const maxNumber = Math.max(
      ...data.map((d) => Math.max(
        activeSeries.views ? d.views : 0,
        activeSeries.reads ? d.reads : 0,
        activeSeries.likes ? d.likes : 0
      ))
    );
    return Math.ceil((maxNumber || 100) * 1.15 / 50) * 50;
  }, [data, activeSeries]);

  // Coordinate projection
  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / (maxVal || 1)) * chartHeight;

  // Build SVG path strings
  const viewsPath = useMemo(() => {
    if (!activeSeries.views || data.length === 0) return '';
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.views).toFixed(1)}`).join(' ');
  }, [data, activeSeries.views, maxVal]);

  const readsPath = useMemo(() => {
    if (!activeSeries.reads || data.length === 0) return '';
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.reads).toFixed(1)}`).join(' ');
  }, [data, activeSeries.reads, maxVal]);

  const likesPath = useMemo(() => {
    if (!activeSeries.likes || data.length === 0) return '';
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.likes).toFixed(1)}`).join(' ');
  }, [data, activeSeries.likes, maxVal]);

  // Views Area gradient path
  const viewsAreaPath = useMemo(() => {
    if (!activeSeries.views || data.length === 0) return '';
    const bottom = getY(0).toFixed(1);
    return `${viewsPath} L ${getX(data.length - 1).toFixed(1)} ${bottom} L ${getX(0).toFixed(1)} ${bottom} Z`;
  }, [viewsPath, data, maxVal]);

  // Y-axis tick intervals (4 steps)
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  // X-axis tick display interval
  const xTickStep = timeframe === '90d' ? 14 : timeframe === '30d' ? 5 : 1;

  const activeHoverPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <section className="bg-canvas-paper border border-border-subtle p-6 space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-accent-crimson" />
            <h2 className="font-editorial text-xl font-bold text-ink-primary">
              Audience Readership & Engagement Trends
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-ink-secondary mt-1">
            <span className="flex items-center gap-1">
              <Clock size={11} /> Data Freshness: {lastUpdated}
            </span>
            <span>·</span>
            <span>ClickHouse Materialized Aggregates</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Timeframe selector */}
          <div className="inline-flex rounded border border-border-subtle p-0.5 bg-canvas-subtle">
            {(['7d', '30d', '90d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                  timeframe === tf
                    ? 'bg-ink-primary text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Toggle Table View */}
          <button
            type="button"
            onClick={() => setIsTableVisible((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono border transition-colors ${
              isTableVisible
                ? 'bg-accent-crimson text-white border-accent-crimson'
                : 'bg-white dark:bg-zinc-900 border-border-subtle text-ink-primary hover:bg-slate-50'
            }`}
            title="Toggle Accessible Data Table View"
          >
            <Table size={12} />
            {isTableVisible ? 'Hide Table' : 'View Data Table'}
          </button>
        </div>
      </div>

      {/* KPI Cards Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 border border-border-subtle bg-canvas-subtle">
          <span className="text-[11px] font-mono text-ink-secondary uppercase flex items-center gap-1">
            <Eye size={12} /> Total Impressions
          </span>
          <span className="font-editorial text-2xl font-bold text-ink-primary block mt-1">
            {totals.totalViews.toLocaleString()}
          </span>
        </div>

        <div className="p-3 border border-border-subtle bg-canvas-subtle">
          <span className="text-[11px] font-mono text-ink-secondary uppercase flex items-center gap-1">
            <BookOpen size={12} className="text-accent-crimson" /> Full Reads (&ge;90%)
          </span>
          <span className="font-editorial text-2xl font-bold text-accent-crimson block mt-1">
            {totals.totalReads.toLocaleString()}
          </span>
        </div>

        <div className="p-3 border border-border-subtle bg-canvas-subtle">
          <span className="text-[11px] font-mono text-ink-secondary uppercase flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-700" /> Read Completion Ratio
          </span>
          <span className="font-editorial text-2xl font-bold text-ink-primary block mt-1">
            {totals.overallReadRatio}%
          </span>
        </div>

        <div className="p-3 border border-border-subtle bg-canvas-subtle">
          <span className="text-[11px] font-mono text-ink-secondary uppercase flex items-center gap-1">
            <Heart size={12} className="text-emerald-700" /> Reader Applauds
          </span>
          <span className="font-editorial text-2xl font-bold text-ink-primary block mt-1">
            {totals.totalLikes.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Series Toggle Filters */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveSeries((s) => ({ ...s, views: !s.views }))}
          className={`flex items-center gap-1.5 px-2 py-1 border transition-opacity ${
            activeSeries.views
              ? 'border-ink-primary text-ink-primary font-bold bg-slate-100 dark:bg-zinc-800'
              : 'border-border-subtle text-ink-muted opacity-60'
          }`}
        >
          <span className="w-2.5 h-0.5 bg-ink-primary" /> Impressions
        </button>

        <button
          type="button"
          onClick={() => setActiveSeries((s) => ({ ...s, reads: !s.reads }))}
          className={`flex items-center gap-1.5 px-2 py-1 border transition-opacity ${
            activeSeries.reads
              ? 'border-accent-crimson text-accent-crimson font-bold bg-rose-50 dark:bg-rose-950/20'
              : 'border-border-subtle text-ink-muted opacity-60'
          }`}
        >
          <span className="w-2.5 h-0.5 bg-accent-crimson" /> Full Reads (&ge;90% depth)
        </button>

        <button
          type="button"
          onClick={() => setActiveSeries((s) => ({ ...s, likes: !s.likes }))}
          className={`flex items-center gap-1.5 px-2 py-1 border transition-opacity ${
            activeSeries.likes
              ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-border-subtle text-ink-muted opacity-60'
          }`}
        >
          <span className="w-2.5 h-0.5 bg-emerald-700 border-dashed border-t" /> Applauds & Likes
        </button>
      </div>

      {/* SVG Chart Container with Reserved Aspect Ratio */}
      <div className="relative w-full aspect-[800/260] select-none border border-border-subtle bg-white dark:bg-zinc-950 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          role="region"
          aria-label="Author Readership Trends Interactive Chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="viewsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#71717a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#71717a" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="readsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#881337" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#881337" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Hairline Grid */}
          {yTicks.map((tickVal, idx) => {
            const y = getY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e4e4e7"
                  strokeDasharray={idx === 0 ? undefined : '3,3'}
                  strokeWidth="1"
                  className="dark:stroke-zinc-800"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-ink-secondary"
                >
                  {Math.round(tickVal)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Date Ticks */}
          {data.map((point, idx) => {
            if (idx % xTickStep !== 0 && idx !== data.length - 1) return null;
            const x = getX(idx);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={getY(0)}
                  x2={x}
                  y2={getY(0) + 4}
                  stroke="#d4d4d8"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={getY(0) + 16}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-ink-secondary"
                >
                  {point.label}
                </text>
              </g>
            );
          })}

          {/* Render Area Gradients */}
          {activeSeries.views && (
            <path d={viewsAreaPath} fill="url(#viewsAreaGradient)" />
          )}

          {/* Render Main Paths */}
          {activeSeries.views && (
            <path
              d={viewsPath}
              fill="none"
              stroke="#18181b"
              strokeWidth="1.75"
              className="dark:stroke-zinc-300"
            />
          )}

          {activeSeries.reads && (
            <path
              d={readsPath}
              fill="none"
              stroke="#881337"
              strokeWidth="2"
            />
          )}

          {activeSeries.likes && (
            <path
              d={likesPath}
              fill="none"
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />
          )}

          {/* Interactive Hover Hit Areas */}
          {data.map((_, idx) => {
            const x = getX(idx);
            const stepW = chartWidth / (data.length - 1 || 1);
            return (
              <rect
                key={idx}
                x={x - stepW / 2}
                y={padding.top}
                width={stepW}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* Active Hover Crosshair and Markers */}
          {hoverIndex !== null && data[hoverIndex] && (
            <g pointerEvents="none">
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={getY(0)}
                stroke="#881337"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Data Markers */}
              {activeSeries.views && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex].views)}
                  r="4"
                  fill="#18181b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {activeSeries.reads && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex].reads)}
                  r="4.5"
                  fill="#881337"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {activeSeries.likes && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex].likes)}
                  r="3.5"
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {activeHoverPoint && hoverIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none p-2.5 bg-ink-primary text-white border border-zinc-700 shadow-xl text-xs font-mono space-y-1 transition-all"
            style={{
              left: `${Math.min(78, Math.max(12, (getX(hoverIndex) / width) * 100))}%`,
              top: '12%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold border-b border-zinc-700 pb-1 text-slate-200">
              {activeHoverPoint.label} ({activeHoverPoint.date})
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Impressions:</span>
              <span className="font-bold text-white">{activeHoverPoint.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-300">
              <span>Full Reads (&ge;90%):</span>
              <span className="font-bold text-white">{activeHoverPoint.reads.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-300">
              <span>Applauds:</span>
              <span className="font-bold text-white">{activeHoverPoint.likes.toLocaleString()}</span>
            </div>
            <div className="pt-1 border-t border-zinc-700/60 text-[10px] text-zinc-400">
              Completion: {Math.round((activeHoverPoint.reads / (activeHoverPoint.views || 1)) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Accessible Tabular Fallback */}
      {isTableVisible && (
        <AccessibleDataTable
          caption={`Author Readership Telemetry (${timeframe.toUpperCase()} Timeframe)`}
          headers={['Date', 'Period Label', 'Impressions', 'Full Reads (≥90%)', 'Applauds & Likes']}
          rows={data.map((d) => ({
            date: d.date,
            label: d.label,
            views: d.views,
            reads: d.reads,
            likes: d.likes,
          }))}
          keyExtractor={(row) => row.date}
        />
      )}
    </section>
  );
};
