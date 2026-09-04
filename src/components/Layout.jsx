import React from "react";

/**
 * Layout - page content shell.
 *
 * Centered max-width column with consistent horizontal padding and a
 * generous vertical rhythm. Pages render their own <Header /> above this.
 *
 * The bottom padding ensures content never sits flush with the viewport edge
 * on mobile, where a sticky bottom action bar may overlay the last 64px.
 */
function Layout({ children, narrow = false, className = "" }) {
  const max = narrow ? "max-w-3xl" : "max-w-7xl";
  return (
    <div
      className={`mx-auto w-full min-w-0 ${max} px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 ${className}`}
    >
      {children}
    </div>
  );
}

export default Layout;
