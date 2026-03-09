import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ToastContext, useToastManager } from '../hooks/useToast';
import type { Toast } from '../hooks/useToast';
import { ToastContainer } from './Toast';

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toastsRef, listenersRef, addToast, removeToast } = useToastManager();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const sync = useCallback(() => {
    setToasts([...toastsRef.current]);
  }, [toastsRef]);

  useEffect(() => {
    listenersRef.current.add(sync);
    return () => {
      listenersRef.current.delete(sync);
    };
  }, [listenersRef, sync]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}
