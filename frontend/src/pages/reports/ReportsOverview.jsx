import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble, CalendarDays, DoorOpen, Download, FileSpreadsheet, LoaderCircle, Receipt, UtensilsCrossed, Users, Wallet, Wrench,
} from 'lucide-react';
import { floors as floorsApi } from '../../utils/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorPanel } from '../../components/ui/PageStates';
import SummaryTile from '../finance/SummaryTile';
import { monthLabel, stagger } from '../finance/financeUtils';
import { plural } from '../../utils/format';
import {
  exportCollection, exportComplaints, exportFloorSummary, exportFreeBeds, exportInvoices, exportLeaves, exportMess, exportResidents, exportRooms, exportVisitors,
} from '../../utils/exports';
import { Card, DailyBars, ReportHeader, ReportSkeleton } from './ReportParts';
import { useReportScope, useReportSummary } from './reportState';

const GROUPS = [
  {
    title: 'Residents & rooms',
    icon: BedDouble,
    items: [
      { key: 'residents', label: 'Residents list', hint: 'Contacts, parents, room and bed', run: ({ floor }) => exportResidents(null, floor) },
      { key: 'rooms', label: 'Rooms & beds', hint: 'Status, beds taken, who lives where', run: ({ floor }) => exportRooms(null, floor) },
      { key: 'free', label: 'Free beds', hint: 'Rooms with space right now', run: ({ floor }) => exportFreeBeds(null, floor) },
      { key: 'floors', label: 'Floor summary', hint: 'Occupancy per floor and company', run: () => exportFloorSummary() },
    ],
  },
  {
    title: 'Fees',
    icon: Wallet,
    items: [
      { key: 'collection', label: 'Fee collection', hint: 'Billed, collected and pending', run: ({ month, floor }) => exportCollection(month, floor) },
      { key: 'invoices', label: 'Invoices', hint: 'Every invoice raised this month', run: ({ month, floor }) => exportInvoices(month, floor) },
    ],
  },
  {
    title: 'Leaves & gate',
    icon: CalendarDays,
    items: [
      { key: 'leaves', label: 'Leave register', hint: 'Requests, exit and return times', run: ({ month, floor }) => exportLeaves(month, floor) },
      { key: 'visitors', label: 'Visitor register', hint: 'Who came, for whom, in and out', run: ({ month, floor }) => exportVisitors(month, floor) },
    ],
  },
  {
    title: 'Helpdesk & mess',
    icon: Wrench,
    items: [
      { key: 'complaints', label: 'Complaints', hint: 'Category, priority, status', run: ({ month, floor }) => exportComplaints(month, floor) },
      { key: 'mess', label: 'Mess attendance', hint: 'Plates served per meal, per day', run: ({ summary }) => exportMess(summary) },
    ],
  },
];

