import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary. Without this a render error unmounts the entire
 * React root, leaving only whatever the parent wrapper paints — for the TT
 * route that's a full-bleed black `bg-black` container (the "black screen"
 * bug users reported after submitting an opinion).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Surface into the console so we can retrieve it from the log stream.
    console.error('[ErrorBoundary] Unhandled render error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    // Force a fresh load so any bad in-memory state (query cache, session
    // storage flags like `tt:fresh-opinion`) is cleared.
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-lg font-semibold">Etwas ist schiefgelaufen.</h1>
          <p className="text-sm text-muted-foreground">
            Bitte lade die Seite neu. Falls das Problem bleibt, versuch es
            gleich noch einmal — deine Passphrase bleibt gültig.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground/70 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-full h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }
}
