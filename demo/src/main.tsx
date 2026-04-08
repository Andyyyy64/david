import { initRuntime } from '@web/lib/runtime';
import { createDemoRuntime } from './lib/runtime-demo';

async function boot() {
  await initRuntime(async () => createDemoRuntime());

  // Dynamic imports AFTER runtime is initialized — prevents api.ts from
  // calling getRuntime() before the singleton exists.
  const [{ StrictMode }, { createRoot }, { DemoShell }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./DemoShell'),
  ]);
  await import('@web/i18n');
  await import('@web/global.css');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DemoShell />
    </StrictMode>,
  );
}

boot();
