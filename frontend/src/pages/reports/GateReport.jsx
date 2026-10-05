import { motion } from 'framer-motion';
import { CalendarCheck, CalendarDays, Clock, DoorOpen, TriangleAlert, UserCheck } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import DownloadMenu from '../../components/ui/DownloadMenu';
import { ErrorPanel } from '../../components/ui/PageStates';
import SummaryTile from '../finance/SummaryTile';
import { stagger } from '../finance/financeUtils';
import { LEAVE_STATUS, LEAVE_TYPES } from '../../config/hostel';
import { exportLeaves, exportVisitors } from '../../utils/exports';
import { BarList, Card, DailyBars, ReportHeader, ReportSkeleton } from './ReportParts';
import { toItems, useReportScope, useReportSummary } from './reportState';

const GateReport = () => {
  const { month, floor } = useReportScope();
  const { data, loading, error, reload } = useReportSummary(month, floor);
  const lv = data?.leaves;
  const vs = data?.visitors;
  const approved = lv ? (lv.byStatus.APPROVED || 0) + (lv.byStatus.CHECKED_OUT || 0) + (lv.byStatus.RETURNED || 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader title="Leaves & Gate" onRefresh={reload} loading={loading}>
        <DownloadMenu
          options={[
            { key: 'leaves', label: 'Leave register', hint: 'Requests with exit and return times', run: () => exportLeaves(month, floor) },
            { key: 'visitors', label: 'Visitor register', hint: 'Every visitor with in / out time', run: () => exportVisitors(month, floor) },
          ]}
        />
      </ReportHeader>
      {error && <ErrorPanel message={error} onRetry={reload} />}

      {!data ? <ReportSkeleton /> : (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <SummaryTile icon={CalendarDays} tone="lilac" label="Leave requests" value={lv.total} money={false} caption={`${approved} approved · ${lv.byStatus.REJECTED || 0} rejected`} />
            <SummaryTile icon={TriangleAlert} tone="peach" label="Late returns" value={lv.lateReturns} money={false} caption="Came back after the end time" />
            <SummaryTile icon={CalendarCheck} tone="sun" label="Out right now" value={lv.outNow} money={false} caption={lv.overdueNow ? `${lv.overdueNow} past return time` : 'All within time'} />
            <SummaryTile icon={DoorOpen} tone="mint" label="Visitors" value={vs.total} money={false} caption={vs.stillInside ? `${vs.stillInside} not checked out` : 'All checked out'} />
            <SummaryTile icon={Clock} tone="white" label="Average visit" value={vs.avgStayMinutes} money={false} caption="minutes" />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Leaves starting each day">
              <DailyBars label="Leaves per day" days={lv.daily} series={[{ key: 'count', label: 'Leaves', color: 'var(--color-lilac-500)' }]} />
            </Card>
            <Card title="Visitors each day">
              <DailyBars label="Visitors per day" days={vs.daily} series={[{ key: 'count', label: 'Visitors', color: 'var(--color-sun-400)' }]} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <Card title="Leave types"><BarList items={toItems(lv.byType, LEAVE_TYPES)} tone="brand" /></Card>
            <Card title="Visitors by relation"><BarList items={toItems(vs.byRelationship)} /></Card>
            <Card title="Most leaves this month">
              {lv.topStudents.length === 0 ? (
                <p className="text-[13px] text-[var(--text-tertiary)] m-0">No leaves this month.</p>
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                  {lv.topStudents.map((s) => (
                    <li key={s.rollNumber} className="flex items-center gap-3">
                      <Avatar name={s.name} size={32} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold truncate">{s.name}</span>
                        <span className="block text-[11px] text-[var(--text-tertiary)]">{s.rollNumber}{s.roomNumber ? ` · Room ${s.roomNumber}` : ''}</span>
                      </span>
                      <span className="text-right text-[12px]">
                        <strong className="block text-[14px]">{s.count}</strong>
                        <span className="text-[var(--text-tertiary)]">{s.nights} night{s.nights === 1 ? '' : 's'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Where requests stand">
            <div className="flex flex-wrap gap-2">
              {Object.entries(LEAVE_STATUS).map(([k, v]) => (
                <span key={k} className={`badge normal-case ${v.badge}`}><UserCheck size={12} /> {v.short} · {lv.byStatus[k] || 0}</span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default GateReport;
