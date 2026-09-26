import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// Right-side panel for details. Full screen on phones.
const Drawer = ({ open, onClose, title, header, footer, width = 520, children }) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[9000]" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            className="absolute inset-0 bg-[#1b2a29]/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="absolute top-0 right-0 h-full w-full bg-white shadow-[var(--shadow-lg)] flex flex-col"
            style={{ maxWidth: width }}
          >
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--border-color)] bg-mint-50">
              <div className="min-w-0 flex-1">{header || <h3 className="text-[17px] font-bold m-0">{title}</h3>}</div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 shrink-0 rounded-xl bg-white hover:bg-mint-100 border border-[var(--border-color)] flex items-center justify-center cursor-pointer text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-5">{children}</div>
            {footer && <div className="px-5 sm:px-6 py-4 border-t border-[var(--border-color)] bg-white">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Drawer;
