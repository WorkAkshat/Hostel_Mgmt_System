import { StyleSheet, View } from 'react-native';
import { BedDouble, CalendarDays, CircleCheck, Lightbulb, Megaphone, Plus, UtensilsCrossed, Wallet, Wrench } from 'lucide-react-native';
import { dashboardApi, demandNotesApi, feesApi, leavesApi, messApi, noticesApi, pollsApi } from '../../api';
import { asList } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { useData, useRefreshAll } from '../../lib/query';
import { fmtDate, firstName, greeting, isoDay, rupees, timeAgo } from '../../lib/format';
import { LEAVE_STATUS, LEAVE_TYPES, MEALS, dayName, mealState, noteDueDate, normalizeMenu } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Card, IconTile, Press, Row, Skeleton, T } from '../../ui/primitives';
import { Hero, HeroCells, QuickActions, onHero } from '../../ui/blocks';
import { MEAL_ICONS } from '../../features/mealIcons';
import { Appear, Grid, ListRow, Screen, Section, Stat } from '../../ui/layout';
import Bell from '../../features/Bell';
import PollCard from '../../features/PollCard';
import AnnouncementBanner from '../../features/AnnouncementBanner';
import { go } from '../../lib/nav';

export default function StudentHome() {
  const { user } = useAuth();
  const refreshAll = useRefreshAll();
  const dash = useData(['dashboard'], dashboardApi.get);
  const leaves = useData(['my-leaves'], leavesApi.mine);
  const menu = useData(['menu'], messApi.menu, { interval: 300_000 });
  const skips = useData(['my-opt-outs'], messApi.myOptOuts);
  const invoices = useData(['my-invoices'], feesApi.mine);
  const notes = useData(['demand-notes'], () => demandNotesApi.all());
  const notices = useData(['notices'], () => noticesApi.all());
  const polls = useData(['polls'], pollsApi.all);

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

  const active = asList(leaves.data).find((l: any) => ['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(l.status));
  const openPoll = asList(polls.data).find((p: any) => p.isActive && !p.userHasVoted) || asList(polls.data).find((p: any) => p.isActive);
  const latestNotices = asList(notices.data).slice(0, 2);

  return (
    <Screen
      title={`Hi, ${firstName(user?.name)} 👋`}
      left={<Press onPress={() => go('/student/me')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="My profile" style={{ borderRadius: 24, borderWidth: 2, borderColor: colors.white }}><Avatar name={user?.name} uri={profile?.avatar} size={44} tone="mint" /></Press>}
      subtitle={`${greeting()} · ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
      right={<Bell />}
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

      {/* Shortcuts */}
      <Appear i={2}>
        <QuickActions items={[
            { icon: Plus, tone: 'sun', label: 'Apply leave', onPress: () => go({ pathname: '/student/leaves', params: { apply: '1' } }) },
            { icon: Wrench, tone: 'peach', label: 'Complaint', onPress: () => go({ pathname: '/helpdesk', params: { new: '1' } }) },
            { icon: Lightbulb, tone: 'lilac', label: 'Suggest', onPress: () => go('/suggestions') },
            { icon: Megaphone, tone: 'mint', label: 'News', onPress: () => go('/notices') },
          ]} />
      </Appear>

      {/* Today's meals */}
      <Appear i={3}>
        <Section title="Today's meals" action="Mess" onAction={() => go('/student/mess')}>
          <Card padded={false}>
            {MEALS.map((m, i) => {
              const state = mealState(m.window);
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
      {openPoll && <Appear i={3}><Section title="Poll"><PollCard poll={openPoll} /></Section></Appear>}


    </Screen>
  );
}

const styles = StyleSheet.create({
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
