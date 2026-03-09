import { createContext, useContext, useCallback, useRef } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function useToastManager() {
  const toastsRef = useRef<Toast[]>([]);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((fn) => fn());
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      toastsRef.current = toastsRef.current.filter((t) => t.id !== id);
      notify();
    },
    [notify],
  );

  const addToast = useCallback(
    (message: string, type: ToastType = 'error', duration = 5000) => {
      const id = `toast-${++nextId}`;
      const toast: Toast = { id, message, type, duration };
      toastsRef.current = [...toastsRef.current, toast];
      notify();
      setTimeout(() => removeToast(id), duration);
    },
    [notify, removeToast],
  );

  return {
    toastsRef,
    listenersRef,
    addToast,
    removeToast,
  };
}
