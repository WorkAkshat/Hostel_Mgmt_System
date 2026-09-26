import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble, Check, ClipboardCheck, LogOut, Pencil, Phone, Plus, Search, Snowflake, Trash2, UserPlus, Wrench, X,
} from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { rooms as roomsApi, students as studentsApi } from '../../utils/api';
import { priceFor } from '../../config/hostel';

export const ROOM_STATUS = {
  AVAILABLE: { label: 'Has space', badge: 'badge-success' },
  FULL: { label: 'Full', badge: 'badge-info' },
  MAINTENANCE: { label: 'Maintenance', badge: 'badge-danger' },
};

const parseAssets = (room) => {
  try {
    const list = typeof room?.assets === 'string' ? JSON.parse(room.assets || '[]') : room?.assets || [];
    return Array.isArray(list) ? list.map((a) => ({ name: a.name, status: a.status === 'Broken' || a.status === 'Damaged' ? 'Damaged' : 'Working' })) : [];
  } catch {
    return [];
  }
};

const Section = ({ title, action, children }) => (
  <section className="mt-6 first:mt-0">
    <div className="flex items-center justify-between mb-2.5">
      <h4 className="text-[12px] font-bold text-brand-700 tracking-wide m-0">{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

const RoomDrawer = ({ room: openRoom, unassigned, onClose, onEdit, onDelete, onChanged, onPreview }) => {
  const toast = useToast();
  // Keep showing the last room while the drawer slides closed
  const lastRoom = useRef(openRoom);
  if (openRoom) lastRoom.current = openRoom;
  const room = openRoom || lastRoom.current;
  const [assets, setAssets] = useState([]);
  const [assetsDirty, setAssetsDirty] = useState(false);
  const [newAsset, setNewAsset] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [busy, setBusy] = useState(null);
  const [movingOut, setMovingOut] = useState(null);

  useEffect(() => {
    if (!openRoom) return;
    const room = openRoom;
    setAssets(parseAssets(room));
    setAssetsDirty(false);
    setPicking(false);
    setPickSearch('');
    setNewAsset('');
  }, [openRoom]);

  const candidates = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return unassigned.filter((s) => !q || [s.user?.name, s.rollNumber, s.phoneNumber].some((v) => v && v.toLowerCase().includes(q)));
  }, [unassigned, pickSearch]);

  if (!room) return <><Drawer open={false} onClose={onClose} /></>;

  const capacity = room.sharingType || room.capacity || 0;
  const occupants = room.students || [];
  const free = Math.max(0, capacity - occupants.length);
  const status = ROOM_STATUS[room.status] || ROOM_STATUS.AVAILABLE;
  const price = priceFor(room.sharingType);
  const inMaintenance = room.status === 'MAINTENANCE';
  const damaged = assets.filter((a) => a.status === 'Damaged').length;

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(...success);
      await onChanged();
      return true;
    } catch (err) {
      toast.error('Something went wrong', err.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const assign = (student) =>
    run(`assign-${student.id}`, () => studentsApi.update(student.id, { roomId: room.id }), [
      `${student.user?.name} moved in`, `Room ${room.roomNumber}`,
    ]).then((ok) => ok && setPicking(false));

  const moveOut = async () => {
    const ok = await run(`out-${movingOut.id}`, () => studentsApi.update(movingOut.id, { roomId: '' }), [
      `${movingOut.user?.name} moved out`, `Room ${room.roomNumber} now has a free bed`,
    ]);
    if (!ok) throw new Error('failed');
  };

  const toggleMaintenance = () =>
    run('status', () => roomsApi.update(room.id, { status: inMaintenance ? 'AVAILABLE' : 'MAINTENANCE' }), [
      inMaintenance ? 'Room is back in use' : 'Room marked for maintenance',
      inMaintenance ? 'Students can be assigned again' : 'No new students can be assigned',
    ]);

  const saveAssets = () =>
    run('assets', () => roomsApi.update(room.id, { assets }), ['Checklist saved', `Room ${room.roomNumber}`]).then(
      (ok) => ok && setAssetsDirty(false)
    );

  const updateAsset = (index, patch) => {
    setAssets((list) => list.map((a, i) => (i === index ? { ...a, ...patch } : a)));
    setAssetsDirty(true);
  };

  const addAsset = (e) => {
    e.preventDefault();
    if (!newAsset.trim()) return;
    setAssets((list) => [...list, { name: newAsset.trim(), status: 'Working' }]);
    setNewAsset('');
    setAssetsDirty(true);
  };

  return (
    <>
      <Drawer
        open={Boolean(openRoom)}
        onClose={onClose}
        title={`Room ${room.roomNumber}`}
        header={
          <div className="flex items-center gap-3.5">
            <span className="w-14 h-14 rounded-2xl bg-white border border-mint-200 flex flex-col items-center justify-center shrink-0">
              <span className="text-[11px] text-[var(--text-tertiary)] leading-none">Room</span>
              <span className="text-[18px] font-bold text-brand-700 leading-tight">{room.roomNumber}</span>
            </span>
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold m-0">Floor {room.floorNumber} · {price.label}</h3>
              <p className="text-[13px] text-[var(--text-secondary)] m-0 truncate">{room.block}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`badge ${status.badge}`}>{status.label}</span>
                {room.isAc && <span className="badge badge-info"><Snowflake size={12} /> AC</span>}
                <span className="badge bg-cream-100 text-sun-800 normal-case">₹{price.total.toLocaleString('en-IN')}/bed</span>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-2">
            <button className="btn-brand flex-1 h-11" onClick={() => onEdit(room)}>
              <Pencil size={16} /> Edit room
            </button>
            <button
              className={`h-11 px-4 rounded-[var(--border-radius-btn)] border text-[14px] font-semibold cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-60 ${
                inMaintenance ? 'bg-[var(--success-bg)] border-transparent text-[var(--success)]' : 'bg-white border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-peach-50'
              }`}
              onClick={toggleMaintenance}
              disabled={busy === 'status'}
              title={inMaintenance ? 'Open the room for students again' : 'Block the room for repairs'}
            >
              <Wrench size={16} /> <span className="hidden sm:inline">{inMaintenance ? 'End maintenance' : 'Maintenance'}</span>
            </button>
            <button
              className="h-11 w-11 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] border-none cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onDelete(room)}
              disabled={occupants.length > 0}
              aria-label="Delete room"
              title={occupants.length ? 'Move residents out before deleting' : 'Delete room'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        }
      >
        {/* Beds */}
        <Section title={`Beds · ${occupants.length} of ${capacity} taken`}>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {Array.from({ length: capacity }).map((_, i) => {
              const s = occupants[i];
              const bedLabel = s?.bedId || `Bed ${String.fromCharCode(65 + i)}`;
              return (
                <motion.li
                  key={s?.id || `free-${i}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${s ? 'bg-mint-50' : 'border border-dashed border-[var(--border-strong)]'}`}
                >
                  {s ? (
                    <>
                      <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={40} onPreview={onPreview} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold truncate">{s.user?.name}</span>
                        <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                          {bedLabel} · {s.rollNumber}
                        </span>
                      </span>
                      {s.phoneNumber && (
                        <a href={`tel:${s.phoneNumber}`} className="w-9 h-9 rounded-lg bg-white text-brand-700 flex items-center justify-center" aria-label={`Call ${s.user?.name}`}>
                          <Phone size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => setMovingOut(s)}
                        className="w-9 h-9 rounded-lg bg-white text-[var(--text-tertiary)] hover:text-[var(--danger)] border-none cursor-pointer flex items-center justify-center"
                        aria-label={`Move ${s.user?.name} out`}
                        title="Move out of this room"
                      >
                        <LogOut size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="w-10 h-10 rounded-full bg-mint-50 text-brand-400 flex items-center justify-center shrink-0">
                        <BedDouble size={17} />
                      </span>
                      <span className="flex-1 text-[14px] text-[var(--text-tertiary)]">{bedLabel} · empty</span>
                      {!inMaintenance && (
                        <button className="btn-secondary h-9 px-3 text-[13px]" onClick={() => setPicking(true)}>
                          <UserPlus size={14} /> Assign
                        </button>
                      )}
                    </>
                  )}
                </motion.li>
              );
            })}
          </ul>
          {inMaintenance && free > 0 && (
            <p className="text-[12px] text-[var(--warning)] mt-2 mb-0">End maintenance to assign students to the free beds.</p>
          )}

          <AnimatePresence>
            {picking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 rounded-2xl border border-[var(--border-color)] bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold">Students without a room</span>
                    <button onClick={() => setPicking(false)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:bg-mint-50" aria-label="Close list">
                      <X size={15} />
                    </button>
                  </div>
                  <label className="relative block mb-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input className="form-input h-10 pl-9" placeholder="Search name or roll no." value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} autoFocus />
                  </label>
                  {candidates.length === 0 ? (
                    <p className="text-[13px] text-[var(--text-tertiary)] m-0 py-3 text-center">
                      {unassigned.length ? 'No match.' : 'Every student already has a room.'}
                    </p>
                  ) : (
                    <ul className="list-none m-0 p-0 max-h-[240px] overflow-y-auto custom-scrollbar">
                      {candidates.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-b-0">
                          <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={34} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate">{s.user?.name}</span>
                            <span className="block text-[12px] text-[var(--text-tertiary)]">{s.rollNumber}</span>
                          </span>
                          <button className="btn-brand h-8 px-3 text-[12px]" disabled={busy === `assign-${s.id}`} onClick={() => assign(s)}>
                            {busy === `assign-${s.id}` ? 'Saving…' : 'Assign'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* Assets checklist */}
        <Section
          title={`Room checklist${damaged ? ` · ${damaged} damaged` : ''}`}
          action={assetsDirty && (
            <button className="btn-primary h-8 px-3 text-[12px]" onClick={saveAssets} disabled={busy === 'assets'}>
              <Check size={14} /> {busy === 'assets' ? 'Saving…' : 'Save checklist'}
            </button>
          )}
        >
          {assets.length === 0 ? (
            <p className="text-[13px] text-[var(--text-tertiary)] m-0">No items listed for this room yet.</p>
          ) : (
            <ul className="list-none m-0 p-0 rounded-xl border border-[var(--border-color)] overflow-hidden">
              {assets.map((asset, index) => (
                <li key={`${asset.name}-${index}`} className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border-color)] last:border-b-0">
                  <ClipboardCheck size={16} className={asset.status === 'Damaged' ? 'text-[var(--danger)]' : 'text-brand-500'} />
                  <span className="flex-1 text-[14px]">{asset.name}</span>
                  <div className="flex p-0.5 rounded-lg bg-mint-50" role="radiogroup" aria-label={`${asset.name} condition`}>
                    {['Working', 'Damaged'].map((state) => {
                      const active = asset.status === state;
                      return (
                        <button
                          key={state}
                          role="radio"
                          aria-checked={active}
                          onClick={() => updateAsset(index, { status: state })}
                          className={`h-7 px-2.5 rounded-md text-[12px] font-semibold border-none cursor-pointer transition-colors ${
                            active
                              ? state === 'Working' ? 'bg-white text-[var(--success)] shadow-[var(--shadow-sm)]' : 'bg-[var(--danger)] text-white'
                              : 'bg-transparent text-[var(--text-tertiary)]'
                          }`}
                        >
                          {state}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setAssets((list) => list.filter((_, i) => i !== index)); setAssetsDirty(true); }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--danger)] bg-transparent border-none cursor-pointer"
                    aria-label={`Remove ${asset.name}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addAsset} className="flex gap-2 mt-2">
            <input className="form-input h-10 flex-1" placeholder="Add an item, e.g. Cupboard" value={newAsset} onChange={(e) => setNewAsset(e.target.value)} aria-label="New checklist item" />
            <button type="submit" className="btn-secondary h-10 px-3" disabled={!newAsset.trim()}>
              <Plus size={15} /> Add
            </button>
          </form>
        </Section>
      </Drawer>

      <ConfirmDialog
        open={Boolean(movingOut)}
        tone="default"
        title={`Move ${movingOut?.user?.name} out of room ${room.roomNumber}?`}
        message="She will stay a resident but without a room, so you can assign her somewhere else."
        confirmLabel="Move out"
        onConfirm={moveOut}
        onClose={() => setMovingOut(null)}
      />
    </>
  );
};

export default RoomDrawer;
