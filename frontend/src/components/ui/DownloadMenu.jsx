import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Download, FileSpreadsheet, LoaderCircle } from 'lucide-react';
import { useToast } from './Toast';

// "Download" button with a small menu of CSV exports.
// options: [{ key, label, hint, run: () => Promise|void }]
const DownloadMenu = ({ options, label = 'Download', align = 'right', className = '' }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = async (opt) => {
    setBusy(opt.key);
    try {
      const count = await opt.run();
      if (count === 0) toast.info('Nothing to download', 'There are no rows for this selection.');
      else setOpen(false);
    } catch (err) {
      toast.error('Download failed', err.message);
    } finally {
      setBusy(null);
    }
  };

  // A single option downloads straight away
  if (options.length === 1) {
    const only = options[0];
    return (
      <button className={`btn-secondary ${className}`} onClick={() => run(only)} disabled={Boolean(busy)} title={only.hint}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />} <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button className="btn-secondary w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
        <Download size={16} /> <span>{label}</span> <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-30 top-[calc(100%+6px)] ${align === 'right' ? 'right-0' : 'left-0'} w-[280px] p-1.5 bg-white border border-[var(--border-color)] rounded-2xl shadow-[var(--shadow-lg)]`}
          >
            {options.map((opt) => (
              <button
                key={opt.key}
                role="menuitem"
                onClick={() => run(opt)}
                disabled={Boolean(busy)}
                className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl bg-transparent border-none text-left cursor-pointer hover:bg-mint-50 disabled:opacity-60"
              >
                <span className="w-8 h-8 shrink-0 rounded-lg bg-mint-100 text-brand-700 flex items-center justify-center">
                  {busy === opt.key ? <LoaderCircle size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{opt.label}</span>
                  {opt.hint && <span className="block text-[12px] text-[var(--text-tertiary)]">{opt.hint}</span>}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DownloadMenu;
