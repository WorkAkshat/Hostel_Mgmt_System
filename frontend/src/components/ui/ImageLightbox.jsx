import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';

// Full-size photo viewer. `image` = { url, name } or null.
const ImageLightbox = ({ image, onClose }) => {
  useEffect(() => {
    if (!image) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image, onClose]);

  return createPortal(
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-[#1b2a29]/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.figure
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative m-0 max-w-2xl w-full bg-white rounded-[var(--border-radius-modal)] p-3 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pt-1 pb-3">
              <figcaption className="text-[15px] font-bold">{image.name}</figcaption>
              <div className="flex items-center gap-1.5">
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-xl bg-mint-100 text-brand-700 text-[13px] font-semibold flex items-center gap-1.5 hover:bg-mint-200"
                >
                  <ExternalLink size={14} /> Open original
                </a>
                <button
                  onClick={onClose}
                  aria-label="Close photo"
                  className="w-9 h-9 rounded-xl bg-mint-50 hover:bg-mint-100 border-none flex items-center justify-center cursor-pointer text-[var(--text-secondary)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--bg-primary)] flex items-center justify-center overflow-hidden">
              <img src={image.url} alt={image.name} className="max-h-[70vh] max-w-full object-contain" />
            </div>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ImageLightbox;
