import { motion } from 'framer-motion';
import { BedDouble, DoorOpen, UserPlus, Users, Wrench } from 'lucide-react';
import ProgressBar from '../../components/ui/ProgressBar';
import DonutRing from '../../components/ui/DonutRing';
import DownloadMenu from '../../components/ui/DownloadMenu';
import { ErrorPanel } from '../../components/ui/PageStates';
import SummaryTile from '../finance/SummaryTile';
import { stagger } from '../finance/financeUtils';
import { exportFloorSummary, exportFreeBeds, exportResidents, exportRooms } from '../../utils/exports';
import { Card, ReportHeader, ReportSkeleton } from './ReportParts';
import { useReportScope, useReportSummary } from './reportState';

const SHARING = { 1: { label: 'Single', color: 'var(--color-lilac-500)' }, 2: { label: 'Twin', color: 'var(--color-brand-500)' }, 3: { label: 'Triple', color: 'var(--color-sun-400)' } };

const OccupancyReport = () => {
  const { month, floor } = useReportScope();
  const { data, loading, error, reload } = useReportSummary(month, floor);
  const occ = data?.occupancy;
  const pct = occ?.totals.beds ? Math.round((occ.totals.occupied / occ.totals.beds) * 100) : 0;
  const sharing = (occ?.floors || []).reduce((acc, f) => {
    Object.entries(f.bySharing || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader title="Occupancy" subtitle="Live bed position — rooms change every day, so this is always today's picture" onRefresh={reload} loading={loading}>
        <DownloadMenu
          options={[
            { key: 'floors', label: 'Floor summary', hint: 'Occupancy per floor', run: () => exportFloorSummary() },
            { key: 'rooms', label: 'Rooms & beds', hint: 'Every room with residents', run: () => exportRooms(null, floor) },
            { key: 'free', label: 'Free beds', hint: 'Rooms with space', run: () => exportFreeBeds(null, floor) },
            { key: 'residents', label: 'Residents list', hint: 'Contacts, room and bed', run: () => exportResidents(null, floor) },
          ]}
        />
      </ReportHeader>
      {error && <ErrorPanel message={error} onRetry={reload} />}

      {!data ? <ReportSkeleton /> : (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <SummaryTile icon={BedDouble} tone="white" label="Total beds" value={occ.totals.beds} money={false} caption={`${occ.totals.rooms} rooms`} />
            <SummaryTile icon={Users} tone="mint" label="Beds taken" value={occ.totals.occupied} money={false} caption={`${pct}% occupied`} />
            <SummaryTile icon={DoorOpen} tone="sun" label="Free beds" value={occ.totals.free} money={false} caption="Ready for admission" />
            <SummaryTile icon={Wrench} tone="peach" label="Under repair" value={occ.totals.maintenanceRooms} money={false} caption="Rooms blocked" />
            <SummaryTile icon={UserPlus} tone="lilac" label="New admissions" value={occ.newAdmissions} money={false} caption={occ.withoutRoom ? `${occ.withoutRoom} still without a room` : 'Joined this month'} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
            <Card title="Floor by floor">
              <ul className="list-none m-0 p-0 flex flex-col gap-3">
                {occ.floors.map((f, i) => {
                  const p = f.beds ? Math.round((f.occupied / f.beds) * 100) : 0;
                  return (
                    <li key={f.floorNumber} className="p-3.5 rounded-2xl border border-[var(--border-color)]">
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="w-10 h-10 shrink-0 rounded-xl bg-mint-100 text-brand-700 font-bold flex items-center justify-center">{f.floorNumber}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-semibold truncate">{f.companyName}</span>
                          <span className="block text-[12px] text-[var(--text-tertiary)]">{f.rooms} rooms · {f.beds} beds{f.maintenanceRooms ? ` · ${f.maintenanceRooms} under repair` : ''}</span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[15px] font-bold">{f.occupied}/{f.beds}</span>
                          <span className="block text-[12px] text-sun-800 font-semibold">{f.free} free</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1"><ProgressBar value={f.occupied} max={f.beds || 1} tone={p >= 90 ? 'brand' : 'sun'} height={7} delay={i * 0.05} label={`Floor ${f.floorNumber} occupancy`} /></div>
                        <span className="text-[12px] font-semibold w-10 text-right">{p}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card title="Room types">
              <div className="flex items-center gap-5">
                <DonutRing size={128} stroke={15} label="Rooms by sharing" segments={Object.entries(sharing).map(([k, v]) => ({ value: v, color: SHARING[k]?.color || 'var(--color-mint-300)' }))}>
                  <span className="text-[11px] text-[var(--text-tertiary)]">Rooms</span>
                  <span className="text-[18px] font-bold">{occ.totals.rooms}</span>
                </DonutRing>
                <ul className="list-none m-0 p-0 flex flex-col gap-2 flex-1">
                  {Object.entries(sharing).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 text-[13px]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: SHARING[k]?.color }} />
                      <span className="flex-1 text-[var(--text-secondary)]">{SHARING[k]?.label || `${k}-sharing`}</span>
                      <strong>{v}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default OccupancyReport;
