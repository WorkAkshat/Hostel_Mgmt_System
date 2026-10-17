import { motion } from 'framer-motion';
import { CircleCheck, Hourglass, MessageSquareWarning, Wrench } from 'lucide-react';
import DonutRing from '../../components/ui/DonutRing';
import DownloadMenu from '../../components/ui/DownloadMenu';
import { ErrorPanel } from '../../components/ui/PageStates';
import SummaryTile from '../finance/SummaryTile';
import { stagger } from '../finance/financeUtils';
import { COMPLAINT_STATUS, PRIORITIES } from '../../config/hostel';
import { exportComplaints } from '../../utils/exports';
import { BarList, Card, ReportHeader, ReportSkeleton } from './ReportParts';
import { toItems, useReportScope, useReportSummary } from './reportState';

const STATUS_COLORS = { PENDING: 'var(--color-sun-400)', IN_PROGRESS: 'var(--color-lilac-500)', RESOLVED: 'var(--color-brand-500)' };

const HelpdeskReport = () => {
  const { month, floor } = useReportScope();
  const { data, loading, error, reload } = useReportSummary(month, floor);
  const c = data?.complaints;
  const resolved = c?.byStatus.RESOLVED || 0;

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader title="Helpdesk" onRefresh={reload} loading={loading}>
        <DownloadMenu options={[{ key: 'complaints', label: 'Complaints', hint: 'Every complaint raised this month', run: () => exportComplaints(month, floor) }]} />
      </ReportHeader>
      {error && <ErrorPanel message={error} onRetry={reload} />}

      {!data ? <ReportSkeleton /> : (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryTile icon={MessageSquareWarning} tone="lilac" label="Raised this month" value={c.total} money={false} caption={`${c.byPriority.URGENT || 0} urgent · ${c.byPriority.HIGH || 0} high`} />
            <SummaryTile icon={CircleCheck} tone="mint" label="Resolved" value={resolved} money={false} caption={c.total ? `${Math.round((resolved / c.total) * 100)}% of this month's` : '—'} />
            <SummaryTile icon={Wrench} tone="sun" label="Open now" value={c.openNow} money={false} caption="Across all months" />
            <SummaryTile icon={Hourglass} tone="peach" label="Waiting 3+ days" value={c.openOver3Days} money={false} caption={c.openOver3Days ? 'Follow up with the team' : 'Nothing stuck'} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
            <Card title="Problems by category">
              <BarList items={c.byCategory.map((x) => ({ label: x.category, value: x.count, note: x.open ? `${x.open} open` : 'all fixed' }))} />
            </Card>
            <div className="flex flex-col gap-4">
              <Card title="Status">
                <div className="flex items-center gap-5">
                  <DonutRing size={120} stroke={14} label="Complaints by status" segments={Object.keys(COMPLAINT_STATUS).map((k) => ({ value: c.byStatus[k] || 0, color: STATUS_COLORS[k] }))}>
                    <span className="text-[18px] font-bold">{c.total}</span>
                  </DonutRing>
                  <ul className="list-none m-0 p-0 flex flex-col gap-2 flex-1">
                    {Object.entries(COMPLAINT_STATUS).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-2 text-[13px]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
                        <span className="flex-1 text-[var(--text-secondary)]">{v.label}</span>
                        <strong>{c.byStatus[k] || 0}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
              <Card title="Priority"><BarList items={toItems(c.byPriority, PRIORITIES)} /></Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HelpdeskReport;
