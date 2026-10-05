import { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, CircleCheck, HandCoins, House, IdCard, Moon, Phone, ShieldCheck, Siren, UserCheck, UserPen, X } from 'lucide-react-native';
import { authApi, leavesApi, paymentsApi, roomsApi, studentsApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, fmtDateTime, isoDay, rupees, timeAgo } from '../../lib/format';
import { DOCUMENT_TYPES, LEAVE_TYPES, priceFor } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, IconButton, Chips, Divider, Row, T } from '../../ui/primitives';
import { Field, Input, Picker } from '../../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, Screen } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';
import Bell from '../../features/Bell';
import { TileTabs } from '../../ui/blocks';
import { FloorChips, onFloor, useFloor } from '../../features/floor';

type Tab = 'leaves' | 'payments' | 'registrations' | 'profile' | 'documents';
const FIELD_LABEL: Record<string, string> = { phoneNumber: 'Phone', fatherName: "Father's name", parentContact: 'Parent phone', permanentAddress: 'Address', state: 'State', pincode: 'PIN', coachingCollege: 'College' };

export default function Requests() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>('leaves');
  useEffect(() => { if (params.tab) { setTab(params.tab); router.setParams({ tab: undefined }); } }, [params.tab]);
  const { floor } = useFloor();

  const leaves = useData(['leaves'], leavesApi.all);
  const regs = useData(['pending-users'], authApi.pending);
  const reqs = useData(['profile-requests'], studentsApi.profileRequests);
  const docs = useData(['documents', 'PENDING'], () => studentsApi.documents('PENDING'));
  const pays = useData(['payment-claims', 'PENDING'], () => paymentsApi.claims('PENDING'));

  const pendingLeaves = asList(leaves.data).filter((l: any) => l.status === 'PENDING' && onFloor(l.student?.room, floor)).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const counts = { leaves: pendingLeaves.length, registrations: asList(regs.data).length, profile: asList(reqs.data).filter((r: any) => r.status === 'PENDING').length, documents: asList(docs.data).length, payments: asList(pays.data).length };

  return (
    <Screen title="Requests" subtitle="Waiting for your decision" right={<Bell />} onRefresh={() => Promise.all([leaves.refetch(), regs.refetch(), reqs.refetch(), docs.refetch(), pays.refetch()])}>
      <TileTabs value={tab} onChange={setTab} items={[
        { value: 'leaves', label: 'Leaves', icon: CalendarDays, tone: 'lilac', count: counts.leaves },
        { value: 'payments', label: 'Payments', icon: HandCoins, tone: 'sun', count: counts.payments },
        { value: 'registrations', label: 'Joiners', icon: UserCheck, tone: 'mint', count: counts.registrations },
        { value: 'profile', label: 'Profile', icon: UserPen, tone: 'peach', count: counts.profile },
        { value: 'documents', label: 'ID proof', icon: IdCard, tone: 'sun', count: counts.documents },
      ]} />
      {tab === 'leaves' && <><FloorChips /><LeaveList list={pendingLeaves} loading={leaves.isLoading} error={leaves.error} retry={leaves.refetch} /></>}
      {tab === 'payments' && <PaymentClaims list={asList(pays.data)} loading={pays.isLoading} />}
      {tab === 'registrations' && <Registrations list={asList(regs.data)} loading={regs.isLoading} />}
      {tab === 'profile' && <ProfileRequests list={asList(reqs.data).filter((r: any) => r.status === 'PENDING')} loading={reqs.isLoading} />}
      {tab === 'documents' && <Documents list={asList(docs.data)} loading={docs.isLoading} />}
    </Screen>
  );
}

