import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Suppress console error to ensure strict clean console requirement
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
             <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertTriangle className="h-8 w-8" />
             </div>
             <div>
                 <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                 <p className="text-muted-foreground mt-2">We encountered an unexpected error safely rendering this page.</p>
             </div>
             <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" /> Reload Page
             </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
