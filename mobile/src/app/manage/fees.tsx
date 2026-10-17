import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, HandCoins, Receipt, Download, Share2, TriangleAlert, Wallet } from 'lucide-react-native';
import { demandNotesApi, feesApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, monthKey, plural, rupees } from '../../lib/format';
import { BILL_STATUS, billState } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, Chips, IconButton, Row, T } from '../../ui/primitives';
import { SearchInput } from '../../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, Grid, Screen, Stat } from '../../ui/layout';
import { Hero, HeroCells, onHero } from '../../ui/blocks';
import { FloorChips, onFloor, useFloor } from '../../features/floor';
import RecordPayment from '../../features/RecordPayment';
import { downloadBill, shareBill } from '../../features/receipt';

const invNo = (i: any) => `INV/${String(i.id).slice(0, 6).toUpperCase()}`;

// Fee invoices: who owes what, record payments, share receipts
export default function Fees() {
  const qc = useQueryClient();
  const toast = useToast();
  const { floor } = useFloor();
  const { data, isLoading, error, refetch } = useData(['invoices'], feesApi.all);
  const config = useData(['company-config'], demandNotesApi.companyConfig, { interval: false });
  const [filter, setFilter] = useState<'open' | 'overdue' | 'paid'>('open');
  const [q, setQ] = useState('');
  const [paying, setPaying] = useState<any>(null);

  const rows = useMemo(() => asList(data).filter((i: any) => onFloor(i.student?.room, floor)).map((i: any) => ({ ...i, state: billState(i.status, i.dueDate) })), [data, floor]);
  const open = rows.filter((r: any) => r.state !== 'paid');
  const overdue = rows.filter((r: any) => r.state === 'overdue');
  const thisMonth = monthKey();
  const collected = rows.filter((r: any) => r.paidAt && monthKey(new Date(r.paidAt)) === thisMonth);
  const sum = (l: any[]) => l.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const shown = rows
    .filter((r: any) => (filter === 'open' ? r.state !== 'paid' : r.state === filter))
    .filter((r: any) => !q.trim() || [r.student?.user?.name, r.student?.rollNumber, r.student?.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const record = async (p: any) => {
    await feesApi.recordPayment(paying.id, p);
    toast.success('Payment recorded', `${rupees(paying.amount)} from ${paying.student?.user?.name}`);
    await qc.invalidateQueries({ queryKey: ['invoices'] });
    setPaying(null);
  };

  const share = async (i: any, mode: 'share' | 'download' = 'share') => {
    try {
      await (mode === 'download' ? downloadBill : shareBill)({
        title: i.status === 'PAID' ? 'Fee receipt' : 'Fee bill', number: invNo(i), company: config.data?.companies?.[i.floorNumber || i.student?.room?.floorNumber],
        resident: { name: i.student?.user?.name, roll: i.student?.rollNumber, room: i.student?.room?.roomNumber },
        lines: i.rentAmount != null ? [{ label: 'Room rent', amount: i.rentAmount || 0 }, { label: 'Mess & catering', amount: i.messAmount || 0 }, ...(i.electricityAmount ? [{ label: 'Electricity', amount: i.electricityAmount }] : [])] : [{ label: 'Hostel fee', amount: i.amount }],
        total: i.amount, issued: i.createdAt, due: i.dueDate, paidAt: i.paidAt,
      });
    } catch (e: any) { toast.error('Could not create the PDF', e.message); }
  };

  return (
    <Screen title="Fees & payments" subtitle={`${plural(open.length, 'unpaid bill')} · ${rupees(sum(open))} to collect`} back tabBar={false} onRefresh={refetch}>
      <FloorChips />
      <Hero>
        <Row align="flex-start">
          <View style={{ flex: 1, gap: 2 }}>
            <T v="label" c={onHero.faint}>To collect</T>
            <T v="display" c={onHero.strong}>{rupees(sum(open))}</T>
            <T v="small" c={onHero.soft}>{plural(open.length, 'unpaid bill')}</T>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><Wallet size={22} color={colors.white} /></View>
        </Row>
        <HeroCells items={[
          { k: 'Overdue', v: rupees(sum(overdue)), active: filter === 'overdue', onPress: () => setFilter('overdue') },
          { k: 'Collected · month', v: rupees(sum(collected)), active: filter === 'paid', onPress: () => setFilter('paid') },
        ]} />
      </Hero>
      <SearchInput value={q} onChange={setQ} placeholder="Name, roll no. or room" />
      <Chips value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Unpaid', count: open.length }, { value: 'overdue', label: 'Overdue', count: overdue.length }, { value: 'paid', label: 'Paid', count: rows.length - open.length }]} />

      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={filter === 'paid' ? Receipt : CircleCheck} tone={filter === 'paid' ? 'mint' : 'success'} title={filter === 'paid' ? 'No payments yet' : 'Nothing to collect'} />
      ) : shown.map((i: any, idx: number) => (
        <Appear key={i.id} i={idx}>
          <Card style={{ gap: 10 }}>
            <Row>
              <Avatar name={i.student?.user?.name} />
              <View style={{ flex: 1 }}>
                <T v="title" numberOfLines={1}>{i.student?.user?.name}</T>
                <T v="caption" c={colors.text3} numberOfLines={1}>Room {i.student?.room?.roomNumber || '—'} · {i.student?.rollNumber}</T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T v="title" w="bold">{rupees(i.amount)}</T>
                <Badge label={BILL_STATUS[i.state].label} tone={BILL_STATUS[i.state].tone} />
              </View>
            </Row>
            <T v="caption" c={i.state === 'overdue' ? colors.danger : colors.text3}>
              {i.state === 'paid' ? `Paid ${fmtDate(i.paidAt, { year: 'numeric' })}` : `Due ${fmtDate(i.dueDate, { year: 'numeric' })}`}
            </T>
            <Row gap={8}>
              <IconButton icon={Download} label="Download PDF" tone="mint" size={40} onPress={() => share(i, 'download')} />
              <IconButton icon={Share2} label="Share PDF" tone="white" size={40} onPress={() => share(i)} />
              {i.state !== 'paid' && <Button title="Record payment" icon={HandCoins} small onPress={() => setPaying(i)} style={{ flex: 1 }} />}
            </Row>
          </Card>
        </Appear>
      ))}
      <RecordPayment bill={paying && { title: paying.student?.user?.name, subtitle: `${invNo(paying)} · due ${fmtDate(paying.dueDate)}`, amount: paying.amount }} onClose={() => setPaying(null)} onSave={record} />
    </Screen>
  );
}