// ── Leaves ──
const LeaveList = ({ list, loading, error, retry }: { list: any[]; loading: boolean; error: unknown; retry: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [note, setNote] = useState('');

  const decide = async (l: any, status: 'APPROVED' | 'REJECTED', comments = '') => {
    setBusy(l.id + status);
    try {
      await leavesApi.decide(l.id, status, comments);
      toast.success(status === 'APPROVED' ? 'Leave approved' : 'Leave rejected', `${l.student?.user?.name} gets a notification.`);
      await qc.invalidateQueries({ queryKey: ['leaves'] });
      setRejecting(null);
    } catch (e: any) { toast.error('Could not update', e.message); } finally { setBusy(null); }
  };

  if (error) return <ErrorBox message={(error as Error).message} onRetry={retry} />;
  if (loading) return <Loading />;
  if (!list.length) return <Empty icon={CircleCheck} tone="success" title="No leave requests" text="New requests from students appear here." />;
  return (
    <>
      {list.map((l, i) => {
        const soon = new Date(l.startDate).getTime() - Date.now() < 12 * 3600000;
        return (
          <Appear key={l.id} i={i}>
            <Card style={{ gap: 12 }}>
              <Row>
                <Avatar name={l.student?.user?.name} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T v="title" numberOfLines={1}>{l.student?.user?.name}</T>
                  <T v="caption" c={colors.text3} numberOfLines={1}>Room {l.student?.room?.roomNumber || '—'} · applied {timeAgo(l.createdAt)}</T>
                  <View style={{ marginTop: 2 }}><Badge label={LEAVE_TYPES[l.type] || 'Leave'} tone={l.type === 'EMERGENCY' ? 'danger' : l.type === 'NIGHT_OUT' ? 'lilac' : 'mint'} icon={l.type === 'EMERGENCY' ? Siren : l.type === 'NIGHT_OUT' ? Moon : House} /></View>
                </View>
              </Row>
              <T c={colors.text2}>{l.reason}</T>
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: soon ? colors.cream100 : colors.bg, borderRadius: 12, padding: 10 }}>
                <View style={{ flex: 1 }}><T v="caption" c={colors.text3}>Leaves</T><T v="small" w="semibold">{fmtDateTime(l.startDate)}</T></View>
                <View style={{ flex: 1 }}><T v="caption" c={colors.text3}>Back by</T><T v="small" w="semibold">{fmtDateTime(l.endDate)}</T></View>
              </View>
              <Row gap={8}>
                {l.student?.parentContact ? <IconButton icon={Phone} label="Call parent" tone="white" size={40} onPress={() => Linking.openURL(`tel:${l.student.parentContact}`)} /> : null}
                <Button title="Reject" icon={X} kind="danger" small onPress={() => { setNote(''); setRejecting(l); }} style={{ flex: 1 }} />
                <Button title="Approve" icon={Check} kind="brand" small loading={busy === l.id + 'APPROVED'} onPress={() => decide(l, 'APPROVED')} style={{ flex: 1 }} />
              </Row>
            </Card>
          </Appear>
        );
      })}
      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} title="Reject leave" subtitle={rejecting ? `${rejecting.student?.user?.name} · ${LEAVE_TYPES[rejecting.type] || 'Leave'}` : ''}
        footer={<Button title="Reject leave" icon={X} kind="danger" loading={!!busy} onPress={() => decide(rejecting, 'REJECTED', note.trim())} full />}
      >
        <Field label="Reason for the student" hint="They see this in the app"><Input value={note} onChangeText={setNote} multiline placeholder="e.g. Exams are on — please stay in" /></Field>
      </Sheet>
    </>
  );
};

