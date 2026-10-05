import { motion } from 'framer-motion';
import { Coffee, Cookie, Moon, Soup, UtensilsCrossed } from 'lucide-react';
import DownloadMenu from '../../components/ui/DownloadMenu';
import ProgressBar from '../../components/ui/ProgressBar';
import { ErrorPanel } from '../../components/ui/PageStates';
import SummaryTile from '../finance/SummaryTile';
import { stagger } from '../finance/financeUtils';
import { exportMess } from '../../utils/exports';
import { Card, DailyBars, ReportHeader, ReportSkeleton } from './ReportParts';
import { useReportScope, useReportSummary } from './reportState';

const MEALS = [
  { key: 'BREAKFAST', label: 'Breakfast', icon: Coffee, color: 'var(--color-sun-400)', tone: 'sun' },
  { key: 'LUNCH', label: 'Lunch', icon: Soup, color: 'var(--color-brand-500)', tone: 'mint' },
  { key: 'SNACKS', label: 'Snacks', icon: Cookie, color: 'var(--color-peach-500)', tone: 'peach' },
  { key: 'DINNER', label: 'Dinner', icon: Moon, color: 'var(--color-lilac-500)', tone: 'lilac' },
];

const MessReport = () => {
  const { month, floor } = useReportScope();
  const { data, loading, error, reload } = useReportSummary(month, floor);
  const mess = data?.mess;
  const days = Math.max(1, mess?.servedDays || 1);
  const avg = (key) => Math.round((mess?.totals[key] || 0) / days);

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader title="Mess" onRefresh={reload} loading={loading}>
        <DownloadMenu options={[{ key: 'mess', label: 'Mess attendance', hint: 'Plates per meal, per day', run: async () => exportMess(data) }]} />
      </ReportHeader>
      {error && <ErrorPanel message={error} onRetry={reload} />}

      {!data ? <ReportSkeleton /> : (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {MEALS.map((m) => (
              <SummaryTile key={m.key} icon={m.icon} tone={m.tone} label={`${m.label} / day`} value={avg(m.key)} money={false} caption={`${mess.totals[m.key] || 0} plates · ${mess.optOuts[m.key] || 0} skipped`} />
            ))}
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
            <Card title="Plates served each day">
              <DailyBars label="Plates per meal per day" days={mess.days} height={180} series={MEALS.map((m) => ({ key: m.key, label: m.label, color: m.color }))} />
            </Card>
            <Card title="Turnout vs residents">
              <p className="text-[12px] text-[var(--text-tertiary)] m-0 mb-4">Average plates per day out of {mess.residents} residents.</p>
              <ul className="list-none m-0 p-0 flex flex-col gap-3.5">
                {MEALS.map((m, i) => {
                  const pct = mess.residents ? Math.round((avg(m.key) / mess.residents) * 100) : 0;
                  return (
                    <li key={m.key}>
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="flex items-center gap-1.5"><m.icon size={14} className="text-[var(--text-tertiary)]" /> {m.label}</span>
                        <strong>{pct}%</strong>
                      </div>
                      <ProgressBar value={avg(m.key)} max={mess.residents || 1} tone={pct >= 70 ? 'brand' : 'sun'} height={7} delay={i * 0.05} label={`${m.label} turnout`} />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <UtensilsCrossed size={15} /> {Object.values(mess.optOuts).reduce((s, x) => s + x, 0)} meals skipped in advance this month
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default MessReport;
