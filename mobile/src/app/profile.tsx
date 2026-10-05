import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Clock, FilePen, IdCard, ShieldCheck, Upload, XCircle } from 'lucide-react-native';
import { dashboardApi, studentsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { fmtDate, timeAgo } from '../lib/format';
import { DOCUMENT_TYPES, STUDENT_STATUS, priceFor } from '../lib/hostel';
import { colors } from '../ui/theme';
import { Avatar, Badge, Button, Card, Divider, IconTile, Row, T } from '../ui/primitives';
import { Choices, Field, Input, digits } from '../ui/form';
import { ErrorBox, Loading, useToast } from '../ui/feedback';
import { Screen, Section } from '../ui/layout';
import { Sheet } from '../ui/Sheet';
import ProfileHero from '../features/ProfileHero';

const EDITABLE = [
  { key: 'phoneNumber', label: 'Your phone', kind: 'phone' },
  { key: 'fatherName', label: "Father's name" },
  { key: 'parentContact', label: 'Parent phone', kind: 'phone' },
  { key: 'coachingCollege', label: 'Company / college' },
  { key: 'permanentAddress', label: 'Home address' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'PIN code', kind: 'pin' },
] as const;
const LABEL: Record<string, string> = Object.fromEntries(EDITABLE.map((f) => [f.key, f.label]));
const REQ = { PENDING: { label: 'Waiting for warden', tone: 'warning' as const, icon: Clock }, APPROVED: { label: 'Approved & saved', tone: 'success' as const, icon: CircleCheck }, REJECTED: { label: 'Not approved', tone: 'danger' as const, icon: XCircle } };
const DOC = { PENDING: { label: 'Being verified', tone: 'warning' as const }, VERIFIED: { label: 'Verified', tone: 'success' as const }, REJECTED: { label: 'Rejected — add again', tone: 'danger' as const } };

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={{ paddingVertical: 10, gap: 2 }}>
    <T v="caption" c={colors.text3}>{label}</T>
    <T v="title" c={value ? colors.text : colors.text3} w={value ? 'semibold' : 'regular'}>{value || 'Not added'}</T>
  </View>
);

export default function Profile() {
  const { user } = useAuth();
  const dash = useData(['dashboard'], dashboardApi.get, { enabled: !user?.studentDetails?.id });
  const id = user?.studentDetails?.id || dash.data?.profile?.id;
  const student = useData(['student', id], () => studentsApi.byId(id), { enabled: !!id });
  const requests = useData(['my-profile-requests'], studentsApi.myProfileRequests);
  const docs = useData(['my-documents', id], () => studentsApi.studentDocuments(id), { enabled: !!id });
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);

  const s = student.data;
  const pending = asList(requests.data).find((r: any) => r.status === 'PENDING');
  const st = s ? STUDENT_STATUS[s.status] || { label: s.status, tone: 'white' as const } : null;

  return (
    <Screen title="My profile" back tabBar={false} onRefresh={() => Promise.all([student.refetch(), requests.refetch(), docs.refetch()])}>
      {student.error ? <ErrorBox message={(student.error as Error).message} onRetry={student.refetch} /> : !s ? <Loading rows={3} h={140} /> : (
        <>
          <ProfileHero
            name={s.user?.name}
            avatar={s.profilePic}
            line1={s.rollNumber}
            line2={[s.user?.email, s.dateOfJoining ? `Joined ${fmtDate(s.dateOfJoining, { year: 'numeric' })}` : ''].filter(Boolean).join(' · ')}
            pill={st?.label}
            cells={[{ k: 'Room', v: String(s.room?.roomNumber || '—') }, { k: 'Bed', v: s.bedId ? String(s.bedId).split('-').pop() || '—' : '—' }, { k: 'Floor', v: String(s.room?.floorNumber || '—') }]}
          />

          {pending && (
            <Card tone="sun" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Clock size={18} color={colors.sun800} />
              <T v="small" c={colors.sun900} style={{ flex: 1 }}>Your change request from {timeAgo(pending.createdAt)} is waiting for the warden.</T>
            </Card>
          )}

          <Section title="Contact & family" action={pending ? undefined : 'Request change'} onAction={() => setEditing(true)}>
            <Card padded style={{ paddingVertical: 4 }}>
              <Info label="Your phone" value={s.phoneNumber} /><Divider />
              <Info label="Father's name" value={s.fatherName} /><Divider />
              <Info label="Parent phone" value={s.parentContact} /><Divider />
              <Info label="Mother" value={[s.motherName, s.motherContact].filter(Boolean).join(' · ')} /><Divider />
              <Info label="Emergency contact" value={s.emergencyContact} />
            </Card>
          </Section>

          <Section title="Home & college">
            <Card padded style={{ paddingVertical: 4 }}>
              <Info label="Home address" value={[s.permanentAddress, s.state, s.pincode].filter(Boolean).join(', ')} /><Divider />
              <Info label="Company / college" value={s.coachingCollege} /><Divider />
              <Info label="Blood group" value={s.bloodGroup} /><Divider />
              <Info label="Monthly fee" value={s.room ? `₹${priceFor(s.room.sharingType).total.toLocaleString('en-IN')} · ${priceFor(s.room.sharingType).label}` : ''} />
            </Card>
          </Section>

          <Section title="ID documents" action="Add" onAction={() => setAddingDoc(true)}>
            {asList(docs.data).length === 0 ? (
              <Card><T v="small" c={colors.text2}>No ID added yet. The hostel needs one government ID for your file.</T></Card>
            ) : asList(docs.data).map((d: any) => (
              <Card key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconTile icon={d.status === 'VERIFIED' ? ShieldCheck : IdCard} tone={d.status === 'VERIFIED' ? 'success' : 'mint'} />
                <View style={{ flex: 1 }}><T v="title">{DOCUMENT_TYPES[d.docType] || d.docType}</T><T v="caption" c={colors.text3}>•••• {String(d.documentNumber).slice(-4)}</T></View>
                <Badge label={(DOC as any)[d.status]?.label || d.status} tone={(DOC as any)[d.status]?.tone || 'white'} />
              </Card>
            ))}
          </Section>

          {asList(requests.data).length > 0 && (
            <Section title="My change requests">
              {asList(requests.data).slice(0, 5).map((r: any) => {
                const rs = (REQ as any)[r.status] || REQ.PENDING;
                return (
                  <Card key={r.id} style={{ gap: 6 }}>
                    <Row style={{ justifyContent: 'space-between' }}><T v="caption" c={colors.text3}>{timeAgo(r.createdAt)}</T><Badge label={rs.label} tone={rs.tone} icon={rs.icon} /></Row>
                    {Object.entries(r.requestedChanges || {}).filter(([, v]) => v).map(([k, v]) => <T key={k} v="small"><T v="small" c={colors.text3}>{LABEL[k] || k}: </T>{String(v)}</T>)}
                  </Card>
                );
              })}
            </Section>
          )}
          <T v="caption" c={colors.text3} center>Name, roll number and room are managed by the warden office.</T>
        </>
      )}
      <ChangeSheet open={editing} student={s} onClose={() => setEditing(false)} />
      <DocSheet open={addingDoc} onClose={() => setAddingDoc(false)} studentId={id} />
    </Screen>
  );
}

