import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Gauge, Save } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import ProgressBar from '../../components/ui/ProgressBar';
import { SearchBox } from '../../components/ui/PageStates';
import { useToast } from '../../components/ui/Toast';
import { electricity as electricityApi } from '../../utils/api';
import { rupees } from '../../utils/format';
import { monthLabel } from './financeUtils';

const num = (v) => (v === '' || v == null ? null : Number(v));

// Enter each occupied room's sub-meter reading for a billing month.
// The previous reading is carried over from last month's closing reading.
const MeterReadings = ({ open, onClose, month, rooms, readings, prevReadings, rate, onSaved }) => {
  const toast = useToast();
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState('');

  const byRoom = useMemo(() => Object.fromEntries(readings.map((r) => [r.roomId, r])), [readings]);
  const prevByRoom = useMemo(() => Object.fromEntries(prevReadings.map((r) => [r.roomId, r])), [prevReadings]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setDrafts(Object.fromEntries(rooms.map((room) => {
      const saved = byRoom[room.id];
      return [room.id, {
        prev: saved ? String(saved.previousReading) : prevByRoom[room.id] ? String(prevByRoom[room.id].currentReading) : '',
        curr: saved ? String(saved.currentReading) : '',
      }];
    })));
  }, [open, rooms, byRoom, prevByRoom]);

  const set = (roomId, key, value) =>
    setDrafts((d) => ({ ...d, [roomId]: { ...d[roomId], [key]: value.replace(/[^\d.]/g, '').slice(0, 8) } }));

  const save = async (room) => {
    const d = drafts[room.id];
    const prev = num(d.prev);
    const curr = num(d.curr);
    if (prev == null || curr == null) return toast.error(`Room ${room.roomNumber}`, 'Enter both the previous and the current reading.');
    if (curr < prev) return toast.error(`Room ${room.roomNumber}`, 'Current reading cannot be lower than the previous one.');
    setSaving(room.id);
    try {
      await electricityApi.submitReading({ roomId: room.id, readingMonth: month, previousReading: prev, currentReading: curr, ratePerUnit: rate });
      toast.success(`Room ${room.roomNumber} saved`, `${curr - prev} units · ${rupees((curr - prev) * rate)}`);
      onSaved();
    } catch (err) {
      toast.error('Could not save the reading', err.message);
    } finally {
      setSaving(null);
    }
  };

  const done = rooms.filter((r) => byRoom[r.id]).length;
  const q = search.trim().toLowerCase();
  const shown = rooms.filter((r) => !q || String(r.roomNumber).toLowerCase().includes(q));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Meter readings"
      width={560}
      header={(
        <div>
          <h3 className="text-[17px] font-bold m-0 flex items-center gap-2"><Gauge size={18} className="text-brand-600" /> Meter readings · {monthLabel(month)}</h3>
          <p className="text-[12px] text-[var(--text-secondary)] m-0 mt-0.5">₹{rate}/unit · each room’s bill is split equally between its residents</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1"><ProgressBar value={done} max={rooms.length || 1} tone="brand" height={6} label="Rooms read" /></div>
            <span className="text-[12px] font-semibold whitespace-nowrap">{done} / {rooms.length} rooms</span>
          </div>
        </div>
      )}
    >
      <SearchBox value={search} onChange={setSearch} placeholder="Find a room" className="mb-4" />
      {shown.length === 0 ? (
        <p className="text-[13px] text-[var(--text-tertiary)] text-center py-8 m-0">No occupied rooms {q ? 'match' : 'on this floor'}.</p>
      ) : (
        <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
          {shown.map((room) => {
            const d = drafts[room.id] || { prev: '', curr: '' };
            const saved = byRoom[room.id];
            const units = num(d.curr) != null && num(d.prev) != null ? num(d.curr) - num(d.prev) : null;
            const changed = !saved || String(saved.previousReading) !== d.prev || String(saved.currentReading) !== d.curr;
            const residents = room.students?.filter((s) => s.status !== 'CHECKED_OUT').length || 0;
            return (
              <li key={room.id} className={`rounded-2xl border p-3.5 ${saved && !changed ? 'bg-mint-50 border-mint-200' : 'bg-white border-[var(--border-color)]'}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[15px] font-bold">Room {room.roomNumber}</span>
                  <span className="text-[12px] text-[var(--text-tertiary)]">Floor {room.floorNumber} · {residents} resident{residents === 1 ? '' : 's'}</span>
                  {saved && !changed && <CircleCheck size={16} className="ml-auto text-[var(--success)]" aria-label="Saved" />}
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Previous
                    <input className="form-input h-10 mt-1" inputMode="decimal" value={d.prev} onChange={(e) => set(room.id, 'prev', e.target.value)} placeholder="0" />
                  </label>
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Current
                    <input className="form-input h-10 mt-1" inputMode="decimal" value={d.curr} onChange={(e) => set(room.id, 'curr', e.target.value)} placeholder="Meter now" onKeyDown={(e) => e.key === 'Enter' && save(room)} />
                  </label>
                  <button className={`${changed ? 'btn-primary' : 'btn-secondary'} h-10 px-3`} disabled={!changed || saving === room.id} onClick={() => save(room)} aria-label={`Save room ${room.roomNumber}`}>
                    <Save size={15} /> <span className="hidden sm:inline">{saving === room.id ? 'Saving' : 'Save'}</span>
                  </button>
                </div>
                {units != null && units >= 0 && (
                  <p className="text-[12px] text-[var(--text-secondary)] m-0 mt-2">
                    {units} units · <strong>{rupees(units * rate)}</strong>{residents > 1 ? ` · ${rupees((units * rate) / residents)} each` : ''}
                  </p>
                )}
                {units != null && units < 0 && <p className="text-[12px] text-[var(--danger)] m-0 mt-2">Current reading is lower than the previous one.</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
};

export default MeterReadings;
