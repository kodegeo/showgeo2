import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - React production-safe class component
 * 
 * Rules enforced:
 * - No React hooks (useEffect, useState, etc.)
 * - No helper functions that use hooks
 * - render() is pure with no side effects
 * - All side effects only in lifecycle methods or event handlers
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Pure function - no side effects, only returns state update
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Side effects allowed in lifecycle methods
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = (): void => {
    // Side effects allowed in event handlers
    // No setState needed - page reload will reset everything
    window.location.reload();
  };

  render(): ReactNode {
    // ✅ Pure render method - no side effects, only returns JSX based on state/props
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      
      if (fallback) {
        return fallback;
      }

      // Default error UI
      const errorMessage = this.state.error?.message || "An unexpected error occurred";
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] text-white">
          <div className="text-center">
            <h2 className="text-2xl font-heading font-bold text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-[#9A9A9A] font-body mb-4">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}






