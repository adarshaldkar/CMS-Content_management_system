import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface EditorialErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showRetry?: boolean;
  onReset?: () => void;
}

interface EditorialErrorBoundaryState {
  hasError: boolean;
  errorRef: string;
}

/**
 * EditorialErrorBoundary
 * Catches component-level runtime crashes, suppresses raw stack traces,
 * displays a graceful editorial notice with a Correlation ID, and supports recovery.
 */
export class EditorialErrorBoundary extends Component<
  EditorialErrorBoundaryProps,
  EditorialErrorBoundaryState
> {
  state: EditorialErrorBoundaryState = {
    hasError: false,
    errorRef: '',
  };

  static getDerivedStateFromError(): EditorialErrorBoundaryState {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const errorRef = `ERR-${today}-${randomHex}`;
    return { hasError: true, errorRef };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[EditorialErrorBoundary ${this.state.errorRef}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorRef: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-6 my-4 border border-border-subtle bg-canvas-subtle rounded text-center max-w-xl mx-auto"
          style={{ borderRadius: 2 }}
        >
          <h3 className="font-serif text-lg font-bold text-ink-primary mb-1.5">
            {this.props.fallbackTitle || 'Section Temporarily Unavailable'}
          </h3>
          <p className="text-xs text-ink-secondary mb-4 leading-relaxed font-sans">
            {this.props.fallbackMessage ||
              'An unexpected rendering issue occurred while displaying this section.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {this.props.showRetry !== false && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-3.5 py-1.5 bg-ink-primary hover:bg-black text-white text-xs font-semibold rounded transition-colors"
                style={{ borderRadius: 2 }}
              >
                Try Reloading Section
              </button>
            )}
            <span className="font-mono text-[10px] text-ink-muted tracking-wider uppercase select-all">
              Reference: {this.state.errorRef}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
