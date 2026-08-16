import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
            <div className="bg-red-100 text-red-600 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops, something went wrong.</h2>
            <p className="text-gray-600 mb-6 text-sm">
              A rendering error occurred. If you're in development, this might be a Hot Module Replacement (HMR) glitch with React.lazy.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm w-full"
            >
              Refresh Page
            </button>
            <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left overflow-x-auto">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Error Details</p>
              <pre className="text-xs text-red-500 whitespace-pre-wrap font-mono">
                {this.state.error?.toString()}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
