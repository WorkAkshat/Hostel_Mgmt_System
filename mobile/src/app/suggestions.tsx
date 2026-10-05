import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Eye, Lightbulb, Send } from 'lucide-react-native';
import { suggestionsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { timeAgo } from '../lib/format';
import { colors } from '../ui/theme';
import { Avatar, Badge, Button, Card, Chips, Row, T } from '../ui/primitives';
import { Input } from '../ui/form';
import { Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear, Screen, Section } from '../ui/layout';

const STATUS: Record<string, { label: string; mine: string; tone: 'warning' | 'lilac' | 'success'; icon: any }> = {
  PENDING: { label: 'New', mine: 'Waiting to be read', tone: 'warning', icon: Check },
  READ: { label: 'Read', mine: 'Read by the warden', tone: 'lilac', icon: Eye },
  RESOLVED: { label: 'Done', mine: 'Acted on', tone: 'success', icon: CheckCheck },
};

export default function Suggestions() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <Inbox /> : <Compose />;
}

const Compose = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const mine = useData(['my-suggestions'], suggestionsApi.mine);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (text.trim().length < 10) return setError('Write at least a sentence so the warden understands the idea.');
    setBusy(true);
    try {
      await suggestionsApi.create(text.trim());
      setText('');
      toast.success('Suggestion sent', 'Thank you — the warden reads every one.');
      await qc.invalidateQueries({ queryKey: ['my-suggestions'] });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen title="Suggestions" subtitle="Ideas for the hostel" back tabBar={false} onRefresh={mine.refetch}>
      <Card tone="sun" style={{ gap: 12 }}>
        <Row align="flex-start"><Lightbulb size={20} color={colors.sun800} /><T v="small" c={colors.sun900} style={{ flex: 1 }}>Only the warden office sees this. Be specific — what should change, and why?</T></Row>
        <Input value={text} onChangeText={(v) => { setText(v.slice(0, 1000)); setError(null); }} multiline placeholder="e.g. Could the Wi-Fi router on floor 3 be moved near the corridor?" />
        {error && <ErrorBox message={error} />}
        <Button title="Send suggestion" icon={Send} onPress={send} loading={busy} full />
      </Card>
      <Section title="My suggestions">
        {mine.isLoading ? <Loading rows={2} h={70} /> : asList(mine.data).length === 0 ? (
          <T v="small" c={colors.text3}>What you send appears here, with whether the warden has read it.</T>
        ) : asList(mine.data).map((s: any, i: number) => {
          const st = STATUS[s.status] || STATUS.PENDING;
          return (
            <Appear key={s.id} i={i}>
              <Card style={{ gap: 8 }}>
                <T>{s.content}</T>
                <Row style={{ justifyContent: 'space-between' }}><T v="caption" c={colors.text3}>Sent {timeAgo(s.createdAt)}</T><Badge label={st.mine} tone={st.tone} icon={st.icon} /></Row>
              </Card>
            </Appear>
          );
        })}
      </Section>
    </Screen>
  );
};

const Inbox = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useData(['suggestions'], () => suggestionsApi.all());
  const [filter, setFilter] = useState<'PENDING' | 'READ' | 'RESOLVED' | 'all'>('PENDING');
  const list = asList(data);
  const shown = list.filter((s: any) => filter === 'all' || s.status === filter);

  const setStatus = async (id: string, status: string) => {
    try {
      await suggestionsApi.setStatus(id, status);
      await qc.invalidateQueries({ queryKey: ['suggestions'] });
    } catch (e: any) { toast.error('Could not update', e.message); }
  };

  return (
    <Screen title="Suggestions" subtitle={`${list.filter((s: any) => s.status === 'PENDING').length} new`} back tabBar={false} onRefresh={refetch}>
      <Chips value={filter} onChange={setFilter} options={[
        { value: 'PENDING', label: 'New', count: list.filter((s: any) => s.status === 'PENDING').length },
        { value: 'READ', label: 'Read' }, { value: 'RESOLVED', label: 'Done' }, { value: 'all', label: 'All' },
      ]} />
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty icon={Lightbulb} title="Nothing here" text="New ideas from students appear in this list." />
      ) : shown.map((s: any, i: number) => (
        <Appear key={s.id} i={i}>
          <Card style={{ gap: 10 }}>
            <Row>
              <Avatar name={s.student?.user?.name} size={34} />
              <View style={{ flex: 1 }}>
                <T v="title">{s.student?.user?.name || 'Student'}</T>
                <T v="caption" c={colors.text3}>{s.student?.room ? `Room ${s.student.room.roomNumber} · ` : ''}{timeAgo(s.createdAt)}</T>
              </View>
              <Badge label={(STATUS[s.status] || STATUS.PENDING).label} tone={(STATUS[s.status] || STATUS.PENDING).tone} />
            </Row>
            <T>{s.content}</T>
            <Row gap={8}>
              {s.status !== 'READ' && s.status !== 'RESOLVED' && <Button title="Mark read" icon={Eye} kind="secondary" small onPress={() => setStatus(s.id, 'READ')} style={{ flex: 1 }} />}
              {s.status !== 'RESOLVED' && <Button title="Done" icon={CheckCheck} kind="brand" small onPress={() => setStatus(s.id, 'RESOLVED')} style={{ flex: 1 }} />}
            </Row>
          </Card>
        </Appear>
      ))}
    </Screen>
  );
};
