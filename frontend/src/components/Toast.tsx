import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastItem = { id: string; message: string; type?: 'info' | 'success' | 'error' };

const ToastContext = createContext<{
  push: (m: string, t?: ToastItem['type']) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ minWidth: 240, padding: 12, borderRadius: 10, background: t.type === 'error' ? '#fee2e2' : t.type === 'success' ? '#ecfccb' : '#eef2ff', color: '#111', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

export default ToastProvider;
