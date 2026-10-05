import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Send, ShieldAlert, Wrench } from 'lucide-react';
import { complaints as complaintsApi } from '../../utils/api';
import { useToast } from '../../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SkeletonList } from '../../components/ui/PageStates';
import { COMPLAINT_STATUS, PRIORITIES } from '../../config/hostel';
import { timeAgo } from '../../utils/format';
import { COMPLAINT_CATEGORIES, categoryMeta } from './complaintMeta';
import useLiveRefresh from '../../hooks/useLiveRefresh';

const STEPS = ['Raised', 'Being fixed', 'Resolved'];
const stepOf = { PENDING: 0, IN_PROGRESS: 1, RESOLVED: 2 };

const emptyForm = { category: '', priority: 'MEDIUM', description: '' };

const StudentComplaints = () => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = (await complaintsApi.getMyComplaints()) || [];
      setItems([...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      setError(err.message || 'Could not load your complaints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setFormError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) return setFormError('Choose what the problem is about.');
    if (form.description.trim().length < 10) return setFormError('Describe the problem in a sentence or two.');
    setSaving(true);
    try {
      await complaintsApi.create({ ...form, description: form.description.trim() });
      toast.success('Complaint sent', 'The warden office will look into it.');
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not send the complaint.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Complaints" subtitle="Something broken or not working? Tell the warden office here." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-5 items-start">
        <form onSubmit={submit} noValidate className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-5">
          <h2 className="text-[16px] font-bold m-0">Raise a complaint</h2>

          <fieldset className="border-none p-0 m-0">
            <legend className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 p-0">What is it about?</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {COMPLAINT_CATEGORIES.map(({ value, label, icon: Icon }) => {
                const on = form.category === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('category', value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-[12px] font-semibold cursor-pointer transition-colors ${on ? 'border-sun-400 bg-cream-100 text-sun-900' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                  >
                    <Icon size={19} className={on ? 'text-sun-800' : 'text-brand-500'} />
                    <span className="text-center leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border-none p-0 m-0">
            <legend className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 p-0">How urgent?</legend>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg-primary)]" role="radiogroup">
              {Object.entries(PRIORITIES).map(([value, { label }]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={form.priority === value}
                  onClick={() => set('priority', value)}
                  className={`relative h-9 rounded-lg text-[13px] border-none cursor-pointer ${form.priority === value ? 'text-sun-900 font-semibold' : 'bg-transparent text-[var(--text-secondary)]'}`}
                >
                  {form.priority === value && <motion.span layoutId="complaint-priority" className="absolute inset-0 rounded-lg bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">Describe the problem <span className="text-[var(--danger)]">*</span></span>
            <textarea className="form-input h-28 py-2.5 resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. The fan in my room makes a loud noise and stops after a few minutes." />
          </label>

          {formError && (
            <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
              <ShieldAlert size={16} className="shrink-0" /> {formError}
            </div>
          )}

          <button type="submit" className="btn-primary h-12" disabled={saving}><Send size={16} /> {saving ? 'Sending…' : 'Send complaint'}</button>
        </form>

        <section className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold m-0">My complaints</h2>
          {error && <ErrorPanel message={error} onRetry={load} />}
          {loading ? (
            <SkeletonList count={3} height={140} columns="grid-cols-1" />
          ) : items.length === 0 ? (
            <EmptyPanel icon={Wrench} title="No complaints yet" text="Anything you report will be tracked here until it is fixed." />
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {items.map((c, i) => {
                  const meta = categoryMeta(c.category);
                  const Icon = meta.icon;
                  const step = stepOf[c.status] ?? 0;
                  return (
                    <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }} className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-peach-50 text-peach-700 flex items-center justify-center shrink-0"><Icon size={17} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-bold">{meta.label}</span>
                          <span className="block text-[12px] text-[var(--text-tertiary)]">Raised {timeAgo(c.createdAt)} · {PRIORITIES[c.priority]?.label || c.priority} priority</span>
                        </span>
                        <span className={`badge normal-case ${COMPLAINT_STATUS[c.status]?.badge}`}>{COMPLAINT_STATUS[c.status]?.label}</span>
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)] m-0">{c.description}</p>
                      <ol className="list-none m-0 p-0 flex items-center gap-1" aria-label="Progress">
                        {STEPS.map((label, idx) => (
                          <li key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                            <span className={`flex items-center gap-1 text-[11px] font-semibold ${idx <= step ? 'text-brand-700' : 'text-[var(--text-tertiary)]'}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${idx <= step ? 'bg-brand-600 text-white' : 'bg-mint-100'}`}>
                                {idx < step || c.status === 'RESOLVED' ? <Check size={11} /> : <span className="text-[10px]">{idx + 1}</span>}
                              </span>
                              {label}
                            </span>
                            {idx < STEPS.length - 1 && <span className={`flex-1 h-0.5 rounded ${idx < step ? 'bg-brand-500' : 'bg-mint-100'}`} />}
                          </li>
                        ))}
                      </ol>
                      {c.wardenNotes && <p className="text-[13px] m-0 px-3 py-2 rounded-lg bg-mint-50 text-brand-800">Warden: {c.wardenNotes}</p>}
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

export default StudentComplaints;
