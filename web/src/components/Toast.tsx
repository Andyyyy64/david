import { useState, useEffect } from 'react';
import type { Toast as ToastData } from '../hooks/useToast';
import { useToast } from '../hooks/useToast';

function ToastItem({ toast }: { toast: ToastData }) {
  const { removeToast } = useToast();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fadeOutTime = Math.max(toast.duration - 400, 0);
    const timer = setTimeout(() => setExiting(true), fadeOutTime);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  return (
    <div
      className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : ''}`}
      role="alert"
    >
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => removeToast(toast.id)}
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
