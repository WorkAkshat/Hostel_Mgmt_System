import { StyleSheet, View } from 'react-native';
import {
  Boxes, CalendarCheck, CircleCheck, QrCode, CalendarX, ChartColumn, ClipboardList, Contact, DoorOpen, Gauge, HandCoins, IdCard, Megaphone, Moon, NotebookPen, UserCheck, UserPen, UtensilsCrossed, Wallet, Wrench,
} from 'lucide-react-native';
import { authApi, complaintsApi, floorsApi, leavesApi, noticesApi, paymentsApi, reportsApi, studentsApi, visitorsApi } from '../../api';
import { asList } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { useData, useRefreshAll } from '../../lib/query';
import { firstName, greeting, monthKey, plural, rupees, timeAgo } from '../../lib/format';
import { colors } from '../../ui/theme';
import { Avatar, Card, IconTile, Press, Progress, Row, Skeleton, T } from '../../ui/primitives';
import { useAllBills } from '../../features/dues';
import { Appear, Grid, ListRow, Screen, Section, Stat } from '../../ui/layout';
import { Hero, HeroCells, QuickActions, onHero } from '../../ui/blocks';
import Bell from '../../features/Bell';
import { FloorChips, onFloor, useFloor, useFloors } from '../../features/floor';
import { go } from '../../lib/nav';

