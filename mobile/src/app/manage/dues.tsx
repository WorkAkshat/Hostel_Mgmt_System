import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CircleCheck, Phone } from 'lucide-react-native';
import { rupees, plural } from '../../lib/format';
import { call } from '../../lib/contact';
import { go } from '../../lib/nav';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Chips, IconButton, T } from '../../ui/primitives';
import { SearchInput } from '../../ui/form';
import { Empty, ErrorBox, Loading } from '../../ui/feedback';
import { Appear, ListRow, Screen } from '../../ui/layout';
import { FloorChips, onFloor, useFloor } from '../../features/floor';
import { useAllBills } from '../../features/dues';

// Everyone who owes money, one row per resident (fee bills + demand notes together).
// Tap a resident to see their bills and record a payment.
export default function PendingDues() {
  const { floor } = useFloor();
  const { bills, isLoading, error, refetch } = useAllBills();
  const [filter, setFilter] = useState<'all' | 'overdue'>('all');
  const [q, setQ] = useState('');

  const people = useMemo(() => {
    const map: Record<string, { student: any; total: number; overdue: number; count: number; oldest: string | Date }> = {};
    bills.filter((b) => b.state !== 'paid' && onFloor(b.student?.room || { floorNumber: b.floor }, floor)).forEach((b) => {
      const p = (map[b.studentId] ||= { student: b.student, total: 0, overdue: 0, count: 0, oldest: b.due });
      p.total += b.amount;
      p.count += 1;
      if (b.state === 'overdue') p.overdue += b.amount;
      if (new Date(b.due) < new Date(p.oldest)) p.oldest = b.due;
    });
    return Object.entries(map).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.overdue - a.overdue) || (b.total - a.total));
  }, [bills, floor]);

  const total = people.reduce((a, p) => a + p.total, 0);
  const overdueTotal = people.reduce((a, p) => a + p.overdue, 0);
  const late = people.filter((p) => p.overdue > 0);
  const s = q.trim().toLowerCase();
  const shown = (filter === 'overdue' ? late : people).filter((p) => !s || [p.student?.user?.name, p.student?.rollNumber, p.student?.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(s)));

  return (
    <Screen title="Pending dues" subtitle="Fee bills and demand notes" back tabBar={false} onRefresh={refetch}>
      <FloorChips />
      <View style={styles.strip}>
        {[{ k: 'Total due', v: rupees(total), c: colors.sun900 }, { k: 'Residents', v: String(people.length), c: colors.sun900 }, { k: 'Overdue', v: rupees(overdueTotal), c: overdueTotal ? colors.danger : colors.sun900 }].map((x, i) => (
          <View key={x.k} style={[styles.cell, i > 0 && styles.cellLine]}>
            <T v="h2" c={x.c} numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
            <T v="caption" c={colors.sun800}>{x.k}</T>
          </View>
        ))}
      </View>
      <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Everyone', count: people.length }, { value: 'overdue', label: 'Overdue', count: late.length }]} />
      {people.length > 4 && <SearchInput value={q} onChange={setQ} placeholder="Name, roll no. or room" />}

      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={4} h={70} /> : shown.length === 0 ? (
        <Empty icon={CircleCheck} tone="success" title={filter === 'overdue' ? 'Nobody is overdue' : 'Nothing pending'} text="All bills on this floor are paid." />
      ) : shown.map((p, i) => (
        <Appear key={p.id} i={i}>
          <ListRow
            leading={<Avatar name={p.student?.user?.name} tone={p.overdue ? 'danger' : 'sun'} />}
            title={p.student?.user?.name || 'Resident'}
            sub={`Room ${p.student?.room?.roomNumber || '—'} · ${plural(p.count, 'bill')}`}
            right={
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T v="title" w="bold" c={p.overdue ? colors.danger : colors.text}>{rupees(p.total)}</T>
                <Badge label={p.overdue ? 'Overdue' : 'Due'} tone={p.overdue ? 'danger' : 'warning'} />
              </View>
            }
            actions={p.student?.phoneNumber ? <IconButton icon={Phone} label="Call" tone="mint" size={36} onPress={() => call(p.student.phoneNumber)} /> : undefined}
            onPress={() => go(`/manage/student/${p.id}`)}
            chevron={false}
          />
        </Appear>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', backgroundColor: colors.cream100, borderRadius: 16, borderWidth: 1, borderColor: colors.sun200, paddingVertical: 12 },
  cell: { flex: 1, alignItems: 'center', paddingHorizontal: 6, gap: 2 },
  cellLine: { borderLeftWidth: 1, borderLeftColor: colors.sun200 },
});
