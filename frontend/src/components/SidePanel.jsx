import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SidePanel = ({ isOpen, onClose, title, children }) => {
  // Prevent body scroll when panel is open
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Drawer Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button 
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border-none flex items-center justify-center text-slate-500 cursor-pointer transition-all"
            onClick={onClose}
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export default SidePanel;