const ReportsOverview = () => {
  const toast = useToast();
  const { month, floor } = useReportScope();
  const { data, loading, error, reload } = useReportSummary(month, floor);
  const [collection, setCollection] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    let alive = true;
    setCollection(null);
    floorsApi.getReport(floor === 'all' ? 'combined' : floor, month)
      .then((r) => alive && setCollection(floor === 'all'
        ? { billed: r.grandTotal?.total || 0, collected: r.grandTotal?.collected || 0, rate: r.grandTotal?.collectionRate || 0 }
        : { billed: r.summary?.grandTotal || 0, collected: r.summary?.totalCollected || 0, rate: r.summary?.collectionRate || 0 }))
      .catch(() => {});
    return () => { alive = false; };
  }, [month, floor]);

  const download = async (item) => {
    setBusy(item.key);
    try {
      const rows = await item.run({ month, floor, summary: data });
      if (rows === 0) toast.info('Nothing to download', `No ${item.label.toLowerCase()} for ${monthLabel(month)}.`);
      else toast.success('Downloaded', `${item.label} · ${plural(rows, 'row')}`);
    } catch (err) {
      toast.error('Download failed', err.message);
    } finally {
      setBusy(null);
    }
  };

  const occ = data?.occupancy;
  const occPct = occ?.totals.beds ? Math.round((occ.totals.occupied / occ.totals.beds) * 100) : 0;
  const plates = data ? Object.values(data.mess.totals).reduce((s, x) => s + x, 0) : 0;
  const servedDays = Math.max(1, data?.mess.servedDays || 1);

  return (
    <div className="flex flex-col gap-5">
      <ReportHeader title="Reports" onRefresh={reload} loading={loading} />
      {error && <ErrorPanel message={error} onRetry={reload} />}

      {!data ? <ReportSkeleton /> : (
        <>
          <motion.div key={`${month}-${floor}`} variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <SummaryTile icon={BedDouble} tone="mint" label="Occupancy" value={occPct} money={false} unit="%" caption={`${occ.totals.occupied}/${occ.totals.beds} beds · ${occ.totals.free} free`} />
            <SummaryTile icon={Wallet} tone="sun" label="Fees collected" value={collection?.collected || 0} caption={collection ? `${collection.rate}% of billed` : 'Loading…'} />
            <SummaryTile icon={CalendarDays} tone="lilac" label="Leaves" value={data.leaves.total} money={false} caption={data.leaves.lateReturns ? `${data.leaves.lateReturns} came back late` : 'No late returns'} />
            <SummaryTile icon={DoorOpen} tone="white" label="Visitors" value={data.visitors.total} money={false} caption={data.visitors.avgStayMinutes ? `Avg stay ${data.visitors.avgStayMinutes} min` : '—'} />
            <SummaryTile icon={Wrench} tone="peach" label="Complaints" value={data.complaints.total} money={false} caption={`${data.complaints.openNow} open now`} />
            <SummaryTile icon={UtensilsCrossed} tone="white" label="Plates / day" value={Math.round(plates / servedDays)} money={false} caption={`${plural(data.mess.residents, 'resident')}`} />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card title="Gate activity by day">
              <DailyBars
                label="Leaves and visitors per day"
                days={data.leaves.daily.map((d, i) => ({ date: d.date, leaves: d.count, visitors: data.visitors.daily[i]?.count || 0 }))}
                series={[{ key: 'leaves', label: 'Leaves starting', color: 'var(--color-lilac-500)' }, { key: 'visitors', label: 'Visitors', color: 'var(--color-sun-400)' }]}
              />
            </Card>
            <Card title="Mess plates by day">
              <DailyBars
                label="Mess plates per day"
                days={data.mess.days}
                series={[
                  { key: 'BREAKFAST', label: 'Breakfast', color: 'var(--color-sun-400)' },
                  { key: 'LUNCH', label: 'Lunch', color: 'var(--color-brand-500)' },
                  { key: 'SNACKS', label: 'Snacks', color: 'var(--color-peach-500)' },
                  { key: 'DINNER', label: 'Dinner', color: 'var(--color-lilac-500)' },
                ]}
              />
            </Card>
          </div>

          <Card
            title="Download centre"
            action={<span className="text-[12px] text-[var(--text-tertiary)]">Excel-ready CSV · {floor === 'all' ? 'all floors' : `floor ${floor}`} · {monthLabel(month)}</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {GROUPS.map(({ title, icon: Icon, items }) => (
                <div key={title} className="flex flex-col gap-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] m-0 flex items-center gap-1.5"><Icon size={13} /> {title}</h3>
                  {items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => download(item)}
                      disabled={Boolean(busy)}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-white text-left cursor-pointer hover:border-brand-200 hover:bg-mint-50/60 transition-colors disabled:opacity-60"
                    >
                      <span className="w-9 h-9 shrink-0 rounded-lg bg-mint-100 text-brand-700 flex items-center justify-center">
                        {busy === item.key ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold">{item.label}</span>
                        <span className="block text-[12px] text-[var(--text-tertiary)] truncate">{item.hint}</span>
                      </span>
                      <Download size={15} className="text-[var(--text-tertiary)] group-hover:text-brand-700" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {(occ.withoutRoom > 0 || data.leaves.overdueNow > 0 || data.complaints.openOver3Days > 0) && (
            <Card title="Needs a look">
              <ul className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
                {occ.withoutRoom > 0 && <li className="flex items-center gap-2.5 p-3 rounded-xl bg-cream-100"><Users size={16} className="text-sun-800" /> {plural(occ.withoutRoom, 'resident')} without a room</li>}
                {data.leaves.overdueNow > 0 && <li className="flex items-center gap-2.5 p-3 rounded-xl bg-peach-50"><CalendarDays size={16} className="text-peach-700" /> {plural(data.leaves.overdueNow, 'resident')} past return time</li>}
                {data.complaints.openOver3Days > 0 && <li className="flex items-center gap-2.5 p-3 rounded-xl bg-peach-50"><Receipt size={16} className="text-peach-700" /> {plural(data.complaints.openOver3Days, 'complaint')} open over 3 days</li>}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsOverview;
