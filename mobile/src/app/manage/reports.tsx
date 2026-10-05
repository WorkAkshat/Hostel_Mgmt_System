import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BedDouble, CalendarDays, CircleCheck, DoorOpen, Receipt, UtensilsCrossed, Wallet, Wrench } from 'lucide-react-native';
import { floorsApi, reportsApi } from '../../api';
import { useData } from '../../lib/query';
import { monthKey, plural, rupees } from '../../lib/format';
import { LEAVE_TYPES } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Card, Progress, Row, Segmented, T } from '../../ui/primitives';
import { ErrorBox, Loading } from '../../ui/feedback';
import { Grid, Screen, Section, Stat } from '../../ui/layout';
import { Hero, HeroCells, onHero } from '../../ui/blocks';
import { FloorChips, useFloor } from '../../features/floor';
import MonthStepper from '../../features/MonthStepper';

// Day-by-day mini bar chart
const Bars = ({ days, color }: { days: { date: string; count: number }[]; color: string }) => {
  const max = Math.max(1, ...days.map((d) => d.count));
  if (days.every((d) => !d.count)) return <T v="small" c={colors.text3}>Nothing recorded this month.</T>;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 90 }}>
        {days.map((d) => <Animated.View entering={FadeIn} key={d.date} style={{ flex: 1, height: `${Math.max(3, (d.count / max) * 100)}%` as any, backgroundColor: d.count ? color : colors.mint100, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />)}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}><T v="caption" c={colors.text3}>1</T><T v="caption" c={colors.text3}>15</T><T v="caption" c={colors.text3}>{days.length}</T></Row>
    </View>
  );
};

