import { motion } from 'framer-motion';

const TONES = {
  brand: 'bg-brand-500',
  sun: 'bg-sun-400',
  success: 'bg-[var(--success)]',
  warning: 'bg-amber-500',
  danger: 'bg-[var(--danger)]',
};

// Horizontal bar that grows to `value` / `max` when it mounts or changes.
const ProgressBar = ({ value = 0, max = 100, tone = 'brand', height = 8, delay = 0, label, trackClassName = 'bg-mint-100' }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${trackClassName}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={`h-full rounded-full ${TONES[tone] || TONES.brand}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
};

export default ProgressBar;