const ChangeSheet = ({ open, student, onClose }: { open: boolean; student: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open && student) { setForm(Object.fromEntries(EDITABLE.map((f) => [f.key, student[f.key] || '']))); setError(null); }
  }, [open, student]);
  const changed = useMemo(() => EDITABLE.filter((f) => String(form[f.key] ?? '').trim() !== String(student?.[f.key] ?? '').trim()), [form, student]);

  const submit = async () => {
    if (!changed.length) return setError('Change at least one detail first.');
    for (const f of changed) {
      const v = String(form[f.key]).trim();
      if (!v) return setError(`${f.label} cannot be empty.`);
      if ((f as any).kind === 'phone' && v.length !== 10) return setError(`${f.label} must be 10 digits.`);
      if ((f as any).kind === 'pin' && v.length !== 6) return setError('PIN code must be 6 digits.');
    }
    setBusy(true);
    try {
      await studentsApi.requestProfileChange(Object.fromEntries(changed.map((f) => [f.key, String(form[f.key]).trim()])));
      toast.success('Request sent', 'You will be notified when the warden decides.');
      await qc.invalidateQueries({ queryKey: ['my-profile-requests'] });
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Request a change" subtitle="The warden checks it before it's saved."
      footer={<Button title={changed.length ? `Send ${changed.length} change${changed.length > 1 ? 's' : ''}` : 'Nothing changed yet'} icon={FilePen} onPress={submit} loading={busy} disabled={!changed.length} full />}
    >
      {EDITABLE.map((f) => (
        <Field key={f.key} label={f.label} hint={changed.some((c) => c.key === f.key) ? 'Changed' : undefined}>
          <Input
            value={form[f.key] || ''}
            keyboardType={(f as any).kind ? 'number-pad' : 'default'}
            onChangeText={(v) => { setError(null); setForm((x) => ({ ...x, [f.key]: (f as any).kind === 'phone' ? digits(v, 10) : (f as any).kind === 'pin' ? digits(v, 6) : v })); }}
            multiline={f.key === 'permanentAddress'}
          />
        </Field>
      ))}
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const DocSheet = ({ open, onClose, studentId }: { open: boolean; onClose: () => void; studentId?: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState('AADHAAR');
  const [num, setNum] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setType('AADHAAR'); setNum(''); setError(null); } }, [open]);
  const clean = num.replace(/\s/g, '').toUpperCase();
  const submit = async () => {
    if (type === 'AADHAAR' && !/^\d{12}$/.test(clean)) return setError('Aadhaar number has 12 digits.');
    if (type === 'PAN' && !/^[A-Z]{5}\d{4}[A-Z]$/.test(clean)) return setError('PAN looks like ABCDE1234F.');
    if (type === 'PASSPORT' && !/^[A-Z]\d{7}$/.test(clean)) return setError('Passport number looks like A1234567.');
    setBusy(true);
    try {
      await studentsApi.uploadDocument(type, clean);
      toast.success('Submitted', 'The warden will verify it.');
      await qc.invalidateQueries({ queryKey: ['my-documents', studentId] });
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Add an ID document" subtitle="Adding the same type again replaces the old one."
      footer={<Button title="Submit for verification" icon={Upload} onPress={submit} loading={busy} full />}
    >
      <Field label="Document"><Choices value={type} onChange={(v) => { setType(v); setError(null); }} columns={3} options={Object.entries(DOCUMENT_TYPES).map(([value, label]) => ({ value, label }))} /></Field>
      <Field label="Number" required><Input value={num} onChangeText={(v) => { setNum(v.slice(0, 16)); setError(null); }} autoCapitalize="characters" placeholder={type === 'AADHAAR' ? '12 digits' : type === 'PAN' ? 'ABCDE1234F' : 'A1234567'} /></Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

