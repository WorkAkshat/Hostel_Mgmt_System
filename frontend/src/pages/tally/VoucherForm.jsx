import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, ShieldAlert } from 'lucide-react';
import { accounting as accountingApi } from '../../utils/api';
import { Field } from '../../components/ui/FormField';
import { useToast } from '../../components/ui/Toast';
import { todayIso } from '../../utils/format';
import { GROUP_LABELS, VOUCHER_TYPES, inr, panel } from './tallyUtils';

// Sensible debit / credit defaults for each voucher type
const DEFAULTS = {
  RECEIPT: { debitHeadCode: 'ASSET-BANK', creditHeadCode: 'REV-HOSTEL' },
  PAYMENT: { debitHeadCode: 'EXP-MAINT', creditHeadCode: 'ASSET-BANK' },
  JOURNAL: { debitHeadCode: 'EXP-OTHERS', creditHeadCode: 'LIAB-VENDOR-PAYABLE' },
  CONTRA: { debitHeadCode: 'ASSET-BANK', creditHeadCode: 'ASSET-CASH' },
};
const EMPTY = { voucherType: 'RECEIPT', amount: '', narration: '', date: todayIso(), ...DEFAULTS.RECEIPT };

const HeadSelect = ({ id, value, onChange, heads }) => {
  const groups = Object.entries(heads.reduce((acc, h) => ({ ...acc, [h.group]: [...(acc[h.group] || []), h] }), {}));
  return (
    <select id={id} className="form-input cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)}>
      {groups.map(([group, list]) => (
        <optgroup key={group} label={GROUP_LABELS[group] || group}>
          {list.map((h) => <option key={h.code} value={h.code}>{h.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
};

// Manual double-entry voucher for anything the quick forms do not cover.
const VoucherForm = ({ heads, floor, onPosted }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(null); };
  const nameOf = (code) => heads.find((h) => h.code === code)?.name || code;

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) return setError('Enter an amount above zero.');
    if (form.debitHeadCode === form.creditHeadCode) return setError('Debit and credit accounts must be different.');
    if (form.narration.trim().length < 3) return setError('Write a narration so the entry can be understood later.');
    setSaving(true);
    try {
      const res = await accountingApi.createVoucher({ ...form, amount: Number(form.amount), narration: form.narration.trim(), floorNumber: floor === 'combined' ? null : floor });
      toast.success('Voucher posted', `${res.voucherNo} · ${inr(form.amount)}`);
      setForm((f) => ({ ...EMPTY, voucherType: f.voucherType, date: f.date, ...DEFAULTS[f.voucherType] }));
      onPosted();
    } catch (err) {
      setError(err.message || 'Could not post the voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={`${panel} p-5 flex flex-col gap-5 max-w-3xl`}>
      <div>
        <h2 className="text-[16px] font-bold m-0">Post a voucher</h2>
        <p className="text-[13px] text-[var(--text-secondary)] m-0">Fee receipts sync automatically — use this for anything else.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Voucher type">
        {VOUCHER_TYPES.map((t) => {
          const active = form.voucherType === t.value;
          return (
            <button
              type="button"
              key={t.value}
              role="radio"
              aria-checked={active}
              onClick={() => setForm((f) => ({ ...f, voucherType: t.value, ...DEFAULTS[t.value] }))}
              className={`relative p-3 rounded-xl border text-left cursor-pointer transition-colors ${active ? 'border-transparent' : 'border-[var(--border-color)] bg-white hover:border-[var(--border-strong)]'}`}
            >
              {active && <motion.span layoutId="voucher-type" className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className={`relative block text-[14px] font-semibold ${active ? 'text-sun-900' : ''}`}>{t.label}</span>
              <span className={`relative block text-[11px] ${active ? 'text-sun-900/80' : 'text-[var(--text-tertiary)]'}`}>{t.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:items-end">
        <Field label="Debit (Dr) — receives value" htmlFor="v-dr">
          <HeadSelect id="v-dr" value={form.debitHeadCode} onChange={(v) => set('debitHeadCode', v)} heads={heads} />
        </Field>
        <ArrowRight size={18} className="hidden sm:block mb-3 text-[var(--text-tertiary)] rotate-180" aria-hidden="true" />
        <Field label="Credit (Cr) — gives value" htmlFor="v-cr">
          <HeadSelect id="v-cr" value={form.creditHeadCode} onChange={(v) => set('creditHeadCode', v)} heads={heads} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Amount (₹)" required htmlFor="v-amt">
          <input id="v-amt" className="form-input text-[16px] font-bold" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, '').slice(0, 10))} placeholder="14000" />
        </Field>
        <Field label="Date" required htmlFor="v-date">
          <input id="v-date" type="date" className="form-input" value={form.date} max={todayIso()} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>
      <Field label="Narration" required htmlFor="v-note">
        <textarea id="v-note" rows={2} className="form-input resize-none py-2.5" value={form.narration} onChange={(e) => set('narration', e.target.value.slice(0, 240))} placeholder="e.g. Security deposit received from Sneha Patel, Room 204" />
      </Field>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
          <ShieldAlert size={16} className="shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
        <span className="text-[12px] text-[var(--text-tertiary)]">{nameOf(form.debitHeadCode)} Dr {form.amount ? inr(form.amount) : ''} · {nameOf(form.creditHeadCode)} Cr</span>
        <button type="submit" className="btn-primary" disabled={saving}><Plus size={16} /> {saving ? 'Posting…' : 'Post voucher'}</button>
      </div>
    </form>
  );
};

export default VoucherForm;
