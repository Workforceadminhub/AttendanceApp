import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initErrorReporter } from './utils/errorReporter';

initErrorReporter();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Report Web Vitals: in dev → console.log, in prod → POST to /api/metrics/web-vitals.
// Replace the prod handler if you wire up a different metrics sink.
reportWebVitals((metric) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[web-vitals]", metric.name, metric.value, metric);
    return;
  }
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      path: window.location.pathname,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/metrics/web-vitals", body);
    } else {
      fetch("/api/metrics/web-vitals", { method: "POST", keepalive: true, body, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    // swallow — metrics must never break the app
  }
});
