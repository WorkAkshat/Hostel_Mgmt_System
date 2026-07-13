import { useEffect } from 'react';
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

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" 
      onClick={onClose}
    >
      <div 
        className="glass-card w-[90%] max-w-[520px] rounded-[var(--border-radius-lg)] overflow-hidden shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)] bg-white/10">
          <h3 className="text-lg text-[var(--text-primary)] font-bold">{title}</h3>
          <button 
            className="bg-transparent border-none w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] cursor-pointer transition-all duration-200 hover:bg-black/5 hover:text-[var(--text-primary)]" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
