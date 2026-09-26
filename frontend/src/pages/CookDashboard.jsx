import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Printer, RefreshCw } from 'lucide-react';
import { mess as messApi } from '../utils/api';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import FilterChips from '../components/ui/FilterChips';
import { ErrorPanel, PageHeader, SkeletonList } from '../components/ui/PageStates';
import { MEALS } from '../config/hostel';
import { fmtDate } from '../utils/format';
import { MEAL_ICONS } from './mess/MessAdmin';
import { dayName, isoDate, mealState, normalizeMenu } from './mess/menuUtils';

// What the kitchen needs to cook: plates per meal after students skip meals.
const CookDashboard = () => {
  const [which, setWhich] = useState('today');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const date = new Date();
  if (which === 'tomorrow') date.setDate(date.getDate() + 1);
  const dateKey = isoDate(date);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [cook, m] = await Promise.all([messApi.getCookDashboard(dateKey), messApi.getMenu().catch(() => null)]);
      setData(cook);
      setMenu(m ? normalizeMenu(m) : null);
    } catch (err) {
      setError(err.message || 'Could not load kitchen numbers.');
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  const day = dayName(date);
  const optOuts = data?.optOutsList || [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Kitchen view" subtitle={`${fmtDate(date, { weekday: 'long' })} · ${data?.totalEnrolledResidents ?? '—'} residents checked in`}>
        <FilterChips id="cook-day" value={which} onChange={setWhich} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }]} />
        <button className="btn-secondary h-10" onClick={load} aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        <button className="btn-secondary h-10 print:hidden" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </PageHeader>

      {error && <ErrorPanel message={error} onRetry={load} />}
      {loading ? (
        <SkeletonList count={4} height={190} columns="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      ) : data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {MEALS.map((m, i) => {
              const Icon = MEAL_ICONS[m.key];
              const state = mealState(m.key, date);
              const plates = data.expectedMealCounts?.[m.type] ?? 0;
              const skipped = data.optOutCounts?.[m.type] ?? 0;
              return (
                <motion.section
                  key={m.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                  className={`rounded-[var(--border-radius-card)] border p-5 ${state === 'serving' ? 'bg-cream-100 border-sun-300' : state === 'over' ? 'bg-[var(--bg-primary)] border-[var(--border-color)] opacity-70' : 'bg-white border-[var(--border-color)]'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-peach-50 text-peach-700 flex items-center justify-center"><Icon size={18} /></span>
                    <span>
                      <span className="block text-[15px] font-bold">{m.label}</span>
                      <span className="block text-[11px] text-[var(--text-tertiary)]">{m.time}</span>
                    </span>
                  </div>
                  <div className="mt-4 text-[40px] font-bold leading-none tracking-tight"><AnimatedNumber value={plates} /></div>
                  <div className="text-[13px] text-[var(--text-secondary)] mt-1">plates to cook</div>
                  <p className="text-[13px] m-0 mt-3 min-h-[38px]">{menu?.[day]?.[m.key] || <span className="text-[var(--text-tertiary)]">Menu not set</span>}</p>
                  <div className={`mt-3 text-[12px] font-semibold ${skipped ? 'text-[var(--warning)]' : 'text-[var(--text-tertiary)]'}`}>
                    {skipped ? `${skipped} resident${skipped === 1 ? '' : 's'} skipping` : 'Nobody skipping'}
                  </div>
                </motion.section>
              );
            })}
          </div>

          <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
            <h2 className="text-[16px] font-bold m-0 mb-3">Who is skipping</h2>
            {optOuts.length === 0 ? (
              <p className="text-[13px] text-[var(--text-tertiary)] m-0 flex items-center gap-2"><ChefHat size={15} /> Everyone is eating every meal {which}.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {MEALS.map((m) => {
                  const list = optOuts.filter((o) => o.mealType === m.type);
                  return (
                    <div key={m.key}>
                      <h3 className="text-[13px] font-bold text-brand-700 m-0 mb-2">{m.label} · {list.length}</h3>
                      {list.length === 0 ? (
                        <p className="text-[12px] text-[var(--text-tertiary)] m-0">—</p>
                      ) : (
                        <ul className="list-none m-0 p-0 flex flex-col gap-1">
                          {list.map((o) => (
                            <li key={o.id} className="text-[13px] flex justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-primary)]">
                              <span className="truncate">{o.student?.user?.name || 'Resident'}</span>
                              <span className="text-[var(--text-tertiary)] shrink-0">{o.student?.room ? `Room ${o.student.room.roomNumber}` : ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CookDashboard;
