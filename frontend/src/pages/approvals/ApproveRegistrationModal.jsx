import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, Printer, ShieldAlert, ShieldCheck } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import Avatar from '../../components/ui/Avatar';
import { Field, FormSection, digitsOnly } from '../../components/ui/FormField';
import RoomSelect from '../students/RoomSelect';
import { INDIAN_STATES, MARITAL_STATUSES, STAFF_DEPARTMENTS } from '../../config/hostel';

const toDateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

export const requestedRole = (user) => (user?.role || '').replace('PENDING_', '');

const ROLES = [
  { key: 'STUDENT', label: 'Student', desc: 'Lives in the hostel', icon: GraduationCap },
  { key: 'STAFF', label: 'Staff', desc: 'Gate & staff tools', icon: Briefcase },
  { key: 'ADMIN', label: 'Warden', desc: 'Full admin access', icon: ShieldCheck },
];

export const formFromUser = (user) => {
  const s = user.student || {};
  return {
    role: requestedRole(user),
    roomId: '',
    phoneNumber: s.phoneNumber || user.staff?.phoneNumber || '',
    parentContact: s.parentContact || '',
    motherName: s.motherName || '',
    motherContact: s.motherContact || '',
    siblingContact: s.siblingContact || '',
    emergencyContact: s.emergencyContact || '',
    bloodGroup: s.bloodGroup || '',
    department: user.staff?.department || 'Warden',
    designation: user.staff?.designation || '',
    dateOfJoining: toDateInput(s.dateOfJoining),
    maritalStatus: s.maritalStatus || 'Unmarried',
    fatherName: s.fatherName || '',
    dob: toDateInput(s.dob),
    permanentAddress: s.permanentAddress || '',
    state: s.state || '',
    pincode: s.pincode || '',
    coachingCollege: s.coachingCollege || '',
  };
};

const REQUIRED_STUDENT = {
  fatherName: "Enter the father's name",
  dateOfJoining: 'Pick the joining date',
  dob: 'Pick the date of birth',
  coachingCollege: 'Enter the college or company',
  permanentAddress: 'Enter the permanent address',
  state: 'Select the state',
};

const validate = (form) => {
  const errors = {};
  if (form.role !== 'ADMIN' && form.phoneNumber.length !== 10) errors.phoneNumber = 'Must be 10 digits';
  if (form.role === 'STUDENT') {
    if (form.parentContact.length !== 10) errors.parentContact = 'Must be 10 digits';
    Object.entries(REQUIRED_STUDENT).forEach(([key, msg]) => { if (!form[key]) errors[key] = msg; });
    if (form.pincode.length !== 6) errors.pincode = 'PIN code must be 6 digits';
  }
  if (form.role === 'STAFF' && !form.designation.trim()) errors.designation = 'Enter a designation';
  return errors;
};

