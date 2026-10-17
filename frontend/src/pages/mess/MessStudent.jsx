import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CircleCheck, MessageSquareWarning, Undo2, UtensilsCrossed } from 'lucide-react';
import { mess as messApi, notices as noticesApi } from '../../utils/api';
import FilterChips from '../../components/ui/FilterChips';
import { useToast } from '../../components/ui/Toast';
import { ErrorPanel, PageHeader, SkeletonList } from '../../components/ui/PageStates';
import { MEALS } from '../../config/hostel';
import { fmtDate } from '../../utils/format';
import WeeklyMenu from './WeeklyMenu';
import MessNotices from './MessNotices';
import { MEAL_ICONS } from './MessAdmin';
import { dayName, isoDate, mealState, normalizeMenu } from './menuUtils';
import useLiveRefresh from '../../hooks/useLiveRefresh';

const MessStudent = () => {
  const toast = useToast();
  const [menu, setMenu] = useState(null);
  const [notices, setNotices] = useState([]);
  const [optOuts, setOptOuts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [which, setWhich] = useState('today');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [m, n, o, l] = await Promise.all([
        messApi.getMenu(),
        noticesApi.getAll('MESS').catch(() => []),
        messApi.getMyOptOuts().catch(() => []),
        messApi.getMyAttendance().catch(() => []),
      ]);
      setMenu(normalizeMenu(m));
      setNotices(n || []);
      setOptOuts(o || []);
      setLogs(l || []);
    } catch (err) {
      setError(err.message || 'Could not load the mess menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(load);

  const date = useMemo(() => {
    const d = new Date();
    if (which === 'tomorrow') d.setDate(d.getDate() + 1);
    return d;
  }, [which]);
  const dateKey = isoDate(date);
  const skippedFor = (type) => optOuts.find((o) => o.date === dateKey && o.mealType === type);

  const skip = async (meal) => {
    setBusy(meal.type);
    try {
      const res = await messApi.optOutMeal({ mealType: meal.type, date: dateKey });
      setOptOuts((list) => [...list, res.optOut]);
      toast.success(`${meal.label} skipped`, `The kitchen will cook one plate less ${which === 'today' ? 'today' : 'tomorrow'}.`);
    } catch (err) {
      toast.error('Could not skip the meal', err.message);
    } finally {
      setBusy(null);
    }
  };

  const undo = async (meal, record) => {
    setBusy(meal.type);
    try {
      await messApi.cancelOptOut(record.id);
      setOptOuts((list) => list.filter((o) => o.id !== record.id));
      toast.success(`You are eating ${meal.label.toLowerCase()} again`);
    } catch (err) {
      toast.error('Could not undo', err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <SkeletonList count={3} height={180} columns="grid-cols-1" />;
  if (error || !menu) return <ErrorPanel message={error || 'Could not load the mess menu.'} onRetry={() => { setLoading(true); load(); }} />;

  const day = dayName(date);
  const eatenToday = logs.filter((l) => l.date === isoDate(new Date())).map((l) => l.mealType);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Mess" subtitle="See what is cooking and skip meals you will miss, so less food is wasted." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 items-start">
        <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold m-0">{day}'s meals</h2>
              <p className="text-[12px] text-[var(--text-tertiary)] m-0">{fmtDate(date, { weekday: 'long' })}</p>
            </div>
            <FilterChips id="mess-day" value={which} onChange={setWhich} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }]} />
          </div>

          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {MEALS.map((m, i) => {
              const Icon = MEAL_ICONS[m.key];
              const state = mealState(m.key, date);
              const record = skippedFor(m.type);
              const ate = which === 'today' && eatenToday.includes(m.type);
              return (
                <motion.li
                  key={`${which}-${m.key}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border ${
                    record ? 'bg-[var(--bg-primary)] border-dashed border-[var(--border-strong)]' : state === 'serving' ? 'bg-cream-100 border-sun-300' : 'bg-white border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${state === 'serving' && !record ? 'bg-sun-300 text-sun-900' : 'bg-peach-50 text-peach-700'}`}><Icon size={18} /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-bold">{m.label}</span>
                        <span className="text-[12px] text-[var(--text-tertiary)]">{m.time}</span>
                        {state === 'serving' && !record && <span className="badge bg-sun-300 text-sun-900 normal-case">Now</span>}
                      </span>
                      <span className={`block text-[13px] ${record ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>
                        {menu[day]?.[m.key] || 'Menu not set'}
                      </span>
                    </span>
                  </div>
                  {ate ? (
                    <span className="badge badge-success normal-case self-start sm:self-center"><CircleCheck size={12} /> Checked in</span>
                  ) : record ? (
                    <button className="btn-secondary h-9 px-3 text-[13px]" disabled={busy === m.type || state !== 'upcoming'} onClick={() => undo(m, record)}>
                      <Undo2 size={14} /> {state === 'upcoming' ? 'Skipped · undo' : 'Skipped'}
                    </button>
                  ) : state === 'upcoming' ? (
                    <button className="h-9 px-3 rounded-[var(--border-radius-btn)] border border-[var(--border-color)] bg-white text-[13px] font-semibold text-[var(--text-secondary)] hover:border-peach-200 hover:text-peach-700 cursor-pointer disabled:opacity-60" disabled={busy === m.type} onClick={() => skip(m)}>
                      Skip this meal
                    </button>
                  ) : state === 'over' ? (
                    <span className="text-[12px] text-[var(--text-tertiary)] self-start sm:self-center">Served</span>
                  ) : null}
                </motion.li>
              );
            })}
          </ul>
          <Link to="/student/complaints" className="flex items-center gap-2 text-[13px] font-semibold text-brand-700 hover:underline self-start">
            <MessageSquareWarning size={15} /> Problem with the food? Tell the warden
          </Link>
        </section>

        <div className="flex flex-col gap-5">
          <MessNotices notices={notices} />
          <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
            <h2 className="text-[16px] font-bold m-0 mb-3">My recent check-ins</h2>
            {logs.length === 0 ? (
              <p className="text-[13px] text-[var(--text-tertiary)] m-0">Your mess entries will appear here once you check in at the counter.</p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                {logs.slice(0, 8).map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-primary)] text-[13px]">
                    <UtensilsCrossed size={14} className="text-brand-500" />
                    <span className="flex-1 capitalize">{String(l.mealType).toLowerCase()}</span>
                    <span className="text-[var(--text-tertiary)]">{fmtDate(l.date, { weekday: 'short' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <WeeklyMenu menu={menu} />
    </div>
  );
};

export default MessStudent;
