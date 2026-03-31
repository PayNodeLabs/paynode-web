'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    loading: (message: string) => string;
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => dismiss(id), 5000);
    }
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    loading: (msg: string) => addToast(msg, 'loading'),
    dismiss,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto
              flex items-center gap-3 p-4 pr-3 min-w-[320px] max-w-[420px]
              bg-black/60 backdrop-blur-xl border border-white/10
              rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]
              animate-in slide-in-from-right-8 duration-500
            `}
          >
            <div className="shrink-0">
              {t.type === 'success' && <CheckCircle className="text-green-400" size={20} />}
              {t.type === 'error' && <XCircle className="text-red-400" size={20} />}
              {t.type === 'info' && <Info className="text-blue-400" size={20} />}
              {t.type === 'loading' && <Loader2 className="text-pink-500 animate-spin" size={20} />}
            </div>
            
            <p className="flex-1 text-[13px] font-medium text-neutral-200 leading-tight">
              {t.message}
            </p>

            <button 
              onClick={() => dismiss(t.id)}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors text-neutral-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
