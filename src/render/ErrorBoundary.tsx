import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/telemetry';

/** Props for the error boundary. */
interface ErrorBoundaryProps {
  /** The subtree to guard. */
  children: ReactNode;
  /** Rendered in place of the subtree when it throws. */
  fallback: ReactNode;
}

/** Internal error-boundary state. */
interface ErrorBoundaryState {
  /** Whether a descendant has thrown. */
  hasError: boolean;
}

/**
 * Catches render/load errors in its subtree — notably a failed GLB fetch in
 * `useGLTF`, which would otherwise tear down the whole r3f Canvas. Shows a
 * fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // M_AUDIT2.ARCH.64 + M_AUDIT2.SEC2.46 — telemetry facade strips the
    // stack + componentStack in prod builds so adb logcat doesn't leak
    // module structure / source-map-aided reverse engineering surface.
    reportError(error, { source: 'ErrorBoundary', componentStack: info.componentStack });
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
