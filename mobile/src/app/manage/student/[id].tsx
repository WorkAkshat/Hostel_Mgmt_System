import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronDown, Download, CircleCheck, HandCoins, MessageCircle, Phone, Receipt, Share2, UserRound, Wrench } from 'lucide-react-native';
import { demandNotesApi, studentsApi } from '../../../api';
import { useData } from '../../../lib/query';
import { call, whatsapp } from '../../../lib/contact';
import { fmtDate, fmtDateTime, plural, rupees, timeAgo } from '../../../lib/format';
import { BILL_STATUS, COMPLAINT_STATUS, LEAVE_STATUS, LEAVE_TYPES, STUDENT_STATUS, priceFor } from '../../../lib/hostel';
import { colors } from '../../../ui/theme';
import { Avatar, Badge, Button, Card, Divider, IconButton, IconTile, Press, Row, T } from '../../../ui/primitives';
import { ErrorBox, Loading, useToast } from '../../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../../ui/layout';
import { Hero, HeroPill, onHero } from '../../../ui/blocks';
import RecordPayment from '../../../features/RecordPayment';
import { dueLabel, shareBillPdf, useAllBills, useRecordBill, type Bill } from '../../../features/dues';

const Info = ({ k, v }: { k: string; v?: string | null }) => (
  <Row style={{ justifyContent: 'space-between', paddingVertical: 9 }} align="flex-start">
    <T v="small" c={colors.text3}>{k}</T>
    <T v="small" w="semibold" style={{ flex: 1, textAlign: 'right', marginLeft: 12 }}>{v || '—'}</T>
  </Row>
);

