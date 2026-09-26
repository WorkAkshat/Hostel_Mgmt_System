import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CircleCheck } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import { Field } from '../../components/ui/FormField';
import { rupees, todayIso } from '../../utils/format';
import { PAYMENT_METHODS } from './financeUtils';

// Warden records money received against a bill (invoice or demand note).
// bill: { title, subtitle, amount }
const RecordPaymentModal = ({ open, bill, onClose, onSubmit }) => {
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMethod('CASH');
    setReference('');
    setPaidOn(todayIso());
    setError(null);
  }, [open]);

  const meta = PAYMENT_METHODS.find((m) => m.value === method);

  const submit = async (e) => {
    e.preventDefault();
    if (method !== 'CASH' && !reference.trim()) return setError(`Enter the ${meta.refLabel.toLowerCase()} so the payment can be traced later.`);
    if (!paidOn) return setError('Choose the date the money was received.');
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ method, reference: reference.trim(), paidOn });
    } catch (err) {
      setError(err.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="Record a payment">
      {bill && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-cream-100 border border-sun-200 mb-5">
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold truncate">{bill.title}</div>
            {bill.subtitle && <div className="text-[12px] text-[var(--text-secondary)] truncate">{bill.subtitle}</div>}
          </div>
          <div className="text-[22px] font-extrabold tracking-tight">{rupees(bill.amount)}</div>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-5">
          <ShieldAlert size={17} className="shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">How was it paid?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup">
            {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => {
              const active = method === value;
              return (
                <button
                  type="button"
                  key={value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethod(value)}
                  className={`relative h-[68px] rounded-xl border flex flex-col items-center justify-center gap-1 text-[13px] font-semibold cursor-pointer transition-colors ${
                    active ? 'border-sun-400 text-sun-900' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {active && <motion.span layoutId="pay-method" className="absolute inset-0 rounded-xl bg-sun-200" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={18} className="relative" />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={meta.refLabel} required={method !== 'CASH'} hint={meta.refHint} htmlFor="pay-ref">
            <input id="pay-ref" className="form-input" value={reference} onChange={(e) => setReference(e.target.value.slice(0, 40))} placeholder={method === 'CASH' ? 'e.g. 1043' : ''} />
          </Field>
          <Field label="Received on" required htmlFor="pay-date">
            <input id="pay-date" type="date" className="form-input" value={paidOn} max={todayIso()} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <CircleCheck size={16} /> {saving ? 'Saving…' : 'Mark as paid'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default RecordPaymentModal;
