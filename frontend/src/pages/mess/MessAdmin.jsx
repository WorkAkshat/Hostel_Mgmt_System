import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, ChevronRight, Coffee, Cookie, Moon, Soup, UtensilsCrossed } from 'lucide-react';
import { mess as messApi, notices as noticesApi, complaints as complaintsApi } from '../../utils/api';
import ProgressBar from '../../components/ui/ProgressBar';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { useToast } from '../../components/ui/Toast';
import { ErrorPanel, PageHeader, SkeletonList } from '../../components/ui/PageStates';
import { MEALS } from '../../config/hostel';
import WeeklyMenu from './WeeklyMenu';
import MessNotices from './MessNotices';
import { dayName, mealState, normalizeMenu } from './menuUtils';

export const MEAL_ICONS = { breakfast: Coffee, lunch: Soup, snacks: Cookie, dinner: Moon };

const MessAdmin = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [stats, cook, menu, notices, complaints] = await Promise.all([
        messApi.getStats().catch(() => null),
        messApi.getCookDashboard().catch(() => null),
        messApi.getMenu(),
        noticesApi.getAll('MESS').catch(() => []),
        complaintsApi.getAll().catch(() => []),
      ]);
      setData({ stats, cook, menu: normalizeMenu(menu), notices: notices || [], foodComplaints: (complaints || []).filter((c) => c.category === 'Mess & Food' && c.status !== 'RESOLVED').length });
    } catch (err) {
      setError(err.message || 'Could not load the mess.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveMenu = async (menu) => {
    try {
      await messApi.updateMenu(menu);
      setData((d) => ({ ...d, menu }));
      toast.success('Menu saved', 'Students see the new menu right away.');
      return true;
    } catch (err) {
      toast.error('Could not save the menu', err.message);
      return false;
    }
  };

  const postNotice = async (content) => {
    try {
      const notice = await noticesApi.create({ title: 'Mess update', content, category: 'MESS' });
      setData((d) => ({ ...d, notices: [notice, ...d.notices] }));
      toast.success('Announcement posted');
      return true;
    } catch (err) {
      toast.error('Could not post', err.message);
      return false;
    }
  };

  const deleteNotice = async (notice) => {
    try {
      await noticesApi.remove(notice.id);
      setData((d) => ({ ...d, notices: d.notices.filter((n) => n.id !== notice.id) }));
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  if (loading) return <SkeletonList count={4} height={200} />;
  if (error || !data) return <ErrorPanel message={error || 'Could not load the mess.'} onRetry={() => { setLoading(true); load(); }} />;

  const today = dayName();
  const attended = Object.fromEntries((data.stats?.mealStatsChartData || []).map((m) => [m.name.toLowerCase(), m.Attended]));
  const roster = data.cook?.totalEnrolledResidents ?? data.stats?.totalStudentsCount ?? 0;
  const history = data.stats?.historyChartData || [];
  const maxHistory = Math.max(1, ...history.map((h) => h.Attendance || 0));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Mess" subtitle={`${today} · ${roster} residents on the roster`}>
        <Link to="/admin/cook-dashboard" className="btn-secondary h-10"><ChefHat size={16} /> Kitchen view</Link>
      </PageHeader>

      {/* Today */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {MEALS.map((m, i) => {
          const Icon = MEAL_ICONS[m.key];
          const state = mealState(m.key);
          const expected = data.cook?.expectedMealCounts?.[m.type] ?? roster;
          const skipped = data.cook?.optOutCounts?.[m.type] ?? 0;
          const came = attended[m.key] ?? 0;
          return (
            <motion.section
              key={m.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className={`rounded-[var(--border-radius-card)] border p-4 flex flex-col gap-3 ${state === 'serving' ? 'bg-cream-100 border-sun-300' : 'bg-white border-[var(--border-color)]'}`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${state === 'serving' ? 'bg-sun-300 text-sun-900' : 'bg-peach-50 text-peach-700'}`}><Icon size={17} /></span>
                <span className="flex-1">
                  <span className="block text-[14px] font-bold">{m.label}</span>
                  <span className="block text-[11px] text-[var(--text-tertiary)]">{m.time}</span>
                </span>
                {state === 'serving' && <span className="badge bg-sun-300 text-sun-900 normal-case">Serving now</span>}
                {state === 'over' && <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] normal-case">Done</span>}
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] m-0 min-h-[36px]">{data.menu[today]?.[m.key] || 'Not set'}</p>
              <div>
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-[var(--text-secondary)]"><strong className="text-[18px] text-[var(--text-primary)]"><AnimatedNumber value={came} /></strong> of {expected} came</span>
                  {skipped > 0 && <span className="text-[var(--warning)] font-semibold">{skipped} skipped</span>}
                </div>
                <ProgressBar value={came} max={expected || 1} tone="sun" height={6} delay={0.1 + i * 0.05} label={`${m.label} turnout`} />
              </div>
            </motion.section>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <section className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5">
            <h2 className="text-[16px] font-bold m-0 mb-4">Check-ins, last 7 days</h2>
            {history.length === 0 ? (
              <p className="text-[13px] text-[var(--text-tertiary)] m-0">No mess check-ins recorded yet.</p>
            ) : (
              <div className="flex items-end gap-2 h-[130px]" role="img" aria-label="Mess check-ins over the last 7 days">
                {history.map((h, i) => (
                  <div key={h.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-semibold">{h.Attendance}</span>
                    <motion.div
                      className="w-full max-w-[36px] rounded-t-lg bg-brand-400"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, (h.Attendance / maxHistory) * 90)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">{String(h.date).slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link to="/admin/complaints" className="flex items-center gap-3 p-4 rounded-[var(--border-radius-card)] bg-white border border-[var(--border-color)] hover:border-brand-200 transition-colors group">
            <span className="w-10 h-10 rounded-xl bg-peach-50 text-peach-700 flex items-center justify-center"><UtensilsCrossed size={18} /></span>
            <span className="flex-1">
              <span className="block text-[14px] font-bold">Food complaints</span>
              <span className="block text-[13px] text-[var(--text-secondary)]">{data.foodComplaints ? `${data.foodComplaints} open in Helpdesk` : 'None open right now'}</span>
            </span>
            <ChevronRight size={18} className="text-[var(--text-tertiary)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <MessNotices notices={data.notices} onPost={postNotice} onDelete={deleteNotice} />
      </div>

      <WeeklyMenu menu={data.menu} onSave={saveMenu} />
    </div>
  );
};

export default MessAdmin;
