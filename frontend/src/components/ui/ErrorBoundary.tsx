import React, { Component, ErrorInfo, ReactNode } from 'react';
import CreativeErrorPage from './CreativeErrorPage';

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

      // Use CreativeErrorPage with liquid-motion variant
      return (
        <CreativeErrorPage 
          variant="liquid-motion"
          errorCode="500"
          errorTitle="Application Error"
          errorMessage={
            import.meta.env.DEV && this.state.error 
              ? this.state.error.message 
              : "Something unexpected happened. Please refresh the page or try again."
          }
          onRefresh={() => window.location.reload()}
          showBackButton={false}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 