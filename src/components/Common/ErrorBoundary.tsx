import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-rose-500/30 bg-rose-500/5 text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-500/20 ring-1 ring-rose-500/50 shadow-lg shadow-rose-500/20">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-mono">CRITICAL MODULE FAILURE</h2>
            <p className="text-slate-400 text-sm font-sans max-w-md mx-auto">
              Componenta a întâmpinat o eroare neașteptată. Sistemul Trinity a izolat defectul pentru a preveni crash-ul întregii platforme.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-white transition-all shadow-lg active:scale-95"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>REPORNEȘTE MODULUL</span>
          </button>
          {this.state.error && (
            <pre className="mt-4 p-3 rounded-lg bg-black/40 text-rose-400/80 text-xs font-mono overflow-auto max-w-lg w-full text-left border border-rose-500/10">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
