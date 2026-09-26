import { motion } from 'framer-motion';

// Row of filter pills with counts; the yellow highlight slides between them.
const FilterChips = ({ options, value, onChange, id, className = '' }) => (
  <div role="tablist" className={`flex flex-wrap gap-1.5 ${className}`}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(opt.value)}
          className={`relative h-9 px-3.5 rounded-xl text-[13px] whitespace-nowrap border cursor-pointer transition-colors ${
            active
              ? 'border-transparent text-sun-900 font-semibold'
              : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] font-medium hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          {active && (
            <motion.span
              layoutId={`chips-${id}`}
              className="absolute inset-0 rounded-xl bg-sun-300"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {opt.label}
            {opt.count != null && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                active ? 'bg-white/60 text-sun-900' : 'bg-mint-100 text-brand-700'
              }`}>
                {opt.count}
              </span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

export default FilterChips;
