import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999]" 
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="w-[95%] max-w-[540px] rounded-[var(--border-radius-modal)] overflow-hidden shadow-2xl animate-fade-in flex flex-col"
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
          className="flex items-center justify-between px-6 py-5 border-b"
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
      </div>
    </div>,
    document.body
  );
};

export default CustomModal;
