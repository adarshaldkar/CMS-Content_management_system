import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-stone-200/80 dark:bg-stone-800 animate-pulse rounded ${className}`} />
);

export const ArticleCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 p-4 bg-white dark:bg-stone-900 border border-border-subtle dark:border-stone-800 rounded">
      {/* Cover Image Skeleton */}
      <Skeleton className="w-full h-48 rounded" />

      {/* Category Pill Skeleton */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="w-20 h-4 rounded-full" />
        <Skeleton className="w-12 h-4" />
      </div>

      {/* Title Skeleton */}
      <div className="space-y-2">
        <Skeleton className="w-full h-6" />
        <Skeleton className="w-4/5 h-6" />
      </div>

      {/* Excerpt Skeleton */}
      <div className="space-y-1.5 pt-1">
        <Skeleton className="w-full h-3.5" />
        <Skeleton className="w-11/12 h-3.5" />
      </div>

      {/* Author & Byline Skeleton */}
      <div className="flex items-center gap-2.5 pt-3 border-t border-border-subtle dark:border-stone-800">
        <Skeleton className="w-7 h-7 rounded-full" />
        <Skeleton className="w-28 h-3.5" />
        <Skeleton className="w-16 h-3.5 ml-auto" />
      </div>
    </div>
  );
};

export const ArticleReaderSkeleton: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-24 h-3.5" />
        <Skeleton className="w-4 h-3.5" />
        <Skeleton className="w-20 h-3.5" />
      </div>

      {/* Headline Skeleton */}
      <div className="space-y-3">
        <Skeleton className="w-full h-10 sm:h-12" />
        <Skeleton className="w-4/5 h-10 sm:h-12" />
      </div>

      {/* Excerpt */}
      <div className="space-y-2 pt-2">
        <Skeleton className="w-full h-5" />
        <Skeleton className="w-3/4 h-5" />
      </div>

      {/* Byline & Author Bar */}
      <div className="flex items-center justify-between border-t border-b border-border-subtle dark:border-stone-800 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
        <Skeleton className="w-28 h-4" />
      </div>

      {/* Hero Image */}
      <Skeleton className="w-full h-72 sm:h-96 rounded" />

      {/* Paragraph blocks */}
      <div className="space-y-4 pt-4">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-11/12 h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-4/5 h-4" />
      </div>

      <div className="space-y-4 pt-4">
        <Skeleton className="w-3/5 h-7" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-10/12 h-4" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => {
  return (
    <tr className="border-b border-border-subtle dark:border-stone-800 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
};
