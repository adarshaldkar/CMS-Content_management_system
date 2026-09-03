import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface EditorialErrorBannerProps {
  title?: string;
  message: string;
  errorRef?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * EditorialErrorBanner
 * Non-disruptive inline error alert with optional Correlation ID and retry callback.
 */
export const EditorialErrorBanner: React.FC<EditorialErrorBannerProps> = ({
  title = 'Failed to load content',
  message,
  errorRef,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 my-3 border border-red-200 bg-red-50/50 text-ink-primary rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
      style={{ borderRadius: 2 }}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle size={16} className="text-accent-crimson shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-ink-primary">{title}</h5>
          <p className="text-xs text-ink-secondary mt-0.5">{message}</p>
          {errorRef && (
            <span className="font-mono text-[10px] text-ink-muted mt-1 block">
              Reference: {errorRef}
            </span>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-zinc-50 border border-border-subtle text-ink-primary text-xs font-semibold rounded shadow-xs transition-colors shrink-0"
          style={{ borderRadius: 2 }}
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
