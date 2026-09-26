import { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import { Field, FormSection, digitsOnly } from '../../components/ui/FormField';
import RoomSelect from './RoomSelect';
import { BLOOD_GROUPS, INDIAN_STATES, MARITAL_STATUSES, STUDENT_STATUS } from '../../config/hostel';

const toDateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

const EMPTY = {
  name: '', email: '', password: '', rollNumber: '',
  phoneNumber: '', parentContact: '', motherName: '', motherContact: '', siblingContact: '', emergencyContact: '',
  roomId: '', dateOfJoining: '', status: 'CHECKED_IN',
  fatherName: '', dob: '', bloodGroup: '', maritalStatus: 'Unmarried', coachingCollege: '', course: '',
  permanentAddress: '', state: '', pincode: '',
};

const fromStudent = (s) => ({
  ...EMPTY,
  name: s.user?.name || '',
  email: s.user?.email || '',
  rollNumber: s.rollNumber || '',
  phoneNumber: s.phoneNumber || '',
  parentContact: s.parentContact || '',
  motherName: s.motherName || '',
  motherContact: s.motherContact || '',
  siblingContact: s.siblingContact || '',
  emergencyContact: s.emergencyContact || '',
  roomId: s.roomId || '',
  dateOfJoining: toDateInput(s.dateOfJoining),
  status: s.status || 'CHECKED_IN',
  fatherName: s.fatherName || '',
  dob: toDateInput(s.dob),
  bloodGroup: s.bloodGroup || '',
  maritalStatus: s.maritalStatus || 'Unmarried',
  coachingCollege: s.coachingCollege || '',
  course: s.course || '',
  permanentAddress: s.permanentAddress || '',
  state: s.state || '',
  pincode: s.pincode || '',
});

const PHONE_FIELDS = {
  phoneNumber: 'Student phone',
  parentContact: 'Parent phone',
  motherContact: "Mother's phone",
  siblingContact: 'Sibling phone',
};

const validate = (form, isEdit) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter the full name';
  if (!isEdit) {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address';
    if (form.password.length < 6) errors.password = 'Use at least 6 characters';
  }
  Object.entries(PHONE_FIELDS).forEach(([key, label]) => {
    const required = key === 'phoneNumber' || key === 'parentContact';
    if ((required || form[key]) && form[key].length !== 10) errors[key] = `${label} must be 10 digits`;
  });
  if (form.pincode && form.pincode.length !== 6) errors.pincode = 'PIN code must be 6 digits';
  return errors;
};

