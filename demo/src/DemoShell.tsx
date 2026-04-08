import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import App from '@web/App';
import { DemoScene } from './three/Scene';
import { useDemoLiveFeed } from './lib/runtime-demo';

function usePortalTarget(targetId: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const update = () => {
      setTarget(document.getElementById(targetId));
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [targetId]);

  return target;
}

function LiveFeedModalPortal({ pose, hour, setSnapshot }: {
  pose: 'sleeping' | 'sitting_desk' | 'standing' | null;
  hour: number;
  setSnapshot: (url: string) => void;
}) {
  const target = usePortalTarget('demo-live-feed-modal-slot');

  if (!target) return null;

  return createPortal(
    <div style={{ width: '100%', height: '100%' }}>
      <DemoScene pose={pose} hour={hour} onSnapshot={setSnapshot} captureSnapshots={false} />
    </div>,
    target,
  );
}

function LiveFeedPreviewPortal({ pose, hour, setSnapshot }: {
  pose: 'sleeping' | 'sitting_desk' | 'standing' | null;
  hour: number;
  setSnapshot: (url: string) => void;
}) {
  const target = usePortalTarget('demo-live-feed-preview-slot');

  if (!target) return null;

  return createPortal(
    <div style={{ width: '100%', height: '100%' }}>
      <DemoScene pose={pose} hour={hour} onSnapshot={setSnapshot} captureSnapshots={false} />
    </div>,
    target,
  );
}

export function DemoShell() {
  const { pose, hour, setSnapshot } = useDemoLiveFeed();

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-10000px',
          top: '-10000px',
          width: '640px',
          height: '480px',
          pointerEvents: 'none',
        }}
      >
        <DemoScene pose={pose} hour={hour} onSnapshot={setSnapshot} captureSnapshots />
      </div>
      <LiveFeedPreviewPortal pose={pose} hour={hour} setSnapshot={setSnapshot} />
      <LiveFeedModalPortal pose={pose} hour={hour} setSnapshot={setSnapshot} />
      <App />
    </>
  );
}
