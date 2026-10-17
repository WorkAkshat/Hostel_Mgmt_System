import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Building2, CircleCheck, Download, HandCoins, Info, Receipt, ScrollText, Share2, Wallet, Zap } from 'lucide-react-native';
import { dashboardApi, demandNotesApi, feesApi, paymentsApi } from '../../api';
import { asList } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { useData } from '../../lib/query';
import { fmtDate, monthKey, monthLabel, plural, rupees, rupeesShort } from '../../lib/format';
import { BILL_STATUS, billState, noteDueDate, priceFor } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Badge, Button, Card, Chips, Divider, IconTile, Row, T } from '../../ui/primitives';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../ui/layout';
import { Hero, HeroCells, onHero } from '../../ui/blocks';
import { Sheet } from '../../ui/Sheet';
import { downloadBill, shareBill, type BillDoc } from '../../features/receipt';
import PayBill from '../../features/PayBill';
import { docTitle, invoiceView } from '../../features/dues';

const STEPS = [
  { t: 'Open the bill', d: 'Tap any unpaid bill below — scan its QR with GPay / PhonePe / Paytm, or use the bank details.' },
  { t: 'Send the transaction ID', d: 'Type the UTR from your UPI app or bank SMS and tap "I have paid". Cash? Pay at the office.' },
  { t: 'Receipt appears here', d: 'The warden confirms it, the bill turns green and you can download the receipt.' },
];

