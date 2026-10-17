import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftToLine, ArrowRightFromLine, CircleCheck, DoorOpen, HeartHandshake, LogIn, LogOut, Phone, ShieldCheck, TriangleAlert, User, UserPlus, UserRound, Users, UsersRound } from 'lucide-react-native';
import { leavesApi, studentsApi, visitorsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { call } from '../lib/contact';
import { duration, fmtDateTime, fmtTime, timeAgo } from './gateFormat';
import { LEAVE_TYPES, RELATIONS } from '../lib/hostel';
import { colors } from '../ui/theme';
import { Avatar, Badge, Button, Card, IconButton, Press, Row, T } from '../ui/primitives';
import { Choices, Field, Input, SearchInput, digits } from '../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear } from '../ui/layout';
import { Hero, HeroCells, onHero } from '../ui/blocks';
import { Sheet } from '../ui/Sheet';

type Tab = 'leaving' | 'out' | 'visitors';

// Gate desk: approved leaves to let out, residents outside, and visitors
export default function GateBoard({ request }: { request?: { tab: Tab } }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const leaves = useData(['leaves'], leavesApi.all, { interval: 20_000 });
  const visitors = useData(['visitors'], visitorsApi.all, { interval: 20_000 });
  const [tab, setTab] = useState<Tab>(request?.tab || 'leaving');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  useEffect(() => { if (request) setTab(request.tab); }, [request]);

  const match = (x: any, extra: string[] = []) => {
    const s = q.trim().toLowerCase();
    return !s || [x.student?.user?.name, x.student?.rollNumber, x.student?.room?.roomNumber, ...extra].some((v) => v && String(v).toLowerCase().includes(s));
  };
  const all = asList(leaves.data);
  const leaving = all.filter((l: any) => l.status === 'APPROVED' && match(l)).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const out = all.filter((l: any) => l.status === 'CHECKED_OUT' && match(l)).sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  const inside = useMemo(() => asList(visitors.data).filter((v: any) => !v.checkOutTime && match(v, [v.name, v.phone])), [visitors.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const late = out.filter((l: any) => new Date(l.endDate) < new Date()).length;

  const run = async (key: string, fn: () => Promise<unknown>, ok: string, sub?: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok, sub);
      await Promise.all([qc.invalidateQueries({ queryKey: ['leaves'] }), qc.invalidateQueries({ queryKey: ['visitors'] })]);
    } catch (e: any) { toast.error('Could not save', e.message); } finally { setBusy(null); }
  };

  const error = leaves.error || visitors.error;
  return (
    <>
      <Hero>
        <Row>
          <View style={{ flex: 1 }}>
            <T v="label" c={onHero.faint}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</T>
            <T v="h2" c={onHero.strong}>{late ? `${late} resident${late > 1 ? 's' : ''} past return time` : 'Gate is all clear'}</T>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            {late ? <TriangleAlert size={22} color={colors.sun300} /> : <ShieldCheck size={22} color={colors.white} />}
          </View>
        </Row>
        <HeroCells big items={[
          { k: 'Leaving', v: String(all.filter((l: any) => l.status === 'APPROVED').length), active: tab === 'leaving', onPress: () => setTab('leaving') },
          { k: late ? `Out · ${late} late` : 'Out now', v: String(all.filter((l: any) => l.status === 'CHECKED_OUT').length), active: tab === 'out', onPress: () => setTab('out') },
          { k: 'Visitors in', v: String(asList(visitors.data).filter((v: any) => !v.checkOutTime).length), active: tab === 'visitors', onPress: () => setTab('visitors') },
        ]} />
      </Hero>
      <SearchInput value={q} onChange={setQ} placeholder="Name, roll no. or room" />
      {tab === 'visitors' && <Button title="Check in a visitor" icon={UserPlus} onPress={() => setCheckingIn(true)} full />}
      {error ? <ErrorBox message={(error as Error).message} onRetry={() => { leaves.refetch(); visitors.refetch(); }} /> : leaves.isLoading ? <Loading /> : (
        <>
          {tab === 'leaving' && (leaving.length === 0 ? <Empty icon={DoorOpen} title="Nobody waiting to leave" text="Approved leaves show here until the resident walks out." /> : leaving.map((l: any, i: number) => (
            <Appear key={l.id} i={i}>
              <Card style={{ gap: 10 }}>
                <Row>
                  <Avatar name={l.student?.user?.name} />
                  <View style={{ flex: 1 }}><T v="title">{l.student?.user?.name}</T><T v="caption" c={colors.text3}>{l.student?.rollNumber} · Room {l.student?.room?.roomNumber || '—'}</T></View>
                  <Badge label={LEAVE_TYPES[l.type] || 'Leave'} tone="success" />
                </Row>
                <T v="small" c={colors.text2}>Leaves {fmtDateTime(l.startDate)} · back by {fmtDateTime(l.endDate)}</T>
                <Button title="Mark as left the hostel" icon={ArrowRightFromLine} kind="brand" loading={busy === l.id} onPress={() => run(l.id, () => leavesApi.checkout(l.id), 'Exit recorded', `${l.student?.user?.name} left at ${fmtTime(new Date())}`)} full />
              </Card>
            </Appear>
          )))}

          {tab === 'out' && (out.length === 0 ? <Empty icon={CircleCheck} tone="success" title="Everyone is in" text="Residents who are out on leave appear here." /> : out.map((l: any, i: number) => {
            const isLate = new Date(l.endDate) < new Date();
            return (
              <Appear key={l.id} i={i}>
                <Card tone={isLate ? 'danger' : undefined} style={{ gap: 10 }}>
                  <Row>
                    <Avatar name={l.student?.user?.name} tone={isLate ? 'white' : 'mint'} />
                    <View style={{ flex: 1 }}><T v="title">{l.student?.user?.name}</T><T v="caption" c={colors.text3}>Room {l.student?.room?.roomNumber || '—'} · left {timeAgo(l.checkoutTime)}</T></View>
                    {isLate ? <Badge label={`${duration(l.endDate)} late`} tone="danger" icon={TriangleAlert} /> : <Badge label={`Back ${fmtTime(l.endDate)}`} tone="lilac" />}
                  </Row>
                  <Row gap={8}>
                    {user?.role === 'ADMIN' && l.student?.parentContact ? <IconButton icon={Phone} label="Call parent" tone="white" size={44} onPress={() => call(l.student.parentContact)} /> : null}
                    <Button title="Mark as returned" icon={ArrowLeftToLine} kind="brand" loading={busy === l.id} onPress={() => run(l.id, () => leavesApi.checkin(l.id), 'Return recorded', `${l.student?.user?.name} is back`)} style={{ flex: 1 }} />
                  </Row>
                </Card>
              </Appear>
            );
          }))}

          {tab === 'visitors' && (inside.length === 0 ? <Empty icon={DoorOpen} title="No visitors inside" /> : inside.map((v: any, i: number) => (
            <Appear key={v.id} i={i}>
              <Card style={{ gap: 10 }}>
                <Row>
                  <Avatar name={v.name} tone="lilac" />
                  <View style={{ flex: 1 }}><T v="title">{v.name}</T><T v="caption" c={colors.text3}>{v.relationship} of {v.student?.user?.name} · Room {v.student?.room?.roomNumber || '—'}</T></View>
                  <Badge label={`In ${duration(v.checkInTime, true)}`} tone={Date.now() - new Date(v.checkInTime).getTime() > 3 * 3600000 ? 'warning' : 'mint'} />
                </Row>
                <Row gap={8}>
                  <IconButton icon={Phone} label="Call visitor" tone="white" size={44} onPress={() => call(v.phone)} />
                  <Button title="Check out" icon={LogOut} kind="secondary" loading={busy === v.id} onPress={() => run(v.id, () => visitorsApi.checkOut(v.id), 'Visitor checked out')} style={{ flex: 1 }} />
                </Row>
              </Card>
            </Appear>
          )))}
        </>
      )}
      <CheckIn open={checkingIn} onClose={() => setCheckingIn(false)} admin={user?.role === 'ADMIN'} />
    </>
  );
}

const RELATION_ICON: Record<string, any> = { Father: User, Mother: UserRound, Sibling: UsersRound, Guardian: ShieldCheck, Relative: HeartHandshake, Friend: Users };

// Check a visitor in: pick the resident by name / room, then the visitor's details
const CheckIn = ({ open, onClose }: { open: boolean; onClose: () => void; admin?: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const residents = useData(['gate-residents'], visitorsApi.residents, { enabled: open, interval: false });
  const [host, setHost] = useState<any>(null);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('Father');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setHost(null); setQ(''); setName(''); setPhone(''); setRelation('Father'); setError(null); } }, [open]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = asList(residents.data);
    return (s ? list.filter((r: any) => [r.name, r.rollNumber, r.roomNumber, `room ${r.roomNumber}`].some((v) => v && String(v).toLowerCase().includes(s))) : list).slice(0, 6);
  }, [residents.data, q]);

  const submit = async () => {
    if (!host) return setError('Choose who they are visiting.');
    if (name.trim().length < 2) return setError("Enter the visitor's name.");
    if (phone.length !== 10) return setError('Phone number must be 10 digits.');
    setBusy(true);
    try {
      await visitorsApi.checkIn({ studentRollNumber: host.rollNumber, name: name.trim(), phone, relationship: relation });
      toast.success('Visitor checked in', `${name.trim()} → ${host.name}, Room ${host.roomNumber || '—'}`);
      await qc.invalidateQueries({ queryKey: ['visitors'] });
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Check in a visitor" subtitle="Who they're meeting, then their details"
      footer={<Button title={name.trim() ? `Check in ${name.trim().split(' ')[0]}` : 'Check in'} icon={LogIn} kind="brand" onPress={submit} loading={busy} full />}>
      <View style={styles.step}><View style={styles.stepNo}><T v="caption" w="bold" c={colors.brand700}>1</T></View><T v="title">Visiting</T></View>
      {host ? (
        <View style={styles.host}>
          <Avatar name={host.name} uri={host.avatar} size={46} tone="white" />
          <View style={{ flex: 1 }}>
            <T v="title" w="bold" c={colors.brand900} numberOfLines={1}>{host.name}</T>
            <T v="caption" c={colors.brand700}>Room {host.roomNumber || '—'}{host.floorNumber ? ` · Floor ${host.floorNumber}` : ''} · {host.rollNumber}</T>
          </View>
          <Button title="Change" kind="secondary" small onPress={() => { setHost(null); setQ(''); }} />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <SearchInput value={q} onChange={(v) => { setQ(v); setError(null); }} placeholder="Resident name or room no." />
          {residents.isLoading ? <Loading rows={2} h={52} /> : matches.length === 0 ? (
            <T v="small" c={colors.text3} center style={{ paddingVertical: 10 }}>No resident matches “{q}”</T>
          ) : (
            <View style={styles.results}>
              {matches.map((r: any, i: number) => (
                <Press key={r.id} onPress={() => { setHost(r); setError(null); }} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Visiting ${r.name}`}
                  style={[styles.result, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Avatar name={r.name} uri={r.avatar} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="title" numberOfLines={1}>{r.name}</T>
                    <T v="caption" c={colors.text3} numberOfLines={1}>Room {r.roomNumber || '—'} · {r.rollNumber}</T>
                  </View>
                  <View style={styles.pick}><T v="caption" w="bold" c={colors.brand700}>Select</T></View>
                </Press>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={[styles.step, { marginTop: 4 }]}><View style={styles.stepNo}><T v="caption" w="bold" c={colors.brand700}>2</T></View><T v="title">Visitor</T></View>
      <Field label="Full name" required><Input value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder="e.g. Ramesh Sharma" autoCapitalize="words" /></Field>
      <Field label="Mobile number" required><Input prefix="+91" value={phone} onChangeText={(v) => { setPhone(digits(v, 10)); setError(null); }} keyboardType="number-pad" placeholder="10 digits" /></Field>
      <Field label="Relation">
        <Choices columns={3} value={relation} onChange={setRelation} options={RELATIONS.map((r) => ({ value: r, label: r, icon: RELATION_ICON[r] }))} />
      </Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  host: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.mint100, borderWidth: 1, borderColor: colors.mint300 },
  results: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pick: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.mint100 },
});
