import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BedDouble, ChevronRight, Download, LayoutGrid, List, Pencil, Phone, RefreshCw, Search, TriangleAlert, UserPlus, Users, X,
} from 'lucide-react';
import { students as studentsApi, rooms as roomsApi } from '../utils/api';
import StudentAdmissionFormPrint from '../components/StudentAdmissionFormPrint';
import Avatar from '../components/ui/Avatar';
import ImageLightbox from '../components/ui/ImageLightbox';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FilterChips from '../components/ui/FilterChips';
import { useToast } from '../components/ui/Toast';
import StudentFormModal from './students/StudentFormModal';
import StudentDrawer from './students/StudentDrawer';
import { STUDENT_STATUS } from '../config/hostel';

const VIEW_KEY = 'hms_students_view';

const SORTS = {
  name: { label: 'Name A–Z', fn: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || '') },
  room: {
    label: 'Room number',
    fn: (a, b) => String(a.room?.roomNumber || '~').localeCompare(String(b.room?.roomNumber || '~'), undefined, { numeric: true }),
  },
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.dateOfJoining || 0) - new Date(a.dateOfJoining || 0) },
};

const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) || (window.innerWidth < 768 ? 'cards' : 'table');
  } catch {
    return 'table';
  }
};

const toCsv = (rows) => {
  const header = ['Name', 'Roll number', 'Email', 'Phone', 'Parent phone', 'Room', 'Floor', 'Status', 'Joined', 'College / company'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((s) => [
    s.user?.name, s.rollNumber, s.user?.email, s.phoneNumber, s.parentContact,
    s.room?.roomNumber, s.room?.floorNumber, STUDENT_STATUS[s.status]?.label || s.status,
    s.dateOfJoining ? new Date(s.dateOfJoining).toLocaleDateString('en-IN') : '', s.coachingCollege,
  ].map(escape).join(','));
  return [header.map(escape).join(','), ...lines].join('\n');
};

const StatusBadge = ({ status }) => {
  const meta = STUDENT_STATUS[status] || STUDENT_STATUS.CHECKED_IN;
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
};

const RoomLabel = ({ room }) =>
  room ? (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <BedDouble size={14} className="text-brand-600" /> {room.roomNumber}
      {room.floorNumber && <span className="text-[var(--text-tertiary)] font-normal">· Floor {room.floorNumber}</span>}
    </span>
  ) : (
    <span className="text-[13px] text-[var(--text-tertiary)]">No room</span>
  );

const Students = () => {
  const toast = useToast();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [view, setView] = useState(readView);
  const [isSmall, setIsSmall] = useState(() => window.innerWidth < 640);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [studentList, roomList] = await Promise.all([studentsApi.getAll(), roomsApi.getAll()]);
      setStudents(studentList || []);
      setRooms(roomList || []);
    } catch (err) {
      setLoadError(err.message || 'Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dashboard "Add student" quick action lands here
  useEffect(() => {
    if (location.state?.action === 'add') {
      setEditing(null);
      setFormOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  // Tables don't fit on phones — always show cards there
  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep the open drawer in sync after edits
  useEffect(() => {
    if (viewing) setViewing((v) => students.find((s) => s.id === v?.id) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floorNumber).filter(Boolean))].sort((a, b) => a - b),
    [rooms]
  );

  const counts = useMemo(() => ({
    all: students.length,
    CHECKED_IN: students.filter((s) => s.status === 'CHECKED_IN').length,
    CHECKED_OUT: students.filter((s) => s.status === 'CHECKED_OUT').length,
    SUSPENDED: students.filter((s) => s.status === 'SUSPENDED').length,
    unallocated: students.filter((s) => !s.roomId).length,
  }), [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (statusFilter === 'unallocated') { if (s.roomId) return false; }
        else if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (floorFilter !== 'all' && String(s.room?.floorNumber) !== floorFilter) return false;
        if (!q) return true;
        return [s.user?.name, s.user?.email, s.rollNumber, s.room?.roomNumber, s.phoneNumber, s.parentContact, s.coachingCollege]
          .some((v) => v && String(v).toLowerCase().includes(q));
      })
      .sort(SORTS[sort].fn);
  }, [students, search, statusFilter, floorFilter, sort]);

  const hasFilters = search || statusFilter !== 'all' || floorFilter !== 'all';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setFloorFilter('all'); };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); };

  const handleSubmit = async (payload) => {
    if (editing) {
      await studentsApi.update(editing.id, payload);
      toast.success('Changes saved', `${payload.name}'s profile is up to date.`);
    } else {
      await studentsApi.create(payload);
      toast.success('Student added', `${payload.name} can now sign in with her email.`);
    }
    setFormOpen(false);
    await load();
  };

  const handleDelete = async () => {
    try {
      await studentsApi.remove(deleting.id);
      toast.success('Student removed', `${deleting.user?.name} has been deleted.`);
      if (viewing?.id === deleting.id) setViewing(null);
      await load();
    } catch (err) {
      toast.error('Could not delete', err.message);
      throw err;
    }
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.info('List downloaded', `${filtered.length} students exported to CSV.`);
  };

  const chipOptions = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'CHECKED_IN', label: 'Checked in', count: counts.CHECKED_IN },
    { value: 'CHECKED_OUT', label: 'Checked out', count: counts.CHECKED_OUT },
    { value: 'SUSPENDED', label: 'Suspended', count: counts.SUSPENDED },
    { value: 'unallocated', label: 'No room', count: counts.unallocated },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {loading ? 'Loading residents…' : `${counts.all} residents · ${counts.CHECKED_IN} checked in · ${counts.unallocated} without a room`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportCsv} disabled={!filtered.length} title="Download the current list as CSV">
            <Download size={16} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <UserPlus size={17} /> Add student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Search students</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              className="form-input pl-10 pr-10"
              placeholder="Search by name, roll no., room, phone or college"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-mint-50 bg-transparent border-none cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </label>
          <div className="flex gap-2">
            <select className="form-input w-auto flex-1 lg:w-[150px] cursor-pointer" value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} aria-label="Filter by floor">
              <option value="all">All floors</option>
              {floors.map((f) => <option key={f} value={String(f)}>Floor {f}</option>)}
            </select>
            <select className="form-input w-auto flex-1 lg:w-[160px] cursor-pointer" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort students">
              {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="hidden sm:flex p-1 rounded-xl bg-mint-50 border border-[var(--border-color)]" role="group" aria-label="Layout">
              {[{ key: 'table', icon: List, label: 'Table view' }, { key: 'cards', icon: LayoutGrid, label: 'Card view' }].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  aria-label={label}
                  title={label}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors ${
                    view === key ? 'bg-white text-brand-700 shadow-[var(--shadow-sm)]' : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <FilterChips id="student-status" options={chipOptions} value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[68px] rounded-2xl skeleton-loading" />)}
        </div>
      ) : loadError ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-10 flex flex-col items-center text-center gap-3">
          <TriangleAlert size={26} className="text-[var(--danger)]" />
          <p className="text-[14px] text-[var(--text-secondary)] m-0">{loadError}</p>
          <button className="btn-secondary" onClick={() => { setLoading(true); load(); }}><RefreshCw size={15} /> Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-12 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-mint-100 text-brand-600 flex items-center justify-center"><Users size={24} /></span>
          <h3 className="text-[16px] font-bold m-0">{students.length ? 'No students match these filters' : 'No students yet'}</h3>
          <p className="text-[14px] text-[var(--text-secondary)] m-0 max-w-sm">
            {students.length ? 'Try a different search or clear the filters.' : 'Add your first resident, or approve registrations from the Approvals tab.'}
          </p>
          {students.length ? (
            <button className="btn-secondary mt-1" onClick={clearFilters}>Clear filters</button>
          ) : (
            <button className="btn-primary mt-1" onClick={openAdd}><UserPlus size={16} /> Add student</button>
          )}
        </div>
      ) : view === 'table' && !isSmall ? (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll no.</th>
                <th>Room</th>
                <th>Phone</th>
                <th>Parent</th>
                <th>Status</th>
                <th className="text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, index) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 12) * 0.02 }}
                  onClick={() => setViewing(s)}
                  className="cursor-pointer group"
                >
                  <td>
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={38} onPreview={setPreview} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate group-hover:text-brand-700">{s.user?.name}</div>
                        <div className="text-[12px] text-[var(--text-tertiary)] truncate">{s.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><code className="text-[12px] text-[var(--text-secondary)]">{s.rollNumber}</code></td>
                  <td><RoomLabel room={s.room} /></td>
                  <td className="whitespace-nowrap">{s.phoneNumber}</td>
                  <td className="whitespace-nowrap">{s.parentContact}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-mint-100 hover:text-brand-700 bg-transparent border-none cursor-pointer"
                        aria-label={`Edit ${s.user?.name}`}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <ChevronRight size={17} className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 text-[12px] text-[var(--text-tertiary)] border-t border-[var(--border-color)]">
            Showing {filtered.length} of {students.length} students
            {hasFilters && <button onClick={clearFilters} className="ml-2 text-brand-700 font-semibold bg-transparent border-none cursor-pointer p-0">Clear filters</button>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {filtered.map((s, index) => (
              <motion.article
                key={s.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 9) * 0.03 } }}
                exit={{ opacity: 0 }}
                whileHover={{ y: -3 }}
                onClick={() => setViewing(s)}
                className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 cursor-pointer hover:border-brand-200 hover:shadow-[var(--shadow-hover)] transition-[border-color,box-shadow]"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={s.user?.name} src={s.user?.avatar || s.profilePic} size={48} rounded="rounded-2xl" onPreview={setPreview} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold m-0 truncate">{s.user?.name}</h3>
                    <p className="text-[12px] text-[var(--text-tertiary)] m-0 truncate">{s.rollNumber}</p>
                    <div className="mt-1.5"><StatusBadge status={s.status} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-mint-50 px-3 py-2">
                    <div className="text-[11px] text-[var(--text-tertiary)]">Room</div>
                    <RoomLabel room={s.room} />
                  </div>
                  <div className="rounded-xl bg-mint-50 px-3 py-2">
                    <div className="text-[11px] text-[var(--text-tertiary)]">Parent</div>
                    <div className="text-[13px] font-medium flex items-center gap-1"><Phone size={12} className="text-brand-600" /> {s.parentContact || '—'}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary flex-1 h-9 text-[13px]" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn-secondary flex-1 h-9 text-[13px]" onClick={(e) => { e.stopPropagation(); setViewing(s); }}>
                    View profile
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <StudentFormModal
        open={formOpen}
        student={editing}
        rooms={rooms}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <StudentDrawer
        student={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onDelete={setDeleting}
        onPrint={setPrinting}
        onPreview={setPreview}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.user?.name || 'this student'}?`}
        message="Her login, invoices, leaves and complaints will be permanently removed. This cannot be undone."
        confirmLabel="Delete student"
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />

      <ImageLightbox image={preview} onClose={() => setPreview(null)} />

      {printing && <StudentAdmissionFormPrint student={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
};

export default Students;