export default function WardenHome() {
  const { user } = useAuth();
  const refreshAll = useRefreshAll();
  const { floor } = useFloor();
  const floors = useFloors();
  const month = monthKey();
  const summary = useData(['report-summary', month, floor], () => reportsApi.summary(month, floor));
  const fees = useData(['fee-report', month, floor], () => floorsApi.report(floor, month));
  const leaves = useData(['leaves'], leavesApi.all);
  const regs = useData(['pending-users'], authApi.pending);
  const reqs = useData(['profile-requests'], studentsApi.profileRequests);
  const docs = useData(['documents', 'PENDING'], () => studentsApi.documents('PENDING'));
  const pays = useData(['payment-claims', 'PENDING'], () => paymentsApi.claims('PENDING'));
  const notices = useData(['notices'], () => noticesApi.all());
  const payDetails = useData(['payment-settings'], paymentsApi.settings, { interval: false });
  const floorsWithoutUpi = payDetails.data ? floors.filter((x: any) => !payDetails.data?.[String(x.floorNumber)]?.upiId).length : 0;
  const complaints = useData(['complaints'], complaintsApi.all);
  const visitors = useData(['visitors'], visitorsApi.all);

  const f = floor === 'all' ? null : floors.find((x: any) => String(x.floorNumber) === floor);
  const occ = summary.data?.occupancy?.totals;
  const pct = occ?.beds ? Math.round((occ.occupied / occ.beds) * 100) : 0;
  const feeSum = fees.data ? (floor === 'all' ? { billed: fees.data.grandTotal?.total, got: fees.data.grandTotal?.collected, rate: fees.data.grandTotal?.collectionRate } : { billed: fees.data.summary?.grandTotal, got: fees.data.summary?.totalCollected, rate: fees.data.summary?.collectionRate }) : null;

  const inScope = (x: any) => onFloor(x?.student?.room, floor);
  const leaveList = asList(leaves.data).filter(inScope);
  const pendingLeaves = leaveList.filter((l: any) => l.status === 'PENDING').length;
  const outNow = leaveList.filter((l: any) => l.status === 'CHECKED_OUT');
  const overdue = outNow.filter((l: any) => new Date(l.endDate) < new Date()).length;
  const openComplaints = asList(complaints.data).filter((c: any) => c.status !== 'RESOLVED' && inScope(c)).length;
  const inside = asList(visitors.data).filter((v: any) => !v.checkOutTime && inScope(v)).length;

  // Money still to collect on this floor (fee bills + demand notes)
  const allBills = useAllBills();
  const unpaidBills = allBills.bills.filter((b) => b.state !== 'paid' && onFloor(b.student?.room || { floorNumber: b.floor }, floor));
  const dueTotal = unpaidBills.reduce((a, b) => a + b.amount, 0);
  const dueStudents = new Set(unpaidBills.map((b) => b.studentId)).size;
  const overdueStudents = new Set(unpaidBills.filter((b) => b.state === 'overdue').map((b) => b.studentId)).size;

  const attention = [
    { n: asList(regs.data).length, icon: UserCheck, tone: 'danger' as const, title: 'New registrations', sub: 'Approve and give a room', go: '/warden/requests?tab=registrations' },
    { n: floorsWithoutUpi, icon: QrCode, tone: 'mint' as const, title: 'Add UPI for the bill QR', sub: 'Residents can only pay at the office until then', go: '/manage/payment-settings' },
    { n: asList(pays.data).length, icon: HandCoins, tone: 'sun' as const, title: 'Payments to confirm', sub: 'Residents paid by UPI / bank', go: '/warden/requests?tab=payments' },
    { n: pendingLeaves, icon: CalendarCheck, tone: 'warning' as const, title: 'Leave requests', sub: 'Waiting for your decision', go: '/warden/requests' },
    { n: overdue, icon: CalendarX, tone: 'danger' as const, title: 'Past return time', sub: 'Out longer than approved', go: '/warden/gate' },
    { n: asList(reqs.data).filter((r: any) => r.status === 'PENDING').length, icon: UserPen, tone: 'warning' as const, title: 'Profile changes', sub: 'Students asked to update details', go: '/warden/requests?tab=profile' },
    { n: asList(docs.data).length, icon: IdCard, tone: 'mint' as const, title: 'ID documents', sub: 'To verify', go: '/warden/requests?tab=documents' },
    { n: openComplaints, icon: Wrench, tone: 'peach' as const, title: 'Open complaints', sub: 'Not resolved yet', go: '/helpdesk' },
  ].filter((a) => a.n > 0);

  return (
    <Screen title={`Hi, ${firstName(user?.name)} 👋`} subtitle={`${greeting()} · ${user?.assignedFloor ? `Floor ${user.assignedFloor} warden` : 'Chief warden'}`} left={<Press onPress={() => go('/warden/more')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="My profile" style={{ borderRadius: 24, borderWidth: 2, borderColor: colors.white }}><Avatar name={user?.name} uri={undefined} size={44} tone="mint" /></Press>} right={<Bell />} onRefresh={refreshAll}>
      <FloorChips />

      <Appear>
        <Hero>
          <Row align="flex-start">
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" c={onHero.faint}>Now viewing</T>
              <T v="h1" c={onHero.strong} numberOfLines={2}>{f ? `Floor ${f.floorNumber}` : 'All floors'}</T>
              {f?.companyName ? <T v="small" c={onHero.soft} numberOfLines={1}>{f.companyName}</T> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="display" c={onHero.strong}>{occ ? `${pct}%` : '—'}</T>
              <T v="caption" c={onHero.faint}>occupied</T>
            </View>
          </Row>
          {summary.isLoading ? <Skeleton h={10} style={{ opacity: 0.4 }} /> : occ ? (
            <Progress value={occ.occupied} max={occ.beds || 1} color={colors.sun300} track="rgba(255,255,255,0.22)" />
          ) : null}
          <HeroCells items={[
            { k: 'Beds taken', v: occ ? `${occ.occupied}/${occ.beds}` : '—', onPress: () => go('/warden/residents?tab=rooms') },
            { k: 'Out now', v: String(outNow.length), onPress: () => go('/warden/gate?tab=out') },
            { k: 'Collected', v: feeSum ? rupees(feeSum.got) : '—', onPress: () => go('/manage/fees') },
          ]} />
        </Hero>
      </Appear>

      <Appear i={1}>
        <Press onPress={() => go('/manage/dues')} accessibilityRole="button" scaleTo={0.98} style={[styles.dues, !dueTotal && styles.duesClear]}>
          <IconTile icon={dueTotal ? Wallet : CircleCheck} tone={dueTotal ? 'sun' : 'success'} size={38} />
          <View style={{ flex: 1 }}>
            <T v="title" w="bold" c={dueTotal ? colors.sun900 : colors.success}>{allBills.isLoading ? 'Checking dues…' : dueTotal ? `${rupees(dueTotal)} pending` : 'All dues collected'}</T>
            <T v="caption" c={dueTotal ? colors.sun800 : colors.success}>{dueTotal ? `${plural(dueStudents, 'resident')}${overdueStudents ? ` · ${overdueStudents} overdue` : ''}` : 'Nothing left to collect'}</T>
          </View>
          <T v="small" w="bold" c={dueTotal ? colors.sun900 : colors.success}>View ›</T>
        </Press>
      </Appear>

      <Appear i={1}>
        <Section title="Needs your attention">
          {attention.length === 0 ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon={CircleCheck} tone="success" />
              <View style={{ flex: 1 }}>
                <T v="title">All caught up</T>
                <T v="small" c={colors.text2}>No requests, late returns or open complaints right now.</T>
              </View>
            </Card>
          ) : attention.map((a) => (
            <ListRow key={a.title} icon={a.icon} tone={a.tone} title={a.title} sub={a.sub}
              right={<View style={styles.count}><T v="small" w="bold" c={colors.sun900}>{a.n}</T></View>}
              onPress={() => go(a.go as any)} />
          ))}
        </Section>
      </Appear>

      <Appear i={2}>
        <Section title="Announcements" action="New" onAction={() => go({ pathname: '/notices', params: { new: '1' } })}>
          {asList(notices.data).length === 0 ? (
            <ListRow icon={Megaphone} tone="lilac" title="Make an announcement" sub="Residents and staff see it on their home screen" onPress={() => go({ pathname: '/notices', params: { new: '1' } })} />
          ) : asList(notices.data).slice(0, 2).map((n: any) => (
            <ListRow key={n.id} icon={Megaphone} tone={n.category === 'URGENT' ? 'danger' : 'lilac'} title={n.title} sub={n.content}
              meta={`${timeAgo(n.createdAt)}${n.target === 'STAFF' ? ' · staff only' : n.target === 'STUDENTS' ? ' · residents only' : ' · everyone'}`} onPress={() => go('/notices')} />
          ))}
        </Section>
      </Appear>

      <Appear i={3}>
        <Section title="Quick actions">
          <QuickActions items={[
            { icon: Moon, tone: 'lilac', label: 'Roll call', onPress: () => go('/manage/roll-call') },
            { icon: HandCoins, tone: 'sun', label: 'Payment', onPress: () => go('/manage/fees') },
            { icon: Gauge, tone: 'peach', label: 'Meters', onPress: () => go('/manage/demand-notes?tab=meters') },
            { icon: Megaphone, tone: 'mint', label: 'Announce', onPress: () => go({ pathname: '/notices', params: { new: '1' } }) },
            { icon: UtensilsCrossed, tone: 'peach', label: 'Kitchen', onPress: () => go('/manage/mess') },
            { icon: NotebookPen, tone: 'lilac', label: 'Expense', onPress: () => go('/manage/expenses') },
            { icon: ChartColumn, tone: 'mint', label: 'Reports', onPress: () => go('/manage/reports') },
            { icon: Boxes, tone: 'sun', label: 'Stock', onPress: () => go('/manage/inventory') },
          ]} />
        </Section>
      </Appear>

    </Screen>
  );
}

const styles = StyleSheet.create({
  dues: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cream100, borderRadius: 16, borderWidth: 1, borderColor: colors.sun200, padding: 12 },
  duesClear: { backgroundColor: colors.successBg, borderColor: colors.successBg },
  count: { minWidth: 30, height: 28, borderRadius: 14, backgroundColor: colors.sun300, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 },
});
