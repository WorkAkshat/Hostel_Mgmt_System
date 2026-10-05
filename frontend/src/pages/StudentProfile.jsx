import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble, CircleCheck, Clock, FilePen, GraduationCap, House, IdCard, Phone, ShieldAlert, ShieldCheck, Upload, Users, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboard as dashboardApi, students as studentsApi } from '../utils/api';
import CustomModal from '../components/CustomModal';
import Avatar from '../components/ui/Avatar';
import { Field, digitsOnly } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';
import { ErrorPanel, PageHeader, SkeletonList } from '../components/ui/PageStates';
import { DOCUMENT_TYPES, INDIAN_STATES, STUDENT_STATUS, priceFor } from '../config/hostel';
import { fmtDate, timeAgo } from '../utils/format';
import useLiveRefresh from '../hooks/useLiveRefresh';

// Fields a student may ask to change — the warden approves before anything is saved
const EDITABLE = [
  { key: 'phoneNumber', label: 'Your phone', type: 'phone' },
  { key: 'fatherName', label: "Father's name" },
  { key: 'parentContact', label: 'Parent phone', type: 'phone' },
  { key: 'coachingCollege', label: 'Company / college' },
  { key: 'permanentAddress', label: 'Home address', full: true },
  { key: 'state', label: 'State', type: 'state' },
  { key: 'pincode', label: 'PIN code', type: 'pin' },
];
const LABEL = Object.fromEntries(EDITABLE.map((f) => [f.key, f.label]));

const REQUEST_STATUS = {
  PENDING: { label: 'Waiting for warden', badge: 'badge-warning', icon: Clock },
  APPROVED: { label: 'Approved & saved', badge: 'badge-success', icon: CircleCheck },
  REJECTED: { label: 'Not approved', badge: 'badge-danger', icon: XCircle },
};
const DOC_STATUS = {
  PENDING: { label: 'Being verified', badge: 'badge-warning' },
  VERIFIED: { label: 'Verified', badge: 'badge-success' },
  REJECTED: { label: 'Rejected — upload again', badge: 'badge-danger' },
};

const Row = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-2.5 border-b border-[var(--border-color)] last:border-0">
    <dt className="text-[12px] text-[var(--text-tertiary)]">{label}</dt>
    <dd className="m-0 text-[14px] font-medium break-words">{value || <span className="text-[var(--text-tertiary)] font-normal">Not added</span>}</dd>
  </div>
);

const Section = ({ icon: Icon, title, children, action }) => (
  <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
    <div className="flex items-center justify-between gap-3 mb-2">
      <h2 className="text-[15px] font-bold m-0 flex items-center gap-2"><Icon size={16} className="text-brand-600" /> {title}</h2>
      {action}
    </div>
    <dl className="m-0">{children}</dl>
  </section>
);

const ChangeRequestModal = ({ open, student, onClose, onSubmit }) => {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !student) return;
    setError(null);
    setForm(Object.fromEntries(EDITABLE.map((f) => [f.key, student[f.key] || ''])));
  }, [open, student]);

  const changed = EDITABLE.filter((f) => String(form[f.key] ?? '').trim() !== String(student?.[f.key] ?? '').trim());

  const submit = async (e) => {
    e.preventDefault();
    if (!changed.length) return setError('Change at least one detail before sending.');
    for (const f of changed) {
      const v = String(form[f.key]).trim();
      if (f.type === 'phone' && v.length !== 10) return setError(`${f.label} must be 10 digits.`);
      if (f.type === 'pin' && v.length !== 6) return setError('PIN code must be 6 digits.');
      if (!v) return setError(`${f.label} cannot be empty.`);
    }
    setSaving(true);
    try {
      await onSubmit(Object.fromEntries(changed.map((f) => [f.key, String(form[f.key]).trim()])));
    } catch (err) {
      setError(err.message || 'Could not send the request.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setError(null); };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="Request a change" size="lg">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <p className="text-[13px] text-[var(--text-secondary)] m-0 -mt-1">Edit what is wrong or outdated. The warden checks it before it is saved to your record.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EDITABLE.map((f) => (
            <Field key={f.key} label={f.label} htmlFor={`pr-${f.key}`} full={f.full} hint={changed.some((c) => c.key === f.key) ? 'Changed' : undefined}>
              {f.type === 'state' ? (
                <select id={`pr-${f.key}`} className="form-input cursor-pointer" value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Choose state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  id={`pr-${f.key}`}
                  className="form-input"
                  inputMode={f.type === 'phone' || f.type === 'pin' ? 'numeric' : undefined}
                  value={form[f.key] || ''}
                  onChange={(e) => set(f.key, f.type === 'phone' ? digitsOnly(e.target.value, 10) : f.type === 'pin' ? digitsOnly(e.target.value, 6) : e.target.value)}
                />
              )}
            </Field>
          ))}
        </div>
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
          <span className="text-[12px] text-[var(--text-tertiary)]">{changed.length ? `${changed.length} change${changed.length > 1 ? 's' : ''} to send` : 'Nothing changed yet'}</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || !changed.length}><FilePen size={16} /> {saving ? 'Sending…' : 'Send to warden'}</button>
          </div>
        </div>
      </form>
    </CustomModal>
  );
};

