import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BedDouble, CalendarDays, CircleCheck, Images, LayoutGrid, Lightbulb, Megaphone, Plus, ShieldCheck, UserRound, UtensilsCrossed, Wallet, Wrench } from 'lucide-react-native';
import { dashboardApi, demandNotesApi, feesApi, leavesApi, messApi, noticesApi, pollsApi } from '../../api';
import { asList } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { useData, useRefreshAll } from '../../lib/query';
import { fmtDate, firstName, greeting, isoDay, rupees, timeAgo } from '../../lib/format';
import { LEAVE_STATUS, LEAVE_TYPES, MEALS, dayName, getMergedMeals, mealState, noteDueDate, normalizeMenu } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Card, IconTile, Press, Row, Skeleton, T } from '../../ui/primitives';
import { Hero, HeroCells, QuickActions, onHero } from '../../ui/blocks';
import { MEAL_ICONS } from '../../features/mealIcons';
import { Appear, Grid, ListRow, Screen, Section, Stat } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';
import Bell from '../../features/Bell';
import PollCard from '../../features/PollCard';
import AnnouncementBanner from '../../features/AnnouncementBanner';
import { go } from '../../lib/nav';

export default function StudentHome() {
  const { user } = useAuth();
  const refreshAll = useRefreshAll();
  const [quickOpen, setQuickOpen] = useState(false);
  const dash = useData(['dashboard'], dashboardApi.get);
  const leaves = useData(['my-leaves'], leavesApi.mine);
  const menu = useData(['menu'], messApi.menu, { interval: 300_000 });
  const skips = useData(['my-opt-outs'], messApi.myOptOuts);
  const invoices = useData(['my-invoices'], feesApi.mine);
  const notes = useData(['demand-notes'], () => demandNotesApi.all());
  const notices = useData(['notices'], () => noticesApi.all());
  const polls = useData(['polls'], pollsApi.all);
  const mealSettings = useData(['meal-settings'], messApi.mealSettings);
  const activeMeals = useMemo(() => getMergedMeals(mealSettings.data), [mealSettings.data]);

  const profile = dash.data?.profile;
  const room = profile?.room;
  const today = isoDay();
  const todayMenu = menu.data ? normalizeMenu(menu.data)[dayName()] : null;
  const skippedToday = asList(skips.data).filter((o: any) => o.date === today).map((o: any) => o.mealType);

  const unpaid = [
    ...asList(invoices.data).filter((i: any) => i.status !== 'PAID').map((i: any) => ({ amount: i.amount, due: i.dueDate })),
    ...asList(notes.data).filter((n: any) => n.status !== 'PAID').map((n: any) => ({ amount: n.totalAmount, due: noteDueDate(n) })),
  ];
  const due = unpaid.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const nextDue = unpaid.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0];

  const isDepInv = (i: any) => i.category === 'DEPOSIT' || /security|deposit/i.test(i.title || '') || /security|deposit/i.test(i.note || '');
  const isAdvInv = (i: any) => i.category === 'ADVANCE' || /advance/i.test(i.title || '') || /advance/i.test(i.note || '');

  const depositPaid = asList(invoices.data)
    .filter((i: any) => isDepInv(i) && i.status === 'PAID')
    .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
  const advancePaid = asList(invoices.data)
    .filter((i: any) => isAdvInv(i) && i.status === 'PAID')
    .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

  const active = asList(leaves.data).find((l: any) => ['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(l.status));
  const openPoll = asList(polls.data).find((p: any) => p.isActive && !p.userHasVoted) || asList(polls.data).find((p: any) => p.isActive);
  const latestNotices = asList(notices.data).slice(0, 2);

  return (
    <Screen
      title={`Hi, ${firstName(user?.name)} 👋`}
      left={<Press onPress={() => go('/student/me')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="My profile" style={{ borderRadius: 24, borderWidth: 2, borderColor: colors.white }}><Avatar name={user?.name} uri={profile?.avatar} size={44} tone="mint" /></Press>}
      subtitle={`${greeting()} · ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
      right={
        <Row gap={8} style={{ alignItems: 'center' }}>
          <Press onPress={() => setQuickOpen(true)} scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Quick actions" style={styles.quickBtn}>
            <LayoutGrid size={20} color={colors.brand700} />
          </Press>
          <Bell />
        </Row>
      }
      onRefresh={refreshAll}
    >
      <AnnouncementBanner />

      {/* Room card */}
      <Appear>
        {dash.isLoading ? <Skeleton h={168} /> : (
          <Hero onPress={() => go('/profile')}>
            <Row align="flex-start">
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label" c={onHero.faint}>{room?.floorNumber ? `Floor ${room.floorNumber} · Hari Pushp Tower` : 'Hari Pushp Tower'}</T>
                <T v="display" c={onHero.strong}>{room ? `Room ${room.roomNumber}` : 'No room yet'}</T>
                <T v="small" c={onHero.soft}>{profile?.rollNumber || user?.studentDetails?.rollNumber}</T>
              </View>
              <View style={styles.heroIcon}><BedDouble size={24} color={colors.white} /></View>
            </Row>
            <HeroCells items={[
              { k: 'Sharing', v: room?.sharingType ? `${room.sharingType}-bed` : '—' },
              { k: 'AC', v: room ? (room.isAc ? 'Yes' : 'No') : '—' },
              { k: 'Status', v: profile?.status === 'CHECKED_IN' ? 'Active' : profile?.status === 'CHECKED_OUT' ? 'Left' : profile?.status === 'SUSPENDED' ? 'Paused' : '—' },
            ]} />
          </Hero>
        )}
      </Appear>

      {/* Money + leave */}
      <Appear i={1}>
        <Grid>
          <Stat
            icon={due ? Wallet : CircleCheck}
            tone={due ? 'sun' : 'mint'}
            label={due ? 'Amount due' : 'All paid up'}
            value={rupees(due)}
            caption={nextDue ? `Next by ${fmtDate(nextDue.due)}` : 'No pending bills'}
            onPress={() => go('/student/bills')}
          />
          <Stat
            icon={CalendarDays}
            tone="lilac"
            label="Leave"
            value={active ? LEAVE_STATUS[active.status]?.short || active.status : 'None'}
            caption={active ? `${LEAVE_TYPES[active.type] || 'Leave'} · ${fmtDate(active.startDate)}` : 'Tap to apply'}
            onPress={() => go('/student/leaves')}
          />
        </Grid>
      </Appear>

      {/* Security Deposit & Advance Status */}
      <Appear i={1}>
        <Press onPress={() => go('/student/bills')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="View deposits and advance">
          <Card style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.white, borderColor: colors.border, gap: 10 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Row gap={6} style={{ alignItems: 'center', flex: 1, marginRight: 8 }}>
                <ShieldCheck size={16} color={colors.brand700} />
                <T v="title" w="bold" numberOfLines={1} style={{ flex: 1 }}>Security & Advance</T>
              </Row>
              <View style={{ backgroundColor: colors.mint50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.mint200 }}>
                <T v="caption" w="bold" c={colors.brand700}>View bills ›</T>
              </View>
            </Row>
            <Row gap={10}>
              <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 2 }}>
                <T v="caption" c={colors.text3}>Security deposit</T>
                <T v="title" w="bold" c={depositPaid > 0 ? colors.success : colors.text}>{rupees(depositPaid)}</T>
                <T v="caption" c={depositPaid > 0 ? colors.success : colors.text3} numberOfLines={1}>{depositPaid > 0 ? '✓ Paid' : '₹0 recorded'}</T>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 10, gap: 2 }}>
                <T v="caption" c={colors.text3}>Advance payment</T>
                <T v="title" w="bold" c={advancePaid > 0 ? colors.brand700 : colors.text}>{rupees(advancePaid)}</T>
                <T v="caption" c={advancePaid > 0 ? colors.brand700 : colors.text3} numberOfLines={1}>{advancePaid > 0 ? '✓ Recorded' : '₹0 recorded'}</T>
              </View>
            </Row>
          </Card>
        </Press>
      </Appear>

      {/* Hostel Tour Feature Card */}
      <Appear i={2}>
        <Press onPress={() => go('/gallery')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Hostel tour and room photos">
          <Card style={{ backgroundColor: colors.mint50, borderColor: colors.brand200, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Row gap={12} style={{ alignItems: 'center', flex: 1, paddingRight: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.mint200 }}>
                  <Images size={22} color={colors.brand700} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="title" w="bold" c={colors.brand900} numberOfLines={1}>Hostel Tour & Rooms</T>
                  <T v="caption" c={colors.text2} numberOfLines={1}>Room views, mess & facilities</T>
                </View>
              </Row>
              <View style={{ backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.brand300 }}>
                <T v="caption" w="bold" c={colors.brand700}>Explore ›</T>
              </View>
            </Row>
          </Card>
        </Press>
      </Appear>

      {/* Shortcuts */}
      <Appear i={2}>
        <Section title="Quick actions">
          <QuickActions items={[
            { icon: Plus, tone: 'sun', label: 'Apply leave', onPress: () => go({ pathname: '/student/leaves', params: { apply: '1' } }) },
            { icon: Images, tone: 'mint', label: 'Hostel tour', onPress: () => go('/gallery') },
            { icon: ShieldCheck, tone: 'lilac', label: 'Helpline', onPress: () => go('/helpline') },
            { icon: Wrench, tone: 'peach', label: 'Complaint', onPress: () => go({ pathname: '/helpdesk', params: { new: '1' } }) },
          ]} />
        </Section>
      </Appear>

      {/* Today's meals */}
      <Appear i={3}>
        <Section title="Today's meals" action="Mess" onAction={() => go('/student/mess')}>
          <Card padded={false}>
            {activeMeals.map((m, i) => {
              const state = mealState(m.window || [0, 1440]);
              const skipped = skippedToday.includes(m.type);
              return (
                <View key={m.key} style={[styles.meal, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }, state === 'serving' && !skipped && { backgroundColor: colors.cream100 }]}>
                  <IconTile icon={MEAL_ICONS[m.key] || UtensilsCrossed} tone={skipped ? 'white' : state === 'serving' ? 'sun' : state === 'over' ? 'mint' : 'peach'} size={38} />
                  <View style={{ flex: 1 }}>
                    <Row gap={6} style={{ flexWrap: 'wrap', rowGap: 0 }}>
                      <T v="title">{m.label}</T>
                      <T v="caption" c={colors.text3} numberOfLines={1}>{m.time}</T>
                    </Row>
                    <T v="small" c={skipped ? colors.text3 : colors.text2} style={skipped ? { textDecorationLine: 'line-through' } : undefined} numberOfLines={1}>
                      {todayMenu?.[m.key] || 'Menu not set'}
                    </T>
                  </View>
                  {skipped ? <Badge label="Skipped" tone="white" /> : state === 'serving' ? <Badge label="Now" tone="sun" /> : state === 'over' ? <T v="caption" c={colors.text3}>Served</T> : null}
                </View>
              );
            })}
          </Card>
        </Section>
      </Appear>

      {/* Poll */}
      {openPoll && <Appear i={3}><Section title="Poll" action="All polls" onAction={() => go('/polls')}><PollCard poll={openPoll} /></Section></Appear>}

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick actions" subtitle="Shortcuts for student features">
        <QuickActions items={[
          { icon: Plus, tone: 'sun', label: 'Apply leave', onPress: () => { setQuickOpen(false); go({ pathname: '/student/leaves', params: { apply: '1' } }); } },
          { icon: Wallet, tone: 'sun', label: 'Pay bills', onPress: () => { setQuickOpen(false); go('/student/bills'); } },
          { icon: Wrench, tone: 'peach', label: 'Complaint', onPress: () => { setQuickOpen(false); go({ pathname: '/helpdesk', params: { new: '1' } }); } },
          { icon: Images, tone: 'mint', label: 'Hostel tour', onPress: () => { setQuickOpen(false); go('/gallery'); } },
          { icon: UtensilsCrossed, tone: 'peach', label: 'Mess menu', onPress: () => { setQuickOpen(false); go('/student/mess'); } },
          { icon: ShieldCheck, tone: 'lilac', label: 'Helpline', onPress: () => { setQuickOpen(false); go('/helpline'); } },
          { icon: Megaphone, tone: 'mint', label: 'Notices', onPress: () => { setQuickOpen(false); go('/notices'); } },
          { icon: UserRound, tone: 'mint', label: 'My profile', onPress: () => { setQuickOpen(false); go('/profile'); } },
        ]} />
      </Sheet>

    </Screen>
  );
}

const styles = StyleSheet.create({
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  quickBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.mint200 },
});
