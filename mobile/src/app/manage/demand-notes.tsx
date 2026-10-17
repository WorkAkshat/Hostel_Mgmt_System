import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, FileText, Gauge, HandCoins, Save, Download, Share2, Send, Sparkles, Zap } from 'lucide-react-native';
import { demandNotesApi, electricityApi, roomsApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, monthKey, monthLabel, plural, rupees, shiftMonth } from '../../lib/format';
import { BILL_STATUS, billState, noteDueDate } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, Chips, IconButton, Progress, Row, Segmented, T } from '../../ui/primitives';
import { Input, money } from '../../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, Grid, Screen, Stat } from '../../ui/layout';
import { Hero, HeroCells, onHero } from '../../ui/blocks';
import { FloorChips, onFloor, useFloor } from '../../features/floor';
import MonthStepper from '../../features/MonthStepper';
import RecordPayment from '../../features/RecordPayment';
import { downloadBill, shareBill } from '../../features/receipt';

export default function DemandNotes() {
  const params = useLocalSearchParams<{ tab?: 'notes' | 'meters' }>();
  const [tab, setTab] = useState<'notes' | 'meters'>('notes');
  useEffect(() => { if (params.tab) { setTab(params.tab); router.setParams({ tab: undefined }); } }, [params.tab]);
  const [month, setMonth] = useState(monthKey());

  return (
    <Screen title="Demand notes" subtitle="Monthly bills + electricity" back tabBar={false}>
      <MonthStepper value={month} onChange={setMonth} />
      <FloorChips />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'notes', label: 'Notes & payments' }, { value: 'meters', label: 'Meter readings' }]} />
      {tab === 'notes' ? <Notes month={month} /> : <Meters month={month} onCalculated={() => setTab('notes')} />}
    </Screen>
  );
}

