import React from 'react';

export interface ArticleSparklineProps {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
  label?: string;
}

export const ArticleSparkline: React.FC<ArticleSparklineProps> = ({
  data = [12, 18, 15, 26, 32, 45, 52],
  color = '#881337', // Editorial Crimson
  width = 80,
  height = 24,
  label = '7-day readership trend',
}) => {
  if (!data || data.length < 2) {
    return (
      <div
        className="inline-flex items-center justify-center text-[10px] font-mono text-ink-muted"
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const isUp = data[data.length - 1] >= data[0];
  const lastPoint = points.split(' ').pop()?.split(',') || ['0', '0'];

  return (
    <div
      className="inline-flex items-center gap-1.5 align-middle"
      title={`${label}: ${data[0]} → ${data[data.length - 1]} (${isUp ? '+' : ''}${
        data[0] === 0 ? 0 : Math.round(((data[data.length - 1] - data[0]) / (data[0] || 1)) * 100)
      }%)`}
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="2"
          fill={color}
        />
      </svg>
    </div>
  );
};
