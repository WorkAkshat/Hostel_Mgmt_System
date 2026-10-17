import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Moon, Save } from 'lucide-react-native';
import { nightApi } from '../../api';
import { useData } from '../../lib/query';
import { fmtTime, isoDay } from '../../lib/format';
import { colors } from '../../ui/theme';
import { Badge, Button, Card, Row, T, tap } from '../../ui/primitives';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Screen } from '../../ui/layout';
import { FloorSelect, useFloor, useFloors } from '../../features/floor';

const MARKS = [
  { value: 'PRESENT', label: 'In', on: colors.success },
  { value: 'ABSENT', label: 'Absent', on: colors.danger },
  { value: 'ON_LEAVE', label: 'Leave', on: colors.lilac500 },
];

// Night roll call for one floor: tap In / Absent / Leave for each resident, then save
export default function RollCall() {
  const qc = useQueryClient();
  const toast = useToast();
  const floors = useFloors();
  const { floor: picked, locked } = useFloor();
  const [floor, setFloor] = useState(picked === 'all' ? '1' : picked);
  const date = isoDay();
  const { data, isLoading, error, refetch } = useData(['roll-call', floor, date], () => nightApi.get(floor, date), { interval: false });
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init: Record<string, string> = {};
    (data?.roomsChart || []).forEach((r: any) => r.students.forEach((s: any) => { init[s.id] = s.status || 'PRESENT'; }));
    setMarks(init);
  }, [data]);

  const counts = useMemo(() => {
    const v = Object.values(marks);
    return { PRESENT: v.filter((x) => x === 'PRESENT').length, ABSENT: v.filter((x) => x === 'ABSENT').length, ON_LEAVE: v.filter((x) => x === 'ON_LEAVE').length, all: v.length };
  }, [marks]);

  const save = async () => {
    setBusy(true);
    try {
      await nightApi.submit({ date, floorNumber: floor, notifyParents: notify, records: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })) });
      toast.success(`Roll call saved · Floor ${floor}`, `${counts.PRESENT} in · ${counts.ABSENT} absent · ${counts.ON_LEAVE} on leave`);
      await qc.invalidateQueries({ queryKey: ['roll-call'] });
    } catch (e: any) { toast.error('Could not save', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen title="Night roll call" subtitle={`${locked ? `Floor ${floor} · ` : ''}${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`} back tabBar={false} onRefresh={refetch}>
      {!locked && (
        <FloorSelect value={floor} onChange={setFloor} allowAll={false} />
      )}
      {data?.submitted && (
        <Card tone="success" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <CircleCheck size={18} color={colors.success} />
          <T v="small" c={colors.success} style={{ flex: 1 }}>Saved {data.submittedAt ? `at ${fmtTime(data.submittedAt)}` : 'today'} — you can still change and save again.</T>
        </Card>
      )}
      <Row gap={8}>
        {[{ k: 'In', v: counts.PRESENT, c: colors.success }, { k: 'Absent', v: counts.ABSENT, c: colors.danger }, { k: 'On leave', v: counts.ON_LEAVE, c: colors.lilac700 }].map((x) => (
          <View key={x.k} style={styles.count}>
            <T v="h2" c={x.c}>{x.v}</T>
            <T v="caption" c={colors.text3}>{x.k}</T>
          </View>
        ))}
      </Row>

      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={4} /> : !(data?.roomsChart || []).some((r: any) => r.students.length) ? (
        <Empty icon={Moon} title="No residents on this floor" />
      ) : (data.roomsChart || []).filter((r: any) => r.students.length).map((room: any) => (
        <Card key={room.roomId} style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}><T v="title">Room {room.roomNumber}</T><T v="caption" c={colors.text3}>{room.students.length} resident{room.students.length === 1 ? '' : 's'}</T></Row>
          {room.students.map((s: any) => (
            <View key={s.id} style={{ gap: 6 }}>
              <Row>
                <T v="small" w="semibold" style={{ flex: 1 }} numberOfLines={1}>{s.name}</T>
                {s.hasActiveLeave && <Badge label="Has leave" tone="lilac" />}
              </Row>
              <View style={styles.seg}>
                {MARKS.map((m) => {
                  const on = marks[s.id] === m.value;
                  return (
                    <Pressable key={m.value} onPress={() => { tap(); setMarks((x) => ({ ...x, [s.id]: m.value })); }} style={[styles.segItem, on && { backgroundColor: m.on }]} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${s.name} ${m.label}`}>
                      <T v="small" w={on ? 'bold' : 'medium'} c={on ? colors.white : colors.text2}>{m.label}</T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      ))}

      {counts.all > 0 && (
        <Card style={{ gap: 12 }}>
          <Row>
            <T v="small" style={{ flex: 1 }}>Tell parents of absent residents</T>
            <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.brand500, false: colors.borderStrong }} thumbColor={colors.white} />
          </Row>
          <Button title={`Save roll call · Floor ${floor}`} icon={Save} kind="brand" onPress={save} loading={busy} full />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  seg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 3, gap: 3 },
  segItem: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
