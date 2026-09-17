"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { openFeedbackWithFallback } from "@/lib/feedback";
import { openSentryFeedbackDialog } from "@/lib/sentry/feedback";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

type SentryFeedback = {
  createWidget: () => void;
};

type SentryBrowserClient = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
  ) => void;
  getFeedback?: () => SentryFeedback | null;
};

function getSentryClient(): SentryBrowserClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window as Window & { Sentry?: SentryBrowserClient }).Sentry ?? null;
}

/**
 * Global Error Boundary
 *
 * Catches unhandled errors in component tree and:
 * 1. Reports them to error tracking
 * 2. Shows a user-friendly error UI
 * 3. Offers bug reporting via feedback
 */
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracker
    getSentryClient()?.captureException?.(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReportBug = () => {
    void openFeedbackWithFallback(async () => {
      const opened = await openSentryFeedbackDialog({
        messagePlaceholder: "What happened when the error occurred?",
        source: "global_error_boundary",
      });
      if (!opened) {
        throw new Error("Sentry feedback not available");
      }
    });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <div className="relative">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">That didn’t load</h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Your progress has been
                preserved where possible.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted border border-border rounded-lg p-4 text-left">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="w-full bg-accent hover:bg-accent-dark text-black"
              >
                Reload Application
              </Button>
              <Button
                onClick={this.handleReportBug}
                variant="outline"
                className="w-full"
              >
                Report This Issue
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This error has been automatically logged. If the problem persists,
              please report it using the button above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
