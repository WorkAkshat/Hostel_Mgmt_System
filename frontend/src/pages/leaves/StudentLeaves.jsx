import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Home, Moon, ShieldAlert, Siren, Send } from 'lucide-react';
import { leaves as leavesApi } from '../../utils/api';
import { useToast } from '../../components/ui/Toast';
import { Field } from '../../components/ui/FormField';
import { EmptyPanel, ErrorPanel, PageHeader, SkeletonList } from '../../components/ui/PageStates';
import { LEAVE_STATUS, LEAVE_TYPES } from '../../config/hostel';
import { daysSpan, fmtDateTime, plural, toLocalInput } from '../../utils/format';

const TYPES = [
  { value: 'NIGHT_OUT', icon: Moon, label: 'Night out', hint: 'Staying out locally' },
  { value: 'OUT_OF_STATION', icon: Home, label: 'Going home', hint: 'Out of the city' },
  { value: 'EMERGENCY', icon: Siren, label: 'Emergency', hint: 'Urgent family matter' },
];

const STEPS = ['Applied', 'Approved', 'Left', 'Back'];
const stepIndex = { PENDING: 0, APPROVED: 1, CHECKED_OUT: 2, RETURNED: 3 };

const Stepper = ({ status }) => {
  if (status === 'REJECTED') return null;
  const current = stepIndex[status] ?? 0;
  return (
    <ol className="list-none m-0 p-0 flex items-center gap-1" aria-label="Leave progress">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-1 flex-1 last:flex-none">
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${i <= current ? 'text-brand-700' : 'text-[var(--text-tertiary)]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center ${i <= current ? 'bg-brand-600 text-white' : 'bg-mint-100'}`}>
              {i < current ? <Check size={11} /> : <span className="text-[10px]">{i + 1}</span>}
            </span>
            {step}
          </span>
          {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 rounded ${i < current ? 'bg-brand-500' : 'bg-mint-100'}`} />}
        </li>
      ))}
    </ol>
  );
};

const emptyForm = () => ({ type: 'NIGHT_OUT', startDate: '', endDate: '', reason: '' });

const StudentLeaves = () => {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = (await leavesApi.getMyLeaves()) || [];
      setLeaves([...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(err.message || 'Could not load your leaves.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setFormError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return setFormError('Choose when you leave and when you will be back.');
    if (new Date(form.endDate) <= new Date(form.startDate)) return setFormError('Return time must be after the leaving time.');
    if (form.type !== 'EMERGENCY' && new Date(form.startDate) < new Date(Date.now() - 60 * 60000)) return setFormError('Leaving time cannot be in the past.');
    if (form.reason.trim().length < 5) return setFormError('Please write a short reason.');
    setSaving(true);
    try {
      await leavesApi.create({
        ...form,
        reason: form.reason.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      toast.success('Leave request sent', 'The warden will review it. You will get a notification.');
      setForm(emptyForm());
      load();
    } catch (err) {
      setFormError(err.message || 'Could not send the request.');
    } finally {
      setSaving(false);
    }
  };

  const active = leaves.find((l) => l.status === 'CHECKED_OUT' || l.status === 'APPROVED' || l.status === 'PENDING');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Leaves" subtitle="Ask the warden before going out, and track your requests here." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-5 items-start">
        {/* Apply */}
        <form onSubmit={submit} noValidate className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-5">
          <h2 className="text-[16px] font-bold m-0">Apply for leave</h2>

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Leave type">
            {TYPES.map(({ value, icon: Icon, label, hint }) => {
              const on = form.type === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('type', value)}
                  className={`relative text-left p-3 rounded-xl border cursor-pointer transition-colors ${on ? 'border-sun-400 bg-cream-100' : 'border-[var(--border-color)] bg-white hover:border-[var(--border-strong)]'}`}
                >
                  {on && <motion.span layoutId="leave-type" className="absolute inset-0 rounded-xl ring-2 ring-sun-400" />}
                  <Icon size={18} className={on ? 'text-sun-800' : 'text-[var(--text-tertiary)]'} />
                  <span className="block text-[13px] font-semibold mt-1.5">{label}</span>
                  <span className="block text-[11px] text-[var(--text-tertiary)] leading-snug">{hint}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Leaving on" required htmlFor="lv-start">
              <input id="lv-start" type="datetime-local" className="form-input" value={form.startDate} min={form.type === 'EMERGENCY' ? undefined : toLocalInput(Date.now())} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field label="Back by" required htmlFor="lv-end">
              <input id="lv-end" type="datetime-local" className="form-input" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
            </Field>
          </div>
          {form.startDate && form.endDate && new Date(form.endDate) > new Date(form.startDate) && (
            <p className="text-[13px] text-brand-700 -mt-2 m-0">{plural(daysSpan(form.startDate, form.endDate), 'day')} away</p>
          )}

          <Field label="Reason" required htmlFor="lv-reason" hint="Where you are going and why — the warden reads this">
            <textarea id="lv-reason" className="form-input h-24 py-2.5 resize-y" value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Going home to Jaipur for my sister's wedding" />
          </Field>

          {formError && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
              <ShieldAlert size={16} className="shrink-0" /> {formError}
            </div>
          )}

          <button type="submit" className="btn-primary h-12" disabled={saving}>
            <Send size={16} /> {saving ? 'Sending…' : 'Send to warden'}
          </button>
          <p className="text-[12px] text-[var(--text-tertiary)] m-0 -mt-2">Your parents are informed when the leave is approved and when you leave the gate.</p>
        </form>

        {/* History */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold m-0">My leaves</h2>
          {error && <ErrorPanel message={error} onRetry={load} />}
          {loading ? (
            <SkeletonList count={3} height={150} columns="grid-cols-1" />
          ) : leaves.length === 0 ? (
            <EmptyPanel icon={Moon} title="No leaves yet" text="Requests you send will appear here with their status." />
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {leaves.map((l, i) => {
                  const status = LEAVE_STATUS[l.status] || LEAVE_STATUS.PENDING;
                  return (
                    <motion.li
                      key={l.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }}
                      className={`bg-white border rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3 ${l === active ? 'border-sun-300' : 'border-[var(--border-color)]'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-bold">{LEAVE_TYPES[l.type] || l.type}</span>
                        <span className={`badge ${status.badge} normal-case`}>{status.label}</span>
                      </div>
                      <p className="text-[13px] m-0">
                        <strong>{fmtDateTime(l.startDate)}</strong> → <strong>{fmtDateTime(l.endDate)}</strong>
                        <span className="text-[var(--text-tertiary)]"> · {plural(daysSpan(l.startDate, l.endDate), 'day')}</span>
                      </p>
                      <p className="text-[13px] text-[var(--text-secondary)] m-0">“{l.reason}”</p>
                      <Stepper status={l.status} />
                      {l.comments && (
                        <p className={`text-[13px] m-0 px-3 py-2 rounded-lg ${l.status === 'REJECTED' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-mint-50 text-brand-800'}`}>
                          Warden: {l.comments}
                        </p>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentLeaves;
