import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Latin subsets only: the full geist-mono imports add Cyrillic, Vietnamese
// and symbol @font-face rules (with long unicode-ranges) the app never uses.
import '@fontsource/geist-sans/latin-400.css';
import '@fontsource/geist-sans/latin-500.css';
import '@fontsource/geist-sans/latin-600.css';
import '@fontsource/geist-sans/latin-700.css';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/geist-mono/latin-500.css';
import '@fontsource/geist-mono/latin-600.css';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initErrorReporter } from './utils/errorReporter';

initErrorReporter();

// A deploy replaces the hashed chunks, so a tab opened before it fails to
// load the next lazy route. Reload once to pick up the new build; the
// timestamp guard stops a reload loop if the chunk is genuinely broken.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('chunkReloadAt') || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem('chunkReloadAt', String(Date.now()));
  } catch {
    // storage unavailable: still reload once
  }
  event.preventDefault();
  window.location.reload();
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);

// Dev only: log Web Vitals to the console. Production field data goes to
// Vercel Speed Insights (<SpeedInsights /> above); enable it in the Vercel
// project dashboard.
if (process.env.NODE_ENV !== "production") {
  reportWebVitals((metric) => {
    console.log("[web-vitals]", metric.name, metric.value, metric);
  });
}