const ApproveRegistrationModal = ({ user, rooms, onClose, onApprove, onPrint, onPreview }) => {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm(formFromUser(user));
    setErrors({});
    setServerError(null);
  }, [user]);

  if (!user || !form) return <CustomModal isOpen={false} onClose={onClose} />;

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };
  const digits = (key, max) => (e) => set(key)(digitsOnly(e.target.value, max));

  const input = (key, props = {}) => (
    <input
      id={`ap-${key}`}
      className={`form-input ${errors[key] ? '!border-[var(--danger)]' : ''}`}
      value={form[key]}
      onChange={set(key)}
      aria-invalid={Boolean(errors[key])}
      {...props}
    />
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setServerError('Please fill the highlighted fields before approving.');
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      await onApprove(user, form);
    } catch (err) {
      setServerError(err.message || 'Could not approve this registration.');
    } finally {
      setSaving(false);
    }
  };

  const s = user.student || {};
  const applied = [
    ['Phone', s.phoneNumber || user.staff?.phoneNumber],
    ['Father', s.fatherName],
    ['College / company', s.coachingCollege],
    ['From', [s.state, s.pincode].filter(Boolean).join(' · ')],
    ['Blood group', s.bloodGroup],
    ['Applied', user.createdAt && new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
  ].filter(([, v]) => v);

  return (
    <CustomModal isOpen onClose={onClose} title="Review registration" size="lg">
      {/* Applicant summary */}
      <div className="rounded-2xl bg-mint-100 border border-mint-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={user.name} src={user.avatar || s.profilePic} size={64} rounded="rounded-2xl" tone="white" onPreview={onPreview} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[18px] font-bold m-0 truncate">{user.name}</h3>
            <p className="text-[13px] text-[var(--text-secondary)] m-0 truncate">{user.email}</p>
            <span className="badge badge-info normal-case mt-1.5">Registered as {requestedRole(user).toLowerCase()}</span>
          </div>
          <button type="button" className="btn-secondary h-10 shrink-0" onClick={() => onPrint(user, form)}>
            <Printer size={15} /> Admission form
          </button>
        </div>
        {applied.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 mt-4 pt-4 border-t border-mint-300 m-0">
            {applied.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] text-brand-700">{label}</dt>
                <dd className="m-0 text-[13px] font-semibold truncate">{value}</dd>
              </div>
            ))}
            {s.permanentAddress && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[11px] text-brand-700">Address</dt>
                <dd className="m-0 text-[13px]">{s.permanentAddress}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {serverError && (
        <div role="alert" className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-5">
          <ShieldAlert size={17} className="shrink-0" /> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        <fieldset className="border-none p-0 m-0">
          <legend className="text-[12px] font-bold text-brand-700 tracking-wide mb-3 p-0">Give access as</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {ROLES.map(({ key, label, desc, icon: Icon }) => {
              const active = form.role === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('role')(key)}
                  className={`relative text-left p-3 rounded-xl border cursor-pointer transition-colors ${
                    active ? 'border-sun-400 bg-cream-100' : 'border-[var(--border-color)] bg-white hover:border-[var(--border-strong)]'
                  }`}
                >
                  {active && <motion.span layoutId="approve-role" className="absolute inset-0 rounded-xl ring-2 ring-sun-400" />}
                  <Icon size={18} className={active ? 'text-sun-800' : 'text-[var(--text-tertiary)]'} />
                  <span className="block text-[14px] font-semibold mt-1.5">{label}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)]">{desc}</span>
                </button>
              );
            })}
          </div>
          {form.role !== requestedRole(user) && (
            <p className="text-[12px] text-[var(--warning)] mt-2 mb-0">
              This person registered as {requestedRole(user).toLowerCase()} — you are changing the role.
            </p>
          )}
        </fieldset>

        {form.role === 'STUDENT' && (
          <>
            <FormSection title="Room">
              <Field label="Assign a room" full htmlFor="ap-room" hint="You can also assign it later from the Students page">
                <RoomSelect id="ap-room" rooms={rooms} value={form.roomId} onChange={set('roomId')} />
              </Field>
              <Field label="Date of joining" required error={errors.dateOfJoining} htmlFor="ap-dateOfJoining">
                {input('dateOfJoining', { type: 'date' })}
              </Field>
            </FormSection>

            <FormSection title="Contact numbers">
              <Field label="Student phone" required error={errors.phoneNumber} htmlFor="ap-phoneNumber">
                {input('phoneNumber', { inputMode: 'numeric', onChange: digits('phoneNumber', 10) })}
              </Field>
              <Field label="Parent / guardian phone" required error={errors.parentContact} htmlFor="ap-parentContact">
                {input('parentContact', { inputMode: 'numeric', onChange: digits('parentContact', 10) })}
              </Field>
            </FormSection>

            <FormSection title="Personal details">
              <Field label="Father's name" required error={errors.fatherName} htmlFor="ap-fatherName">
                {input('fatherName')}
              </Field>
              <Field label="Date of birth" required error={errors.dob} htmlFor="ap-dob">
                {input('dob', { type: 'date' })}
              </Field>
              <Field label="Marital status" htmlFor="ap-maritalStatus">
                <select id="ap-maritalStatus" className="form-input cursor-pointer" value={form.maritalStatus} onChange={set('maritalStatus')}>
                  {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="College / company" required error={errors.coachingCollege} htmlFor="ap-coachingCollege">
                {input('coachingCollege')}
              </Field>
            </FormSection>

            <FormSection title="Home address">
              <Field label="Permanent address" required error={errors.permanentAddress} full htmlFor="ap-permanentAddress">
                {input('permanentAddress')}
              </Field>
              <Field label="State" required error={errors.state} htmlFor="ap-state">
                <select id="ap-state" className={`form-input cursor-pointer ${errors.state ? '!border-[var(--danger)]' : ''}`} value={form.state} onChange={set('state')}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </Field>
              <Field label="PIN code" required error={errors.pincode} htmlFor="ap-pincode">
                {input('pincode', { inputMode: 'numeric', onChange: digits('pincode', 6) })}
              </Field>
            </FormSection>
          </>
        )}

        {form.role === 'STAFF' && (
          <FormSection title="Staff details">
            <Field label="Phone" required error={errors.phoneNumber} htmlFor="ap-phoneNumber">
              {input('phoneNumber', { inputMode: 'numeric', onChange: digits('phoneNumber', 10) })}
            </Field>
            <Field label="Department" htmlFor="ap-department">
              <select id="ap-department" className="form-input cursor-pointer" value={form.department} onChange={set('department')}>
                {STAFF_DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Designation" required error={errors.designation} full htmlFor="ap-designation">
              {input('designation', { placeholder: 'e.g. Night guard' })}
            </Field>
          </FormSection>
        )}

        {form.role === 'ADMIN' && (
          <div className="p-4 rounded-xl bg-[var(--warning-bg)] text-[var(--warning)] text-[13px] leading-relaxed">
            A warden can see and change everything — students, fees and approvals. Only choose this for hostel management.
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <ShieldCheck size={16} /> {saving ? 'Approving…' : 'Approve & give access'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default ApproveRegistrationModal;
