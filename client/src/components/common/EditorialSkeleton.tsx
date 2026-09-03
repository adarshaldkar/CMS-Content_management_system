import React from 'react';

interface EditorialSkeletonProps {
  className?: string;
  variant?: 'text' | 'headline' | 'rectangular' | 'circle';
  lines?: number;
}

/**
 * EditorialSkeleton
 * Subtle pulse placeholder matching editorial typography and image aspect ratios.
 */
export const EditorialSkeleton: React.FC<EditorialSkeletonProps> = ({
  className = '',
  variant = 'text',
  lines = 1,
}) => {
  if (variant === 'circle') {
    return (
      <div
        className={`animate-pulse bg-zinc-200 rounded-full shrink-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={`animate-pulse bg-zinc-200 border border-border-subtle rounded ${className}`}
        style={{ borderRadius: 2 }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'headline') {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        <div className="h-7 bg-zinc-200 rounded w-4/5 animate-pulse" />
        <div className="h-7 bg-zinc-200 rounded w-2/3 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-zinc-200 rounded animate-pulse"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%', borderRadius: 2 }}
        />
      ))}
    </div>
  );
};
