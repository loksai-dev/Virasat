import React from 'react';
import { useVirasatStore, ToastMessage } from '@/store/useVirasatStore';
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ToastProvider: React.FC = () => {
  const { toasts, removeToast } = useVirasatStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    risk: <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-white/95 text-slate-800',
    warning: 'border-amber-200 bg-white/95 text-slate-800',
    risk: 'border-rose-200 bg-white/95 text-slate-800',
    info: 'border-sky-200 bg-white/95 text-slate-800',
  };

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5',
        borders[toast.type]
      )}
    >
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-navy leading-tight">{toast.title}</h4>
        {toast.message && (
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Close notification"
        className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
