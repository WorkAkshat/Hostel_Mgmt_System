import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CircleCheck, DoorOpen, House, Moon, Plus, Siren, TriangleAlert } from 'lucide-react-native';
import { leavesApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDateTime, plural } from '../../lib/format';
import { LEAVE_STATUS, LEAVE_TYPES } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Badge, Button, Card, Chips, IconTile, Row, T } from '../../ui/primitives';
import { Choices, DateTimeField, Field, Input } from '../../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, Screen } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';

const TYPES = [
  { value: 'NIGHT_OUT', label: 'Night out', hint: 'Back next day', icon: Moon },
  { value: 'OUT_OF_STATION', label: 'Going home', hint: 'Out of station', icon: House },
  { value: 'EMERGENCY', label: 'Emergency', hint: 'Urgent family need', icon: Siren },
];

// Where the leave is in its life: applied → approved → left → back
const STEPS = ['PENDING', 'APPROVED', 'CHECKED_OUT', 'RETURNED'];
const Timeline = ({ leave }: { leave: any }) => {
  if (leave.status === 'REJECTED') return null;
  const at = STEPS.indexOf(leave.status);
  const labels = ['Applied', 'Approved', 'Left', 'Back'];
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.track}>
        {labels.map((l, i) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', flex: i < labels.length - 1 ? 1 : 0 }}>
            <View style={[styles.dot, i <= at && { backgroundColor: colors.brand500, borderColor: colors.brand500 }]}>
              {i <= at && <CircleCheck size={10} color={colors.white} />}
            </View>
            {i < labels.length - 1 && <View style={[styles.line, i < at && { backgroundColor: colors.brand500 }]} />}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {labels.map((l, i) => <T key={l} v="caption" c={i <= at ? colors.brand700 : colors.text3} style={{ fontSize: 11 }}>{l}</T>)}
      </View>
    </View>
  );
};

