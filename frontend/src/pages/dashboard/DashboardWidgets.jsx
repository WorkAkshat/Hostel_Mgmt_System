import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { TONES, rise } from './dashboardUtils';

export const Card = ({ className = '', children }) => (
  <motion.section
    variants={rise}
    className={`bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 min-w-0 ${className}`}
  >
    {children}
  </motion.section>
);

export const CardHeader = ({ icon: Icon, tone = 'mint', title, count, to, linkLabel = 'View all', children }) => (
  <div className="flex items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone].soft}`}>
        <Icon size={17} />
      </span>
      <h2 className="text-[15px] font-bold m-0 truncate">{title}</h2>
      {count > 0 && (
        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-sun-300 text-sun-900 text-[12px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
    {children}
    {to && (
      <Link to={to} className="text-[13px] font-semibold text-brand-700 hover:text-brand-900 flex items-center gap-0.5 shrink-0">
        {linkLabel} <ChevronRight size={14} />
      </Link>
    )}
  </div>
);

export const EmptyState = ({ icon: Icon, title, text }) => (
  <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
    <span className="w-12 h-12 rounded-full bg-mint-50 text-brand-400 flex items-center justify-center">
      <Icon size={20} />
    </span>
    {title && <p className="text-[14px] font-semibold text-[var(--text-primary)] m-0">{title}</p>}
    <p className="text-[13px] text-[var(--text-tertiary)] m-0 max-w-[260px]">{text}</p>
  </div>
);

export const StatTile = ({ to, icon: Icon, tone, label, children, caption }) => (
  <motion.div variants={rise} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
    <Link
      to={to}
      className={`group relative block h-full overflow-hidden border rounded-[var(--border-radius-card)] p-4 sm:p-5 hover:shadow-[var(--shadow-hover)] transition-shadow ${TONES[tone].card}`}
    >
      <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/40 pointer-events-none" />
      <div className="relative flex items-start justify-between mb-3 sm:mb-4">
        <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-[var(--shadow-sm)] ${TONES[tone].chip}`}>
          <Icon size={20} />
        </span>
        <ChevronRight size={18} className="text-[var(--text-tertiary)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </div>
      <div className="relative text-[13px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="relative text-[22px] sm:text-[28px] font-bold leading-tight tracking-tight text-[var(--text-primary)] mt-0.5">{children}</div>
      <div className="relative mt-2 text-[12px] text-[var(--text-secondary)]">{caption}</div>
    </Link>
  </motion.div>
);

// Two-option pill switch used inside cards
export const MiniTabs = ({ value, onChange, options, id }) => (
  <div className="flex gap-0.5 p-0.5 rounded-lg bg-mint-50" role="tablist">
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.value)}
          className={`relative h-7 px-2.5 rounded-md text-[12px] border-none bg-transparent cursor-pointer whitespace-nowrap ${
            active ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-tertiary)] font-medium hover:text-[var(--text-primary)]'
          }`}
        >
          {active && (
            <motion.span layoutId={`mini-tab-${id}`} className="absolute inset-0 rounded-md bg-white shadow-[var(--shadow-sm)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
          )}
          <span className="relative">{opt.label}{opt.count != null ? ` · ${opt.count}` : ''}</span>
        </button>
      );
    })}
  </div>
);
