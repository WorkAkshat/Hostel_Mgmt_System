import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Hammer, MessageSquareWarning, Phone, Plus, Send, Wrench } from 'lucide-react-native';
import { complaintsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { timeAgo } from '../lib/format';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, PRIORITIES } from '../lib/hostel';
import { colors } from '../ui/theme';
import { Badge, Button, Card, Chips, IconTile, Row, T } from '../ui/primitives';
import { Choices, Field, Input, SearchInput } from '../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear, Screen } from '../ui/layout';
import { Sheet } from '../ui/Sheet';
import { Linking } from 'react-native';

export default function Helpdesk() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const params = useLocalSearchParams<{ new?: string; category?: string }>();
  const { data, isLoading, error, refetch } = useData(admin ? ['complaints'] : ['my-complaints'], admin ? complaintsApi.all : complaintsApi.mine);
  const [filter, setFilter] = useState<'open' | 'IN_PROGRESS' | 'RESOLVED' | 'all'>('open');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<any>(null);

  useEffect(() => {
    if (params.new && !admin) setCreating(true);
    if (params.new) router.setParams({ new: undefined });
  }, [params.new, admin]);

  const list = useMemo(() => asList(data).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [data]);
  const counts = { open: list.filter((c: any) => c.status !== 'RESOLVED').length, IN_PROGRESS: list.filter((c: any) => c.status === 'IN_PROGRESS').length, RESOLVED: list.filter((c: any) => c.status === 'RESOLVED').length, all: list.length };
  const shown = list
    .filter((c: any) => (filter === 'all' ? true : filter === 'open' ? c.status !== 'RESOLVED' : c.status === filter))
    .filter((c: any) => !q.trim() || [c.category, c.description, c.student?.user?.name, c.student?.room?.roomNumber].some((v) => v && String(v).toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <Screen title={admin ? 'Complaints' : 'My complaints'} subtitle={admin ? `${counts.open} open · ${counts.RESOLVED} resolved` : 'Report and track problems'} back tabBar={false} onRefresh={refetch}
      right={!admin ? <Button title="New" icon={Plus} small onPress={() => setCreating(true)} /> : undefined}
    >
      {admin && <SearchInput value={q} onChange={setQ} placeholder="Search problem, resident or room" />}
      <Chips value={filter} onChange={setFilter} options={[
        { value: 'open', label: 'Open', count: counts.open },
        ...(admin ? [{ value: 'IN_PROGRESS' as const, label: 'In progress', count: counts.IN_PROGRESS }] : []),
        { value: 'RESOLVED', label: 'Resolved', count: counts.RESOLVED },
        { value: 'all', label: 'All' },
      ]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={filter === 'open' ? CircleCheck : Wrench} tone={filter === 'open' ? 'success' : 'mint'} title={filter === 'open' ? 'Nothing open' : 'No complaints here'} text={!admin ? 'Fan, tap, Wi-Fi, food — tell the warden and track it here.' : undefined}
          action={!admin ? <Button title="Report a problem" icon={Plus} onPress={() => setCreating(true)} /> : undefined} />
      ) : shown.map((c: any, i: number) => {
        const st = COMPLAINT_STATUS[c.status] || { label: c.status, tone: 'white' as const };
        const pr = PRIORITIES[c.priority];
        return (
          <Appear key={c.id} i={i}>
            <Card onPress={() => setViewing(c)} style={{ gap: 10 }}>
              <Row align="flex-start">
                <IconTile icon={c.status === 'RESOLVED' ? CircleCheck : Hammer} tone={c.status === 'RESOLVED' ? 'success' : c.priority === 'URGENT' ? 'danger' : 'peach'} />
                <View style={{ flex: 1 }}>
                  <Row gap={6}><T v="title">{c.category}</T>{pr && c.priority !== 'MEDIUM' && <Badge label={pr.label} tone={pr.tone} />}</Row>
                  <T v="small" c={colors.text2} numberOfLines={2}>{c.description}</T>
                </View>
                <Badge label={st.label} tone={st.tone} />
              </Row>
              <T v="caption" c={colors.text3}>{admin && c.student ? `${c.student.user?.name} · Room ${c.student.room?.roomNumber || '—'} · ` : ''}{timeAgo(c.createdAt)}</T>
              {c.wardenNotes ? <View style={{ backgroundColor: colors.bg, borderRadius: 10, padding: 10 }}><T v="small" c={colors.text2}>Warden: {c.wardenNotes}</T></View> : null}
            </Card>
          </Appear>
        );
      })}
      <NewComplaint open={creating} onClose={() => setCreating(false)} defaultCategory={params.category} />
      {admin && <UpdateComplaint complaint={viewing} onClose={() => setViewing(null)} />}
    </Screen>
  );
}

