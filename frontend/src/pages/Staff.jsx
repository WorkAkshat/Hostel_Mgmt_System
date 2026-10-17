import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChefHat, Eye, EyeOff, Mail, Pencil, Phone, Shield, ShieldAlert, ShieldCheck, Sparkles, Trash2, UserPlus, Users, Wrench } from 'lucide-react';
import { staff as staffApi } from '../utils/api';
import CustomModal from '../components/CustomModal';
import Avatar from '../components/ui/Avatar';
import FilterChips from '../components/ui/FilterChips';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, digitsOnly } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../components/ui/PageStates';
import { STAFF_DEPARTMENTS } from '../config/hostel';

const DEPT_META = {
  Warden: { icon: ShieldCheck, tone: 'mint', chip: 'bg-mint-100 text-brand-700' },
  Mess: { icon: ChefHat, tone: 'peach', chip: 'bg-peach-50 text-peach-700' },
  Security: { icon: Shield, tone: 'lilac', chip: 'bg-lilac-50 text-lilac-700' },
  Cleaning: { icon: Sparkles, tone: 'sun', chip: 'bg-cream-100 text-sun-800' },
  Maintenance: { icon: Wrench, tone: 'mint', chip: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' },
};
const deptLabel = (value) => STAFF_DEPARTMENTS.find((d) => d.value === value)?.label || value;
const metaFor = (dept) => DEPT_META[dept] || DEPT_META.Maintenance;

const EMPTY = { name: '', email: '', password: '', department: 'Security', designation: '', phoneNumber: '' };

const StaffFormModal = ({ open, member, onClose, onSubmit }) => {
  const isEdit = Boolean(member);
  const [form, setForm] = useState(EMPTY);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowPw(false);
    setForm(member
      ? { ...EMPTY, name: member.user?.name || '', email: member.user?.email || '', department: member.department, designation: member.designation, phoneNumber: String(member.phoneNumber || '').replace(/\D/g, '').slice(-10) }
      : EMPTY);
  }, [open, member]);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Enter the full name.');
    if (!isEdit && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email — it is their login ID.');
    if (!isEdit && form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (!form.designation.trim()) return setError('Enter their role, e.g. Night guard.');
    if (form.phoneNumber.length !== 10) return setError('Phone number must be 10 digits.');
    setSaving(true);
    try {
      const data = { name: form.name.trim(), department: form.department, designation: form.designation.trim(), phoneNumber: form.phoneNumber };
      await onSubmit(isEdit ? data : { ...data, email: form.email.trim().toLowerCase(), password: form.password });
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title={isEdit ? `Edit ${member?.user?.name}` : 'Add a staff member'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold mb-2 p-0">Department</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STAFF_DEPARTMENTS.map((d) => {
              const Icon = metaFor(d.value).icon;
              const active = form.department === d.value;
              return (
                <button
                  type="button"
                  key={d.value}
                  aria-pressed={active}
                  onClick={() => set('department', d.value)}
                  className={`relative h-11 px-3 rounded-xl border flex items-center gap-2 text-[13px] cursor-pointer transition-colors ${active ? 'border-transparent text-sun-900 font-semibold' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
                >
                  {active && <motion.span layoutId="staff-dept" className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={15} className="relative shrink-0" />
                  <span className="relative truncate">{d.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required htmlFor="sf-name">
            <input id="sf-name" className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
          </Field>
          <Field label="Role" required htmlFor="sf-role" hint="e.g. Night guard, Cook, Electrician">
            <input id="sf-role" className="form-input" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
          </Field>
          <Field label="Phone" required htmlFor="sf-phone">
            <input id="sf-phone" className="form-input" inputMode="numeric" value={form.phoneNumber} onChange={(e) => set('phoneNumber', digitsOnly(e.target.value, 10))} placeholder="10-digit mobile" />
          </Field>
          {isEdit ? (
            <Field label="Login email" htmlFor="sf-email" hint="The login ID cannot be changed">
              <input id="sf-email" className="form-input" value={form.email} disabled />
            </Field>
          ) : (
            <Field label="Login email" required htmlFor="sf-email">
              <input id="sf-email" type="email" className="form-input" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
          )}
          {!isEdit && (
            <Field label="Password" required htmlFor="sf-pw" hint="At least 8 characters. Share it with them privately." full>
              <div className="relative">
                <input id="sf-pw" type={showPw ? 'text' : 'password'} className="form-input pr-11" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:bg-mint-50">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          )}
        </div>
        {!isEdit && <p className="text-[12px] text-[var(--text-tertiary)] m-0 -mt-1">Staff can sign in to log visitors and gate passes. They cannot see fees or student records.</p>}

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{isEdit ? <Pencil size={15} /> : <UserPlus size={16} />} {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

const Staff = () => {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dept, setDept] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setStaff((await staffApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load the staff list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => staff.reduce((c, m) => ({ ...c, [m.department]: (c[m.department] || 0) + 1 }), {}), [staff]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((m) => dept === 'all' || m.department === dept)
      .filter((m) => !q || [m.user?.name, m.designation, m.phoneNumber, m.user?.email].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [staff, dept, search]);

  const save = async (data) => {
    if (editing) {
      const updated = await staffApi.update(editing.id, data);
      setStaff((list) => list.map((m) => (m.id === editing.id ? { ...m, ...updated } : m)));
      toast.success('Saved', `${data.name}'s details are updated.`);
    } else {
      await staffApi.create(data);
      toast.success('Staff added', `${data.name} can now sign in with ${data.email}.`);
      load();
    }
    setEditing(undefined);
  };

  const remove = async () => {
    try {
      await staffApi.remove(removing.id);
      setStaff((list) => list.filter((m) => m.id !== removing.id));
      toast.success('Removed', `${removing.user?.name} can no longer sign in.`);
    } catch (err) {
      toast.error('Could not remove', err.message);
      throw err;
    }
  };

  const options = [
    { value: 'all', label: 'Everyone', count: staff.length },
    ...STAFF_DEPARTMENTS.filter((d) => counts[d.value]).map((d) => ({ value: d.value, label: d.label, count: counts[d.value] })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Staff" subtitle={loading ? 'Loading…' : `${staff.length} people · ${Object.keys(counts).length} departments`}>
        <button className="btn-primary" onClick={() => setEditing(null)}><UserPlus size={17} /> Add staff</button>
      </PageHeader>

      {error && <ErrorPanel message={error} onRetry={() => { setLoading(true); load(); }} />}

      {staff.length > 0 && (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
          <SearchBox value={search} onChange={setSearch} placeholder="Search by name, role or phone" />
          <FilterChips id="staff-dept" value={dept} onChange={setDept} options={options} />
        </div>
      )}

      {loading ? (
        <SkeletonList count={6} height={190} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
      ) : shown.length === 0 ? (
        <EmptyPanel
          icon={Users}
          title={staff.length ? 'Nobody matches' : 'No staff added yet'}
          text={staff.length ? 'Try another name or department.' : 'Add guards, cooks and cleaners so they can log visitors and gate passes.'}
          action={!staff.length && <button className="btn-primary" onClick={() => setEditing(null)}><UserPlus size={16} /> Add staff</button>}
        />
      ) : (
        <motion.ul layout className="list-none m-0 p-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {shown.map((m, i) => {
              const meta = metaFor(m.department);
              const Icon = meta.icon;
              return (
                <motion.li
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 9) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4 hover:shadow-[var(--shadow-hover)] transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={m.user?.name} src={m.user?.avatar} size={48} tone={meta.tone} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold m-0 truncate">{m.user?.name}</h3>
                      <p className="text-[13px] text-[var(--text-secondary)] m-0 truncate">{m.designation}</p>
                      <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.chip}`}>
                        <Icon size={11} /> {deptLabel(m.department)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-[13px]">
                    <a href={`tel:${m.phoneNumber}`} className="flex items-center gap-2 text-[var(--text-primary)] hover:text-brand-700 no-underline">
                      <Phone size={14} className="text-[var(--text-tertiary)]" /> {m.phoneNumber}
                    </a>
                    <a href={`mailto:${m.user?.email}`} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-brand-700 no-underline min-w-0">
                      <Mail size={14} className="text-[var(--text-tertiary)] shrink-0" /> <span className="truncate">{m.user?.email}</span>
                    </a>
                  </div>
                  <div className="flex gap-2 mt-auto pt-3 border-t border-[var(--border-color)]">
                    <a href={`tel:${m.phoneNumber}`} className="btn-brand h-9 px-3 text-[13px] flex-1 no-underline"><Phone size={14} /> Call</a>
                    <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => setEditing(m)} aria-label={`Edit ${m.user?.name}`}><Pencil size={14} /></button>
                    <button className="btn-secondary h-9 px-3 text-[13px] hover:!text-[var(--danger)] hover:!border-[var(--danger)]" onClick={() => setRemoving(m)} aria-label={`Remove ${m.user?.name}`}><Trash2 size={14} /></button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      <StaffFormModal open={editing !== undefined} member={editing} onClose={() => setEditing(undefined)} onSubmit={save} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.user?.name}?`}
        message="Their login stops working immediately. This cannot be undone — you would have to add them again."
        confirmLabel="Remove"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
};

export default Staff;
