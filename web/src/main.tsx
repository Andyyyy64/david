import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initRuntime } from './lib/runtime';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import './i18n';
import './global.css';

async function init() {
  try {
    await initRuntime();
  } catch (e) {
    console.warn('Runtime init failed, retrying…', e);
    await initRuntime();
  }
  const { default: App } = await import('./App');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

init();
