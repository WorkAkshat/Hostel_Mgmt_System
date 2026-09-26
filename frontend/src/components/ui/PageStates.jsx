import { RefreshCw, TriangleAlert, X, Search } from 'lucide-react';

// Friendly "nothing here" block
export const EmptyPanel = ({ icon: Icon, title, text, action, tone = 'mint' }) => (
  <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-10 sm:p-12 flex flex-col items-center text-center gap-2.5">
    {Icon && (
      <span className={`w-14 h-14 rounded-full flex items-center justify-center ${tone === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-mint-100 text-brand-600'}`}>
        <Icon size={24} />
      </span>
    )}
    {title && <h3 className="text-[16px] font-bold m-0">{title}</h3>}
    {text && <p className="text-[14px] text-[var(--text-secondary)] m-0 max-w-sm">{text}</p>}
    {action && <div className="mt-1">{action}</div>}
  </div>
);

// Load failure with a retry button
export const ErrorPanel = ({ message, onRetry }) => (
  <div role="alert" className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
    <TriangleAlert size={17} className="shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button onClick={onRetry} className="flex items-center gap-1 font-semibold bg-transparent border-none cursor-pointer text-[var(--danger)]">
        <RefreshCw size={14} /> Retry
      </button>
    )}
  </div>
);

export const SkeletonList = ({ count = 4, height = 120, columns = 'grid-cols-1 xl:grid-cols-2' }) => (
  <div className={`grid ${columns} gap-4`} aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-[var(--border-radius-card)] skeleton-loading" style={{ height }} />
    ))}
  </div>
);

// Search input with icon and clear button
export const SearchBox = ({ value, onChange, placeholder, className = '' }) => (
  <label className={`relative block ${className}`}>
    <span className="sr-only">{placeholder}</span>
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
    <input className="form-input pl-10 pr-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:bg-mint-50"
      >
        <X size={14} />
      </button>
    )}
  </label>
);

// Title + subtitle + actions row used at the top of pages
export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);
