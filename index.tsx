import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Generate the absolute URL for the manifest dynamically.
// We wrap this in a try-catch and provide a fallback to prevent "Invalid URL" errors
// which can occur in certain webview/iframe contexts (like 'about:blank' or 'blob:').
let manifestUrl = "https://easyysmm.vercel.app/tonconnect-manifest.json";

try {
  // Ensure window.location.href is valid for URL construction
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    const currentUrl = window.location.href;
    // Basic check to avoid constructing URL on 'about:blank' which throws TypeError
    if (!currentUrl.startsWith('about:') && !currentUrl.startsWith('data:') && !currentUrl.startsWith('blob:')) {
       manifestUrl = new URL('/tonconnect-manifest.json', currentUrl).toString();
    }
  }
} catch (e) {
  console.warn("Failed to construct dynamic manifest URL. Using fallback.", e);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);