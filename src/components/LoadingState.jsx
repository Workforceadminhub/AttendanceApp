import React from "react";

/**
 * Unified Skeletal Spinner / Skeleton Loading State component.
 * Replaces disparate circular SVG spinners with a cohesive, modern
 * skeletal placeholder interface with pulsing shimmer animations.
 */
function LoadingState({ type = "dashboard", rows = 4, className = "" }) {
  if (type === "card") {
    return (
      <div className={`p-6 bg-white border border-ink-100 rounded-xl space-y-4 animate-pulse shadow-sm ${className}`} role="status">
        <div className="h-5 w-1/3 bg-ink-200 rounded" />
        <div className="h-4 w-3/4 bg-ink-100 rounded" />
        <div className="h-4 w-1/2 bg-ink-100 rounded" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (type === "inline" || type === "simple") {
    return (
      <div className={`flex items-center justify-center p-8 space-x-2 animate-pulse ${className}`} role="status">
        <div className="w-2.5 h-2.5 bg-ink-400 rounded-full animate-ping" />
        <div className="w-2.5 h-2.5 bg-ink-300 rounded-full animate-pulse" />
        <div className="w-2.5 h-2.5 bg-ink-200 rounded-full animate-pulse" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse ${className}`} role="status">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-ink-100 gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-ink-200 rounded-md" />
          <div className="h-4 w-72 bg-ink-100 rounded-md" />
        </div>
        <div className="flex space-x-3">
          <div className="h-9 w-28 bg-ink-200 rounded-lg" />
          <div className="h-9 w-28 bg-ink-100 rounded-lg" />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-white border border-ink-100 rounded-xl space-y-3 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-ink-100 rounded" />
              <div className="w-7 h-7 bg-ink-100 rounded-full" />
            </div>
            <div className="h-7 w-20 bg-ink-200 rounded-md" />
            <div className="h-3 w-32 bg-ink-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / List Skeleton */}
      <div className="bg-white border border-ink-100 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-center pb-3 border-b border-ink-100">
          <div className="h-5 w-36 bg-ink-200 rounded" />
          <div className="h-8 w-44 bg-ink-100 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: Math.max(3, rows) }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-3 border-b border-ink-50 last:border-0">
              <div className="w-9 h-9 bg-ink-200 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ink-200 rounded w-1/3" />
                <div className="h-3 bg-ink-100 rounded w-1/2" />
              </div>
              <div className="h-6 bg-ink-100 rounded w-20 hidden sm:block" />
              <div className="h-6 bg-ink-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export default LoadingState;