const Notes = ({ month }: { month: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const { floor } = useFloor();
  const { data, isLoading, error, refetch } = useData(['demand-notes', month, floor], () => demandNotesApi.all({ month, floorNumber: floor }));
  const [filter, setFilter] = useState<'open' | 'paid' | 'all'>('open');
  const [paying, setPaying] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [askSend, setAskSend] = useState(false);

  const rows = asList(data).map((n: any) => ({ ...n, state: billState(n.status, noteDueDate(n)) }));
  const open = rows.filter((r: any) => r.state !== 'paid');
  const total = (l: any[]) => l.reduce((a, n) => a + (Number(n.totalAmount) || 0), 0);
  const shown = rows.filter((r: any) => (filter === 'all' ? true : filter === 'open' ? r.state !== 'paid' : r.state === 'paid'))
    .sort((a: any, b: any) => String(a.student?.room?.roomNumber).localeCompare(String(b.student?.room?.roomNumber), undefined, { numeric: true }));

  const generate = async () => {
    try {
      const res = await demandNotesApi.generate(month, floor === 'all' ? undefined : Number(floor));
      toast.success('Bills calculated', 'Check them, then send to residents.');
      await qc.invalidateQueries({ queryKey: ['demand-notes'] });
      setAskSend(true);
    } catch (e: any) { toast.error('Could not generate', e.message); throw e; }
  };
  // Residents only see a note after it is sent
  const drafts = rows.filter((r: any) => r.status === 'PENDING');
  // Right after calculating, ask "send now?" once the new drafts have loaded
  useEffect(() => { if (askSend && drafts.length) { setAskSend(false); setConfirmSend(true); } }, [askSend, drafts.length]);
  const send = async (ids?: string[]) => {
    setSending(ids?.[0] || 'all');
    try {
      const res = await demandNotesApi.send(ids ? { ids } : { month, floorNumber: floor });
      toast.success(res.count ? 'Sent to residents' : 'Nothing to send', res.count ? `${res.count} resident${res.count === 1 ? '' : 's'} can now see and pay ${res.count === 1 ? 'it' : 'their note'} in the app.` : undefined);
      await qc.invalidateQueries({ queryKey: ['demand-notes'] });
    } catch (e: any) { toast.error('Could not send', e.message); throw e; } finally { setSending(null); }
  };
  const record = async (p: any) => {
    await demandNotesApi.recordPayment(paying.id, p);
    toast.success('Payment recorded', `${rupees(paying.totalAmount)} from ${paying.student?.user?.name}`);
    await qc.invalidateQueries({ queryKey: ['demand-notes'] });
    setPaying(null);
  };
  const share = async (n: any, mode: 'share' | 'download' = 'share') => {
    try {
      await (mode === 'download' ? downloadBill : shareBill)({
        title: 'Demand note', number: n.noteNumber, company: n.company,
        resident: { name: n.student?.user?.name, roll: n.student?.rollNumber, room: n.student?.room?.roomNumber },
        lines: [{ label: 'Hostel accommodation', amount: n.hostelFee }, { label: 'Electricity', detail: n.electricityUnits ? `${n.electricityUnits} units × ₹${n.electricityRate}` : undefined, amount: n.electricityAmount }, { label: 'Mess & catering', amount: n.messFee }],
        total: n.totalAmount, issued: n.createdAt, due: noteDueDate(n), paidAt: n.paidAt,
      });
    } catch (e: any) { toast.error('Could not create the PDF', e.message); }
  };

  return (
    <>
      <Hero>
        <Row align="flex-start">
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label" c={onHero.faint}>Collected</T>
            <T v="display" c={onHero.strong}>{rupees(total(rows) - total(open))}</T>
            <T v="small" c={onHero.soft}>of {rupees(total(rows))} billed · {plural(rows.length, 'note')}</T>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><FileText size={22} color={colors.white} /></View>
        </Row>
        <Progress value={total(rows) - total(open)} max={total(rows) || 1} color={colors.sun300} track="rgba(255,255,255,0.22)" />
        <HeroCells items={[{ k: 'Pending', v: rupees(total(open)) }, { k: 'Unpaid notes', v: String(open.length) }]} />
      </Hero>
      {drafts.length > 0 && (
        <Card tone="sun" style={{ gap: 10 }}>
          <Row align="flex-start">
            <Send size={20} color={colors.sun800} />
            <View style={{ flex: 1 }}>
              <T v="title" c={colors.sun900}>{plural(drafts.length, 'note')} not sent yet</T>
              <T v="caption" c={colors.sun800}>Check the electricity and amounts, then send. Residents see the note, the QR to pay, and get a notification.</T>
            </View>
          </Row>
          <Button title={`Send ${drafts.length} to residents`} icon={Send} kind="brand" loading={sending === 'all'} onPress={() => setConfirmSend(true)} full />
        </Card>
      )}
      <Button title={rows.length ? `Recalculate for ${monthLabel(month, false)}` : `Calculate notes for ${monthLabel(month, false)}`} icon={Sparkles} kind={rows.length ? 'secondary' : 'primary'} onPress={() => setGenerating(true)} disabled={month > monthKey()} full />
      <Chips value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Pending', count: open.length }, { value: 'paid', label: 'Paid', count: rows.length - open.length }, { value: 'all', label: 'All' }]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={FileText} title={rows.length ? 'Nothing here' : `No notes for ${monthLabel(month)}`} text={rows.length ? undefined : 'Enter meter readings first, then generate.'} />
      ) : shown.map((n: any, i: number) => (
        <Appear key={n.id} i={i}>
          <Card style={{ gap: 10 }}>
            <Row>
              <Avatar name={n.student?.user?.name} />
              <View style={{ flex: 1 }}>
                <T v="title" numberOfLines={1}>{n.student?.user?.name}</T>
                <T v="caption" c={colors.text3}>Room {n.student?.room?.roomNumber || '—'} · {n.noteNumber}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T v="title" w="bold">{rupees(n.totalAmount)}</T>
                {n.status === 'PENDING' ? <Badge label="Draft" tone="white" /> : <Badge label={BILL_STATUS[n.state].label} tone={BILL_STATUS[n.state].tone} />}
              </View>
            </Row>
            <T v="caption" c={colors.text2}>Rent {rupees(n.hostelFee)} · Electricity {rupees(n.electricityAmount)} · Mess {rupees(n.messFee)}</T>
            <Row gap={8} style={{ justifyContent: 'flex-end' }}>
              <IconButton icon={Download} label="Download PDF" tone="mint" size={40} onPress={() => share(n, 'download')} />
              <IconButton icon={Share2} label="Share PDF" tone="white" size={40} onPress={() => share(n)} />
              {n.status === 'PENDING'
                ? <Button title="Send to resident" icon={Send} kind="brand" small loading={sending === n.id} onPress={() => send([n.id]).catch(() => {})} style={{ flex: 1 }} />
                : n.state !== 'paid' ? <Button title="Record payment" icon={HandCoins} small onPress={() => setPaying(n)} style={{ flex: 1 }} /> : null}
            </Row>
          </Card>
        </Appear>
      ))}
      <RecordPayment bill={paying && { title: paying.student?.user?.name, subtitle: `${paying.noteNumber} · due ${fmtDate(noteDueDate(paying))}`, amount: paying.totalAmount }} onClose={() => setPaying(null)} onSave={record} />
      <Confirm open={generating} title={`${rows.length ? 'Recalculate' : 'Calculate'} notes for ${monthLabel(month)}?`}
        message={`${floor === 'all' ? 'All floors' : `Floor ${floor}`}: every checked-in resident gets rent + electricity share + mess. Notes stay as drafts until you send them.${rows.length ? ' Paid notes are left as they are.' : ''}`}
        confirmLabel={rows.length ? 'Recalculate' : 'Calculate'} onConfirm={generate} onClose={() => setGenerating(false)} />
      <Confirm open={confirmSend} title={`Send ${plural(drafts.length, 'demand note')}?`}
        message={`${floor === 'all' ? 'All floors' : `Floor ${floor}`} · ${monthLabel(month)}. Each resident sees their note with the electricity charge and can pay it from the app.`}
        confirmLabel="Send to residents" onConfirm={() => send()} onClose={() => setConfirmSend(false)} />
    </>
  );
};

