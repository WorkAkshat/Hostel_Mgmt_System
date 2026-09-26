import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Snowflake, Fan } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import { Field } from '../../components/ui/FormField';
import { ROOM_PRICING } from '../../config/hostel';

const EMPTY = { roomNumber: '', floorNumber: '', block: '', sharingType: 2, isAc: false };

// Create a room, or edit one when `room` is passed.
const RoomFormModal = ({ open, room, floors, defaultFloor, onClose, onSubmit }) => {
  const isEdit = Boolean(room);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(room
      ? {
          roomNumber: room.roomNumber,
          floorNumber: String(room.floorNumber || ''),
          block: room.block || '',
          sharingType: room.sharingType || 2,
          isAc: Boolean(room.isAc),
        }
      : { ...EMPTY, floorNumber: defaultFloor && defaultFloor !== 'all' ? String(defaultFloor) : String(floors[0]?.floorNumber || '') });
  }, [open, room, floors, defaultFloor]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const occupants = room?.students?.length || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.roomNumber.trim()) return setError('Enter a room number.');
    if (!form.floorNumber) return setError('Choose the floor.');
    if (isEdit && occupants > form.sharingType) {
      return setError(`${occupants} residents live here — move someone out before making it ${form.sharingType}-sharing.`);
    }
    setError(null);
    setSaving(true);
    try {
      const floor = floors.find((f) => String(f.floorNumber) === form.floorNumber);
      await onSubmit({
        roomNumber: form.roomNumber.trim().toUpperCase(),
        floorNumber: Number(form.floorNumber),
        block: form.block.trim() || floor?.hostelName || undefined,
        sharingType: form.sharingType,
        isAc: form.isAc,
      });
    } catch (err) {
      setError(err.message || 'Could not save the room.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title={isEdit ? `Edit room ${room?.roomNumber}` : 'Add a room'}>
      {error && (
        <div role="alert" className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-5">
          <ShieldAlert size={17} className="shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Room number" required htmlFor="rf-number" hint="e.g. 104 or 2B">
            <input
              id="rf-number"
              className="form-input"
              value={form.roomNumber}
              onChange={(e) => set('roomNumber', e.target.value)}
              autoFocus
              placeholder="104"
            />
          </Field>
          <Field label="Floor" required htmlFor="rf-floor">
            <select id="rf-floor" className="form-input cursor-pointer" value={form.floorNumber} onChange={(e) => set('floorNumber', e.target.value)}>
              <option value="">Choose floor</option>
              {floors.map((f) => (
                <option key={f.floorNumber} value={String(f.floorNumber)}>
                  Floor {f.floorNumber}{f.companyName ? ` — ${f.companyName}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 p-0">Beds in this room</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {[1, 2, 3].map((beds) => {
              const active = form.sharingType === beds;
              const price = ROOM_PRICING[beds];
              const tooSmall = isEdit && occupants > beds;
              return (
                <button
                  key={beds}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={tooSmall}
                  onClick={() => set('sharingType', beds)}
                  className={`relative text-left p-3 rounded-xl border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    active ? 'border-sun-400 bg-cream-100' : 'border-[var(--border-color)] bg-white hover:border-[var(--border-strong)]'
                  }`}
                >
                  {active && <motion.span layoutId="room-sharing" className="absolute inset-0 rounded-xl ring-2 ring-sun-400" />}
                  <span className="flex gap-0.5 mb-1.5" aria-hidden="true">
                    {Array.from({ length: beds }).map((_, i) => (
                      <span key={i} className={`w-3 h-4 rounded-sm ${active ? 'bg-sun-400' : 'bg-mint-200'}`} />
                    ))}
                  </span>
                  <span className="block text-[14px] font-semibold">{price.label}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)]">₹{price.total.toLocaleString('en-IN')}/bed</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Air conditioning">
          {[{ value: false, label: 'Non-AC', icon: Fan }, { value: true, label: 'AC room', icon: Snowflake }].map(({ value, label, icon: Icon }) => {
            const active = form.isAc === value;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('isAc', value)}
                className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-[14px] font-semibold cursor-pointer transition-colors ${
                  active ? 'border-brand-400 bg-mint-100 text-brand-800' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            );
          })}
        </div>

        <Field label="Block / wing name" htmlFor="rf-block" hint="Optional — defaults to the floor's hostel name">
          <input id="rf-block" className="form-input" value={form.block} onChange={(e) => set('block', e.target.value)} placeholder="e.g. Vandana Girls Hostel" />
        </Field>

        <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save room' : 'Add room'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default RoomFormModal;
