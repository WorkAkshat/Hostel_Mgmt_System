import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Send, Trash2, Vote } from 'lucide-react-native';
import { noticesApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { timeAgo } from '../lib/format';
import { colors } from '../ui/theme';
import { Badge, Button, Card, IconButton, IconTile, Row, T } from '../ui/primitives';
import { Choices, Field, Input } from '../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear, ListRow, Screen } from '../ui/layout';
import { Sheet } from '../ui/Sheet';
import PollNudge from '../features/PollNudge';
import { go } from '../lib/nav';

const CATEGORIES = [{ value: 'GENERAL', label: 'General' }, { value: 'MESS', label: 'Mess' }, { value: 'URGENT', label: 'Urgent' }];
const AUDIENCE: { value: 'ALL' | 'STUDENTS' | 'STAFF'; label: string }[] = [{ value: 'ALL', label: 'Everyone' }, { value: 'STUDENTS', label: 'Residents' }, { value: 'STAFF', label: 'Staff' }];

export default function Notices() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToast();
  const notices = useData(['notices'], () => noticesApi.all());
  const [posting, setPosting] = useState(false);
  const [removing, setRemoving] = useState<any>(null);
  // "Announce" shortcut from the warden's home opens the form straight away
  const params = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (params.new) { if (admin) setPosting(true); router.setParams({ new: undefined }); } }, [params.new, admin]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['notices'] });

  return (
    <Screen title="Announcements" subtitle={admin ? 'Tell everyone at once' : 'News from the warden'} back tabBar={false} onRefresh={notices.refetch}
      right={admin ? <Button title="New" icon={Plus} small onPress={() => setPosting(true)} /> : undefined}
    >
      {admin ? <ListRow icon={Vote} tone="lilac" title="Polls" sub="Ask a question — everyone votes in the app" onPress={() => go('/polls')} /> : <PollNudge />}
      {notices.error ? <ErrorBox message={(notices.error as Error).message} onRetry={notices.refetch} /> : notices.isLoading ? <Loading /> : asList(notices.data).length === 0 ? (
          <Empty icon={Megaphone} title="No announcements yet" text={admin ? 'Post one — every resident sees it on their home screen.' : 'News from the warden appears here and on your home screen.'} action={admin ? <Button title="Make an announcement" icon={Plus} onPress={() => setPosting(true)} /> : undefined} />
        ) : asList(notices.data).map((n: any, i: number) => (
          <Appear key={n.id} i={i}>
            <Card style={{ gap: 8 }}>
              <Row align="flex-start">
                <IconTile icon={Megaphone} tone={n.category === 'URGENT' ? 'danger' : n.category === 'MESS' ? 'peach' : 'mint'} />
                <View style={{ flex: 1 }}>
                  <T v="title">{n.title}</T>
                  <T v="caption" c={colors.text3}>{n.postedBy ? `${n.postedBy} · ` : ''}{timeAgo(n.createdAt)}</T>
                </View>
                {n.category && n.category !== 'GENERAL' ? <Badge label={n.category === 'MESS' ? 'Mess' : n.category === 'URGENT' ? 'Urgent' : n.category} tone={n.category === 'URGENT' ? 'danger' : 'peach'} /> : null}
                {admin && n.target && n.target !== 'ALL' ? <Badge label={n.target === 'STAFF' ? 'Staff' : 'Residents'} tone="lilac" /> : null}
                {admin && <IconButton icon={Trash2} label="Delete notice" tone="danger" size={34} onPress={() => setRemoving(n)} />}
              </Row>
              <T c={colors.text2}>{n.content}</T>
            </Card>
          </Appear>
        ))}
      {admin && <PostNotice open={posting} onClose={() => setPosting(false)} />}
      <Confirm open={!!removing} title="Delete this notice?" message="Residents will no longer see it." confirmLabel="Delete" danger
        onConfirm={async () => {
          try {
            await noticesApi.remove(removing.id);
            await refresh();
          } catch (e: any) { toast.error('Could not delete', e.message); throw e; }
        }}
        onClose={() => setRemoving(null)} />
    </Screen>
  );
}

const PostNotice = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [target, setTarget] = useState<'ALL' | 'STUDENTS' | 'STAFF'>('ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (title.trim().length < 3 || content.trim().length < 5) return setError('Add a short title and the message.');
    setBusy(true);
    try {
      await noticesApi.create({ title: title.trim(), content: content.trim(), category, target });
      toast.success('Announcement posted', target === 'STAFF' ? 'Staff see it now.' : 'Residents see it on their home screen now.');
      await qc.invalidateQueries({ queryKey: ['notices'] });
      setTitle(''); setContent(''); onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="New announcement" subtitle="Shows at the top of everyone's home screen" footer={<Button title="Announce" icon={Send} onPress={submit} loading={busy} full />}>
      <Field label="Who should see it"><Choices pills value={target} onChange={setTarget} options={AUDIENCE} /></Field>
      <Field label="Type"><Choices pills value={category} onChange={setCategory} options={CATEGORIES} /></Field>
      <Field label="Title" required><Input value={title} onChangeText={setTitle} placeholder="e.g. Water supply off 2–4 PM" /></Field>
      <Field label="Message" required><Input value={content} onChangeText={setContent} multiline /></Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};
