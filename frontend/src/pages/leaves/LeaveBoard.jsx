import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Check, Clock, Download, LogIn, LogOut, PhoneCall, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { leaves as leavesApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import FilterChips from '../../components/ui/FilterChips';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../../components/ui/PageStates';
import { LEAVE_STATUS, LEAVE_TYPES } from '../../config/hostel';
import { daysSpan, downloadCsv, duration, fmtDateTime, plural, timeAgo } from '../../utils/format';

const isLate = (l) => l.status === 'CHECKED_OUT' && new Date(l.endDate) < new Date();

const GATE_COPY = {
  out: {
    title: (n) => `Mark ${n} as left the hostel?`,
    message: 'The gate exit time is recorded now and her parents are informed that she has left.',
    confirm: 'Yes, she has left',
  },
  in: {
    title: (n) => `Mark ${n} as back in the hostel?`,
    message: 'The return time is recorded now and her status goes back to checked in.',
    confirm: 'Yes, she is back',
  },
};

const LeaveCard = ({ leave, isAdmin, busy, onApprove, onReject, onGate }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const s = leave.student || {};
  const name = s.user?.name || 'Resident';
  const status = LEAVE_STATUS[leave.status] || LEAVE_STATUS.PENDING;
  const late = isLate(leave);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      className={`bg-white border rounded-[var(--border-radius-card)] p-4 sm:p-5 flex flex-col gap-3.5 ${late ? 'border-[var(--danger)]/40' : 'border-[var(--border-color)]'}`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} src={s.user?.avatar || s.profilePic} size={44} tone="lilac" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-bold m-0 truncate">{name}</h3>
            <span className={`badge ${status.badge} normal-case`}>{status.short}</span>
            {late && <span className="badge badge-danger normal-case"><Clock size={12} /> Late by {duration(leave.endDate)}</span>}
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] m-0 mt-0.5">
            {s.rollNumber}{s.room ? ` · Room ${s.room.roomNumber}` : ''}{s.room?.floorNumber ? ` · Floor ${s.room.floorNumber}` : ''} · applied {timeAgo(leave.createdAt)}
          </p>
        </div>
        {s.parentContact && (
          <a href={`tel:${s.parentContact}`} className="w-9 h-9 rounded-xl bg-mint-50 text-brand-700 flex items-center justify-center shrink-0 hover:bg-mint-100" title="Call parent" aria-label={`Call ${name}'s parent`}>
            <PhoneCall size={16} />
          </a>
        )}
      </div>

      <div className="rounded-xl bg-[var(--bg-primary)] px-3.5 py-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="badge bg-lilac-50 text-lilac-700 normal-case">{LEAVE_TYPES[leave.type] || leave.type}</span>
          <span className="font-semibold">{fmtDateTime(leave.startDate)}</span>
          <span className="text-[var(--text-tertiary)]">→</span>
          <span className="font-semibold">{fmtDateTime(leave.endDate)}</span>
          <span className="text-[var(--text-tertiary)]">· {plural(daysSpan(leave.startDate, leave.endDate), 'day')}</span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] m-0">“{leave.reason}”{leave.destination ? ` · ${leave.destination}` : ''}</p>
        {(leave.checkoutTime || leave.checkinTime) && (
          <p className="text-[12px] text-[var(--text-tertiary)] m-0 flex flex-wrap gap-x-3">
            {leave.checkoutTime && <span className="flex items-center gap-1"><LogOut size={12} /> Left {fmtDateTime(leave.checkoutTime)}</span>}
            {leave.checkinTime && <span className="flex items-center gap-1"><LogIn size={12} /> Back {fmtDateTime(leave.checkinTime)}</span>}
          </p>
        )}
        {leave.comments && <p className="text-[12px] text-[var(--text-secondary)] m-0">Warden note: {leave.comments}</p>}
      </div>

      {/* Actions for the current step */}
      {leave.status === 'PENDING' && isAdmin && !rejecting && (
        <div className="flex gap-2">
          <button className="btn-brand flex-1 h-10" disabled={busy} onClick={() => onApprove(leave)}>
            <Check size={16} /> {busy ? 'Saving…' : 'Approve'}
          </button>
          <button
            className="h-10 px-4 rounded-[var(--border-radius-btn)] bg-[var(--danger-bg)] text-[var(--danger)] text-[14px] font-semibold border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            <X size={15} /> Reject
          </button>
        </div>
      )}
      <AnimatePresence>
        {rejecting && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={async (e) => { e.preventDefault(); if (await onReject(leave, reason.trim())) setRejecting(false); }}
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input autoFocus className="form-input h-10 flex-1" placeholder="Reason (the student will see this)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason for rejecting" />
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="h-10 px-4 rounded-[var(--border-radius-btn)] bg-[var(--danger)] text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60">
                  {busy ? 'Saving…' : 'Reject leave'}
                </button>
                <button type="button" className="btn-secondary h-10 px-3 text-[13px]" onClick={() => setRejecting(false)}>Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {leave.status === 'APPROVED' && (
        <button className="btn-primary h-10" disabled={busy} onClick={() => onGate(leave, 'out')}>
          <LogOut size={16} /> She is leaving now
        </button>
      )}
      {leave.status === 'CHECKED_OUT' && (
        <button className="btn-brand h-10" disabled={busy} onClick={() => onGate(leave, 'in')}>
          <LogIn size={16} /> She is back
        </button>
      )}
    </motion.li>
  );
};

