import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, Building2, Plus, RefreshCw, Search, Snowflake, TriangleAlert, Wrench, X } from 'lucide-react';
import { rooms as roomsApi, floors as floorsApi, students as studentsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import ImageLightbox from '../components/ui/ImageLightbox';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FilterChips from '../components/ui/FilterChips';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { useToast } from '../components/ui/Toast';
import RoomFormModal from './rooms/RoomFormModal';
import RoomDrawer, { ROOM_STATUS } from './rooms/RoomDrawer';
import { priceFor } from '../config/hostel';

const capacityOf = (room) => room.sharingType || room.capacity || 0;

const damagedCount = (room) => {
  try {
    const list = typeof room.assets === 'string' ? JSON.parse(room.assets || '[]') : room.assets || [];
    return list.filter((a) => a.status === 'Broken' || a.status === 'Damaged').length;
  } catch {
    return 0;
  }
};

const byRoomNumber = (a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });

const RoomCard = ({ room, index, onOpen }) => {
  const capacity = capacityOf(room);
  const occupants = room.students || [];
  const free = Math.max(0, capacity - occupants.length);
  const status = ROOM_STATUS[room.status] || ROOM_STATUS.AVAILABLE;
  const maintenance = room.status === 'MAINTENANCE';
  const damaged = damagedCount(room);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.025 } }}
      whileHover={{ y: -3 }}
      onClick={() => onOpen(room)}
      className={`text-left w-full rounded-[var(--border-radius-card)] border p-4 cursor-pointer transition-[border-color,box-shadow] hover:shadow-[var(--shadow-hover)] ${
        maintenance ? 'bg-peach-50 border-peach-100 hover:border-peach-200' : 'bg-white border-[var(--border-color)] hover:border-brand-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[22px] font-bold leading-none tracking-tight">{room.roomNumber}</div>
          <div className="text-[12px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
            {priceFor(room.sharingType).label}
            {room.isAc && <><span>·</span><Snowflake size={12} className="text-brand-500" /> AC</>}
          </div>
        </div>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <div className="flex gap-1.5 mt-4" aria-label={`${occupants.length} of ${capacity} beds taken`}>
        {Array.from({ length: capacity }).map((_, i) => {
          const s = occupants[i];
          return s ? (
            <span key={s.id} title={s.user?.name} className="flex-1 h-11 rounded-xl bg-mint-100 flex items-center justify-center">
              <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={30} tone="white" />
            </span>
          ) : (
            <span key={i} className={`flex-1 h-11 rounded-xl border border-dashed flex items-center justify-center ${maintenance ? 'border-peach-200 text-peach-500' : 'border-[var(--border-strong)] text-[var(--text-tertiary)]'}`}>
              <BedDouble size={16} />
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-[12px]">
        <span className={free && !maintenance ? 'font-semibold text-sun-800' : 'text-[var(--text-tertiary)]'}>
          {maintenance ? 'Under repair' : free ? `${free} bed${free === 1 ? '' : 's'} free` : 'No free bed'}
        </span>
        {damaged > 0 ? (
          <span className="flex items-center gap-1 text-[var(--danger)] font-semibold"><Wrench size={12} /> {damaged} damaged</span>
        ) : (
          <span className="text-[var(--text-tertiary)]">₹{priceFor(room.sharingType).total.toLocaleString('en-IN')}/bed</span>
        )}
      </div>
    </motion.button>
  );
};

const Rooms = () => {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [floor, setFloor] = useState(user?.assignedFloor ? String(user.assignedFloor) : 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [acFilter, setAcFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openRoomId, setOpenRoomId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [roomList, floorList, studentList] = await Promise.all([
        roomsApi.getAll(),
        floorsApi.getAll().catch(() => []),
        studentsApi.getAll().catch(() => []),
      ]);
      setRooms(roomList || []);
      setFloors(floorList || []);
      setStudents(studentList || []);
    } catch (err) {
      setLoadError(err.message || 'Could not load rooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (location.state?.action === 'add') {
      setEditing(null);
      setFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Floor list from the Floor table, plus any floor a room mentions
  const floorList = useMemo(() => {
    const nums = new Set([...floors.map((f) => f.floorNumber), ...rooms.map((r) => r.floorNumber).filter(Boolean)]);
    return [...nums].sort((a, b) => a - b).map((n) => floors.find((f) => f.floorNumber === n) || { floorNumber: n });
  }, [floors, rooms]);

  const totals = useMemo(() => {
    const beds = rooms.reduce((sum, r) => sum + capacityOf(r), 0);
    const taken = rooms.reduce((sum, r) => sum + (r.students?.length || 0), 0);
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE');
    const blocked = maintenance.reduce((sum, r) => sum + Math.max(0, capacityOf(r) - (r.students?.length || 0)), 0);
    return { beds, taken, free: Math.max(0, beds - taken - blocked), maintenance: maintenance.length, rooms: rooms.length };
  }, [rooms]);

  const q = search.trim().toLowerCase();
  const inScope = useMemo(
    () => rooms.filter((r) => floor === 'all' || String(r.floorNumber) === floor),
    [rooms, floor]
  );

  const counts = useMemo(() => ({
    all: inScope.length,
    AVAILABLE: inScope.filter((r) => r.status === 'AVAILABLE').length,
    FULL: inScope.filter((r) => r.status === 'FULL').length,
    MAINTENANCE: inScope.filter((r) => r.status === 'MAINTENANCE').length,
  }), [inScope]);

  const visible = useMemo(
    () =>
      inScope
        .filter((r) => statusFilter === 'all' || r.status === statusFilter)
        .filter((r) => acFilter === 'all' || (acFilter === 'ac') === Boolean(r.isAc))
        .filter((r) => !q || String(r.roomNumber).toLowerCase().includes(q) || (r.students || []).some((s) => s.user?.name?.toLowerCase().includes(q)))
        .sort(byRoomNumber),
    [inScope, statusFilter, acFilter, q]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    visible.forEach((r) => {
      const key = r.floorNumber || 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  const unassigned = useMemo(() => students.filter((s) => !s.roomId), [students]);
  const openRoom = rooms.find((r) => r.id === openRoomId) || null;
  const hasFilters = statusFilter !== 'all' || acFilter !== 'all' || q;

  const handleSubmit = async (payload) => {
    if (editing) {
      await roomsApi.update(editing.id, payload);
      toast.success(`Room ${payload.roomNumber} updated`);
    } else {
      await roomsApi.create(payload);
      toast.success(`Room ${payload.roomNumber} added`, `Floor ${payload.floorNumber} · ${priceFor(payload.sharingType).label}`);
    }
    setFormOpen(false);
    await load();
  };

  const handleDelete = async () => {
    try {
      await roomsApi.remove(deleting.id);
      toast.success(`Room ${deleting.roomNumber} deleted`);
      setOpenRoomId(null);
      await load();
    } catch (err) {
      toast.error('Could not delete the room', err.message);
      throw err;
    }
  };

  const floorTabs = [
    { value: 'all', label: 'All floors' },
    ...floorList.map((f) => ({ value: String(f.floorNumber), label: `Floor ${f.floorNumber}` })),
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Rooms & beds</h1>
          <p className="page-subtitle">Tap a room to see who lives there, assign free beds or mark repairs.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={17} /> Add room
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total beds', value: totals.beds, sub: `${totals.rooms} rooms`, tone: 'bg-white border-[var(--border-color)]' },
          { label: 'Beds taken', value: totals.taken, sub: totals.beds ? `${Math.round((totals.taken / totals.beds) * 100)}% occupied` : '—', tone: 'bg-mint-100 border-mint-200' },
          { label: 'Free beds', value: totals.free, sub: 'Ready for new residents', tone: 'bg-cream-100 border-cream-200' },
          { label: 'Under maintenance', value: totals.maintenance, sub: totals.maintenance === 1 ? 'room blocked' : 'rooms blocked', tone: 'bg-peach-50 border-peach-100' },
        ].map((t) => (
          <div key={t.label} className={`rounded-[var(--border-radius-card)] border px-4 py-3.5 ${t.tone}`}>
            <div className="text-[12px] text-[var(--text-secondary)]">{t.label}</div>
            <div className="text-[24px] font-bold leading-tight"><AnimatedNumber value={t.value} /></div>
            <div className="text-[12px] text-[var(--text-tertiary)]">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div role="radiogroup" aria-label="Floor" className="flex flex-wrap gap-1 p-1 rounded-xl bg-mint-50 border border-[var(--border-color)]">
            {floorTabs.map((t) => {
              const active = floor === t.value;
              return (
                <button
                  key={t.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFloor(t.value)}
                  className={`relative h-9 px-3 rounded-lg border-none bg-transparent text-[13px] whitespace-nowrap cursor-pointer ${active ? 'text-sun-900 font-semibold' : 'text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)]'}`}
                >
                  {active && <motion.span layoutId="rooms-floor" className="absolute inset-0 rounded-lg bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 flex-1">
            <label className="relative flex-1">
              <span className="sr-only">Search rooms</span>
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
              <input className="form-input pl-10 pr-9" placeholder="Room or resident" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] bg-transparent border-none cursor-pointer hover:bg-mint-50">
                  <X size={14} />
                </button>
              )}
            </label>
            <select className="form-input w-[160px] shrink-0 cursor-pointer" value={acFilter} onChange={(e) => setAcFilter(e.target.value)} aria-label="AC filter">
              <option value="all">AC & non-AC</option>
              <option value="ac">AC only</option>
              <option value="nonac">Non-AC only</option>
            </select>
          </div>
        </div>
        <FilterChips
          id="room-status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All rooms', count: counts.all },
            { value: 'AVAILABLE', label: 'Has space', count: counts.AVAILABLE },
            { value: 'FULL', label: 'Full', count: counts.FULL },
            { value: 'MAINTENANCE', label: 'Maintenance', count: counts.MAINTENANCE },
          ]}
        />
      </div>

      {/* Rooms */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[170px] rounded-[var(--border-radius-card)] skeleton-loading" />)}
        </div>
      ) : loadError ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-10 flex flex-col items-center gap-3 text-center">
          <TriangleAlert size={26} className="text-[var(--danger)]" />
          <p className="text-[14px] text-[var(--text-secondary)] m-0">{loadError}</p>
          <button className="btn-secondary" onClick={() => { setLoading(true); load(); }}><RefreshCw size={15} /> Try again</button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-12 flex flex-col items-center gap-3 text-center">
          <span className="w-14 h-14 rounded-full bg-mint-100 text-brand-600 flex items-center justify-center"><BedDouble size={24} /></span>
          <h3 className="text-[16px] font-bold m-0">{rooms.length ? 'No rooms match these filters' : 'No rooms yet'}</h3>
          <p className="text-[14px] text-[var(--text-secondary)] m-0">{rooms.length ? 'Try another floor or clear the filters.' : 'Add the first room to start assigning beds.'}</p>
          {hasFilters ? (
            <button className="btn-secondary" onClick={() => { setStatusFilter('all'); setAcFilter('all'); setSearch(''); }}>Clear filters</button>
          ) : !rooms.length && (
            <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add room</button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {grouped.map(([floorNum, list]) => {
            const meta = floorList.find((f) => f.floorNumber === floorNum);
            const beds = list.reduce((s, r) => s + capacityOf(r), 0);
            const taken = list.reduce((s, r) => s + (r.students?.length || 0), 0);
            return (
              <section key={floorNum}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-mint-200 text-brand-800 font-bold flex items-center justify-center"><Building2 size={17} /></span>
                  <h2 className="text-[16px] font-bold m-0">Floor {floorNum || '—'}</h2>
                  {meta?.companyName && <span className="text-[14px] text-[var(--text-secondary)]">{meta.companyName}</span>}
                  <span className="text-[13px] text-[var(--text-tertiary)] sm:ml-auto">
                    {list.length} rooms · {taken}/{beds} beds taken
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {list.map((room, i) => (
                    <RoomCard key={room.id} room={room} index={i} onOpen={(r) => setOpenRoomId(r.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <RoomFormModal
        open={formOpen}
        room={editing}
        floors={floorList}
        defaultFloor={floor}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <RoomDrawer
        room={openRoom}
        unassigned={unassigned}
        onClose={() => setOpenRoomId(null)}
        onEdit={(r) => { setEditing(r); setFormOpen(true); }}
        onDelete={setDeleting}
        onChanged={load}
        onPreview={setPreview}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete room ${deleting?.roomNumber}?`}
        message="The room and its checklist will be removed. This cannot be undone."
        confirmLabel="Delete room"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      <ImageLightbox image={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

export default Rooms;
