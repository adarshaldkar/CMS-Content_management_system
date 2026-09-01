import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Gazette ErrorBoundary] Caught render error:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-canvas-paper flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-border-subtle p-8 text-center space-y-5 shadow-sm rounded">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-editorial text-xl font-bold text-ink-primary">
                Editorial View Interrupted
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed font-sans">
                An unexpected interface state occurred. The newsroom has logged the diagnostic trace.
              </p>
            </div>

            {this.state.error && (
              <pre className="p-3 bg-slate-50 border border-border-subtle text-[11px] font-mono text-ink-secondary text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-mono font-semibold transition-colors rounded"
            >
              <RefreshCw size={13} />
              <span>Return to Front Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
