import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Check, X } from 'lucide-react';
import { Card, CardHeader, EmptyState } from './DashboardWidgets';
import { LEAVE_TYPES, daysBetween, initials, residentName, roomOf, shortDate } from './dashboardUtils';

const MAX_ROWS = 4;

// Pending leave requests with approve / reject right on the dashboard.
// Approving goes through the same API as the Leaves page, so parents and the
// student are notified exactly as before.
const LeaveRequestsCard = ({ leaves, onDecision, className = '' }) => {
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const decide = async (leave, status, comments = '') => {
    setBusyId(leave.id);
    const ok = await onDecision(leave, status, comments);
    setBusyId(null);
    if (ok) {
      setRejectingId(null);
      setReason('');
    }
  };

  const visible = leaves.slice(0, MAX_ROWS);

  return (
    <Card className={className}>
      <CardHeader icon={CalendarCheck} tone="lilac" title="Leave requests" count={leaves.length} to="/admin/leaves" />

      {leaves.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="You're all caught up" text="New leave requests will appear here for quick approval." />
      ) : (
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {visible.map((leave) => {
              const name = residentName(leave);
              const room = roomOf(leave);
              const busy = busyId === leave.id;
              const rejecting = rejectingId === leave.id;
              return (
                <motion.li
                  key={leave.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  className="rounded-2xl border border-[var(--border-color)] p-3 sm:p-3.5 hover:border-lilac-200 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-lilac-100 text-lilac-700 text-[13px] font-bold flex items-center justify-center shrink-0">
                      {initials(name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{name}</span>
                        {room && <span className="text-[12px] text-[var(--text-tertiary)]">Room {room}</span>}
                        <span className="badge bg-lilac-50 text-lilac-700">{LEAVE_TYPES[leave.type] || leave.type}</span>
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1 mb-0">
                        <strong className="font-semibold text-[var(--text-primary)]">
                          {shortDate(leave.startDate)} → {shortDate(leave.endDate)}
                        </strong>
                        {' · '}{daysBetween(leave.startDate, leave.endDate)} days
                        {leave.destination ? ` · ${leave.destination}` : ''}
                      </p>
                      {leave.reason && (
                        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 mb-0 line-clamp-1">“{leave.reason}”</p>
                      )}
                    </div>
                    </div>

                    {!rejecting && (
                      <div className="flex items-center gap-2 sm:gap-1.5 shrink-0">
                        <button
                          onClick={() => decide(leave, 'APPROVED')}
                          disabled={busy}
                          className="flex-1 sm:flex-none justify-center h-10 sm:h-9 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold border-none cursor-pointer flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                          aria-label={`Approve leave for ${name}`}
                        >
                          <Check size={15} />
                          <span>{busy ? 'Saving…' : 'Approve'}</span>
                        </button>
                        <button
                          onClick={() => { setRejectingId(leave.id); setReason(''); }}
                          disabled={busy}
                          className="flex-1 sm:flex-none h-10 sm:h-9 sm:w-9 gap-1.5 rounded-xl bg-[var(--danger-bg)] hover:brightness-95 text-[var(--danger)] text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center disabled:opacity-60"
                          aria-label={`Reject leave for ${name}`}
                          title="Reject"
                        >
                          <X size={16} />
                          <span className="sm:hidden">Reject</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {rejecting && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                        onSubmit={(e) => { e.preventDefault(); decide(leave, 'REJECTED', reason.trim()); }}
                      >
                        <div className="flex flex-col sm:flex-row gap-2 pt-3">
                          <input
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for rejecting (optional)"
                            aria-label="Reason for rejecting"
                            className="form-input h-10 flex-1"
                          />
                          <div className="flex gap-2">
                            <button type="submit" disabled={busy} className="h-10 px-4 rounded-xl bg-[var(--danger)] text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60">
                              {busy ? 'Saving…' : 'Reject leave'}
                            </button>
                            <button type="button" onClick={() => setRejectingId(null)} className="btn-secondary h-10 px-3 text-[13px]">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {leaves.length > MAX_ROWS && (
        <p className="text-[13px] text-[var(--text-tertiary)] text-center mt-3 mb-0">
          +{leaves.length - MAX_ROWS} more waiting on the Leaves page
        </p>
      )}
    </Card>
  );
};

export default LeaveRequestsCard;
