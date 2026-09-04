import React from "react";
import { Link } from "react-router-dom";

/**
 * Catches render-time errors in the wrapped route subtree so a single broken
 * page doesn't take down the whole app. Use as a wrapper inside <Route>.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== "production") {
       
      console.error("[RouteErrorBoundary]", error, info);
    }
    // Hook for Sentry-or-equivalent (see src/utils/errorReporter.js)
    if (typeof window !== "undefined" && window.__reportError) {
      try {
        window.__reportError(error, { componentStack: info?.componentStack });
      } catch {
        // swallow
      }
    }
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-ink-900 mb-3">Something went wrong on this page</h1>
          <p className="text-ink-600 mb-6">
            The error has been logged. You can try again, or head back to the homepage.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <pre className="text-left text-xs bg-cream-200 rounded p-4 mb-6 overflow-x-auto">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-md bg-ink-900 text-white hover:bg-ink-800"
            >
              Try again
            </button>
            <Link
              to="/"
              className="px-4 py-2 rounded-md bg-ink-200 text-ink-800 hover:bg-ink-300"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
