import { useEffect, useState } from 'react';
import { FilePlus2, ShieldAlert } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import StudentPicker from '../../components/ui/StudentPicker';
import { Field, digitsOnly } from '../../components/ui/FormField';
import { priceFor } from '../../config/hostel';
import { rupees, todayIso } from '../../utils/format';

// 5th of next month, as YYYY-MM-DD
const defaultDue = () => {
  const d = new Date();
  const due = new Date(d.getFullYear(), d.getMonth() + 1, 5);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-05`;
};

// Raise a one-off invoice for a resident.
const NewInvoiceModal = ({ open, students, invoices, onClose, onSubmit }) => {
  const [student, setStudent] = useState(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudent(null);
    setAmount('');
    setDueDate(defaultDue());
    setError(null);
  }, [open]);

  const choose = (s) => {
    setStudent(s);
    setError(null);
    if (s?.room) setAmount(String(priceFor(s.room.sharingType || s.room.capacity).total));
  };

  const standard = student?.room ? priceFor(student.room.sharingType || student.room.capacity) : null;
  const unpaid = student ? invoices.filter((i) => i.studentId === student.id && i.status !== 'PAID') : [];

  const submit = async (e) => {
    e.preventDefault();
    if (!student) return setError('Choose the resident to bill.');
    if (!Number(amount) || Number(amount) <= 0) return setError('Enter an amount above zero.');
    if (!dueDate) return setError('Choose a due date.');
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ studentRollNumber: student.rollNumber, amount: Number(amount), dueDate });
    } catch (err) {
      setError(err.message || 'Could not raise the invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="New invoice">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Resident" required htmlFor="inv-student" hint={student ? undefined : 'Type a name, roll no. or room'}>
          <StudentPicker id="inv-student" students={students} value={student} onChange={choose} autoFocus />
        </Field>

        {unpaid.length > 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--warning-bg)] text-[var(--warning)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" />
            {student.user?.name} already has {unpaid.length} unpaid invoice{unpaid.length > 1 ? 's' : ''} ({rupees(unpaid.reduce((s, i) => s + i.amount, 0))}).
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Amount (₹)"
            required
            htmlFor="inv-amount"
            hint={standard ? `Standard ${student.room.sharingType || student.room.capacity}-sharing fee: ${rupees(standard.total)}` : undefined}
          >
            <input id="inv-amount" className="form-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(digitsOnly(e.target.value, 7))} placeholder="14000" />
          </Field>
          <Field label="Due date" required htmlFor="inv-due">
            <input id="inv-due" type="date" className="form-input" min={todayIso()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
            <ShieldAlert size={16} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}><FilePlus2 size={16} /> {saving ? 'Saving…' : 'Raise invoice'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

export default NewInvoiceModal;
