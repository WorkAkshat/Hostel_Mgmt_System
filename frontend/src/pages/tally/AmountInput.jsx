import { forwardRef } from 'react';

// Rupee amount box: a ₹ prefix inside the field and a plain-language placeholder,
// so an empty box never looks already filled in.
const AmountInput = forwardRef(({ id, value, onChange, invalid, max = 9 }, ref) => (
  <div className="relative">
    <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-bold pointer-events-none ${value ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>₹</span>
    <input
      ref={ref}
      id={id}
      className={`form-input pl-8 text-[16px] font-bold ${invalid ? '!border-[var(--danger)] !bg-[var(--danger-bg)]' : ''}`}
      inputMode="decimal"
      autoComplete="off"
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, max))}
      placeholder="Type amount"
    />
  </div>
));

AmountInput.displayName = 'AmountInput';

export default AmountInput;
