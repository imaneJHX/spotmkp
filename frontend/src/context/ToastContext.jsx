import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import styles from './ToastContext.module.css';

const ToastContext = createContext(null);
const TOAST_LIFETIME_MS = 2400;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());

  function removeToast(id) {
    const timeoutId = timeoutMapRef.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }

  function showToast(message) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((currentToasts) => [...currentToasts, { id, message }]);

    if (typeof window !== 'undefined') {
      const timeoutId = window.setTimeout(() => {
        removeToast(id);
      }, TOAST_LIFETIME_MS);

      timeoutMapRef.current.set(id, timeoutId);
    }
  }

  useEffect(() => {
    return () => {
      timeoutMapRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutMapRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast} role="status">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}