export default function StudentLeaves() {
  const params = useLocalSearchParams<{ apply?: string }>();
  const { data, isLoading, error, refetch } = useData(['my-leaves'], leavesApi.mine);
  const [filter, setFilter] = useState<'active' | 'past'>('active');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    // Open the form once, then clear ?apply so the next "Apply leave" tap works too
    if (params.apply) { setApplying(true); router.setParams({ apply: undefined }); }
  }, [params.apply]);

  const list = useMemo(() => asList(data).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [data]);
  const active = list.filter((l: any) => ['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(l.status));
  const past = list.filter((l: any) => !['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(l.status));
  const shown = filter === 'active' ? active : past;
  const late = list.filter((l: any) => l.status === 'CHECKED_OUT' && new Date(l.endDate) < new Date());

  return (
    <Screen title="Leaves" subtitle="Your gate passes" onRefresh={refetch}
      right={<Button title="Apply" icon={Plus} small onPress={() => setApplying(true)} />}
    >
      {late.length > 0 && (
        <Card tone="danger" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TriangleAlert size={20} color={colors.danger} />
          <T v="small" c={colors.danger} style={{ flex: 1 }}>You were due back {fmtDateTime(late[0].endDate)}. Please inform the warden.</T>
        </Card>
      )}
      <Chips value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Current', count: active.length }, { value: 'past', label: 'Past', count: past.length }]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={CalendarDays} title={filter === 'active' ? 'No current leave' : 'No past leaves'} text={filter === 'active' ? 'Going out for the night or going home? Apply here first.' : 'Your finished and rejected leaves show here.'}
          action={filter === 'active' ? <Button title="Apply for leave" icon={Plus} onPress={() => setApplying(true)} /> : undefined} />
      ) : shown.map((l: any, i: number) => {
        const st = LEAVE_STATUS[l.status] || { short: l.status, tone: 'white' as const, label: l.status };
        return (
          <Appear key={l.id} i={i}>
            <Card style={{ gap: 12 }}>
              <Row align="flex-start">
                <IconTile icon={l.type === 'EMERGENCY' ? Siren : l.type === 'NIGHT_OUT' ? Moon : House} tone={st.tone} />
                <View style={{ flex: 1 }}>
                  <T v="title">{LEAVE_TYPES[l.type] || 'Leave'}</T>
                  <T v="small" c={colors.text2} numberOfLines={2}>{l.reason}</T>
                </View>
                <Badge label={st.short} tone={st.tone} />
              </Row>
              <View style={styles.dates}>
                <View style={{ flex: 1 }}><T v="caption" c={colors.text3}>From</T><T v="small" w="semibold">{fmtDateTime(l.startDate)}</T></View>
                <View style={{ flex: 1 }}><T v="caption" c={colors.text3}>Back by</T><T v="small" w="semibold">{fmtDateTime(l.endDate)}</T></View>
              </View>
              <Timeline leave={l} />
              {l.comments ? <T v="small" c={colors.text2}>Warden: “{l.comments}”</T> : null}
              {(l.checkoutTime || l.checkinTime) && (
                <Row gap={14}>
                  {l.checkoutTime && <Row gap={4}><DoorOpen size={13} color={colors.text3} /><T v="caption" c={colors.text3}>Left {fmtDateTime(l.checkoutTime)}</T></Row>}
                  {l.checkinTime && <Row gap={4}><CircleCheck size={13} color={colors.text3} /><T v="caption" c={colors.text3}>Back {fmtDateTime(l.checkinTime)}</T></Row>}
                </Row>
              )}
              {l.status === 'APPROVED' && (
                <View style={styles.pass}>
                  <T v="label" c={colors.brand700}>Gate pass</T>
                  <T v="h2" c={colors.brand900}>Approved · show at the gate</T>
                  <T v="caption" c={colors.brand700}>The guard marks the time you leave and return.</T>
                </View>
              )}
            </Card>
          </Appear>
        );
      })}
      <ApplySheet open={applying} onClose={() => setApplying(false)} hasPending={active.some((l: any) => l.status === 'PENDING')} />
    </Screen>
  );
}

const ApplySheet = ({ open, onClose, hasPending }: { open: boolean; onClose: () => void; hasPending: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState('NIGHT_OUT');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setType('NIGHT_OUT'); setFrom(null); setTo(null); setReason(''); setError(null); }
  }, [open]);

  const nights = from && to ? Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000)) : 0;

  const submit = async () => {
    if (!from || !to) return setError('Pick when you leave and when you will be back.');
    if (to <= from) return setError('Return time must be after the time you leave.');
    if (reason.trim().length < 5) return setError('Write a short reason (where and why).');
    setBusy(true);
    setError(null);
    try {
      await leavesApi.apply({ type, reason: reason.trim(), startDate: from.toISOString(), endDate: to.toISOString() });
      toast.success('Leave applied', 'You will get a notification when the warden decides.');
      await qc.invalidateQueries({ queryKey: ['my-leaves'] });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Apply for leave" subtitle={hasPending ? 'You already have a request waiting — this adds another.' : 'The warden approves it, then you can leave.'}
      footer={<Button title={busy ? 'Sending…' : 'Send to warden'} icon={CalendarDays} onPress={submit} loading={busy} full />}
    >
      <Field label="Type of leave"><Choices options={TYPES} value={type} onChange={setType} columns={3} /></Field>
      <Field label="Leaving on" required><DateTimeField label="Leaving on" value={from} onChange={(d) => { setFrom(d); if (to && to <= d) setTo(null); }} minDate={new Date()} /></Field>
      <Field label="Back by" required hint={nights ? plural(nights, 'night') + ' away' : undefined}>
        <DateTimeField label="Back by" value={to} onChange={setTo} minDate={from || new Date()} />
      </Field>
      <Field label="Reason" required hint="Where you are going and why">
        <Input value={reason} onChangeText={(v) => { setReason(v.slice(0, 300)); setError(null); }} multiline placeholder="e.g. Sister's wedding at home in Jaipur" />
      </Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', gap: 10, backgroundColor: colors.bg, borderRadius: 12, padding: 10 },
  track: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  pass: { backgroundColor: colors.mint100, borderRadius: 14, padding: 14, gap: 2, borderWidth: 1, borderColor: colors.mint300, borderStyle: 'dashed' },
});
