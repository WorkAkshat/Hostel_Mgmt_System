import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DoorClosed, DoorOpen, LogOut, Phone, RefreshCw, ShieldAlert, Timer, UserPlus } from 'lucide-react';
import { visitors as visitorsApi, students as studentsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CustomModal from '../components/CustomModal';
import Avatar from '../components/ui/Avatar';
import FilterChips from '../components/ui/FilterChips';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field, digitsOnly } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../components/ui/PageStates';
import { duration, fmtDateTime, fmtTime } from '../utils/format';

const RELATIONS = ['Father', 'Mother', 'Brother', 'Sister', 'Guardian', 'Relative', 'Friend'];

const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();

const emptyForm = { studentRollNumber: '', name: '', phone: '', relationship: 'Father' };

// Check-in form. Wardens can pick the student by name; gate staff type the roll number.
const CheckInModal = ({ open, students, onClose, onSubmit }) => {
  const [form, setForm] = useState(emptyForm);
  const [studentQuery, setStudentQuery] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(emptyForm); setStudentQuery(''); setError(null); }
  }, [open]);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(null); };
  const picked = students?.find((s) => s.rollNumber === form.studentRollNumber);
  const matches = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!students || !q || picked) return [];
    return students.filter((s) => [s.user?.name, s.rollNumber, s.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q))).slice(0, 6);
  }, [students, studentQuery, picked]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentRollNumber.trim()) return setError('Choose which resident they are visiting.');
    if (form.name.trim().length < 2) return setError("Enter the visitor's name.");
    if (form.phone.length !== 10) return setError('Phone number must be 10 digits.');
    setSaving(true);
    try {
      await onSubmit({ ...form, name: form.name.trim(), studentRollNumber: form.studentRollNumber.trim().toUpperCase() });
    } catch (err) {
      setError(err.message || 'Could not check the visitor in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="Check in a visitor">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {students ? (
          <Field label="Visiting" required htmlFor="vs-student" hint={picked ? undefined : 'Type the resident’s name, roll no. or room'}>
            {picked ? (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-mint-50 border border-mint-200">
                <Avatar name={picked.user?.name} src={picked.user?.avatar || picked.profilePic} size={36} tone="white" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold truncate">{picked.user?.name}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)]">{picked.rollNumber}{picked.room ? ` · Room ${picked.room.roomNumber}` : ''}</span>
                </span>
                <button type="button" className="btn-secondary h-8 px-3 text-[12px]" onClick={() => { set('studentRollNumber', ''); setStudentQuery(''); }}>Change</button>
              </div>
            ) : (
              <div className="relative">
                <input id="vs-student" className="form-input" autoFocus autoComplete="off" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="e.g. Priya or 204" />
                {matches.length > 0 && (
                  <ul className="list-none m-0 p-1 absolute left-0 right-0 top-12 z-10 bg-white border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)]">
                    {matches.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => set('studentRollNumber', s.rollNumber)} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg bg-transparent border-none cursor-pointer text-left hover:bg-mint-50">
                          <Avatar name={s.user?.name} size={30} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate">{s.user?.name}</span>
                            <span className="block text-[12px] text-[var(--text-tertiary)]">{s.rollNumber}{s.room ? ` · Room ${s.room.roomNumber}` : ''}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
        ) : (
          <Field label="Resident's roll number" required htmlFor="vs-roll" hint="Printed on the resident's ID card">
            <input id="vs-roll" className="form-input uppercase" autoFocus value={form.studentRollNumber} onChange={(e) => set('studentRollNumber', e.target.value)} placeholder="HARIPUSHP_001" />
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Visitor's name" required htmlFor="vs-name">
            <input id="vs-name" className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Phone" required htmlFor="vs-phone">
            <input id="vs-phone" className="form-input" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', digitsOnly(e.target.value, 10))} placeholder="10-digit mobile" />
          </Field>
        </div>

        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 p-0">Relation to the resident</legend>
          <div className="flex flex-wrap gap-1.5">
            {RELATIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set('relationship', r)}
                aria-pressed={form.relationship === r}
                className={`h-9 px-3.5 rounded-xl text-[13px] border cursor-pointer transition-colors ${form.relationship === r ? 'bg-sun-300 border-transparent text-sun-900 font-semibold' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}><DoorOpen size={16} /> {saving ? 'Saving…' : 'Check in'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

const Visitors = () => {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('inside');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [leaving, setLeaving] = useState(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      setVisitors((await visitorsApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load visitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Wardens can search residents by name; gate staff use roll numbers
    if (user.role === 'ADMIN') studentsApi.getAll().then(setStudents).catch(() => setStudents(null));
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [load, user.role]);

  useEffect(() => {
    if (location.state?.action === 'add') {
      setFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const q = search.trim().toLowerCase();
  const matches = (v) => !q || [v.name, v.phone, v.relationship, v.student?.user?.name, v.student?.rollNumber, v.student?.room?.roomNumber].some((x) => x && String(x).toLowerCase().includes(q));
  const inside = visitors.filter((v) => !v.checkOutTime);
  const today = visitors.filter((v) => isToday(v.checkInTime));
  const lists = { inside, today, all: visitors };
  const visible = (lists[tab] || visitors).filter(matches).sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));

  const checkIn = async (data) => {
    await visitorsApi.create(data);
    toast.success(`${data.name} checked in`, 'Remember to check them out when they leave.');
    setFormOpen(false);
    setTab('inside');
    await load();
  };

  const checkOut = async () => {
    try {
      await visitorsApi.checkOut(leaving.id);
      toast.success(`${leaving.name} checked out`, `Stayed ${duration(leaving.checkInTime)}.`);
      await load();
    } catch (err) {
      toast.error('Could not check out', err.message);
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Visitors" subtitle={`${inside.length} inside right now · ${today.length} came today`}>
        <button className="btn-secondary h-11" onClick={() => { setLoading(true); load(); }} aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        <button className="btn-primary h-11" onClick={() => setFormOpen(true)}><UserPlus size={17} /> Check in visitor</button>
      </PageHeader>

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search visitor, phone, resident or room" />
        <FilterChips
          id="visitor-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'inside', label: 'Inside now', count: inside.length },
            { value: 'today', label: 'Today', count: today.length },
            { value: 'all', label: 'All visits', count: visitors.length },
          ]}
        />
      </div>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList height={150} columns="grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3" />
      ) : visible.length === 0 ? (
        <EmptyPanel
          icon={tab === 'inside' ? DoorClosed : DoorOpen}
          tone={tab === 'inside' ? 'success' : 'mint'}
          title={tab === 'inside' ? 'No visitors inside' : 'No visits here'}
          text={q ? 'Try a different search.' : 'Checked-in visitors will show up here.'}
        />
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {visible.map((v, i) => {
              const inNow = !v.checkOutTime;
              return (
                <motion.li
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 9) * 0.03 } }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={`rounded-[var(--border-radius-card)] border p-4 flex flex-col gap-3 ${inNow ? 'bg-white border-peach-200' : 'bg-white border-[var(--border-color)]'}`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={v.name} size={42} tone="peach" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-bold m-0 truncate">{v.name}</h3>
                        <span className={`badge normal-case ${inNow ? 'bg-peach-100 text-peach-700' : 'badge-success'}`}>{inNow ? 'Inside' : 'Left'}</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-tertiary)] m-0">{v.relationship} of <strong className="text-[var(--text-secondary)]">{v.student?.user?.name || 'resident'}</strong>{v.student?.room ? ` · Room ${v.student.room.roomNumber}` : ''}</p>
                    </div>
                    {v.phone && (
                      <a href={`tel:${v.phone}`} className="w-9 h-9 rounded-xl bg-mint-50 text-brand-700 flex items-center justify-center shrink-0" aria-label={`Call ${v.name}`}><Phone size={15} /></a>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-primary)] px-3 py-2 text-[12px]">
                    <span>In <strong>{isToday(v.checkInTime) ? fmtTime(v.checkInTime) : fmtDateTime(v.checkInTime)}</strong></span>
                    {inNow ? (
                      <span className="flex items-center gap-1 font-semibold text-peach-700"><Timer size={13} /> {duration(v.checkInTime)} inside</span>
                    ) : (
                      <span>Out <strong>{fmtTime(v.checkOutTime)}</strong> · {duration(v.checkInTime, v.checkOutTime)}</span>
                    )}
                  </div>
                  {inNow && (
                    <button className="btn-secondary h-10" onClick={() => setLeaving(v)}><LogOut size={15} /> Check out</button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <CheckInModal open={formOpen} students={students} onClose={() => setFormOpen(false)} onSubmit={checkIn} />

      <ConfirmDialog
        open={Boolean(leaving)}
        tone="default"
        title={`Check out ${leaving?.name}?`}
        message={leaving ? `They have been inside for ${duration(leaving.checkInTime)}. The exit time will be recorded now.` : ''}
        confirmLabel="Check out"
        onConfirm={checkOut}
        onClose={() => setLeaving(null)}
      />
    </div>
  );
};

export default Visitors;