// ── "I have paid" from residents: check the bank / UPI app, then confirm ──
const PaymentClaims = ({ list, loading }: { list: any[]; loading: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [reason, setReason] = useState('');
  const refresh = () => Promise.all(['payment-claims', 'invoices', 'demand-notes'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const approve = async (c: any) => {
    setBusy(c.id);
    try {
      await paymentsApi.approve(c.id);
      toast.success('Payment confirmed', `${c.student?.user?.name}'s bill is now paid.`);
      await refresh();
    } catch (e: any) { toast.error('Could not confirm', e.message); } finally { setBusy(null); }
  };
  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    try {
      await paymentsApi.reject(rejecting.id, reason.trim());
      toast.success('Payment rejected', 'The resident sees your reason.');
      setRejecting(null);
      await refresh();
    } catch (e: any) { toast.error('Could not reject', e.message); } finally { setBusy(null); }
  };
  if (loading) return <Loading />;
  if (!list.length) return <Empty icon={HandCoins} tone="success" title="No payments to check" text="When a resident pays by UPI or bank and sends the transaction ID, it shows here." />;
  return (
    <>
      {list.map((c, i) => (
        <Appear key={c.id} i={i}>
          <Card style={{ gap: 12 }}>
            <Row>
              <Avatar name={c.student?.user?.name} tone="sun" />
              <View style={{ flex: 1 }}>
                <T v="title">{c.student?.user?.name}</T>
                <T v="caption" c={colors.text3}>Room {c.student?.room?.roomNumber || '—'} · sent {timeAgo(c.createdAt)}</T>
              </View>
              <T v="h2">{rupees(c.amount)}</T>
            </Row>
            <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 10, gap: 4 }}>
              <Row><T v="small" c={colors.text3} style={{ width: 92 }}>For</T><T v="small" w="semibold" style={{ flex: 1 }}>{c.billTitle}</T></Row>
              <Row><T v="small" c={colors.text3} style={{ width: 92 }}>Paid by</T><T v="small" w="semibold" style={{ flex: 1 }}>{c.method} · {fmtDate(c.paidOn, { year: 'numeric' })}</T></Row>
              {c.reference ? <Row><T v="small" c={colors.text3} style={{ width: 92 }}>UTR / ref</T><T v="small" w="bold" selectable style={{ flex: 1 }}>{c.reference}</T></Row> : null}
            </View>
            <T v="caption" c={colors.text3}>Check this UTR in the bank statement or UPI app before confirming.</T>
            <Row gap={8} style={{ justifyContent: 'flex-end' }}>
              <Button title="Reject" icon={X} kind="danger" small onPress={() => { setReason(''); setRejecting(c); }} style={{ flex: 1 }} />
              <Button title="Confirm paid" icon={Check} kind="brand" small loading={busy === c.id} onPress={() => approve(c)} style={{ flex: 1.3 }} />
            </Row>
          </Card>
        </Appear>
      ))}
      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} title="Reject payment" subtitle={rejecting ? `${rejecting.student?.user?.name} · ${rupees(rejecting.amount)}` : ''}
        footer={<Button title="Reject payment" icon={X} kind="danger" loading={!!busy} onPress={reject} full />}
      >
        <Field label="Reason for the resident" hint="They see this on the bill and can send it again"><Input value={reason} onChangeText={setReason} multiline placeholder="e.g. No payment with this UTR in the bank statement" /></Field>
      </Sheet>
    </>
  );
};

