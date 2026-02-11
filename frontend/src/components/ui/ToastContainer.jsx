import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import useToastStore from '../../stores/useToastStore';

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    barColor: '#16a34a',
    iconColor: 'text-green-600',
  },
  error: {
    icon: AlertCircle,
    barColor: '#E84E36',
    iconColor: 'text-[#E84E36]',
  },
  warning: {
    icon: AlertTriangle,
    barColor: '#f59e0b',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    barColor: '#1A1917',
    iconColor: 'text-[#1A1917]',
  },
};

const Toast = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on mount
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="relative flex items-start gap-3 bg-white rounded shadow-lg overflow-hidden max-w-[380px] w-[380px] border border-[#E5E5E5]"
      >
        {/* Left color bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 shrink-0"
          style={{ backgroundColor: config.barColor }}
        />

        {/* Icon */}
        <div className={`shrink-0 pt-3.5 pl-4 ${config.iconColor}`}>
          <Icon size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 py-3 pr-2 min-w-0">
          {toast.title && (
            <p className="font-geo-sans text-[11px] font-bold uppercase tracking-widest text-[#1A1917] leading-tight">
              {toast.title}
            </p>
          )}
          {toast.message && (
            <p className="font-geo-sans text-xs text-[#888] mt-0.5 leading-snug">
              {toast.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="shrink-0 p-2 mt-1.5 mr-1 text-[#888] hover:text-[#1A1917] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
