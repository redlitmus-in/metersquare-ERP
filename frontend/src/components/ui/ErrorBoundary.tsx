import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Production-ready error boundary component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of the crashed component
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // In production, you would log to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    // You could also send to your analytics service
    // analytics.track('error', { error: error.message, stack: error.stack });
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-gray-100 p-4 rounded text-sm mb-4">
                <summary className="font-semibold cursor-pointer">Error Details (Development)</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-[#243d8a] text-white rounded hover:bg-[#243d8a]"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })} 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 