import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info';

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextType {
  toast: (options: Omit<ToastData, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<ToastData, 'id'>) => {
      const id = crypto.randomUUID();
      const newToast: ToastData = {
        ...options,
        id,
        duration: options.duration ?? 4000,
      };

      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, newToast.duration);
      }

      return id;
    },
    [dismiss]
  );

  const contextValue = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isDestructive = t.variant === 'destructive';
          const isSuccess = t.variant === 'success';
          const isWarning = t.variant === 'warning';
          const isInfo = t.variant === 'info';

          return (
            <div
              key={t.id}
              role={isDestructive ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-200 bg-white ${
                isDestructive
                  ? 'border-rose-200 text-[#0b111d]'
                  : isSuccess
                  ? 'border-emerald-200 text-[#0b111d]'
                  : isWarning
                  ? 'border-amber-200 text-[#0b111d]'
                  : isInfo
                  ? 'border-blue-200 text-[#0b111d]'
                  : 'border-[#e2e8f0] text-[#0b111d]'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isDestructive && <AlertCircle className="w-4 h-4 text-rose-600" />}
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {isInfo && <Info className="w-4 h-4 text-blue-600" />}
                {!isDestructive && !isSuccess && !isWarning && !isInfo && (
                  <Info className="w-4 h-4 text-[#ea580c]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0b111d]">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-[#64748b] mt-0.5 leading-relaxed">{t.description}</p>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-bold text-[#ea580c] hover:text-[#c2410c] transition-colors"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Close notification"
                className="flex-shrink-0 text-[#94a3b8] hover:text-[#0b111d] p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
