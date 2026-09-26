// Label + control + hint/error, laid out for the two-column `.form-grid`.
export const Field = ({ label, required, hint, error, full, htmlFor, children }) => (
  <div className={`flex flex-col gap-1.5 min-w-0 ${full ? 'md:col-span-2' : ''}`}>
    {label && (
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[var(--text-secondary)]">
        {label}{required && <span className="text-[var(--danger)]"> *</span>}
      </label>
    )}
    {children}
    {error ? (
      <span className="text-[12px] text-[var(--danger)]">{error}</span>
    ) : hint ? (
      <span className="text-[12px] text-[var(--text-tertiary)]">{hint}</span>
    ) : null}
  </div>
);

// Section heading inside long forms
export const FormSection = ({ title, children }) => (
  <fieldset className="border-none p-0 m-0 min-w-0">
    <legend className="text-[12px] font-bold text-brand-700 tracking-wide mb-3 p-0">{title}</legend>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </fieldset>
);

export const digitsOnly = (value, max) => value.replace(/\D/g, '').slice(0, max);