const LeaveBoard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'ADMIN';
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(isAdmin ? 'PENDING' : 'APPROVED');
  const [floor, setFloor] = useState(user.assignedFloor ? String(user.assignedFloor) : 'all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [gate, setGate] = useState(null); // { leave, kind: 'out' | 'in' }

  const load = useCallback(async () => {
    try {
      setError(null);
      setLeaves((await leavesApi.getAll()) || []);
    } catch (err) {
      setError(err.message || 'Could not load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const floors = useMemo(
    () => [...new Set(leaves.map((l) => l.student?.room?.floorNumber).filter(Boolean))].sort((a, b) => a - b),
    [leaves]
  );

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leaves
      .filter((l) => floor === 'all' || String(l.student?.room?.floorNumber) === floor)
      .filter((l) => !q || [l.student?.user?.name, l.student?.rollNumber, l.student?.room?.roomNumber, l.reason].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [leaves, floor, search]);

  const count = (st) => scoped.filter((l) => l.status === st).length;
  const tabs = [
    ...(isAdmin ? [{ value: 'PENDING', label: 'Waiting for you', count: count('PENDING') }] : []),
    { value: 'APPROVED', label: 'Ready to leave', count: count('APPROVED') },
    { value: 'CHECKED_OUT', label: 'Out now', count: count('CHECKED_OUT') },
    { value: 'RETURNED', label: 'Returned', count: count('RETURNED') },
    ...(isAdmin ? [{ value: 'REJECTED', label: 'Rejected', count: count('REJECTED') }] : []),
    { value: 'all', label: 'All', count: scoped.length },
  ];

  const visible = useMemo(() => {
    const list = scoped.filter((l) => tab === 'all' || l.status === tab);
    // Most urgent first: late returns, then soonest departure
    return list.sort((a, b) => (isLate(b) - isLate(a)) || (tab === 'CHECKED_OUT'
      ? new Date(a.endDate) - new Date(b.endDate)
      : tab === 'RETURNED' || tab === 'REJECTED' || tab === 'all'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.startDate) - new Date(b.startDate)));
  }, [scoped, tab]);

  const lateCount = scoped.filter(isLate).length;

  const updateLocal = (id, patch) => setLeaves((list) => list.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const decide = async (leave, status, comments = '') => {
    setBusyId(leave.id);
    try {
      await leavesApi.updateStatus(leave.id, status, comments);
      updateLocal(leave.id, { status, comments });
      toast.success(
        status === 'APPROVED' ? `Leave approved for ${leave.student?.user?.name}` : `Leave rejected for ${leave.student?.user?.name}`,
        status === 'APPROVED' ? 'The student and parents have been notified.' : 'The student has been notified.'
      );
      return true;
    } catch (err) {
      toast.error('Could not update the leave', err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const confirmGate = async () => {
    const { leave, kind } = gate;
    try {
      if (kind === 'out') await leavesApi.logCheckout(leave.id);
      else await leavesApi.logCheckin(leave.id);
      toast.success(kind === 'out' ? `${leave.student?.user?.name} has left` : `${leave.student?.user?.name} is back`, 'Gate time recorded.');
      await load();
    } catch (err) {
      toast.error('Could not record the gate time', err.message);
      throw err;
    }
  };

  const exportCsv = () =>
    downloadCsv(`leaves-${new Date().toISOString().split('T')[0]}.csv`,
      ['Name', 'Roll number', 'Room', 'Type', 'From', 'To', 'Reason', 'Status', 'Left at', 'Back at'],
      visible.map((l) => [l.student?.user?.name, l.student?.rollNumber, l.student?.room?.roomNumber, LEAVE_TYPES[l.type] || l.type,
        fmtDateTime(l.startDate), fmtDateTime(l.endDate), l.reason, LEAVE_STATUS[l.status]?.short || l.status, fmtDateTime(l.checkoutTime), fmtDateTime(l.checkinTime)]));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={isAdmin ? 'Leaves' : 'Gate pass'}
        subtitle={isAdmin ? 'Approve leave requests and see who is out of the hostel.' : 'Record when residents leave and come back.'}
      >
        <button className="btn-secondary h-10" onClick={exportCsv} disabled={!visible.length}><Download size={15} /> <span className="hidden sm:inline">Export</span></button>
        <button className="btn-secondary h-10" onClick={() => { setLoading(true); load(); }}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
      </PageHeader>

      {lateCount > 0 && (
        <button
          onClick={() => setTab('CHECKED_OUT')}
          className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)] text-[14px] font-semibold border-none cursor-pointer text-left"
        >
          <TriangleAlert size={18} className="shrink-0" />
          {plural(lateCount, 'resident')} should have been back by now. Tap to see who.
        </button>
      )}

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchBox className="flex-1" value={search} onChange={setSearch} placeholder="Search name, roll no., room or reason" />
          {floors.length > 1 && (
            <select className="form-input md:w-[150px] cursor-pointer" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Floor">
              <option value="all">All floors</option>
              {floors.map((f) => <option key={f} value={String(f)}>Floor {f}</option>)}
            </select>
          )}
        </div>
        <FilterChips id="leave-tabs" options={tabs} value={tab} onChange={setTab} />
      </div>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList height={210} />
      ) : visible.length === 0 ? (
        <EmptyPanel
          icon={CalendarCheck}
          tone={tab === 'PENDING' ? 'success' : 'mint'}
          title={tab === 'PENDING' ? 'No leave waiting for approval' : 'Nothing here'}
          text={search ? 'Try a different search.' : tab === 'CHECKED_OUT' ? 'Every resident is inside the hostel.' : 'Leaves in this state will show up here.'}
        />
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {visible.map((l) => (
              <LeaveCard
                key={l.id}
                leave={l}
                isAdmin={isAdmin}
                busy={busyId === l.id}
                onApprove={(leave) => decide(leave, 'APPROVED')}
                onReject={(leave, reason) => decide(leave, 'REJECTED', reason)}
                onGate={(leave, kind) => setGate({ leave, kind })}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(gate)}
        tone="default"
        title={gate ? GATE_COPY[gate.kind].title(gate.leave.student?.user?.name || 'this resident') : ''}
        message={gate ? GATE_COPY[gate.kind].message : ''}
        confirmLabel={gate ? GATE_COPY[gate.kind].confirm : ''}
        onConfirm={confirmGate}
        onClose={() => setGate(null)}
      />
    </div>
  );
};

export default LeaveBoard;
