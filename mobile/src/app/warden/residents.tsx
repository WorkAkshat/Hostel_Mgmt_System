import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, ChevronRight, MessageCircle, Phone, Snowflake, Users, Wrench } from 'lucide-react-native';
import { roomsApi, studentsApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { STUDENT_STATUS, priceFor } from '../../lib/hostel';
import { colors, radius, shadow } from '../../ui/theme';
import { Avatar, Badge, Button, Chips, IconButton, Press, Row, Segmented, T, tap } from '../../ui/primitives';
import { SearchInput } from '../../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';
import Bell from '../../features/Bell';
import { call, whatsapp } from '../../lib/contact';
import { FloorChips, onFloor, useFloor } from '../../features/floor';
import { go } from '../../lib/nav';
import { rupees } from '../../lib/format';
import { duesByStudent, useAllBills } from '../../features/dues';

const bedsOf = (r: any) => r.sharingType || r.capacity || 0;

export default function Residents() {
  const params = useLocalSearchParams<{ tab?: 'students' | 'rooms' }>();
  const [tab, setTab] = useState<'students' | 'rooms'>('students');
  useEffect(() => { if (params.tab) { setTab(params.tab); router.setParams({ tab: undefined }); } }, [params.tab]);

  return (
    <Screen title="Residents" subtitle="Students, rooms and beds" right={<Bell />}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'students', label: 'Students' }, { value: 'rooms', label: 'Rooms & beds' }]} />
      <FloorChips />
      {tab === 'students' ? <StudentList /> : <RoomGrid />}
    </Screen>
  );
}

const StudentList = () => {
  const { floor } = useFloor();
  const { data, isLoading, error, refetch } = useData(['students'], studentsApi.all);
  const { bills } = useAllBills();
  const dues = useMemo(() => duesByStudent(bills), [bills]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'CHECKED_IN' | 'none' | 'all'>('CHECKED_IN');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return asList(data)
      .filter((x: any) => (floor === 'all' ? true : onFloor(x.room, floor)))
      .filter((x: any) => (status === 'all' ? true : status === 'none' ? !x.roomId : x.status === 'CHECKED_IN'))
      .filter((x: any) => !s || [x.user?.name, x.rollNumber, x.room?.roomNumber, x.phoneNumber, x.coachingCollege].some((v) => v && String(v).toLowerCase().includes(s)))
      .sort((a: any, b: any) => String(a.user?.name).localeCompare(String(b.user?.name)));
  }, [data, floor, q, status]);
  const all = asList(data);

  return (
    <>
      <SearchInput value={q} onChange={setQ} placeholder="Name, roll no., room or phone" />
      <Chips value={status} onChange={setStatus} options={[
        { value: 'CHECKED_IN', label: 'Checked in', count: all.filter((x: any) => x.status === 'CHECKED_IN').length },
        { value: 'none', label: 'No room', count: all.filter((x: any) => !x.roomId).length },
        { value: 'all', label: 'All' },
      ]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={5} h={68} /> : list.length === 0 ? (
        <Empty icon={Users} title="No students match" text="Try another name or floor." />
      ) : list.map((s: any, i: number) => (
        <Appear key={s.id} i={i}>
          <ListRow
            leading={<Avatar name={s.user?.name} uri={s.user?.avatar || s.profilePic} size={42} />}
            title={s.user?.name}
            sub={s.room ? `Room ${s.room.roomNumber} · Floor ${s.room.floorNumber}` : 'No room yet'}
            meta={dues[s.id] ? `${rupees(dues[s.id].total)} ${dues[s.id].overdue ? 'overdue' : 'due'}` : 'Paid up'}
            actions={s.status !== 'CHECKED_IN' ? <Badge label={STUDENT_STATUS[s.status]?.label || s.status} tone={STUDENT_STATUS[s.status]?.tone || 'white'} /> : s.phoneNumber ? <IconButton icon={Phone} label={`Call ${s.user?.name}`} tone="mint" size={36} onPress={() => call(s.phoneNumber)} /> : undefined}
            onPress={() => go(`/manage/student/${s.id}`)}
            chevron={false}
          />
        </Appear>
      ))}
    </>
  );
};

