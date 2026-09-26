import { useMemo } from 'react';
import { BedDouble, Snowflake } from 'lucide-react';
import { priceFor } from '../../config/hostel';

const capacityOf = (room) => room.sharingType || room.capacity || 0;

// Rooms grouped by floor with free beds and monthly fee.
// `currentStudentId` lets the student's own room stay selectable while editing.
const RoomSelect = ({ rooms, value, onChange, currentStudentId, id = 'room-select' }) => {
  const floors = useMemo(() => {
    const groups = new Map();
    [...rooms]
      .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
      .forEach((room) => {
        const key = room.floorNumber ?? 0;
        if (!groups.has(key)) groups.set(key, []);
        const others = (room.students || []).filter((s) => s.id !== currentStudentId).length;
        groups.get(key).push({ ...room, free: capacityOf(room) - others });
      });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [rooms, currentStudentId]);

  const selected = floors.flatMap(([, list]) => list).find((r) => r.id === value);
  const price = selected ? priceFor(selected.sharingType) : null;

  return (
    <div className="flex flex-col gap-2">
      <select id={id} className="form-input cursor-pointer" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">No room yet</option>
        {floors.map(([floor, list]) => (
          <optgroup key={floor} label={floor ? `Floor ${floor}` : 'Other rooms'}>
            {list.map((room) => {
              const unavailable = room.id !== value && (room.status === 'MAINTENANCE' || room.free <= 0);
              return (
                <option key={room.id} value={room.id} disabled={unavailable}>
                  Room {room.roomNumber} · {priceFor(room.sharingType).label} · {room.isAc ? 'AC' : 'Non-AC'} ·{' '}
                  {room.status === 'MAINTENANCE' ? 'Maintenance' : room.free > 0 ? `${room.free} bed${room.free === 1 ? '' : 's'} free` : 'Full'}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      {selected && price && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-cream-100 border border-cream-200 text-[13px] animate-fade-in">
          <span className="flex items-center gap-2 min-w-0">
            <BedDouble size={16} className="text-sun-800 shrink-0" />
            <span className="truncate">
              <strong className="text-[var(--text-primary)]">₹{price.total.toLocaleString('en-IN')}/month</strong>
              <span className="text-[var(--text-secondary)]"> · room ₹{price.roomRent.toLocaleString('en-IN')} + mess ₹{price.messFee.toLocaleString('en-IN')}</span>
            </span>
          </span>
          {selected.isAc && (
            <span className="badge badge-info shrink-0"><Snowflake size={12} /> AC</span>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomSelect;
