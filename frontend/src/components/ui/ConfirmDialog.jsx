import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert, CircleHelp } from 'lucide-react';

// Replaces window.confirm. `onConfirm` may be async; the dialog shows a busy
// state and closes itself when it resolves.
const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  const danger = tone === 'danger';
  const Icon = danger ? TriangleAlert : CircleHelp;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-[#1b2a29]/40 flex items-end sm:items-center justify-center p-4"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="w-full max-w-[420px] bg-white rounded-[var(--border-radius-modal)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${danger ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-mint-100 text-brand-700'}`}>
              <Icon size={20} />
            </span>
            <h3 id="confirm-title" className="text-[17px] font-bold m-0">{title}</h3>
            {message && <div className="text-[14px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{message}</div>}
            <div className="flex gap-2 justify-end mt-6">
              <button className="btn-secondary h-10" onClick={onClose} disabled={busy}>{cancelLabel}</button>
              <button
                autoFocus
                onClick={handleConfirm}
                disabled={busy}
                className={danger
                  ? 'h-10 px-5 rounded-[var(--border-radius-btn)] bg-[var(--danger)] hover:brightness-95 text-white text-[14px] font-semibold border-none cursor-pointer disabled:opacity-60'
                  : 'btn-brand h-10'}
              >
                {busy ? 'Please wait…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmDialog;