// Which bed each resident sleeps in. Beds come from the room's bed map ("101-A"…)
// or its sharing size; residents are matched by the letter of their bed id and
// anyone without a bed id fills the next empty bed.
const bedLetters = (r: any): string[] => {
  let map: string[] = [];
  try { map = JSON.parse(r.bedMapping || '[]'); } catch { map = []; }
  const n = Math.max(bedsOf(r), map.length);
  return Array.from({ length: n }, (_, i) => String(map[i] || '').split(/[-\s]/).pop()?.toUpperCase() || String.fromCharCode(65 + i));
};
const letterOf = (bedId?: string | null) => (bedId ? String(bedId).trim().split(/[-\s]/).pop()?.toUpperCase() : undefined);
const bedsWithPeople = (r: any) => {
  const letters = bedLetters(r);
  const slots: { letter: string; student: any | null }[] = letters.map((letter) => ({ letter, student: null }));
  const waiting: any[] = [];
  (r.students || []).forEach((st: any) => {
    const slot = slots.find((x) => !x.student && x.letter === letterOf(st.bedId));
    if (slot) slot.student = st; else waiting.push(st);
  });
  waiting.forEach((st) => {
    const slot = slots.find((x) => !x.student);
    if (slot) slot.student = st; else slots.push({ letter: '+', student: st });
  });
  return slots;
};

type BedState = 'empty' | 'paid' | 'due' | 'overdue';
const BED_LOOK: Record<BedState, { bg: string; border: string; fg: string; label: string }> = {
  empty: { bg: colors.white, border: colors.borderStrong, fg: colors.text3, label: 'Empty' },
  paid: { bg: colors.successBg, border: '#bfe3cd', fg: colors.success, label: 'Paid' },
  due: { bg: colors.cream100, border: colors.sun200, fg: colors.sun800, label: 'Due' },
  overdue: { bg: colors.dangerBg, border: '#f5c9c6', fg: colors.danger, label: 'Overdue' },
};