const Bar = ({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) => (
  <View style={{ gap: 4 }}>
    <Row style={{ justifyContent: 'space-between' }}><T v="small">{label}</T><T v="small" w="bold">{value}{note ? <T v="caption" c={colors.text3}> · {note}</T> : null}</T></Row>
    <Progress value={value} max={max || 1} height={6} color={colors.sun400} />
  </View>
);

export default function Reports() {
  const { floor } = useFloor();
  const [month, setMonth] = useState(monthKey());
  const [tab, setTab] = useState<'money' | 'people'>('money');
  const sum = useData(['report-summary', month, floor], () => reportsApi.summary(month, floor));
  const fees = useData(['fee-report', month, floor], () => floorsApi.report(floor, month));

  const f = fees.data ? (floor === 'all'
    ? { billed: fees.data.grandTotal?.total || 0, got: fees.data.grandTotal?.collected || 0, pending: fees.data.grandTotal?.pending || 0, rate: fees.data.grandTotal?.collectionRate || 0, floors: fees.data.floors || [] }
    : { billed: fees.data.summary?.grandTotal || 0, got: fees.data.summary?.totalCollected || 0, pending: fees.data.summary?.totalPending || 0, rate: fees.data.summary?.collectionRate || 0, floors: [] })
    : null;
  const d = sum.data;
  const plates = d ? Object.values(d.mess.totals as Record<string, number>).reduce((a, x) => a + x, 0) : 0;

  return (
    <Screen title="Reports" subtitle="Month at a glance" back tabBar={false} onRefresh={() => Promise.all([sum.refetch(), fees.refetch()])}>
      <MonthStepper value={month} onChange={setMonth} />
      <FloorChips />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'money', label: 'Fees & rooms' }, { value: 'people', label: 'People & mess' }]} />
      {sum.error ? <ErrorBox message={(sum.error as Error).message} onRetry={sum.refetch} /> : !d || !f ? <Loading rows={4} /> : tab === 'money' ? (
        <>
          <Hero>
            <Row align="flex-start">
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label" c={onHero.faint}>Collected</T>
                <T v="display" c={onHero.strong}>{rupees(f.got)}</T>
                <T v="small" c={onHero.soft}>{f.rate}% of {rupees(f.billed)} billed</T>
              </View>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><Receipt size={22} color={colors.white} /></View>
            </Row>
            <Progress value={f.got} max={f.billed || 1} color={colors.sun300} track="rgba(255,255,255,0.22)" />
            <HeroCells items={[
              { k: 'Pending', v: rupees(f.pending) },
              { k: 'Occupancy', v: `${d.occupancy.totals.beds ? Math.round((d.occupancy.totals.occupied / d.occupancy.totals.beds) * 100) : 0}%` },
              { k: 'Free beds', v: String(d.occupancy.totals.free) },
            ]} />
          </Hero>
          {f.floors.length > 0 && (
            <Section title="By floor">
              {f.floors.map((x: any) => (
                <Card key={x.floor.floorNumber} style={{ gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="title" style={{ flex: 1 }} numberOfLines={1}>Floor {x.floor.floorNumber} · {x.floor.companyName}</T>
                    <T v="small" w="bold">{x.summary.collectionRate}%</T>
                  </Row>
                  <Progress value={x.summary.totalCollected} max={x.summary.grandTotal || 1} color={x.summary.collectionRate >= 80 ? colors.brand500 : colors.sun400} height={6} />
                  <T v="caption" c={colors.text3}>{rupees(x.summary.totalCollected)} of {rupees(x.summary.grandTotal)} · {plural(x.summary.totalStudents, 'resident')}</T>
                </Card>
              ))}
            </Section>
          )}
          <Section title="Rooms">
            <Card style={{ gap: 12 }}>
              {d.occupancy.floors.map((x: any) => (
                <Bar key={x.floorNumber} label={`Floor ${x.floorNumber}`} value={x.occupied} max={x.beds} note={`${x.free} free of ${x.beds}`} />
              ))}
              <T v="caption" c={colors.text3}>{d.occupancy.newAdmissions} new admissions this month · {d.occupancy.withoutRoom} without a room</T>
            </Card>
          </Section>
        </>
      ) : (
        <>
          <Grid>
            <Stat icon={CalendarDays} tone="lilac" label="Leaves" value={d.leaves.total} caption={`${d.leaves.lateReturns} late returns`} />
            <Stat icon={DoorOpen} tone="white" label="Visitors" value={d.visitors.total} caption={d.visitors.avgStayMinutes ? `Avg ${d.visitors.avgStayMinutes} min` : ''} />
            <Stat icon={Wrench} tone="peach" label="Complaints" value={d.complaints.total} caption={`${d.complaints.openNow} open now`} />
            <Stat icon={UtensilsCrossed} tone="sun" label="Plates / day" value={Math.round(plates / Math.max(1, d.mess.servedDays || 1))} caption={`${d.mess.residents} residents`} />
          </Grid>
          <Section title="Leaves each day"><Card><Bars days={d.leaves.daily} color={colors.lilac500} /></Card></Section>
          <Section title="Leave types">
            <Card style={{ gap: 10 }}>
              {Object.entries(d.leaves.byType as Record<string, number>).length === 0 ? <T v="small" c={colors.text3}>No leaves this month.</T> : Object.entries(d.leaves.byType as Record<string, number>).map(([k, v]) => <Bar key={k} label={LEAVE_TYPES[k] || k} value={v} max={d.leaves.total} />)}
            </Card>
          </Section>
          <Section title="Complaints by category">
            <Card style={{ gap: 10 }}>
              {d.complaints.byCategory.length === 0 ? <T v="small" c={colors.text3}>No complaints this month.</T> : d.complaints.byCategory.map((c: any) => <Bar key={c.category} label={c.category} value={c.count} max={d.complaints.byCategory[0].count} note={c.open ? `${c.open} open` : 'all fixed'} />)}
            </Card>
          </Section>
          <Section title="Visitors each day"><Card><Bars days={d.visitors.daily} color={colors.sun400} /></Card></Section>
        </>
      )}
    </Screen>
  );
}
