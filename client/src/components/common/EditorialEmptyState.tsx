import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EditorialEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * EditorialEmptyState
 * Minimalist, restrained empty state matching The Gazette's hairlines and typography.
 */
export const EditorialEmptyState: React.FC<EditorialEmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 border border-dashed border-border-subtle bg-canvas-paper text-center max-w-md mx-auto my-6 rounded ${className}`}
      style={{ borderRadius: 2 }}
    >
      {Icon && (
        <div className="w-10 h-10 mx-auto mb-3 text-ink-muted flex items-center justify-center">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <h4 className="font-serif text-base font-bold text-ink-primary mb-1.5">{title}</h4>
      <p className="text-xs text-ink-secondary mb-4 leading-relaxed font-sans">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-1.5 bg-ink-primary hover:bg-black text-white text-xs font-semibold rounded transition-colors"
          style={{ borderRadius: 2 }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
