import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CircleCheck, Download, FileText, Gauge, HandCoins, Receipt, Send, Sparkles, Wallet, Zap } from 'lucide-react';
import { demandNotes as demandNotesApi, electricity as electricityApi, floors as floorsApi, rooms as roomsApi } from '../utils/api';
import Avatar from '../components/ui/Avatar';
import FilterChips from '../components/ui/FilterChips';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProgressBar from '../components/ui/ProgressBar';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox } from '../components/ui/PageStates';
import { downloadCsv, fmtDate, plural, rupees } from '../utils/format';
import SummaryTile from './finance/SummaryTile';
import RecordPaymentModal from './finance/RecordPaymentModal';
import MeterReadings from './finance/MeterReadings';
import DemandNotePrint from '../components/DemandNotePrint';
import { BILL_STATUS, billState, currentMonth, monthLabel, noteDueDate, shiftMonth, stagger, total, useCompanyConfig } from './finance/financeUtils';

const cycleText = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${fmtDate(new Date(y, m - 1, 10))} – ${fmtDate(new Date(y, m, 9), { year: 'numeric' })}`;
};

const DemandNotes = () => {
  const toast = useToast();
  const config = useCompanyConfig();
  const [month, setMonth] = useState(currentMonth());
  const [floor, setFloor] = useState('all');
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [notes, setNotes] = useState([]);
  const [readings, setReadings] = useState([]);
  const [prevReadings, setPrevReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [metersOpen, setMetersOpen] = useState(false);
  const [confirmGen, setConfirmGen] = useState(false);
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);

  const rate = config?.fees?.electricityRate || 12;
  const [isSmall, setIsSmall] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsSmall(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    floorsApi.getAll().then((f) => setFloors(f || [])).catch(() => {});
    roomsApi.getAll().then((r) => setRooms(Array.isArray(r) ? r : r?.rooms || [])).catch(() => {});
  }, []);

  const loadMonth = useCallback(async () => {
    try {
      setError(null);
      const params = floor === 'all' ? { month } : { month, floorNumber: floor };
      const [n, r, p] = await Promise.all([
        demandNotesApi.getAll(params),
        electricityApi.getReadings({ month }).catch(() => []),
        electricityApi.getReadings({ month: shiftMonth(month, -1) }).catch(() => []),
      ]);
      setNotes(n || []);
      setReadings(r || []);
      setPrevReadings(p || []);
    } catch (err) {
      setError(err.message || 'Could not load demand notes.');
    } finally {
      setLoading(false);
    }
  }, [month, floor]);

  useEffect(() => {
    setLoading(true);
    loadMonth();
  }, [loadMonth]);

  const occupiedRooms = useMemo(
    () => rooms
      .filter((r) => (r.students || []).some((s) => s.status === 'CHECKED_IN'))
      .filter((r) => floor === 'all' || String(r.floorNumber) === floor)
      .sort((a, b) => (a.floorNumber - b.floorNumber) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })),
    [rooms, floor]
  );
  const readRoomIds = new Set(readings.map((r) => r.roomId));
  const roomsRead = occupiedRooms.filter((r) => readRoomIds.has(r.id)).length;

  const rows = useMemo(() => notes.map((n) => ({ ...n, due: noteDueDate(n), state: billState(n.status, noteDueDate(n)) })), [notes]);
  const open = rows.filter((r) => r.state !== 'paid');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (status === 'all' ? true : status === 'open' ? r.state !== 'paid' : r.state === 'paid'))
      .filter((r) => !q || [r.student?.user?.name, r.student?.rollNumber, r.student?.room?.roomNumber, r.noteNumber].some((v) => v && String(v).toLowerCase().includes(q)))
      .sort((a, b) => (a.floorNumber - b.floorNumber) || String(a.student?.room?.roomNumber).localeCompare(String(b.student?.room?.roomNumber), undefined, { numeric: true }));
  }, [rows, status, search]);

  const [sendingId, setSendingId] = useState(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const generate = async () => {
    try {
      const res = await demandNotesApi.generate(month, floor === 'all' ? undefined : Number(floor));
      toast.success('Bills calculated', 'Check them, then send to residents.');
      await loadMonth();
      // Offer to send right away — residents only see a note once it is sent
      if (res.count) setConfirmSend(true);
    } catch (err) {
      toast.error('Could not generate', err.message);
    }
  };

  // Residents only see a note once it is sent
  const drafts = notes.filter((n) => n.status === 'PENDING');
  const sendNotes = async (ids) => {
    setSendingId(ids?.[0] || 'all');
    try {
      const res = await demandNotesApi.send(ids ? { ids } : { month, floorNumber: floor });
      toast.success(res.count ? 'Sent to residents' : 'Nothing to send', res.count ? `${plural(res.count, 'resident')} can now see and pay it in the app.` : undefined);
      await loadMonth();
    } catch (err) { toast.error('Could not send', err.message); } finally { setSendingId(null); }
  };

  const recordPayment = async (data) => {
    const res = await demandNotesApi.markPaid(paying.id, data);
    setNotes((list) => list.map((n) => (n.id === paying.id ? { ...n, ...res.demandNote } : n)));
    toast.success('Payment recorded', `${rupees(paying.totalAmount)} from ${paying.student?.user?.name}`);
    setPaying(null);
  };

  const exportCsv = () =>
    downloadCsv(
      `demand-notes-${month}${floor === 'all' ? '' : `-floor-${floor}`}.csv`,
      ['Note no.', 'Resident', 'Roll no.', 'Room', 'Floor', 'Company', 'Hostel fee', 'Electricity units', 'Electricity', 'Catering', 'Total', 'Status', 'Paid on'],
      filtered.map((r) => [r.noteNumber, r.student?.user?.name, r.student?.rollNumber, r.student?.room?.roomNumber, r.floorNumber, r.companyName, r.hostelFee, r.electricityUnits, r.electricityAmount, r.messFee, r.totalAmount, BILL_STATUS[r.state].label, r.paidAt ? fmtDate(r.paidAt, { year: 'numeric' }) : ''])
    );

  const isFuture = month > currentMonth();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Demand Notes" subtitle={`10-to-10 billing cycle · ${cycleText(month)}`}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[var(--border-color)]">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <label className="sr-only" htmlFor="dn-month">Billing month</label>
          <input id="dn-month" type="month" className="h-8 px-2 border-none bg-transparent text-[13px] font-semibold cursor-pointer" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-mint-50" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        <select className="form-input w-auto cursor-pointer" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Floor">
          <option value="all">All floors</option>
          {floors.map((f) => <option key={f.floorNumber} value={String(f.floorNumber)}>Floor {f.floorNumber} · {f.companyName}</option>)}
        </select>
      </PageHeader>

      {error && <ErrorPanel message={error} onRetry={loadMonth} />}

      {/* Two-step workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-8 h-8 shrink-0 rounded-full bg-mint-100 text-brand-700 text-[13px] font-bold flex items-center justify-center">1</span>
            <div className="flex-1 min-w-[180px]">
              <h2 className="text-[15px] font-bold m-0">Electricity readings</h2>
              <p className="text-[12px] text-[var(--text-secondary)] m-0">{roomsRead} of {plural(occupiedRooms.length, 'occupied room')} read for {monthLabel(month, { month: 'long' })}</p>
            </div>
            <button className={roomsRead < occupiedRooms.length ? 'btn-primary' : 'btn-secondary'} onClick={() => setMetersOpen(true)} disabled={!occupiedRooms.length}>
              <Gauge size={16} /> {roomsRead ? 'Update' : 'Enter'} readings
            </button>
          </div>
          <ProgressBar value={roomsRead} max={occupiedRooms.length || 1} tone={roomsRead === occupiedRooms.length && roomsRead ? 'brand' : 'sun'} height={8} label="Rooms read" />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className={`border rounded-[var(--border-radius-card)] p-5 flex flex-wrap items-center gap-3 ${notes.length ? 'bg-white border-[var(--border-color)]' : 'bg-cream-100 border-sun-200'}`}>
          <span className="w-8 h-8 shrink-0 rounded-full bg-mint-100 text-brand-700 text-[13px] font-bold flex items-center justify-center">2</span>
          <div className="flex-1 min-w-[180px]">
            <h2 className="text-[15px] font-bold m-0">Calculate the bills</h2>
            <p className="text-[12px] text-[var(--text-secondary)] m-0">
              {notes.length ? `${plural(notes.length, 'note')} calculated · recalculate after changing readings` : 'Room rent + electricity share + catering for every checked-in resident'}
            </p>
          </div>
          <button className={notes.length ? 'btn-secondary' : 'btn-primary'} onClick={() => setConfirmGen(true)} disabled={isFuture}>
            <Sparkles size={16} /> {notes.length ? 'Recalculate' : 'Calculate'}
          </button>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }} className={`border rounded-[var(--border-radius-card)] p-5 flex flex-wrap items-center gap-3 ${drafts.length ? 'bg-cream-100 border-sun-200' : 'bg-white border-[var(--border-color)]'}`}>
          <span className="w-8 h-8 shrink-0 rounded-full bg-mint-100 text-brand-700 text-[13px] font-bold flex items-center justify-center">3</span>
          <div className="flex-1 min-w-[180px]">
            <h2 className="text-[15px] font-bold m-0">Send to residents</h2>
            <p className="text-[12px] text-[var(--text-secondary)] m-0">
              {drafts.length ? `${plural(drafts.length, 'note')} waiting · residents see it in the app with a QR to pay` : notes.length ? 'All notes are sent' : 'Calculate the notes first'}
            </p>
          </div>
          <button className="btn-brand" onClick={() => setConfirmSend(true)} disabled={!drafts.length || sendingId === 'all'}>
            <Send size={16} /> {sendingId === 'all' ? 'Sending…' : drafts.length ? `Send ${drafts.length}` : 'Sent'}
          </button>
        </motion.section>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <SummaryTile icon={Receipt} tone="lilac" label="Billed" value={total(rows, (r) => r.totalAmount)} caption={plural(rows.length, 'note')} onClick={() => setStatus('all')} active={status === 'all'} />
        <SummaryTile icon={Wallet} tone="sun" label="Pending" value={total(open, (r) => r.totalAmount)} caption={plural(open.length, 'resident')} onClick={() => setStatus('open')} active={status === 'open'} />
        <SummaryTile icon={CircleCheck} tone="mint" label="Collected" value={total(rows.filter((r) => r.state === 'paid'), (r) => r.totalAmount)} caption={plural(rows.length - open.length, 'payment')} onClick={() => setStatus('paid')} active={status === 'paid'} />
        <SummaryTile icon={Zap} tone="peach" label="Electricity" value={total(rows, (r) => r.electricityAmount)} caption={`${Math.round(total(rows, (r) => r.electricityUnits))} units billed`} />
      </motion.div>

      <div className="bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, roll no., room or note no." className="flex-1" />
        <div className="flex items-center gap-2 justify-between">
          <FilterChips id="dn-status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Pending', count: open.length }, { value: 'paid', label: 'Paid' }]} />
          <button className="btn-secondary h-9 px-3" onClick={exportCsv} disabled={!filtered.length} aria-label="Export CSV"><Download size={15} /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-[68px] rounded-2xl skeleton-loading" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyPanel
          icon={rows.length ? CircleCheck : FileText}
          tone={rows.length ? 'success' : 'mint'}
          title={rows.length ? 'Nothing here' : `No demand notes for ${monthLabel(month)}`}
          text={rows.length ? 'Try another filter or search.' : 'Enter this month’s meter readings, then generate the notes.'}
        />
      ) : isSmall ? (
        <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
          {filtered.map((r) => (
            <li key={r.id} className="bg-white border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3" onClick={() => setViewing(r)}>
              <div className="flex items-center gap-3">
                <Avatar name={r.student?.user?.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate">{r.student?.user?.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">Room {r.student?.room?.roomNumber || '—'} · F{r.floorNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold">{rupees(r.totalAmount)}</div>
                  {r.status === 'PENDING' ? <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">Draft</span> : <span className={`badge ${BILL_STATUS[r.state].badge}`}>{BILL_STATUS[r.state].label}</span>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--text-secondary)]">
                <span>Rent {rupees(r.hostelFee)} · Elec {rupees(r.electricityAmount)}</span>
                {r.state !== 'paid' && (
                  <button className="btn-primary h-9 px-3 text-[13px]" onClick={(e) => { e.stopPropagation(); setPaying(r); }}><HandCoins size={15} /> Record</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Room</th>
                <th className="text-right">Hostel</th>
                <th className="text-right">Electricity</th>
                <th className="text-right">Catering</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th className="text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((r, i) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: Math.min(i, 12) * 0.02 } }} onClick={() => setViewing(r)} className="cursor-pointer group">
                    <td>
                      <div className="flex items-center gap-3 min-w-[190px]">
                        <Avatar name={r.student?.user?.name} size={34} />
                        <div className="min-w-0">
                          <div className="font-semibold truncate group-hover:text-brand-700">{r.student?.user?.name}</div>
                          <div className="text-[12px] text-[var(--text-tertiary)]">{r.noteNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{r.student?.room?.roomNumber || '—'} <span className="text-[var(--text-tertiary)]">· F{r.floorNumber}</span></td>
                    <td className="text-right">{rupees(r.hostelFee)}</td>
                    <td className="text-right whitespace-nowrap">{r.electricityAmount ? <>{rupees(r.electricityAmount)} <span className="text-[11px] text-[var(--text-tertiary)]">{r.electricityUnits}u</span></> : <span className="text-[var(--text-tertiary)]">—</span>}</td>
                    <td className="text-right">{rupees(r.messFee)}</td>
                    <td className="text-right font-bold">{rupees(r.totalAmount)}</td>
                    <td>{r.status === 'PENDING' ? <span className="badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)] whitespace-nowrap">Draft</span> : <span className={`badge ${BILL_STATUS[r.state].badge}`}>{BILL_STATUS[r.state].label}</span>}</td>
                    <td className="text-right whitespace-nowrap">
                      {r.status === 'PENDING' && (
                        <button className="btn-brand h-9 px-3 text-[13px] mr-2" disabled={sendingId === r.id} onClick={(e) => { e.stopPropagation(); sendNotes([r.id]); }}><Send size={14} /> Send</button>
                      )}
                      {r.state === 'paid' ? (
                        <button className="btn-secondary h-9 px-3 text-[13px]" onClick={(e) => { e.stopPropagation(); setViewing(r); }}><FileText size={14} /> Receipt</button>
                      ) : (
                        <button className="btn-primary h-9 px-3 text-[13px]" onClick={(e) => { e.stopPropagation(); setPaying(r); }}><HandCoins size={15} /> Record</button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <MeterReadings
        open={metersOpen}
        onClose={() => setMetersOpen(false)}
        month={month}
        rooms={occupiedRooms}
        readings={readings}
        prevReadings={prevReadings}
        rate={rate}
        onSaved={() => electricityApi.getReadings({ month }).then((r) => setReadings(r || [])).catch(() => {})}
      />
      <ConfirmDialog
        open={confirmGen}
        tone="brand"
        title={`${notes.length ? 'Recalculate' : 'Calculate'} notes for ${monthLabel(month)}?`}
        message={`${floor === 'all' ? 'All floors' : `Floor ${floor}`}: every checked-in resident gets a note for ${cycleText(month)}.${roomsRead < occupiedRooms.length ? ` ${plural(occupiedRooms.length - roomsRead, 'room')} without a meter reading will be billed ₹0 electricity.` : ''}${notes.length ? ' Unpaid notes are recalculated; paid notes are left as they are.' : ''}`}
        confirmLabel={notes.length ? 'Recalculate' : 'Calculate'}
        onConfirm={generate}
        onClose={() => setConfirmGen(false)}
      />
      <ConfirmDialog
        open={confirmSend}
        title={`Send ${plural(drafts.length, 'demand note')}?`}
        message={`${floor === 'all' ? 'All floors' : `Floor ${floor}`} · ${monthLabel(month)}. Each resident sees their note with the electricity charge and can pay it from the app.`}
        confirmLabel="Send to residents"
        tone="brand"
        onConfirm={() => sendNotes()}
        onClose={() => setConfirmSend(false)}
      />
      <RecordPaymentModal
        open={Boolean(paying)}
        bill={paying && { title: paying.student?.user?.name, subtitle: `${paying.noteNumber} · Room ${paying.student?.room?.roomNumber || '—'}`, amount: paying.totalAmount }}
        onClose={() => setPaying(null)}
        onSubmit={recordPayment}
      />
      {viewing && <DemandNotePrint note={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default DemandNotes;
