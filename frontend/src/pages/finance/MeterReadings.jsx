import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Gauge, Pencil, Save } from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import ProgressBar from '../../components/ui/ProgressBar';
import { SearchBox } from '../../components/ui/PageStates';
import { useToast } from '../../components/ui/Toast';
import { electricity as electricityApi, demandNotes as demandNotesApi } from '../../utils/api';
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
  const [currentRate, setCurrentRate] = useState(rate || 11);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(String(rate || 11));

  useEffect(() => {
    if (rate) {
      setCurrentRate(rate);
      setTempRate(String(rate));
    }
  }, [rate]);

  const byRoom = useMemo(() => Object.fromEntries(readings.map((r) => [r.roomId, r])), [readings]);
  const prevByRoom = useMemo(() => Object.fromEntries(prevReadings.map((r) => [r.roomId, r])), [prevReadings]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setIsEditingRate(false);
    setDrafts(Object.fromEntries(rooms.map((room) => {
      const saved = byRoom[room.id];
      const activeResidents = room.students?.filter((s) => s.status !== 'CHECKED_OUT').length || 0;
      const defaultSplit = saved?.splitCount || (activeResidents ? Math.min(3, Math.max(1, activeResidents)) : (room.sharingType || 1));
      return [room.id, {
        prev: saved ? String(saved.previousReading) : prevByRoom[room.id] ? String(prevByRoom[room.id].currentReading) : '',
        curr: saved ? String(saved.currentReading) : '',
        splitCount: defaultSplit,
      }];
    })));
  }, [open, rooms, byRoom, prevByRoom]);

  const set = (roomId, key, value) =>
    setDrafts((d) => ({ ...d, [roomId]: { ...d[roomId], [key]: value.replace(/[^\d.]/g, '').slice(0, 8) } }));

  const saveRate = async () => {
    const val = parseFloat(tempRate);
    if (isNaN(val) || val < 0) return toast.error('Invalid rate', 'Please enter a valid rate per unit.');
    try {
      await demandNotesApi.updateElectricityRate(val);
      setCurrentRate(val);
      setIsEditingRate(false);
      toast.success('Rate updated', `Electricity rate set to ₹${val}/unit.`);
      onSaved?.();
    } catch (e) {
      toast.error('Could not update rate', e.message);
    }
  };

  const save = async (room) => {
    const d = drafts[room.id];
    const prev = num(d.prev);
    const curr = num(d.curr);
    const split = d.splitCount || 1;
    if (prev == null || curr == null) return toast.error(`Room ${room.roomNumber}`, 'Enter both the previous and the current reading.');
    if (curr < prev) return toast.error(`Room ${room.roomNumber}`, 'Current reading cannot be lower than the previous one.');
    setSaving(room.id);
    try {
      await electricityApi.submitReading({ roomId: room.id, readingMonth: month, previousReading: prev, currentReading: curr, ratePerUnit: currentRate, splitCount: split });
      const totalCost = (curr - prev) * currentRate;
      const perHead = Math.round(totalCost / split);
      toast.success(`Room ${room.roomNumber} saved`, `${curr - prev} units · ${rupees(totalCost)}${split > 1 ? ` (÷${split} = ${rupees(perHead)}/student)` : ''}`);
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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[12px] text-[var(--text-secondary)]">Rate per unit:</span>
            {isEditingRate ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-brand-700">₹</span>
                <input
                  type="number"
                  step="0.5"
                  className="w-16 h-7 text-[12px] font-bold px-1.5 py-0 border border-brand-400 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveRate}
                  className="btn-primary h-7 px-2 text-[11px] font-semibold rounded-md"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditingRate(false); setTempRate(String(currentRate)); }}
                  className="btn-secondary h-7 px-1.5 text-[11px] rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingRate(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 hover:bg-brand-100 text-brand-800 text-[12px] font-bold border border-brand-200 transition-colors cursor-pointer"
                title="Click to edit rate per unit (e.g. ₹11 to ₹12)"
              >
                ₹{currentRate}/unit <Pencil size={11} className="text-brand-600 ml-0.5" />
              </button>
            )}
            <span className="text-[11px] text-[var(--text-tertiary)]">· split equally between room residents</span>
          </div>
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
            const d = drafts[room.id] || { prev: '', curr: '', splitCount: 1 };
            const saved = byRoom[room.id];
            const units = num(d.curr) != null && num(d.prev) != null ? num(d.curr) - num(d.prev) : null;
            const residents = room.students?.filter((s) => s.status !== 'CHECKED_OUT').length || 0;
            const savedSplit = saved?.splitCount || (residents ? Math.min(3, Math.max(1, residents)) : (room.sharingType || 1));
            const changed = !saved || String(saved.previousReading) !== d.prev || String(saved.currentReading) !== d.curr || savedSplit !== (d.splitCount || 1);
            const split = d.splitCount || 1;
            const totalCost = units != null && units >= 0 ? units * currentRate : 0;
            const perHead = Math.round(totalCost / split);
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
                {/* Divide by selector */}
                <div className="flex items-center justify-between mt-2.5 px-2.5 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200/60">
                  <span className="text-[11px] font-bold text-amber-900">Divide bill by:</span>
                  <div className="inline-flex gap-1.5">
                    {[1, 2, 3].map((n) => {
                      const active = split === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDrafts((x) => ({ ...x, [room.id]: { ...d, splitCount: n } }))}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                            active
                              ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {n === 1 ? '1 (Full)' : `÷ ${n}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {units != null && units >= 0 && (
                  <p className="text-[12px] text-[var(--text-secondary)] m-0 mt-2">
                    {units} units · <strong>{rupees(totalCost)}</strong>
                    {split > 1 ? (
                      <span className="text-brand-700 font-semibold"> · ÷{split} = {rupees(perHead)} / student</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]"> · 1 student (Full bill {rupees(totalCost)})</span>
                    )}
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