// One resident: contact, money owed (record payment right here), bill history with
// PDFs, then details, leaves and complaints.
export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data: s, isLoading, error, refetch } = useData(['student', id], () => studentsApi.byId(String(id)), { enabled: !!id });
  const all = useAllBills();
  const config = useData(['company-config'], demandNotesApi.companyConfig, { interval: false });
  const record = useRecordBill();
  const [paying, setPaying] = useState<Bill | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  if (error) return <Screen title="Resident" back tabBar={false}><ErrorBox message={(error as Error).message} onRetry={refetch} /></Screen>;
  if (isLoading || !s) return <Screen title="Resident" back tabBar={false}><Loading rows={4} h={110} /></Screen>;

  const st = STUDENT_STATUS[s.status] || { label: s.status, tone: 'white' as const };
  const bills = all.bills.filter((b) => b.studentId === s.id).sort((a, b) => new Date(b.due).getTime() - new Date(a.due).getTime());
  const unpaid = bills.filter((b) => b.state !== 'paid').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const due = unpaid.reduce((a, b) => a + b.amount, 0);
  const overdue = unpaid.filter((b) => b.state === 'overdue').reduce((a, b) => a + b.amount, 0);
  const lastPaid = bills.find((b) => b.state === 'paid');
  const next = unpaid[0];
  const leaves = [...(s.leaveRequests || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const complaints = [...(s.complaints || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const out = leaves.find((l: any) => l.status === 'CHECKED_OUT');
  const roomLine = s.room ? [`Room ${s.room.roomNumber}`, s.bedId ? String(s.bedId).replace(/^Bed\s*/i, 'Bed ') : '', `Floor ${s.room.floorNumber}`].filter(Boolean).join(' · ') : 'No room yet';

  const share = async (b: Bill, mode: 'share' | 'download' = 'share') => {
    setSharing(b.key);
    try {
      await shareBillPdf(b, config.data?.companies?.[b.floor || s.room?.floorNumber], { name: s.user?.name, roll: s.rollNumber, room: s.room?.roomNumber }, mode);
    } catch (e: any) { toast.error('Could not create the PDF', e.message); } finally { setSharing(null); }
  };

  return (
    <Screen title={s.user?.name || 'Resident'} subtitle={s.rollNumber} back tabBar={false} onRefresh={() => Promise.all([refetch(), all.refetch()])}>
      {/* Who and where */}
      <Appear>
        <Hero>
          <Row gap={14}>
            <View style={{ borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' }}>
              <Avatar name={s.user?.name} uri={s.profilePic} size={58} tone="white" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h2" c={onHero.strong} numberOfLines={1}>{s.user?.name}</T>
              <T v="small" c={onHero.soft} numberOfLines={1}>{roomLine}</T>
              <Row gap={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                <HeroPill label={st.label} />
                {out && <HeroPill label="Out on leave" />}
                {s.room && <HeroPill label={`${priceFor(s.room.sharingType).label}${s.room.isAc ? ' · AC' : ''}`} />}
              </Row>
            </View>
          </Row>
          <Row gap={8}>
            {[
              { icon: Phone, label: 'Call', on: () => call(s.phoneNumber), ok: !!s.phoneNumber },
              { icon: MessageCircle, label: 'WhatsApp', on: () => whatsapp(s.phoneNumber), ok: !!s.phoneNumber },
              { icon: UserRound, label: 'Parent', on: () => call(s.parentContact), ok: !!s.parentContact },
            ].map((a) => (
              <Press key={a.label} onPress={a.on} disabled={!a.ok} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={a.label} style={[styles.action, !a.ok && { opacity: 0.4 }]}>
                <a.icon size={17} color={colors.white} />
                <T v="small" w="bold" c={colors.white}>{a.label}</T>
              </Press>
            ))}
          </Row>
        </Hero>
      </Appear>

      {/* Money */}
      <Appear i={1}>
        {all.isLoading ? <Loading rows={1} h={150} /> : due > 0 ? (
          <Card style={{ gap: 12 }}>
            <Row>
              <IconTile icon={HandCoins} tone={overdue ? 'danger' : 'sun'} size={38} />
              <View style={{ flex: 1 }}>
                <T v="title">To collect</T>
                <T v="caption" c={overdue ? colors.danger : colors.text3}>{next ? dueLabel(next) : ''}</T>
              </View>
              <Badge label={overdue ? 'Overdue' : 'Due'} tone={overdue ? 'danger' : 'warning'} />
            </Row>
            <View style={styles.moneyRow}>
              {[{ k: 'Total due', v: rupees(due), c: colors.text }, { k: 'Bills', v: String(unpaid.length), c: colors.text }, { k: 'Overdue', v: rupees(overdue), c: overdue ? colors.danger : colors.text }].map((x, i) => (
                <View key={x.k} style={[styles.moneyCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <T v="caption" c={colors.text3}>{x.k}</T>
                  <T v="title" w="bold" c={x.c} numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
                </View>
              ))}
            </View>
            {next && <Button title={`Record payment · ${rupees(next.amount)}`} icon={HandCoins} kind="brand" onPress={() => setPaying(next)} full />}
            {unpaid.length > 1 && <T v="caption" c={colors.text3} center>This records the oldest bill ({next?.title}). Collect the others from the list below.</T>}
          </Card>
        ) : (
          <Card tone="success" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={CircleCheck} tone="white" size={38} />
            <View style={{ flex: 1 }}>
              <T v="title" c={colors.success}>All paid up</T>
              <T v="caption" c={colors.success}>{lastPaid ? `Last payment ${fmtDate(lastPaid.paidAt || '', { year: 'numeric' })} · ${rupees(lastPaid.amount)}` : 'No bills yet'}</T>
            </View>
          </Card>
        )}
      </Appear>

      {/* Bill history */}
      <Appear i={2}>
        <Section title="Payment history">
          {bills.length === 0 ? <T v="small" c={colors.text3}>No bills yet.</T> : (
            <Card padded={false}>
              {bills.slice(0, 8).map((b, i) => {
                const look = BILL_STATUS[b.state];
                return (
                  <View key={b.key}>
                    {i > 0 && <Divider />}
                    <View style={styles.billRow}>
                    <Press onPress={() => (b.state === 'paid' ? share(b, 'download') : setPaying(b))} scaleTo={0.98} accessibilityRole="button" style={styles.billMain}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="title" numberOfLines={1}>{b.title}</T>
                        <T v="caption" c={b.state === 'overdue' ? colors.danger : colors.text3} numberOfLines={1}>{dueLabel(b)}</T>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <T v="title" w="bold" c={b.state === 'paid' ? colors.success : colors.text}>{rupees(b.amount)}</T>
                        <Badge label={look.label} tone={look.tone} />
                      </View>
                    </Press>
                      <IconButton icon={Download} label={b.state === 'paid' ? 'Download receipt' : 'Download bill'} tone="mint" size={36} onPress={() => share(b, 'download')} />
                      <IconButton icon={Share2} label="Share" tone="white" size={36} onPress={() => share(b)} />
                    </View>
                    {sharing === b.key && <T v="caption" c={colors.text3} style={{ paddingHorizontal: 14, paddingBottom: 8 }}>Preparing PDF…</T>}
                  </View>
                );
              })}
            </Card>
          )}
          {bills.some((b) => b.state !== 'paid') && <T v="caption" c={colors.text3}>Tap an unpaid bill to record its payment · tap a paid one for the receipt.</T>}
        </Section>
      </Appear>

      {/* Details (folded to keep the page short) */}
      <Appear i={3}>
        <Card padded={false}>
          <Press onPress={() => setShowDetails((v) => !v)} scaleTo={0.99} accessibilityRole="button" accessibilityState={{ expanded: showDetails }} style={styles.foldHead}>
            <T v="title" style={{ flex: 1 }}>Personal details</T>
            <ChevronDown size={18} color={colors.text3} style={{ transform: [{ rotate: showDetails ? '180deg' : '0deg' }] }} />
          </Press>
          {showDetails && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
              <Info k="Phone" v={s.phoneNumber} /><Divider />
              <Info k="Email" v={s.user?.email} /><Divider />
              <Info k="Father" v={[s.fatherName, s.parentContact].filter(Boolean).join(' · ')} /><Divider />
              <Info k="Mother" v={[s.motherName, s.motherContact].filter(Boolean).join(' · ')} /><Divider />
              <Info k="Emergency" v={s.emergencyContact} /><Divider />
              <Info k="College / company" v={s.coachingCollege} /><Divider />
              <Info k="Address" v={[s.permanentAddress, s.state, s.pincode].filter(Boolean).join(', ')} /><Divider />
              <Info k="Blood group" v={s.bloodGroup} /><Divider />
              <Info k="Joined" v={s.dateOfJoining ? fmtDate(s.dateOfJoining, { year: 'numeric' }) : ''} />
            </View>
          )}
        </Card>
      </Appear>

      {leaves.length > 0 && (
        <Section title={`Leaves · ${plural(leaves.length, 'request')}`}>
          {leaves.slice(0, 3).map((l: any) => (
            <ListRow key={l.id} icon={CalendarDays} tone={LEAVE_STATUS[l.status]?.tone || 'white'} title={LEAVE_TYPES[l.type] || 'Leave'} sub={`${fmtDateTime(l.startDate)} → ${fmtDateTime(l.endDate)}`} right={<Badge label={LEAVE_STATUS[l.status]?.short || l.status} tone={LEAVE_STATUS[l.status]?.tone || 'white'} />} />
          ))}
        </Section>
      )}

      {complaints.length > 0 && (
        <Section title="Complaints">
          {complaints.slice(0, 3).map((c: any) => (
            <ListRow key={c.id} icon={Wrench} tone="peach" title={c.category} sub={c.description} meta={timeAgo(c.createdAt)} right={<Badge label={COMPLAINT_STATUS[c.status]?.label || c.status} tone={COMPLAINT_STATUS[c.status]?.tone || 'white'} />} />
          ))}
        </Section>
      )}

      <RecordPayment
        bill={paying && { title: `${paying.title} · ${s.user?.name}`, subtitle: `${paying.number} · ${dueLabel(paying)}`, amount: paying.amount }}
        onClose={() => setPaying(null)}
        onSave={async (p) => {
          if (!paying) return;
          await record(paying, p);
          toast.success('Payment recorded', `${rupees(paying.amount)} from ${s.user?.name}`);
          setPaying(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  moneyRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 10 },
  moneyCell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 14 },
  billMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingVertical: 12 },
  foldHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
});