const RoomGrid = () => {
  const { floor } = useFloor();
  const { data, isLoading, error, refetch } = useData(['rooms'], roomsApi.all);
  const { bills } = useAllBills();
  const dues = useMemo(() => duesByStudent(bills), [bills]);
  const [filter, setFilter] = useState<'all' | 'free' | 'MAINTENANCE'>('all');
  const [open, setOpen] = useState<any>(null);
  const rooms = useMemo(() => asList(data)
    .filter((r: any) => onFloor(r, floor))
    .sort((a: any, b: any) => (a.floorNumber - b.floorNumber) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })), [data, floor]);
  const free = (r: any) => (r.status === 'MAINTENANCE' ? 0 : Math.max(0, bedsOf(r) - (r.students?.length || 0)));
  const shown = rooms.filter((r: any) => filter === 'all' || (filter === 'free' ? free(r) > 0 : r.status === 'MAINTENANCE'));
  const totals = rooms.reduce((a: any, r: any) => ({ beds: a.beds + bedsOf(r), taken: a.taken + (r.students?.length || 0), free: a.free + free(r) }), { beds: 0, taken: 0, free: 0 });
  const live = open ? rooms.find((r: any) => r.id === open.id) || open : null;
  const stateOf = (st: any): BedState => {
    if (!st) return 'empty';
    const d = dues[st.id];
    return !d ? 'paid' : d.overdue ? 'overdue' : 'due';
  };

  return (
    <>
      <View style={styles.totals}>
        {[{ k: 'Beds', v: totals.beds }, { k: 'Taken', v: totals.taken }, { k: 'Free', v: totals.free }].map((x, i) => (
          <View key={x.k} style={[styles.totalCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
            <T v="h2">{x.v}</T><T v="caption" c={colors.text3}>{x.k}</T>
          </View>
        ))}
      </View>
      <Chips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All rooms', count: rooms.length }, { value: 'free', label: 'Has space', count: rooms.filter((r: any) => free(r) > 0).length }, { value: 'MAINTENANCE', label: 'Repair', count: rooms.filter((r: any) => r.status === 'MAINTENANCE').length }]} />
      <Row gap={12} style={{ flexWrap: 'wrap' }}>
        {(['paid', 'due', 'overdue', 'empty'] as BedState[]).map((k) => (
          <Row key={k} gap={5}><View style={[styles.dot, { backgroundColor: BED_LOOK[k].bg, borderColor: BED_LOOK[k].fg }]} /><T v="caption" c={colors.text2}>{BED_LOOK[k].label}</T></Row>
        ))}
      </Row>
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={4} /> : shown.length === 0 ? (
        <Empty icon={BedDouble} title="No rooms here" />
      ) : shown.map((r: any, ri: number) => {
        const repair = r.status === 'MAINTENANCE';
        const slots = bedsWithPeople(r);
        const rows: (typeof slots)[] = [];
        for (let i = 0; i < slots.length; i += 4) rows.push(slots.slice(i, i + 4));
        return (
          <Appear key={r.id} i={ri}>
            <View style={[styles.roomCard, repair && { backgroundColor: colors.peach50, borderColor: colors.peach100 }]}>
              <Press onPress={() => setOpen(r)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Room ${r.roomNumber} details`} style={styles.roomHead}>
                <View style={styles.roomNo}><T v="caption" c={colors.text3}>ROOM</T><T v="h2" style={{ marginTop: -2 }}>{r.roomNumber}</T></View>
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <T v="small" w="semibold">{priceFor(r.sharingType).label}</T>
                    {r.isAc ? <Badge label="AC" tone="mint" icon={Snowflake} /> : <Badge label="Non-AC" tone="white" />}
                  </Row>
                  <T v="caption" c={repair ? colors.peach700 : free(r) ? colors.sun800 : colors.text3} w="semibold">{repair ? 'Under repair' : free(r) ? `${free(r)} bed${free(r) > 1 ? 's' : ''} free` : 'Full'}</T>
                </View>
                <ChevronRight size={18} color={colors.text3} />
              </Press>
              {rows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
                  {row.map((slot) => {
                    const st = stateOf(slot.student);
                    const look = BED_LOOK[st];
                    const d = slot.student ? dues[slot.student.id] : null;
                    return (
                      <Press key={slot.letter + (slot.student?.id || '')} scaleTo={0.94} disabled={!slot.student}
                        onPress={() => slot.student && go(`/manage/student/${slot.student.id}`)}
                        accessibilityRole="button" accessibilityLabel={slot.student ? `Bed ${slot.letter}, ${slot.student.user?.name}, ${look.label}` : `Bed ${slot.letter}, empty`}
                        style={[styles.bedTile, { backgroundColor: look.bg, borderColor: look.border }, !slot.student && { borderStyle: 'dashed' }]}>
                        <Row gap={4}><BedDouble size={14} color={look.fg} /><T v="caption" w="bold" c={look.fg}>{slot.letter}</T></Row>
                        <T v="caption" w="semibold" c={slot.student ? colors.text : colors.text3} numberOfLines={1}>{slot.student ? (slot.student.user?.name || '').split(' ')[0] : 'Empty'}</T>
                        <T v="caption" c={look.fg} numberOfLines={1} style={{ fontSize: 11 }}>{d ? rupees(d.total) : slot.student ? 'Paid up' : ' '}</T>
                      </Press>
                    );
                  })}
                  {Array.from({ length: 4 - row.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)}
                </View>
              ))}
            </View>
          </Appear>
        );
      })}
      <RoomSheet room={live} onClose={() => setOpen(null)} />
    </>
  );
};

const RoomSheet = ({ room, onClose }: { room: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const toggleRepair = async () => {
    setBusy(true);
    try {
      await roomsApi.update(room.id, { status: room.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE' });
      toast.success(room.status === 'MAINTENANCE' ? 'Room is available again' : 'Room marked under repair');
      await qc.invalidateQueries({ queryKey: ['rooms'] });
    } catch (e: any) { toast.error('Could not update', e.message); } finally { setBusy(false); }
  };
  if (!room) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const p = priceFor(room.sharingType);
  return (
    <Sheet open={!!room} onClose={onClose} title={`Room ${room.roomNumber}`} subtitle={`Floor ${room.floorNumber} · ${p.label}${room.isAc ? ' · AC' : ''} · ₹${p.total.toLocaleString('en-IN')}/bed`}
      footer={<Button title={room.status === 'MAINTENANCE' ? 'Mark available' : 'Mark under repair'} icon={Wrench} kind={room.status === 'MAINTENANCE' ? 'brand' : 'secondary'} loading={busy} onPress={toggleRepair} full />}
    >
      {(room.students || []).length === 0 ? <T c={colors.text2}>Nobody lives here yet.</T> : (room.students || []).map((s: any) => (
        <ListRow key={s.id} leading={<Avatar name={s.user?.name} uri={s.user?.avatar || s.profilePic} />} title={s.user?.name} sub={`${s.rollNumber}${s.bedId ? ` · ${s.bedId}` : ''}`}
          actions={s.phoneNumber ? (
            <Row gap={6}>
              <IconButton icon={MessageCircle} label="WhatsApp" tone="success" size={34} onPress={() => whatsapp(s.phoneNumber)} />
              <IconButton icon={Phone} label="Call" tone="mint" size={34} onPress={() => call(s.phoneNumber)} />
            </Row>
          ) : undefined}
          onPress={() => { onClose(); go(`/manage/student/${s.id}`); }} chevron={false} />
      ))}
      <T v="caption" c={colors.text3}>Move residents between rooms from the website (Rooms → room → Assign).</T>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  total: { flex: 1, backgroundColor: colors.white, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, padding: 10 },
  totals: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  totalCell: { flex: 1, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1.5 },
  roomCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8, ...shadow.card },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomNo: { minWidth: 54, alignItems: 'center', backgroundColor: colors.mint100, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  bedTile: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 8, gap: 1 },
});