// Add a new student, or edit an existing one when `student` is passed.
const StudentFormModal = ({ open, student, rooms, onClose, onSubmit }) => {
  const isEdit = Boolean(student);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(student ? fromStudent(student) : EMPTY);
    setErrors({});
    setServerError(null);
    setShowPassword(false);
  }, [open, student]);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };
  const setDigits = (key, max) => (e) => set(key)(digitsOnly(e.target.value, max));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }
    setServerError(null);
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit) {
        delete payload.email;
        delete payload.password;
        delete payload.rollNumber;
      } else {
        delete payload.status;
        Object.keys(payload).forEach((k) => payload[k] === '' && delete payload[k]);
      }
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message || 'Could not save the student.');
    } finally {
      setSaving(false);
    }
  };

  const input = (key, props = {}) => (
    <input
      id={`sf-${key}`}
      className={`form-input ${errors[key] ? '!border-[var(--danger)]' : ''}`}
      value={form[key]}
      onChange={set(key)}
      aria-invalid={Boolean(errors[key])}
      {...props}
    />
  );
  const phone = (key, placeholder) =>
    input(key, { inputMode: 'numeric', placeholder, onChange: setDigits(key, 10) });

  return (
    <CustomModal
      isOpen={open}
      onClose={onClose}
      title={isEdit ? `Edit ${student?.user?.name || 'student'}` : 'Add a new student'}
      size="lg"
    >
      {serverError && (
        <div role="alert" className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-5">
          <ShieldAlert size={17} className="shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        <FormSection title={isEdit ? 'Basic details' : 'Login account'}>
          <Field label="Full name" required error={errors.name} full htmlFor="sf-name">
            {input('name', { placeholder: 'e.g. Priya Sharma', autoFocus: true })}
          </Field>
          {!isEdit && (
            <>
              <Field label="Email" required error={errors.email} htmlFor="sf-email" hint="The student signs in with this">
                {input('email', { type: 'email', placeholder: 'priya@example.com', autoComplete: 'off' })}
              </Field>
              <Field label="Password" required error={errors.password} htmlFor="sf-password" hint="At least 6 characters">
                <div className="relative">
                  {input('password', { type: showPassword ? 'text' : 'password', autoComplete: 'new-password', className: `form-input pr-11 ${errors.password ? '!border-[var(--danger)]' : ''}` })}
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </>
          )}
          {isEdit && (
            <Field label="Status" htmlFor="sf-status">
              <select id="sf-status" className="form-input cursor-pointer" value={form.status} onChange={set('status')}>
                {Object.entries(STUDENT_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          )}
        </FormSection>

        <FormSection title="Stay">
          <Field label="Room" full htmlFor="sf-room">
            <RoomSelect id="sf-room" rooms={rooms} value={form.roomId} onChange={set('roomId')} currentStudentId={student?.id} />
          </Field>
          <Field label="Date of joining" htmlFor="sf-dateOfJoining">
            {input('dateOfJoining', { type: 'date' })}
          </Field>
          {!isEdit && (
            <Field label="Roll number" htmlFor="sf-rollNumber" hint="Leave blank to generate automatically">
              {input('rollNumber', { placeholder: 'e.g. HP_025' })}
            </Field>
          )}
        </FormSection>

        <FormSection title="Contact numbers">
          <Field label="Student phone" required error={errors.phoneNumber} htmlFor="sf-phoneNumber">
            {phone('phoneNumber', '10-digit mobile')}
          </Field>
          <Field label="Parent / guardian phone" required error={errors.parentContact} htmlFor="sf-parentContact" hint="Leave and gate alerts go here">
            {phone('parentContact', '10-digit mobile')}
          </Field>
          <Field label="Mother's name" htmlFor="sf-motherName">
            {input('motherName')}
          </Field>
          <Field label="Mother's phone" error={errors.motherContact} htmlFor="sf-motherContact">
            {phone('motherContact', 'Optional')}
          </Field>
          <Field label="Sibling phone" error={errors.siblingContact} htmlFor="sf-siblingContact">
            {phone('siblingContact', 'Optional')}
          </Field>
          <Field label="Emergency contact" htmlFor="sf-emergencyContact" hint="Name and number of a local guardian">
            {input('emergencyContact', { placeholder: 'e.g. Aunt — 98xxxxxx10' })}
          </Field>
        </FormSection>

        <FormSection title="Personal details">
          <Field label="Father's name" htmlFor="sf-fatherName">
            {input('fatherName')}
          </Field>
          <Field label="Date of birth" htmlFor="sf-dob">
            {input('dob', { type: 'date' })}
          </Field>
          <Field label="Blood group" htmlFor="sf-bloodGroup">
            <select id="sf-bloodGroup" className="form-input cursor-pointer" value={form.bloodGroup} onChange={set('bloodGroup')}>
              <option value="">Not known</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          {isEdit && (
            <Field label="Marital status" htmlFor="sf-maritalStatus">
              <select id="sf-maritalStatus" className="form-input cursor-pointer" value={form.maritalStatus} onChange={set('maritalStatus')}>
                {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          )}
          <Field label="College / company" htmlFor="sf-coachingCollege">
            {input('coachingCollege', { placeholder: 'Where she studies or works' })}
          </Field>
          <Field label="Course / role" htmlFor="sf-course">
            {input('course', { placeholder: 'e.g. B.Com 2nd year' })}
          </Field>
        </FormSection>

        <FormSection title="Home address">
          <Field label="Permanent address" full htmlFor="sf-permanentAddress">
            {input('permanentAddress', { placeholder: 'House no., street, city' })}
          </Field>
          <Field label="State" htmlFor="sf-state">
            <select id="sf-state" className="form-input cursor-pointer" value={form.state} onChange={set('state')}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </Field>
          <Field label="PIN code" error={errors.pincode} htmlFor="sf-pincode">
            {input('pincode', { inputMode: 'numeric', placeholder: '6 digits', onChange: setDigits('pincode', 6) })}
          </Field>
        </FormSection>

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add student'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default StudentFormModal;
