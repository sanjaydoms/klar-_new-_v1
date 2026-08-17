import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import ToastContainer from '@/features/flights/components/ToastContainer';
import { ToastMessage, ToastType } from '@/features/flights/components/Toast';

/**
 * Module-level toast notifier, callable from anywhere — components, handlers,
 * or plain modules like the api layer. Replaces the blocking alert() calls
 * that were scattered across ~35 files. Rendering reuses the existing
 * Toast/ToastContainer; <GlobalToasts /> is mounted once in main.tsx.
 */

const AUTO_DISMISS_MS = 6000;

let toasts: ToastMessage[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function clearAllToasts(): void {
  toasts = [];
  emit();
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function notify(message: string, type: ToastType, title?: string): void {
  const id = `n${++nextId}`;
  toasts = [...toasts, { id, type, message, title }];
  emit();
  // Toast.tsx accepts a duration prop but has no timer of its own.
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
}

export const notifyError = (message: string, title?: string) => notify(message, 'error', title);
export const notifySuccess = (message: string, title?: string) => notify(message, 'success', title);
export const notifyInfo = (message: string, title?: string) => notify(message, 'info', title);
export const notifyWarning = (message: string, title?: string) => notify(message, 'warning', title);

export function GlobalToasts() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
  );

  // Toasts portal to their own top-level node OUTSIDE the app root. Radix
  // Dialog aria-hides every sibling of its portal while a modal is open — if
  // toasts render inside #root, an error toast fired from a modal (e.g. the
  // fare-rules gate) becomes invisible to screen readers. A separate
  // body-level live region survives that hiding.
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('data-toast-host', '');
    document.body.appendChild(el);
    hostRef.current = el;
    setHost(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!host) return null;
  return createPortal(
    <ToastContainer toasts={current} onClose={dismissToast} position="top-center" />,
    host,
  );
}
