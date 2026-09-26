import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, CircleCheck, Moon, PhoneCall, Save } from 'lucide-react';
import { nightAttendance as nightApi, floors as floorsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SkeletonList } from '../components/ui/PageStates';
import { fmtDate, fmtTime, todayIso } from '../utils/format';

const STATES = [
  { value: 'PRESENT', label: 'Present', on: 'bg-[var(--success)] text-white' },
  { value: 'ABSENT', label: 'Absent', on: 'bg-[var(--danger)] text-white' },
  { value: 'ON_LEAVE', label: 'Leave', on: 'bg-lilac-500 text-white' },
];

const NightRollCall = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [floorList, setFloorList] = useState([1, 2, 3, 4, 5]);
  const [floor, setFloor] = useState(user.assignedFloor || 1);
  const [date, setDate] = useState(todayIso);
  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parentsInformed, setParentsInformed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    floorsApi.getAll()
      .then((list) => list?.length && setFloorList(list.map((f) => f.floorNumber)))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nightApi.getByDate({ floorNumber: floor, date });
      setSheet(data);
      const initial = {};
      (data?.roomsChart || []).forEach((room) => room.students.forEach((s) => { initial[s.id] = s.status || 'PRESENT'; }));
      setMarks(initial);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Could not load the roll call.');
    } finally {
      setLoading(false);
    }
  }, [floor, date]);

  useEffect(() => {
    load();
  }, [load]);

  const rooms = sheet?.roomsChart || [];
  const counts = useMemo(() => {
    const values = Object.values(marks);
    return {
      total: values.length,
      PRESENT: values.filter((v) => v === 'PRESENT').length,
      ABSENT: values.filter((v) => v === 'ABSENT').length,
      ON_LEAVE: values.filter((v) => v === 'ON_LEAVE').length,
    };
  }, [marks]);

  const mark = (id, value) => { setMarks((m) => ({ ...m, [id]: value })); setDirty(true); };

  const markAllPresent = () => {
    const next = { ...marks };
    rooms.forEach((room) => room.students.forEach((s) => { if (!s.hasActiveLeave && next[s.id] !== 'ABSENT') next[s.id] = 'PRESENT'; }));
    setMarks(next);
    setDirty(true);
  };

  const save = async () => {
    try {
      await nightApi.submitBulk({
        date,
        floorNumber: floor,
        notifyParents: parentsInformed,
        records: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      });
      toast.success(`Roll call saved for Floor ${floor}`, `${counts.PRESENT} present · ${counts.ABSENT} absent · ${counts.ON_LEAVE} on leave`);
      await load();
    } catch (err) {
      toast.error('Could not save the roll call', err.message);
      throw err;
    }
  };

  const isToday = date === todayIso();

  return (
    <div className="flex flex-col gap-5 pb-40 lg:pb-24">
      <PageHeader title="Night roll call" subtitle="Mark every resident each night. Students on approved leave are pre-marked." />

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div role="radiogroup" aria-label="Floor" className="flex flex-wrap gap-1 p-1 rounded-xl bg-mint-50 border border-[var(--border-color)]">
          {floorList.map((f) => {
            const active = floor === f;
            return (
              <button key={f} role="radio" aria-checked={active} onClick={() => setFloor(f)} className={`relative h-9 px-3.5 rounded-lg border-none bg-transparent text-[13px] cursor-pointer ${active ? 'text-sun-900 font-semibold' : 'text-[var(--text-secondary)] font-medium'}`}>
                {active && <motion.span layoutId="night-floor" className="absolute inset-0 rounded-lg bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">Floor {f}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)] lg:ml-auto">
          Night of
          <input type="date" className="form-input h-10 w-[170px]" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
      </div>

      {sheet && !loading && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium ${sheet.submitted ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-cream-100 text-sun-900'}`}>
          {sheet.submitted ? <CircleCheck size={18} /> : <Moon size={18} />}
          {sheet.submitted
            ? `Roll call for ${isToday ? 'tonight' : fmtDate(date)} was saved${sheet.submittedAt ? ` at ${fmtTime(sheet.submittedAt)}` : ''}. You can still correct it.`
            : `Roll call for ${isToday ? 'tonight' : fmtDate(date)} has not been taken yet.`}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Residents', value: counts.total, tone: 'bg-white border-[var(--border-color)]' },
          { label: 'Present', value: counts.PRESENT, tone: 'bg-[var(--success-bg)] border-transparent' },
          { label: 'Absent', value: counts.ABSENT, tone: counts.ABSENT ? 'bg-[var(--danger-bg)] border-transparent' : 'bg-white border-[var(--border-color)]' },
          { label: 'On leave', value: counts.ON_LEAVE, tone: 'bg-lilac-50 border-lilac-100' },
        ].map((t) => (
          <div key={t.label} className={`rounded-[var(--border-radius-card)] border px-4 py-3 ${t.tone}`}>
            <div className="text-[12px] text-[var(--text-secondary)]">{t.label}</div>
            <div className="text-[24px] font-bold leading-tight"><AnimatedNumber value={t.value} /></div>
          </div>
        ))}
      </div>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList height={170} />
      ) : rooms.length === 0 || counts.total === 0 ? (
        <EmptyPanel icon={Moon} title={`No residents on Floor ${floor}`} text="Assign students to rooms on this floor to take the roll call." />
      ) : (
        <>
          <div className="flex justify-end">
            <button className="btn-secondary h-10" onClick={markAllPresent}><CheckCheck size={16} /> Mark everyone else present</button>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {rooms.filter((r) => r.students.length).map((room, i) => (
              <motion.section
                key={room.roomId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }}
                className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] overflow-hidden"
              >
                <header className="flex items-center justify-between px-4 py-2.5 bg-mint-50 border-b border-[var(--border-color)]">
                  <span className="text-[14px] font-bold">Room {room.roomNumber}</span>
                  <span className="text-[12px] text-[var(--text-tertiary)]">{room.studentsCount} of {room.sharingType} beds</span>
                </header>
                <ul className="list-none m-0 p-0">
                  {room.students.map((s) => {
                    const current = marks[s.id] || 'PRESENT';
                    return (
                      <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-b-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar name={s.name} size={36} tone={current === 'ABSENT' ? 'peach' : current === 'ON_LEAVE' ? 'lilac' : 'mint'} />
                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold truncate">{s.name}</span>
                            <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                              {s.hasActiveLeave ? `On leave till ${fmtDate(s.leaveInfo?.endDate)}` : s.rollNumber}
                            </span>
                          </span>
                          {current === 'ABSENT' && s.parentContact && (
                            <a href={`tel:${s.parentContact}`} className="ml-auto sm:ml-0 w-8 h-8 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)] flex items-center justify-center shrink-0" title="Call parent" aria-label={`Call ${s.name}'s parent`}>
                              <PhoneCall size={14} />
                            </a>
                          )}
                        </div>
                        <div className="flex p-1 rounded-xl bg-[var(--bg-primary)] gap-1" role="radiogroup" aria-label={`${s.name} status`}>
                          {STATES.map((st) => (
                            <button
                              key={st.value}
                              role="radio"
                              aria-checked={current === st.value}
                              onClick={() => mark(s.id, st.value)}
                              className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-colors ${current === st.value ? st.on : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            ))}
          </div>
        </>
      )}

      {/* Save bar */}
      {counts.total > 0 && !loading && (
        <div className="fixed left-4 right-4 lg:left-auto lg:right-8 bottom-[88px] lg:bottom-6 z-30 lg:w-[560px] bg-white border border-[var(--border-color)] rounded-2xl shadow-[var(--shadow-lg)] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold m-0">
              {counts.PRESENT} present · <span className={counts.ABSENT ? 'text-[var(--danger)]' : ''}>{counts.ABSENT} absent</span> · {counts.ON_LEAVE} on leave
            </p>
            {counts.ABSENT > 0 ? (
              <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] mt-1 cursor-pointer">
                <input type="checkbox" checked={parentsInformed} onChange={(e) => setParentsInformed(e.target.checked)} />
                I have called the parents of absent residents
              </label>
            ) : (
              <p className="text-[12px] text-[var(--text-tertiary)] m-0">{dirty ? 'Unsaved changes' : sheet?.submitted ? 'Saved' : 'Not saved yet'}</p>
            )}
          </div>
          <button className="btn-primary h-11" onClick={() => setConfirming(true)}>
            <Save size={16} /> Save roll call
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        tone={counts.ABSENT ? 'danger' : 'default'}
        title={`Save roll call for Floor ${floor}?`}
        message={counts.ABSENT
          ? `${counts.ABSENT} resident${counts.ABSENT === 1 ? ' is' : 's are'} marked absent. Please make sure the parents have been contacted.`
          : `Everyone on Floor ${floor} is accounted for.`}
        confirmLabel="Save roll call"
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
};

export default NightRollCall;
