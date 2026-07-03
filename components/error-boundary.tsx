"use client";

import { Component, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="mx-auto max-w-md px-4 py-10 text-center">
          <h2 className="text-[18px] font-semibold text-foreground">
            {this.props.title ?? "Something went wrong"}
          </h2>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            This section failed to load. You can try again without reloading the whole app.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