const NewComplaint = ({ open, onClose, defaultCategory }: { open: boolean; onClose: () => void; defaultCategory?: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [category, setCategory] = useState('Electrical');
  const [priority, setPriority] = useState('MEDIUM');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setCategory(defaultCategory || 'Electrical'); setPriority('MEDIUM'); setDesc(''); setError(null); } }, [open, defaultCategory]);

  const submit = async () => {
    if (desc.trim().length < 10) return setError('Describe the problem in a sentence or two.');
    setBusy(true);
    try {
      await complaintsApi.create({ category, priority, description: desc.trim() });
      toast.success('Complaint sent', 'The warden has been told.');
      await qc.invalidateQueries({ queryKey: ['my-complaints'] });
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Report a problem" footer={<Button title="Send complaint" icon={Send} onPress={submit} loading={busy} full />}>
      <Field label="What's it about?"><Choices pills value={category} onChange={setCategory} options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: c }))} /></Field>
      <Field label="How urgent?"><Choices value={priority} onChange={setPriority} columns={4} options={Object.entries(PRIORITIES).map(([value, p]) => ({ value, label: p.label }))} /></Field>
      <Field label="Describe it" required hint="Where it is and what's wrong">
        <Input value={desc} onChangeText={(v) => { setDesc(v.slice(0, 600)); setError(null); }} multiline placeholder="e.g. Ceiling fan in my room makes a loud noise and stops after a few minutes." />
      </Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const UpdateComplaint = ({ complaint, onClose }: { complaint: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('IN_PROGRESS');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (complaint) { setStatus(complaint.status === 'PENDING' ? 'IN_PROGRESS' : complaint.status); setNote(complaint.wardenNotes || ''); } }, [complaint]);

  const save = async () => {
    setBusy(true);
    try {
      await complaintsApi.update(complaint.id, status, note.trim() || undefined);
      toast.success('Complaint updated', 'The student gets a notification.');
      await qc.invalidateQueries({ queryKey: ['complaints'] });
      onClose();
    } catch (e: any) { toast.error('Could not update', e.message); } finally { setBusy(false); }
  };

  const phone = complaint?.student?.phoneNumber;
  return (
    <Sheet open={!!complaint} onClose={onClose} title={complaint?.category} subtitle={complaint ? `${complaint.student?.user?.name || ''} · Room ${complaint.student?.room?.roomNumber || '—'} · ${timeAgo(complaint.createdAt)}` : ''}
      footer={<Button title="Save update" icon={MessageSquareWarning} onPress={save} loading={busy} full />}
    >
      {complaint && (
        <>
          <Card style={{ backgroundColor: colors.bg }}><T>{complaint.description}</T></Card>
          {phone ? <Button title={`Call ${complaint.student?.user?.name?.split(' ')[0]}`} icon={Phone} kind="secondary" onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
          <Field label="Status"><Choices value={status} onChange={setStatus} columns={3} options={Object.entries(COMPLAINT_STATUS).map(([value, s]) => ({ value, label: s.label }))} /></Field>
          <Field label="Note for the student" hint="e.g. Electrician visiting tomorrow 11 AM"><Input value={note} onChangeText={setNote} multiline /></Field>
        </>
      )}
    </Sheet>
  );
};
