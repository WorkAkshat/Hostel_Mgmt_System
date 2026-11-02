import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Check, Search, Snowflake, User, X } from 'lucide-react';
import CustomModal from '../../components/CustomModal';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import { students as studentsApi } from '../../utils/api';
import { priceFor } from '../../config/hostel';

const capacityOf = (r) => r.sharingType || r.capacity || 0;

const AssignRoomModal = ({
  isOpen,
  onClose,
  student: initialStudent = null,
  room: initialRoom = null,
  students = [],
  rooms = [],
  onSuccess,
}) => {
  const toast = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedStudentId(initialStudent?.id || '');
    setSelectedRoomId(initialRoom?.id || initialStudent?.roomId || '');
    setStudentSearch('');
    setError(null);
    setSaving(false);
  }, [isOpen, initialStudent, initialRoom]);

  // Current selected student object
  const currentStudent = useMemo(() => {
    if (initialStudent) return initialStudent;
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [initialStudent, students, selectedStudentId]);

  // Current selected room object
  const currentRoom = useMemo(() => {
    if (initialRoom) return initialRoom;
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [initialRoom, rooms, selectedRoomId]);

  // Sorted & filtered students for selection
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return [...students]
      .filter((s) => {
        if (!q) return true;
        return [s.user?.name, s.user?.email, s.rollNumber, s.phoneNumber, s.room?.roomNumber]
          .some((v) => v && String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // Unassigned first, then alphabetical
        const aNoRoom = !a.roomId;
        const bNoRoom = !b.roomId;
        if (aNoRoom && !bNoRoom) return -1;
        if (!aNoRoom && bNoRoom) return 1;
        return (a.user?.name || '').localeCompare(b.user?.name || '');
      });
  }, [students, studentSearch]);

  // Available rooms grouped by floor with free bed calculation
  const floorGroups = useMemo(() => {
    const groups = new Map();
    [...rooms]
      .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
      .forEach((r) => {
        const key = r.floorNumber ?? 0;
        if (!groups.has(key)) groups.set(key, []);
        const cap = capacityOf(r);
        const occupants = (r.students || []).filter((s) => s.id !== currentStudent?.id);
        const freeBeds = Math.max(0, cap - occupants.length);
        const isCurrent = currentStudent?.roomId && currentStudent.roomId === r.id;
        groups.get(key).push({ ...r, freeBeds, isCurrent });
      });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [rooms, currentStudent]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!currentStudent) {
      setError('Please select a resident to assign.');
      return;
    }

    if (selectedRoomId === (currentStudent.roomId || '')) {
      setError('Selected resident is already in this room.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await studentsApi.update(currentStudent.id, { roomId: selectedRoomId || null });
      if (selectedRoomId && currentRoom) {
        toast.success(
          `Room ${currentRoom.roomNumber} assigned`,
          `${currentStudent.user?.name || 'Resident'} is now in Room ${currentRoom.roomNumber}.`
        );
      } else {
        toast.success(
          'Room unassigned',
          `${currentStudent.user?.name || 'Resident'} was removed from the room.`
        );
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not assign room. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const modalTitle = initialStudent
    ? `Assign room · ${initialStudent.user?.name}`
    : initialRoom
    ? `Assign resident to Room ${initialRoom.roomNumber}`
    : 'Assign room';

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium border border-rose-200">
            {error}
          </div>
        )}

        {/* 1. Resident Selection */}
        {initialStudent ? (
          <div className="p-3.5 rounded-2xl bg-mint-50 border border-mint-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={initialStudent.user?.name}
                src={initialStudent.user?.avatar || initialStudent.profilePic}
                size={40}
              />
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-[var(--text-primary)] truncate">
                  {initialStudent.user?.name}
                </div>
                <div className="text-[12px] text-[var(--text-tertiary)] truncate">
                  {initialStudent.rollNumber} {initialStudent.phoneNumber && `· ${initialStudent.phoneNumber}`}
                </div>
              </div>
            </div>
            <span className={`badge shrink-0 ${initialStudent.room ? 'badge-info' : 'badge-warning'}`}>
              {initialStudent.room ? `Current: Room ${initialStudent.room.roomNumber}` : 'No room yet'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center justify-between">
              <span>Select resident <span className="text-[var(--danger)]">*</span></span>
              {currentStudent?.roomId ? (
                <span className="text-[12px] font-normal text-brand-700">Currently in Room {currentStudent.room?.roomNumber}</span>
              ) : currentStudent ? (
                <span className="text-[12px] font-normal text-amber-700 font-semibold">No room currently</span>
              ) : null}
            </label>
            <div className="relative">
              <select
                className="form-input cursor-pointer"
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setError(null);
                }}
              >
                <option value="">-- Choose a student --</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user?.name} ({s.rollNumber || 'No roll'}) · {s.room ? `Room ${s.room.roomNumber}` : '★ NO ROOM'}
                  </option>
                ))}
              </select>
            </div>
            {filteredStudents.length > 5 && (
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter student by name or roll number..."
                  className="form-input pl-8 py-1.5 text-[12px]"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* 2. Room Selection */}
        {initialRoom ? (
          <div className="p-3.5 rounded-2xl bg-mint-50 border border-mint-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white border border-mint-200 flex flex-col items-center justify-center font-bold text-brand-700 text-[14px]">
                {initialRoom.roomNumber}
              </span>
              <div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">
                  Floor {initialRoom.floorNumber} · {priceFor(initialRoom.sharingType).label}
                </div>
                <div className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                  {initialRoom.isAc && <><Snowflake size={12} className="text-brand-500" /> AC · </>}
                  ₹{priceFor(initialRoom.sharingType).total.toLocaleString('en-IN')}/month
                </div>
              </div>
            </div>
            <span className="badge badge-success shrink-0">
              {Math.max(0, capacityOf(initialRoom) - (initialRoom.students?.length || 0))} bed(s) free
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[var(--text-primary)]">
              Select room <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              className="form-input cursor-pointer"
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setError(null);
              }}
            >
              <option value="">-- No room (leave unassigned) --</option>
              {floorGroups.map(([flNum, list]) => (
                <optgroup key={flNum} label={`Floor ${flNum || '—'}`}>
                  {list.map((r) => {
                    const unavailable = !r.isCurrent && (r.status === 'MAINTENANCE' || r.freeBeds <= 0);
                    return (
                      <option key={r.id} value={r.id} disabled={unavailable}>
                        Room {r.roomNumber} · {priceFor(r.sharingType).label} · {r.isAc ? 'AC' : 'Non-AC'} ·{' '}
                        {r.isCurrent
                          ? '(Current room)'
                          : r.status === 'MAINTENANCE'
                          ? 'Under maintenance'
                          : r.freeBeds > 0
                          ? `${r.freeBeds} bed${r.freeBeds === 1 ? '' : 's'} free`
                          : 'Full'}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Selected Room Details Preview */}
        {currentRoom && (
          <div className="p-3.5 rounded-2xl bg-cream-100 border border-cream-200 text-[13px] flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-white text-sun-800 flex items-center justify-center shrink-0 border border-cream-200">
                <BedDouble size={16} />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-[var(--text-primary)] truncate">
                  Room {currentRoom.roomNumber} · Floor {currentRoom.floorNumber}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] truncate">
                  {priceFor(currentRoom.sharingType).label}
                  {currentRoom.isAc ? ' · AC' : ' · Non-AC'} · ₹{priceFor(currentRoom.sharingType).total.toLocaleString('en-IN')}/mo
                </div>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-sun-800 shrink-0">
              {Math.max(0, capacityOf(currentRoom) - (currentRoom.students || []).filter((s) => s.id !== currentStudent?.id).length)} bed(s) available
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 mt-2 justify-end pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            className="btn-secondary h-10 px-4 text-[13px]"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-brand h-10 px-5 text-[13px] font-semibold flex items-center gap-2"
            disabled={saving || (!selectedStudentId && !initialStudent) || (!selectedRoomId && !initialRoom && !currentStudent?.roomId)}
          >
            <BedDouble size={15} />
            {saving
              ? 'Assigning…'
              : !selectedRoomId && currentStudent?.roomId
              ? 'Remove from room'
              : currentStudent?.roomId && currentStudent.roomId !== selectedRoomId
              ? 'Change room'
              : 'Assign room'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default AssignRoomModal;