export default function StudentBills() {
  const { user } = useAuth();
  const toast = useToast();
  const inv = useData(['my-invoices'], feesApi.mine);
  const notes = useData(['demand-notes'], () => demandNotesApi.all());
  const dash = useData(['dashboard'], dashboardApi.get);
  const config = useData(['company-config'], demandNotesApi.companyConfig, { interval: false });
  const payDetails = useData(['payment-settings'], paymentsApi.settings, { interval: 300_000 });
  const claims = useData(['my-payment-claims'], paymentsApi.myClaims);
  // Latest "I have paid" for a bill (newest first from the server)
  const claimFor = (id: string) => (Array.isArray(claims.data) ? claims.data : []).find((c: any) => c.billId === id);
  const [filter, setFilter] = useState<'open' | 'paid'>('open');
  const [viewing, setViewing] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const room = dash.data?.profile?.room;
  const bills = useMemo(() => [
    ...asList(inv.data).map((i: any) => {
      const v = invoiceView(i);
      return {
        id: i.id, kind: 'invoice', raw: i, number: v.number, title: v.title, charge: v.charge, amount: i.amount, due: i.dueDate, paidAt: i.paidAt, state: billState(i.status, i.dueDate),
        lines: v.lines,
        floor: i.floorNumber || i.student?.room?.floorNumber,
      };
    }),
    ...asList(notes.data).map((n: any) => {
      const due = noteDueDate(n);
      return {
        id: n.id, kind: 'note', charge: false, raw: n, title: `Demand note · ${monthLabel(monthKey(new Date(n.cycleStart))).replace(/^(\w{3})\w*/, '$1')}`, period: `${fmtDate(n.cycleStart)} – ${fmtDate(n.cycleEnd)}`, amount: n.totalAmount, due, paidAt: n.paidAt, state: billState(n.status, due),
        lines: [
          { label: 'Hostel accommodation', amount: n.hostelFee },
          { label: 'Electricity', detail: n.electricityUnits ? `${n.electricityUnits} units × ₹${n.electricityRate} (your share)` : undefined, amount: n.electricityAmount },
          { label: 'Mess & catering', amount: n.messFee },
        ],
        number: n.noteNumber, company: n.company, floor: n.floorNumber,
      };
    }),
  ].sort((a, b) => new Date(b.due).getTime() - new Date(a.due).getTime()), [inv.data, notes.data]);

  const open = bills.filter((b) => b.state !== 'paid');
  const overdue = open.filter((b) => b.state === 'overdue');
  const total = open.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const shown = filter === 'open' ? open : bills.filter((b) => b.state === 'paid');
  const fee = room?.sharingType ? priceFor(room.sharingType) : null;
  const loading = inv.isLoading || notes.isLoading;

  const share = async (b: any, mode: 'share' | 'download' = 'share') => {
    setSharing(true);
    try {
      const company = b.company || config.data?.companies?.[b.floor];
      const doc: BillDoc = {
        title: docTitle(b.kind, b.state === 'paid', b.charge),
        number: b.number || `INV/${String(b.id).slice(0, 6).toUpperCase()}`,
        company,
        resident: { name: user?.name || '', roll: user?.studentDetails?.rollNumber, room: room?.roomNumber },
        lines: b.lines.map((l: any) => ({ ...l, amount: Number(l.amount) || 0 })),
        total: b.amount, issued: b.raw.createdAt, due: b.due, paidAt: b.state === 'paid' ? b.paidAt : null,
      };
      if (mode === 'share') {
        // Android can hide the share window behind an open sheet, so close it first
        setViewing(null);
        await new Promise((r) => setTimeout(r, 350));
      }
      await (mode === 'download' ? downloadBill(doc) : shareBill(doc));
    } catch (e: any) {
      toast.error('Could not create the PDF', e.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen title="Bills" subtitle="What's due and your receipts" onRefresh={() => Promise.all([inv.refetch(), notes.refetch(), claims.refetch(), payDetails.refetch()])}>
      {inv.error ? <ErrorBox message={(inv.error as Error).message} onRetry={inv.refetch} /> : null}

      <Appear>
        <Hero gradient={overdue.length ? 'peach' : 'brand'}>
          <Row align="flex-start">
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" c={onHero.faint}>{open.length ? 'Amount due' : 'All paid up'}</T>
              <T v="display" c={onHero.strong}>{rupees(total)}</T>
              <T v="small" c={onHero.soft}>
                {!open.length ? 'No pending bills. Thank you!' : overdue.length ? `${plural(overdue.length, 'bill')} overdue — please pay at the office soon.` : `${plural(open.length, 'bill')} to pay`}
              </T>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              {open.length ? <Wallet size={24} color={colors.white} /> : <CircleCheck size={24} color={colors.white} />}
            </View>
          </Row>
          {fee && <HeroCells items={[{ k: 'Rent', v: rupeesShort(fee.roomRent) }, { k: 'Mess', v: rupeesShort(fee.messFee) }, { k: 'Monthly', v: rupeesShort(fee.total) }]} />}
        </Hero>
      </Appear>

      <Chips value={filter} onChange={setFilter} options={[{ value: 'open', label: 'To pay', count: open.length }, { value: 'paid', label: 'Paid', count: bills.length - open.length }]} />

      {loading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={filter === 'open' ? CircleCheck : Receipt} tone={filter === 'open' ? 'success' : 'mint'} title={filter === 'open' ? 'Nothing to pay' : 'No receipts yet'} text={filter === 'open' ? 'Paid bills and receipts are under "Paid".' : 'Bills the warden marks as paid appear here.'} />
      ) : shown.map((b, i) => (
        <Appear key={`${b.kind}-${b.id}`} i={i}>
          <ListRow
            icon={b.kind === 'note' ? (b.raw.electricityAmount ? Zap : Building2) : b.charge ? HandCoins : ScrollText}
            tone={b.state === 'paid' ? 'success' : b.state === 'overdue' ? 'peach' : 'sun'}
            title={b.title}
            sub={b.state === 'paid' ? `Paid ${fmtDate(b.paidAt, { year: 'numeric' })}` : `Due ${fmtDate(b.due, { year: 'numeric' })}`}
            right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T v="title" w="bold">{rupees(b.amount)}</T>{b.state !== 'paid' && claimFor(b.id)?.status === 'PENDING' ? <Badge label="Checking" tone="lilac" /> : <Badge label={BILL_STATUS[b.state].label} tone={BILL_STATUS[b.state].tone} />}</View>}
            onPress={() => setViewing(b)}
            chevron={false}
          />
        </Appear>
      ))}

      <ListRow icon={Info} tone="mint" title="How to pay" sub="UPI QR, bank transfer or cash at the office" onPress={() => setHowOpen(true)} />

      <Sheet open={howOpen} onClose={() => setHowOpen(false)} title="How to pay" subtitle="Your receipt shows up here once the warden records it.">
        {STEPS.map((st, i) => (
          <Row key={st.t} align="flex-start">
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}><T v="caption" w="bold" c={colors.brand700}>{i + 1}</T></View>
            <View style={{ flex: 1 }}><T v="title">{st.t}</T><T v="small" c={colors.text2}>{st.d}</T></View>
          </Row>
        ))}
        <Row gap={6}><Info size={14} color={colors.text3} /><T v="caption" c={colors.text3} style={{ flex: 1 }}>A late fee of ₹100/day applies after the due date.</T></Row>
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title} subtitle={viewing ? `${viewing.period ? `${viewing.period} · ` : ''}${viewing.state === 'paid' ? `Paid on ${fmtDate(viewing.paidAt, { year: 'numeric' })}` : `Due by ${fmtDate(viewing.due, { year: 'numeric' })}`}` : ''}
        footer={viewing && (
          <Row gap={10}>
            <Button title={viewing.state === 'paid' ? 'Download receipt' : 'Download bill'} icon={Download} kind="brand" loading={sharing} onPress={() => share(viewing, 'download')} style={{ flex: 1 }} />
            <Button title="Share" icon={Share2} kind="secondary" onPress={() => share(viewing)} disabled={sharing} />
          </Row>
        )}
      >
        {viewing && (
          <Card padded={false}>
            {viewing.charge && <View style={{ padding: 14, paddingBottom: 0 }}><T v="caption" c={colors.text3}>Extra charge from the hostel office</T></View>}
            {viewing.lines.map((l: any, i: number) => (
              <View key={l.label} style={[{ flexDirection: 'row', padding: 14, gap: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}><T v="small" w="semibold">{l.label}</T>{l.detail ? <T v="caption" c={colors.text3}>{l.detail}</T> : null}</View>
                <T v="small" w="bold">{rupees(l.amount)}</T>
              </View>
            ))}
            <View style={{ flexDirection: 'row', padding: 14, backgroundColor: colors.cream100 }}>
              <T v="title" style={{ flex: 1 }}>Total</T><T v="title" w="extrabold">{rupees(viewing.amount)}</T>
            </View>
          </Card>
        )}
        {viewing && viewing.state !== 'paid' && (
          <PayBill bill={{ kind: viewing.kind, id: viewing.id, amount: Number(viewing.amount) || 0, number: viewing.number, title: viewing.title }} details={payDetails.data?.[String(viewing.floor)]} claim={claimFor(viewing.id)} />
        )}
        {viewing?.state === 'paid' && <Card tone="success" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><CircleCheck size={20} color={colors.success} /><T v="small" c={colors.success} style={{ flex: 1 }}>Paid on {fmtDate(viewing.paidAt, { year: 'numeric' })}. Download the receipt below.</T></Card>}
      </Sheet>
    </Screen>
  );
}