const DocumentModal = ({ open, onClose, onSubmit }) => {
  const [docType, setDocType] = useState('AADHAAR');
  const [number, setNumber] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setDocType('AADHAAR'); setNumber(''); setError(null); }
  }, [open]);

  const clean = number.replace(/\s/g, '').toUpperCase();
  const submit = async (e) => {
    e.preventDefault();
    if (docType === 'AADHAAR' && !/^\d{12}$/.test(clean)) return setError('Aadhaar number has 12 digits.');
    if (docType === 'PAN' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(clean)) return setError('PAN looks like ABCDE1234F.');
    if (docType === 'PASSPORT' && !/^[A-Z]\d{7}$/.test(clean)) return setError('Passport number looks like A1234567.');
    setSaving(true);
    try {
      await onSubmit({ docType, documentNumber: clean });
    } catch (err) {
      setError(err.message || 'Could not submit the document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="Add an ID document">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Document type">
          {Object.entries(DOCUMENT_TYPES).map(([k, v]) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={docType === k}
              onClick={() => { setDocType(k); setError(null); }}
              className={`h-11 rounded-xl border text-[13px] cursor-pointer transition-colors ${docType === k ? 'bg-sun-300 border-transparent text-sun-900 font-semibold' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)]'}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Field label={`${DOCUMENT_TYPES[docType]} number`} required htmlFor="doc-no" hint="Adding the same type again replaces the old one">
          <input id="doc-no" className="form-input uppercase tracking-wider" value={number} onChange={(e) => { setNumber(e.target.value.slice(0, 16)); setError(null); }} autoFocus />
        </Field>
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}><Upload size={16} /> {saving ? 'Submitting…' : 'Submit for verification'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

const StudentProfile = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      let id = user?.studentDetails?.id;
      if (!id) id = (await dashboardApi.getDashboard())?.profile?.id;
      if (!id) throw new Error('Your student record was not found. Please contact the warden.');
      const [s, r, d] = await Promise.all([
        studentsApi.getById(id),
        studentsApi.getMyProfileRequests().catch(() => []),
        studentsApi.getStudentDocuments(id).catch(() => []),
      ]);
      setStudent(s);
      setRequests(r || []);
      setDocs(d || []);
    } catch (err) {
      setError(err.message || 'Could not load your profile.');
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load);

  const pending = useMemo(() => requests.find((r) => r.status === 'PENDING'), [requests]);

  const sendRequest = async (changes) => {
    await studentsApi.requestProfileChange(changes);
    toast.success('Request sent', 'The warden will review it. You will see the result here.');
    setEditing(false);
    load();
  };

  const sendDocument = async (data) => {
    await studentsApi.uploadDocument(data);
    toast.success('Document submitted', 'The warden will verify it.');
    setAddingDoc(false);
    load();
  };

  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!student) return <SkeletonList count={3} height={180} columns="grid-cols-1 xl:grid-cols-2" />;

  const room = student.room;
  const status = STUDENT_STATUS[student.status] || { label: student.status, badge: 'badge-info' };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="My profile" subtitle="Your details on record with the hostel office." />

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[var(--border-radius-card)] bg-mint-100 border border-mint-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={student.user?.name} src={student.profilePic || user?.avatar} size={84} tone="white" />
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] font-bold m-0 truncate">{student.user?.name}</h2>
          <p className="text-[13px] text-[var(--text-secondary)] m-0">{student.rollNumber} · {student.user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`badge normal-case ${status.badge}`}>{status.label}</span>
            {student.dateOfJoining && <span className="badge normal-case bg-white text-[var(--text-secondary)]">Joined {fmtDate(student.dateOfJoining, { year: 'numeric' })}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-[340px]">
          {[
            { label: 'Room', value: room?.roomNumber || '—' },
            { label: 'Bed', value: student.bedId ? String(student.bedId).split('-').pop() : '—' },
            { label: 'Floor', value: room?.floorNumber || '—' },
          ].map((t) => (
            <div key={t.label} className="rounded-xl bg-white px-3 py-2.5 text-center">
              <div className="text-[11px] text-[var(--text-tertiary)]">{t.label}</div>
              <div className="text-[18px] font-bold">{t.value}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {pending && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-cream-100 border border-sun-200 text-[13px]">
          <Clock size={18} className="text-sun-800 shrink-0" />
          <span className="flex-1">Your change request from {timeAgo(pending.createdAt)} is waiting for the warden ({Object.keys(pending.requestedChanges || {}).filter((k) => pending.requestedChanges[k]).map((k) => LABEL[k] || k).join(', ')}).</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Section
          icon={Phone}
          title="Contact & family"
          action={<button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => setEditing(true)} disabled={Boolean(pending)} title={pending ? 'Wait for your current request' : undefined}><FilePen size={14} /> Request change</button>}
        >
          <Row label="Your phone" value={student.phoneNumber} />
          <Row label="Father's name" value={student.fatherName} />
          <Row label="Parent phone" value={student.parentContact} />
          <Row label="Mother's name" value={student.motherName} />
          <Row label="Mother's phone" value={student.motherContact} />
          <Row label="Emergency contact" value={student.emergencyContact} />
        </Section>

        <div className="flex flex-col gap-4">
          <Section icon={House} title="Home & college">
            <Row label="Home address" value={[student.permanentAddress, student.state, student.pincode].filter(Boolean).join(', ')} />
            <Row label="Company / college" value={student.coachingCollege} />
            <Row label="Blood group" value={student.bloodGroup} />
            <Row label="Date of birth" value={student.dob ? fmtDate(student.dob, { year: 'numeric' }) : ''} />
          </Section>
          {room && (
            <Section icon={BedDouble} title="Room">
              <Row label="Room type" value={`${priceFor(room.sharingType).label}${room.isAc ? ' · AC' : ''}`} />
              <Row label="Monthly fee" value={`₹${priceFor(room.sharingType).total.toLocaleString('en-IN')} (rent ₹${priceFor(room.sharingType).roomRent.toLocaleString('en-IN')} + mess ₹${priceFor(room.sharingType).messFee.toLocaleString('en-IN')})`} />
            </Section>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-[15px] font-bold m-0 flex items-center gap-2"><IdCard size={16} className="text-brand-600" /> ID documents</h2>
            <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => setAddingDoc(true)}><Upload size={14} /> Add</button>
          </div>
          {docs.length === 0 ? (
            <p className="text-[13px] text-[var(--text-tertiary)] m-0">No ID added yet. The hostel needs one government ID for your file.</p>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-primary)]">
                  {d.status === 'VERIFIED' ? <ShieldCheck size={18} className="text-[var(--success)]" /> : <IdCard size={18} className="text-[var(--text-tertiary)]" />}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold">{DOCUMENT_TYPES[d.docType] || d.docType}</span>
                    <span className="block text-[12px] text-[var(--text-tertiary)] tracking-wider">•••• {String(d.documentNumber).slice(-4)}</span>
                  </span>
                  <span className={`badge normal-case ${DOC_STATUS[d.status]?.badge || ''}`}>{DOC_STATUS[d.status]?.label || d.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
          <h2 className="text-[15px] font-bold m-0 mb-3 flex items-center gap-2"><Users size={16} className="text-brand-600" /> My change requests</h2>
          {requests.length === 0 ? (
            <p className="text-[13px] text-[var(--text-tertiary)] m-0">If something above is wrong, use “Request change”. The warden's decision shows here.</p>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-2">
              {requests.slice(0, 6).map((r) => {
                const st = REQUEST_STATUS[r.status] || REQUEST_STATUS.PENDING;
                const fields = Object.entries(r.requestedChanges || {}).filter(([, v]) => v);
                return (
                  <li key={r.id} className="p-3 rounded-xl bg-[var(--bg-primary)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-[var(--text-tertiary)]">{timeAgo(r.createdAt)}</span>
                      <span className={`badge normal-case ${st.badge}`}><st.icon size={12} /> {st.label}</span>
                    </div>
                    <ul className="list-none m-0 p-0 mt-1.5 text-[13px]">
                      {fields.map(([k, v]) => <li key={k}><span className="text-[var(--text-tertiary)]">{LABEL[k] || k}:</span> {v}</li>)}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-[12px] text-[var(--text-tertiary)] m-0 flex items-center gap-1.5"><GraduationCap size={14} /> Name, roll number and room are managed by the warden office.</p>

      <ChangeRequestModal open={editing} student={student} onClose={() => setEditing(false)} onSubmit={sendRequest} />
      <DocumentModal open={addingDoc} onClose={() => setAddingDoc(false)} onSubmit={sendDocument} />
    </div>
  );
};

export default StudentProfile;
