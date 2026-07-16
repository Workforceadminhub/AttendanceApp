import { redactSensitive } from "./redactSensitive";

/**
 * Error reporter — abstracts Sentry / similar so the rest of the codebase
 * doesn't import vendor SDKs directly.
 *
 * SETUP REQUIRED before this does anything in production:
 *   1. Create a free Sentry account: https://sentry.io
 *   2. Create a React project, copy the DSN
 *   3. `npm i @sentry/react`
 *   4. Set REACT_APP_SENTRY_DSN in your .env.local and your hosting env
 *   5. Uncomment the Sentry init below
 *   6. Verify by throwing an error in dev and seeing it appear in Sentry
 *
 * Until step 5 is done this is a no-op (errors just go to console in dev).
 */

let initialized = false;

export function initErrorReporter() {
  if (initialized) return;
  initialized = true;

  // === Uncomment after `npm i @sentry/react` and setting REACT_APP_SENTRY_DSN ===
  // import * as Sentry from "@sentry/react";
  // const dsn = process.env.REACT_APP_SENTRY_DSN;
  // if (!dsn) return;
  // Sentry.init({
  //   dsn,
  //   environment: process.env.NODE_ENV,
  //   integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  //   tracesSampleRate: 0.1,
  //   replaysSessionSampleRate: 0,
  //   replaysOnErrorSampleRate: 1.0,
  //   beforeSend(event) {
  //     // Strip auth tokens from error context
  //     if (event.request?.headers) delete event.request.headers.Authorization;
  //     return event;
  //   },
  // });

  // Expose a fallback so RouteErrorBoundary can call it without importing Sentry
  if (typeof window !== "undefined") {
    window.__reportError = reportError;
  }
}

/** @param {Error|string} err  @param {object} [context] */
export function reportError(err, context) {
  const safeContext = context ? redactSensitive(context) : undefined;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("[errorReporter]", err, safeContext);
    return;
  }
  // === Replace with Sentry.captureException(err, { extra: context }) once initialized ===
}

/** Capture a non-fatal note (e.g. user dismissed a modal twice). */
export function reportMessage(msg, context) {
  const safeContext = context ? redactSensitive(context) : undefined;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[errorReporter]", msg, safeContext);
    return;
  }
  // === Replace with Sentry.captureMessage(msg, { extra: context }) ===
}
