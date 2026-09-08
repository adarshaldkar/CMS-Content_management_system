import React, { useState, useEffect, useMemo } from 'react';
import { Activity, CheckCircle2, AlertTriangle, Clock, RefreshCw, Table } from 'lucide-react';
import { AccessibleDataTable } from './AccessibleDataTable';

export interface QueueThroughputSample {
  timestamp: string; // ISO string
  active: number;
  completedRate: number; // completed jobs per sec
  delayed: number;
  failedRate: number; // failed jobs per sec
}

export interface QueueThroughputGraphProps {
  queueName: string;
  isStreamLive?: boolean;
}

export const QueueThroughputGraph: React.FC<QueueThroughputGraphProps> = ({
  queueName,
  isStreamLive = true,
}) => {
  const [history, setHistory] = useState<QueueThroughputSample[]>(() => {
    const initial: QueueThroughputSample[] = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const time = new Date(now - i * 5000);
      initial.push({
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        active: Math.floor(2 + Math.random() * 4),
        completedRate: Math.floor(10 + Math.random() * 18),
        delayed: Math.floor(Math.random() * 2),
        failedRate: Math.random() > 0.85 ? 1 : 0,
      });
    }
    return initial;
  });

  const [isTableVisible, setIsTableVisible] = useState<boolean>(false);
  const [lastCoalescedAt, setLastCoalescedAt] = useState<string>('Just now');

  // Coalesced telemetry updates (every 2.5s)
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newSample: QueueThroughputSample = {
          timestamp: nextTime,
          active: Math.floor(1 + Math.random() * 5),
          completedRate: Math.floor(8 + Math.random() * 22),
          delayed: Math.floor(Math.random() * 3),
          failedRate: Math.random() > 0.9 ? 1 : 0,
        };
        const updated = [...prev.slice(1), newSample];
        return updated;
      });
      setLastCoalescedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 2500);

    return () => clearInterval(interval);
  }, [queueName]);

  // SVG Chart Geometry
  const width = 760;
  const height = 180;
  const padding = { top: 15, right: 20, bottom: 25, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = useMemo(() => {
    const maxValFound = Math.max(...history.map((h) => Math.max(h.completedRate, h.active, h.delayed, h.failedRate)));
    return Math.max(20, Math.ceil(maxValFound * 1.25 / 5) * 5);
  }, [history]);

  const getX = (i: number) => padding.left + (i / (history.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / (maxVal || 1)) * chartHeight;

  const completedPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.completedRate).toFixed(1)}`)
    .join(' ');

  const activePath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.active).toFixed(1)}`)
    .join(' ');

  const failedPath = history
    .map((h, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(h.failedRate).toFixed(1)}`)
    .join(' ');

  const currentSample = history[history.length - 1];

  return (
    <div className="border border-border-subtle bg-canvas-paper p-5 space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-3">
          <Activity size={16} className="text-emerald-700" />
          <div>
            <h3 className="text-sm font-editorial font-bold text-ink-primary">
              BullMQ Real-Time Throughput / Sliding Window ({queueName})
            </h3>
            <span className="text-[11px] font-mono text-ink-secondary">
              Coalescing Interval: 2.5s · Last sample at {lastCoalescedAt}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stream Connection Pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono border bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            {isStreamLive ? 'Telemetry Active' : 'Polling Fallback'}
          </div>

          <button
            type="button"
            onClick={() => setIsTableVisible((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-border-subtle bg-white dark:bg-zinc-900 text-ink-primary hover:bg-slate-50"
          >
            <Table size={11} /> {isTableVisible ? 'Hide Table' : 'Table'}
          </button>
        </div>
      </div>

      {/* Metric Readout & Legend Dual-Encoding */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2 border border-border-subtle bg-canvas-subtle flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Completed/sec
          </span>
          <span className="font-bold text-emerald-800 dark:text-emerald-300">
            {currentSample?.completedRate || 0}/s
          </span>
        </div>

        <div className="p-2 border border-border-subtle bg-canvas-subtle flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-ink-primary">
            <span className="w-2 h-2 rounded-full bg-ink-primary" /> Active In-Flight
          </span>
          <span className="font-bold text-ink-primary">
            {currentSample?.active || 0}
          </span>
        </div>

        <div className="p-2 border border-border-subtle bg-canvas-subtle flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <Clock size={12} /> Delayed/Retry
          </span>
          <span className="font-bold text-amber-800 dark:text-amber-300">
            {currentSample?.delayed || 0}
          </span>
        </div>

        <div className="p-2 border border-border-subtle bg-canvas-subtle flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-accent-crimson">
            <AlertTriangle size={12} /> Errors/sec
          </span>
          <span className="font-bold text-accent-crimson">
            {currentSample?.failedRate || 0}/s
          </span>
        </div>
      </div>

      {/* SVG Stream Graph with Reserved Aspect Ratio */}
      <div className="w-full aspect-[760/180] border border-border-subtle bg-white dark:bg-zinc-950 p-2 relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          role="region"
          aria-label="BullMQ Live Telemetry Stream"
        >
          {/* Y Axis Gridlines */}
          {[0, maxVal * 0.5, maxVal].map((t, idx) => {
            const y = getY(t);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e4e4e7"
                  strokeDasharray="3,3"
                  strokeWidth="1"
                  className="dark:stroke-zinc-800"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-ink-secondary"
                >
                  {Math.round(t)}
                </text>
              </g>
            );
          })}

          {/* Time axis ticks */}
          {history.map((sample, i) => {
            if (i % 3 !== 0) return null;
            const x = getX(i);
            return (
              <text
                key={i}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[9px] font-mono fill-ink-muted"
              >
                {sample.timestamp}
              </text>
            );
          })}

          {/* Series Paths */}
          {/* 1. Completed Rate (Emerald solid) */}
          <path
            d={completedPath}
            fill="none"
            stroke="#059669"
            strokeWidth="1.75"
          />

          {/* 2. Active In-flight (Dark Charcoal dotted) */}
          <path
            d={activePath}
            fill="none"
            stroke="#18181b"
            strokeWidth="1.5"
            strokeDasharray="4,2"
            className="dark:stroke-zinc-300"
          />

          {/* 3. Failed Rate (Crimson dashed) */}
          <path
            d={failedPath}
            fill="none"
            stroke="#881337"
            strokeWidth="1.75"
            strokeDasharray="3,3"
          />
        </svg>
      </div>

      {/* Accessible Table */}
      {isTableVisible && (
        <AccessibleDataTable
          caption={`Sliding Window Telemetry: ${queueName}`}
          headers={['Timestamp', 'Completed Rate (/s)', 'Active Workers', 'Delayed Jobs', 'Failure Rate (/s)']}
          rows={history.map((h) => ({
            timestamp: h.timestamp,
            completedRate: `${h.completedRate}/s`,
            active: h.active,
            delayed: h.delayed,
            failedRate: `${h.failedRate}/s`,
          }))}
          keyExtractor={(row) => row.timestamp}
        />
      )}
    </div>
  );
};
