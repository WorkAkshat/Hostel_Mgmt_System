import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomModal = ({ isOpen, onClose, title, children }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // We must always return the portal (even if empty) to keep AnimatePresence working properly,
  // or wrap AnimatePresence around the conditionally rendered modal.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center z-[9999]" 
          style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div 
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-[95%] max-w-[540px] rounded-[var(--border-radius-modal)] overflow-hidden shadow-2xl flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="flex items-center justify-between px-6 py-5 border-b shrink-0"
              style={{ borderColor: 'rgba(226, 232, 240, 0.6)', background: 'rgba(248, 250, 252, 0.6)' }}
            >
              <h3 className="text-[17px] text-slate-800 font-bold tracking-tight">{title}</h3>
              <button 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer transition-all border-none"
                style={{ background: 'rgba(226, 232, 240, 0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(226, 232, 240, 0.9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(226, 232, 240, 0.5)')}
                onClick={onClose}
                title="Close Modal"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CustomModal;
