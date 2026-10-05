import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Landmark, Plus, ShieldAlert } from 'lucide-react';
import { accounting as accountingApi } from '../../utils/api';
import { Field } from '../../components/ui/FormField';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../utils/format';
import { EXPENSE_CATEGORIES, inr, panel, shortDate } from './tallyUtils';

const EMPTY = { category: 'EXP-CLEANING', amount: '', narration: '', paymentMode: 'ASSET-CASH', date: todayIso() };

// Quick entry for everyday hostel spending, posted as a PAYMENT voucher.
const DailyExpense = ({ floor, daybook, onPosted }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setError(null), [form.amount, form.narration]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const cat = EXPENSE_CATEGORIES.find((c) => c.code === form.category);

  // Recent spending straight from the day book
  const recent = useMemo(() => (daybook || []).filter((v) => v.voucherType === 'PAYMENT').slice(0, 8), [daybook]);
  const monthSpend = useMemo(() => {
    const now = new Date();
    return (daybook || [])
      .filter((v) => v.voucherType === 'PAYMENT' && new Date(v.date).getMonth() === now.getMonth() && new Date(v.date).getFullYear() === now.getFullYear())
      .reduce((s, v) => s + (Number(v.debitAmount) || 0), 0);
  }, [daybook]);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) return setError('Enter the amount spent.');
    if (form.narration.trim().length < 3) return setError('Write what it was for, e.g. “Floor cleaner and brooms”.');
    setSaving(true);
    try {
      const res = await accountingApi.createVoucher({
        voucherType: 'PAYMENT',
        amount: Number(form.amount),
        narration: form.narration.trim(),
        date: form.date,
        debitHeadCode: form.category,
        creditHeadCode: form.paymentMode,
        floorNumber: floor === 'combined' ? null : floor,
      });
      toast.success('Expense recorded', `${res.voucherNo} · ${inr(form.amount)} for ${cat?.label}`);
      setForm((f) => ({ ...EMPTY, date: f.date, paymentMode: f.paymentMode }));
      onPosted();
    } catch (err) {
      setError(err.message || 'Could not record the expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
      <form onSubmit={submit} noValidate className={`${panel} p-5 flex flex-col gap-5`}>
        <div>
          <h2 className="text-[16px] font-bold m-0">Record an expense</h2>
          <p className="text-[13px] text-[var(--text-secondary)] m-0">Anything paid out today — supplies, repairs, salaries.</p>
        </div>

        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold mb-2 p-0">What was it for?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map(({ code, label, icon: Icon }) => {
              const active = form.category === code;
              return (
                <button
                  type="button"
                  key={code}
                  aria-pressed={active}
                  onClick={() => set('category', code)}
                  className={`relative h-11 px-3 rounded-xl border flex items-center gap-2 text-[13px] cursor-pointer transition-colors ${active ? 'border-transparent text-sun-900 font-semibold' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                >
                  {active && <motion.span layoutId="exp-cat" className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={15} className="relative shrink-0" />
                  <span className="relative truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Amount (₹)" required htmlFor="exp-amt">
            <input id="exp-amt" className="form-input text-[16px] font-bold" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, '').slice(0, 9))} placeholder="500" />
          </Field>
          <Field label="Date" required htmlFor="exp-date">
            <input id="exp-date" type="date" className="form-input" value={form.date} max={todayIso()} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <fieldset className="border-none p-0 m-0">
            <legend className="text-[13px] font-semibold mb-1.5 p-0">Paid from</legend>
            <div className="flex gap-1.5">
              {[{ code: 'ASSET-CASH', label: 'Cash', icon: Banknote }, { code: 'ASSET-BANK', label: 'Bank', icon: Landmark }].map(({ code, label, icon: Icon }) => (
                <button
                  type="button"
                  key={code}
                  aria-pressed={form.paymentMode === code}
                  onClick={() => set('paymentMode', code)}
                  className={`flex-1 h-11 rounded-xl border text-[13px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${form.paymentMode === code ? 'bg-brand-600 border-brand-600 text-white font-semibold' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <Field label="Details" required htmlFor="exp-note" hint="Who was paid and for what — this shows in the day book">
          <textarea id="exp-note" rows={2} className="form-input resize-none py-2.5" value={form.narration} onChange={(e) => set('narration', e.target.value.slice(0, 200))} placeholder="e.g. Brooms and floor cleaner from Sharma Stores" />
        </Field>

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
          <span className="text-[12px] text-[var(--text-tertiary)]">Posted as a payment voucher: {cat?.label} Dr · {form.paymentMode === 'ASSET-CASH' ? 'Cash' : 'Bank'} Cr</span>
          <button type="submit" className="btn-primary" disabled={saving}><Plus size={16} /> {saving ? 'Saving…' : 'Record expense'}</button>
        </div>
      </form>

      <aside className={`${panel} overflow-hidden`}>
        <div className="px-5 py-4 bg-cream-100 border-b border-sun-200">
          <span className="block text-[12px] text-[var(--text-secondary)]">Spent this month</span>
          <span className="block text-[24px] font-bold tracking-tight">{inr(monthSpend)}</span>
        </div>
        <h3 className="text-[13px] font-bold m-0 px-5 pt-4 pb-2">Recent expenses</h3>
        {recent.length === 0 ? (
          <p className="text-[13px] text-[var(--text-tertiary)] px-5 pb-5 m-0">Nothing recorded yet.</p>
        ) : (
          <ul className="list-none m-0 px-3 pb-3 flex flex-col">
            {recent.map((v, i) => (
              <motion.li key={`${v.id}-${i}`} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }} className="px-2 py-2.5 rounded-xl hover:bg-[var(--bg-primary)]">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-snug">{v.narration}</span>
                  <span className="text-[13px] font-bold whitespace-nowrap">{inr(v.debitAmount)}</span>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{v.debitHead} · {shortDate(v.date)} · {v.voucherNo}</div>
              </motion.li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
};

export default DailyExpense;
