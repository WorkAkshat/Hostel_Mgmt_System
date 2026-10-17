import { motion } from 'framer-motion';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { rupees } from '../../utils/format';
import { rise } from './financeUtils';

const TONES = {
  mint: { card: 'bg-mint-100 border-mint-200', chip: 'bg-white text-brand-700' },
  sun: { card: 'bg-cream-100 border-sun-200', chip: 'bg-sun-300 text-sun-900' },
  peach: { card: 'bg-peach-50 border-peach-100', chip: 'bg-white text-peach-700' },
  lilac: { card: 'bg-lilac-50 border-lilac-100', chip: 'bg-white text-lilac-700' },
  white: { card: 'bg-white border-[var(--border-color)]', chip: 'bg-mint-50 text-brand-700' },
};


// Money / count tile. Clicking it (when onClick is set) applies the matching filter.
const SummaryTile = ({ icon: Icon, tone = 'white', label, value, money = true, unit = '', caption, onClick, active, children }) => {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      variants={rise}
      whileHover={onClick ? { y: -3 } : undefined}
      onClick={onClick}
      aria-pressed={onClick ? Boolean(active) : undefined}
      className={`relative overflow-hidden text-left border rounded-[var(--border-radius-card)] p-4 sm:p-5 ${TONES[tone].card} ${
        onClick ? 'cursor-pointer hover:shadow-[var(--shadow-hover)] transition-shadow' : ''
      } ${active ? 'ring-2 ring-sun-400 ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}`}
    >
      <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/40 pointer-events-none" />
      <span className={`relative w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-sm)] mb-3 ${TONES[tone].chip}`}>
        <Icon size={19} />
      </span>
      <span className="relative block text-[13px] font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="relative block text-[22px] sm:text-[26px] font-bold leading-tight tracking-tight text-[var(--text-primary)] mt-0.5">
        <AnimatedNumber value={value} format={money ? rupees : unit ? (n) => `${Math.round(n).toLocaleString('en-IN')}${unit}` : undefined} />
      </span>
      {caption && <span className="relative block mt-1.5 text-[12px] text-[var(--text-secondary)]">{caption}</span>}
      {children}
    </Tag>
  );
};

export default SummaryTile;