// ── Registrations ──
const Registrations = ({ list, loading }: { list: any[]; loading: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const rooms = useData(['rooms'], roomsApi.all);
  const [viewing, setViewing] = useState<any>(null);
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const roomItems = useMemo(() => asList(rooms.data)
    .filter((r: any) => r.status !== 'MAINTENANCE' && (r.students?.length || 0) < (r.sharingType || r.capacity || 0))
    .sort((a: any, b: any) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }))
    .map((r: any) => ({ value: r.id, label: `Room ${r.roomNumber} · Floor ${r.floorNumber}`, sub: `${(r.sharingType || r.capacity) - (r.students?.length || 0)} bed(s) free · ${priceFor(r.sharingType).label}${r.isAc ? ' · AC' : ''}` })), [rooms.data]);

  if (loading) return <Loading />;
  if (!list.length) return <Empty icon={UserCheck} tone="success" title="No new registrations" text="When someone registers on the website, they show up here." />;

  const requested = (u: any) => String(u.role || '').replace('PENDING_', '');
  const approve = async () => {
    const u = viewing;
    const s = u.student || {};
    const role = requested(u);
    if (role === 'STUDENT' && !roomId) return toast.error('Choose a room', 'Pick a room with a free bed first.');
    setBusy('approve');
    try {
      await authApi.approve(u.id, {
        role, roomId: role === 'STUDENT' ? roomId : undefined,
        phoneNumber: s.phoneNumber || u.staff?.phoneNumber || '', parentContact: s.parentContact || '', fatherName: s.fatherName || '', motherName: s.motherName || '',
        motherContact: s.motherContact || '', siblingContact: s.siblingContact || '', emergencyContact: s.emergencyContact || '', bloodGroup: s.bloodGroup || '',
        maritalStatus: s.maritalStatus || 'Unmarried', dob: s.dob ? isoDay(new Date(s.dob)) : '', dateOfJoining: s.dateOfJoining ? isoDay(new Date(s.dateOfJoining)) : isoDay(),
        permanentAddress: s.permanentAddress || '', state: s.state || '', pincode: s.pincode || '', coachingCollege: s.coachingCollege || '',
        department: u.staff?.department || 'Warden', designation: u.staff?.designation || '',
      });
      toast.success(`${u.name} approved`, role === 'STUDENT' ? 'Room allotted — they can sign in now.' : 'They can sign in now.');
      await Promise.all([qc.invalidateQueries({ queryKey: ['pending-users'] }), qc.invalidateQueries({ queryKey: ['rooms'] }), qc.invalidateQueries({ queryKey: ['students'] })]);
      setViewing(null);
    } catch (e: any) { toast.error('Could not approve', e.message); } finally { setBusy(null); }
  };
  const reject = async () => {
    setBusy('reject');
    try {
      await authApi.reject(viewing.id);
      toast.success('Registration rejected');
      await qc.invalidateQueries({ queryKey: ['pending-users'] });
      setViewing(null);
    } catch (e: any) { toast.error('Could not reject', e.message); } finally { setBusy(null); }
  };

  const s = viewing?.student || {};
  return (
    <>
      {list.map((u, i) => (
        <Appear key={u.id} i={i}>
          <Card onPress={() => { setRoomId(''); setViewing(u); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={u.name} tone="sun" />
            <View style={{ flex: 1 }}>
              <T v="title">{u.name}</T>
              <T v="caption" c={colors.text3} numberOfLines={1}>{u.email} · {timeAgo(u.createdAt)}</T>
            </View>
            <Badge label={requested(u) === 'STUDENT' ? 'Student' : requested(u) === 'STAFF' ? 'Staff' : 'Warden'} tone="mint" />
          </Card>
        </Appear>
      ))}
      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} subtitle={viewing ? `${viewing.email} · registered ${timeAgo(viewing.createdAt)}` : ''}
        footer={
          <Row gap={10}>
            <Button title="Reject" icon={X} kind="danger" loading={busy === 'reject'} onPress={reject} style={{ flex: 1 }} />
            <Button title="Approve" icon={Check} kind="brand" loading={busy === 'approve'} onPress={approve} style={{ flex: 2 }} />
          </Row>
        }
      >
        {viewing && (
          <>
            <Card style={{ gap: 2, paddingVertical: 6 }}>
              {[
                ['Phone', s.phoneNumber || viewing.staff?.phoneNumber], ["Father's name", s.fatherName], ['Parent phone', s.parentContact],
                ['College / company', s.coachingCollege], ['Address', [s.permanentAddress, s.state, s.pincode].filter(Boolean).join(', ')], ['Date of birth', s.dob ? fmtDate(s.dob, { year: 'numeric' }) : ''],
              ].map(([k, v], idx) => (
                <View key={k as string}>
                  {idx > 0 && <Divider />}
                  <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}><T v="small" c={colors.text3}>{k}</T><T v="small" w="semibold" style={{ flex: 1, textAlign: 'right' }}>{v || '—'}</T></Row>
                </View>
              ))}
            </Card>
            {requested(viewing) === 'STUDENT' && (
              <Field label="Give a room" required hint={roomItems.length ? `${roomItems.length} rooms have a free bed` : 'No free beds right now'}>
                <Picker label="Choose a room" value={roomId} onChange={setRoomId} items={roomItems} searchable placeholder="Choose a room with a free bed" />
              </Field>
            )}
            <T v="caption" c={colors.text3}>For the full admission form (blood group, marital status…), approve from the website.</T>
          </>
        )}
      </Sheet>
    </>
  );
};

