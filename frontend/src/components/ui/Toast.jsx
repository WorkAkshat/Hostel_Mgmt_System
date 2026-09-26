import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CircleCheck, className: 'text-[var(--success)]' },
  error: { icon: CircleAlert, className: 'text-[var(--danger)]' },
  info: { icon: Info, className: 'text-brand-600' },
};

// Small confirmation messages in the bottom-right (bottom-center on phones).
// Usage: const toast = useToast(); toast.success('Leave approved');
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type, message, description) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-2), { id, type, message, description }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m, d) => show('success', m, d),
    error: (m, d) => show('error', m, d),
    info: (m, d) => show('info', m, d),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[100000] bottom-[88px] lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 flex flex-col items-center lg:items-end gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map(({ id, type, message, description }) => {
            const { icon: Icon, className } = STYLES[type] || STYLES.info;
            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="pointer-events-auto w-full max-w-[380px] flex items-start gap-3 p-3.5 pr-2.5 rounded-2xl bg-white border border-[var(--border-color)] shadow-[var(--shadow-lg)]"
              >
                <Icon size={20} className={`shrink-0 mt-px ${className}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text-primary)] m-0">{message}</p>
                  {description && <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 mb-0">{description}</p>}
                </div>
                <button
                  onClick={() => dismiss(id)}
                  aria-label="Dismiss"
                  className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-mint-50 hover:text-[var(--text-primary)] border-none bg-transparent cursor-pointer"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
