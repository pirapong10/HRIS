import React, { useState, useCallback, createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);

  const config = {
    success: { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: '✅' },
    error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: '❌' },
    info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', icon: 'ℹ️' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const s = config[t.type] || config.success;
          return (
            <div key={t.id} style={{
              background: s.bg, border: `1px solid ${s.border}`, color: s.color,
              borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 8,
              minWidth: 260, maxWidth: 400
            }}>
              <span>{s.icon}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