// ── Profile change requests ──
const ProfileRequests = ({ list, loading }: { list: any[]; loading: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (r: any, ok: boolean) => {
    setBusy(r.id + ok);
    try {
      if (ok) await studentsApi.approveProfileRequest(r.id); else await studentsApi.rejectProfileRequest(r.id);
      toast.success(ok ? 'Changes saved' : 'Request rejected', `${r.studentName} is notified.`);
      await qc.invalidateQueries({ queryKey: ['profile-requests'] });
    } catch (e: any) { toast.error('Could not update', e.message); } finally { setBusy(null); }
  };
  if (loading) return <Loading />;
  if (!list.length) return <Empty icon={UserPen} tone="success" title="No profile changes" text="When a student asks to update details, it shows here." />;
  return (
    <>
      {list.map((r, i) => (
        <Appear key={r.id} i={i}>
          <Card style={{ gap: 10 }}>
            <Row>
              <Avatar name={r.studentName} />
              <View style={{ flex: 1, minWidth: 0 }}><T v="title" numberOfLines={1}>{r.studentName}</T><T v="caption" c={colors.text3} numberOfLines={1}>{r.studentRoll} · {timeAgo(r.createdAt)}</T></View>
            </Row>
            <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 10, gap: 4 }}>
              {Object.entries(r.requestedChanges || {}).filter(([, v]) => v).map(([k, v]) => (
                <Row key={k} align="flex-start"><T v="small" c={colors.text3} style={{ width: 96 }}>{FIELD_LABEL[k] || k}</T><T v="small" w="semibold" style={{ flex: 1 }}>{String(v)}</T></Row>
              ))}
            </View>
            <Row gap={8} style={{ justifyContent: 'flex-end' }}>
              <Button title="Reject" icon={X} kind="danger" small loading={busy === r.id + false} onPress={() => act(r, false)} style={{ flex: 1 }} />
              <Button title="Approve" icon={Check} kind="brand" small loading={busy === r.id + true} onPress={() => act(r, true)} style={{ flex: 1 }} />
            </Row>
          </Card>
        </Appear>
      ))}
    </>
  );
};

// ── ID documents ──
const Documents = ({ list, loading }: { list: any[]; loading: boolean }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (d: any, status: 'VERIFIED' | 'REJECTED') => {
    setBusy(d.id + status);
    try {
      await studentsApi.verifyDocument(d.id, status);
      toast.success(status === 'VERIFIED' ? 'Document verified' : 'Document rejected');
      await qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (e: any) { toast.error('Could not update', e.message); } finally { setBusy(null); }
  };
  if (loading) return <Loading />;
  if (!list.length) return <Empty icon={ShieldCheck} tone="success" title="Nothing to verify" text="ID documents students add appear here." />;
  return (
    <>
      {list.map((d, i) => (
        <Appear key={d.id} i={i}>
          <Card style={{ gap: 10 }}>
            <Row>
              <Avatar name={d.student?.user?.name} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T v="title" numberOfLines={1}>{d.student?.user?.name || 'Student'}</T>
                <T v="caption" c={colors.text3} numberOfLines={1}>Room {d.student?.room?.roomNumber || '—'} · {d.student?.rollNumber}</T>
                <View style={{ marginTop: 2 }}><Badge label={DOCUMENT_TYPES[d.docType] || d.docType} tone="mint" icon={IdCard} /></View>
              </View>
            </Row>
            <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 12 }}><T v="h2" style={{ letterSpacing: 2 }}>{d.documentNumber}</T><T v="caption" c={colors.text3}>Check against the original card</T></View>
            <Row gap={8} style={{ justifyContent: 'flex-end' }}>
              <Button title="Reject" icon={X} kind="danger" small loading={busy === d.id + 'REJECTED'} onPress={() => act(d, 'REJECTED')} style={{ flex: 1 }} />
              <Button title="Verify" icon={ShieldCheck} kind="brand" small loading={busy === d.id + 'VERIFIED'} onPress={() => act(d, 'VERIFIED')} style={{ flex: 1 }} />
            </Row>
          </Card>
        </Appear>
      ))}
    </>
  );
};