const Meters = ({ month, onCalculated }: { month: string; onCalculated: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const { floor } = useFloor();
  // No auto-refresh here, so readings being typed are not reset
  const rooms = useData(['rooms'], roomsApi.all, { interval: false });
  const readings = useData(['readings', month], () => electricityApi.readings({ month }), { interval: false });
  const prev = useData(['readings', shiftMonth(month, -1)], () => electricityApi.readings({ month: shiftMonth(month, -1) }), { interval: false });
  const config = useData(['company-config'], demandNotesApi.companyConfig, { interval: false });
  const rate = Number(config.data?.fees?.electricityRate) || 12;
  const [draft, setDraft] = useState<Record<string, { prev: string; curr: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<'send' | 'review' | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  // Bills from these readings: calculate, and optionally send to every resident at once
  const finish = async (send: boolean) => {
    setFinishing(send ? 'send' : 'review');
    try {
      await demandNotesApi.generate(month, floor === 'all' ? undefined : Number(floor));
      if (send) {
        const res = await demandNotesApi.send({ month, floorNumber: floor });
        toast.success('Bills sent to residents', res.count ? `${plural(res.count, 'resident')} can now see the electricity bill and pay it in the app.` : 'Everyone already had their bill.');
      } else {
        toast.success('Bills calculated', 'Check them, then tap Send.');
      }
      await qc.invalidateQueries({ queryKey: ['demand-notes'] });
      onCalculated();
    } catch (e: any) { toast.error('Could not finish', e.message); throw e; } finally { setFinishing(null); }
  };

  const list = useMemo(() => asList(rooms.data)
    .filter((r: any) => onFloor(r, floor) && (r.students || []).some((s: any) => s.status === 'CHECKED_IN'))
    .sort((a: any, b: any) => (a.floorNumber - b.floorNumber) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })), [rooms.data, floor]);
  const byRoom = useMemo(() => Object.fromEntries(asList(readings.data).map((r: any) => [r.roomId, r])), [readings.data]);
  const prevByRoom = useMemo(() => Object.fromEntries(asList(prev.data).map((r: any) => [r.roomId, r])), [prev.data]);

  useEffect(() => {
    setDraft(Object.fromEntries(list.map((r: any) => {
      const saved = byRoom[r.id];
      return [r.id, { prev: saved ? String(saved.previousReading) : prevByRoom[r.id] ? String(prevByRoom[r.id].currentReading) : '', curr: saved ? String(saved.currentReading) : '' }];
    })));
  }, [list, byRoom, prevByRoom]);

  const done = list.filter((r: any) => byRoom[r.id]).length;
  const save = async (room: any) => {
    const d = draft[room.id];
    const p = Number(d?.prev), c = Number(d?.curr);
    if (d?.prev === '' || d?.curr === '' || Number.isNaN(p) || Number.isNaN(c)) return toast.error(`Room ${room.roomNumber}`, 'Enter both readings.');
    if (c < p) return toast.error(`Room ${room.roomNumber}`, 'Current reading cannot be lower than the previous one.');
    setBusy(room.id);
    try {
      await electricityApi.submit({ roomId: room.id, readingMonth: month, previousReading: p, currentReading: c, ratePerUnit: rate });
      toast.success(`Room ${room.roomNumber} saved`, `${c - p} units · ${rupees((c - p) * rate)}`);
      await qc.invalidateQueries({ queryKey: ['readings', month] });
    } catch (e: any) { toast.error('Could not save', e.message); } finally { setBusy(null); }
  };

  if (rooms.isLoading || readings.isLoading) return <Loading />;
  return (
    <>
      <Card style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}><T v="title">{done} of {list.length} rooms read</T><T v="caption" c={colors.text3}>₹{rate}/unit</T></Row>
        <Progress value={done} max={list.length || 1} color={done === list.length && done ? colors.brand500 : colors.sun400} />
        <T v="caption" c={colors.text3}>The room bill is split equally between its residents.</T>
      </Card>
      {list.length === 0 ? <Empty icon={Gauge} title="No occupied rooms" /> : list.map((room: any) => {
        const d = draft[room.id] || { prev: '', curr: '' };
        const saved = byRoom[room.id];
        const changed = !saved || String(saved.previousReading) !== d.prev || String(saved.currentReading) !== d.curr;
        const units = d.prev !== '' && d.curr !== '' ? Number(d.curr) - Number(d.prev) : null;
        return (
          <Card key={room.id} tone={saved && !changed ? 'mint' : undefined} style={{ gap: 10 }}>
            <Row>
              <T v="title" style={{ flex: 1 }}>Room {room.roomNumber}</T>
              <T v="caption" c={colors.text3}>{plural((room.students || []).length, 'resident')}</T>
              {saved && !changed && <CircleCheck size={16} color={colors.success} />}
            </Row>
            <Row gap={8} align="flex-end">
              <View style={{ flex: 1, gap: 4 }}><T v="caption" c={colors.text3}>Previous</T><Input value={d.prev} onChangeText={(v) => setDraft((x) => ({ ...x, [room.id]: { ...d, prev: money(v) } }))} keyboardType="decimal-pad" placeholder="0" /></View>
              <View style={{ flex: 1, gap: 4 }}><T v="caption" c={colors.text3}>Current</T><Input value={d.curr} onChangeText={(v) => setDraft((x) => ({ ...x, [room.id]: { ...d, curr: money(v) } }))} keyboardType="decimal-pad" placeholder="Meter now" /></View>
              <Button title="Save" icon={Save} small kind={changed ? 'primary' : 'secondary'} disabled={!changed} loading={busy === room.id} onPress={() => save(room)} style={{ height: 48 }} />
            </Row>
            {units != null && (units >= 0
              ? <Row gap={6}><Zap size={13} color={colors.sun800} /><T v="caption" c={colors.text2}>{units} units · {rupees(units * rate)}{(room.students || []).length > 1 ? ` · ${rupees((units * rate) / room.students.length)} each` : ''}</T></Row>
              : <T v="caption" c={colors.danger}>Current reading is lower than the previous one.</T>)}
          </Card>
        );
      })}
      {done > 0 && (
        <Card tone={done === list.length ? 'mint' : 'sun'} style={{ gap: 10 }}>
          <Row align="flex-start">
            <Send size={20} color={colors.brand700} />
            <View style={{ flex: 1 }}>
              <T v="title">{done === list.length ? 'All rooms read' : `${done} of ${list.length} rooms read`}</T>
              <T v="caption" c={colors.text2}>Make this month's bills (rent + electricity share + mess) and send them. Each resident sees their bill in the app with the QR to pay.</T>
            </View>
          </Row>
          <Button title="Calculate & send to residents" icon={Send} kind="brand" loading={finishing === 'send'} disabled={!!finishing} onPress={() => setConfirmFinish(true)} full />
          <Button title="Calculate only — I'll check first" icon={Sparkles} kind="secondary" small loading={finishing === 'review'} disabled={!!finishing} onPress={() => finish(false).catch(() => {})} full />
        </Card>
      )}
      <Confirm open={confirmFinish} title={`Send ${monthLabel(month)} bills?`}
        message={`${floor === 'all' ? 'All floors' : `Floor ${floor}`}: bills are calculated from these readings and sent to every checked-in resident.${done < list.length ? ` ${list.length - done} room(s) have no reading yet — they get no electricity charge.` : ''}`}
        confirmLabel="Calculate & send" onConfirm={() => finish(true)} onClose={() => setConfirmFinish(false)} />
    </>
  );
};
