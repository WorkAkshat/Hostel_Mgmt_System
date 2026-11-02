import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Sparkles, Vote, X } from 'lucide-react-native';
import { pollsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { plural } from '../lib/format';
import { colors } from '../ui/theme';
import { Button, IconButton, Press, Row, T } from '../ui/primitives';
import { Choices, Field, Input } from '../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Hero, HeroCells, onHero } from '../ui/blocks';
import { Appear, Screen } from '../ui/layout';
import { Sheet } from '../ui/Sheet';
import PollCard from '../features/PollCard';

type Audience = 'ALL' | 'STUDENTS' | 'STAFF';
const AUDIENCE: { value: Audience; label: string }[] = [{ value: 'ALL', label: 'Everyone' }, { value: 'STUDENTS', label: 'Residents' }, { value: 'STAFF', label: 'Staff' }];
const CLOSES = [{ value: 'never', label: 'I close it' }, { value: '1', label: '1 day' }, { value: '3', label: '3 days' }, { value: '7', label: '1 week' }];
const PRIVACY = [{ value: 'named', label: 'Show me names' }, { value: 'anon', label: 'Anonymous' }];

// Ready-made questions so the warden can start a poll in two taps
const IDEAS = [
  { t: '🍽️ Sunday dinner', q: 'What should we have for Sunday special dinner?', o: ['Paneer butter masala', 'Chole bhature', 'Biryani', 'Pizza night'] },
  { t: '🧹 Cleaning day', q: 'Which day suits you for the room cleaning drive?', o: ['Saturday', 'Sunday', 'Weekday evening'] },
  { t: '⭐ Rate the food', q: 'How happy are you with the mess food this week?', o: ['😋 Loved it', '🙂 It was okay', '😕 Needs work'] },
  { t: '🎬 Movie night', q: 'Should we have a movie night this weekend?', o: ['Yes, Saturday', 'Yes, Sunday', 'Not interested'] },
];

export default function Polls() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToast();
  const polls = useData(['polls'], pollsApi.all, { interval: 20_000 });
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [removing, setRemoving] = useState<any>(null);
  const params = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { if (params.new) { if (admin) setCreating(true); router.setParams({ new: undefined }); } }, [params.new, admin]);

  const all = asList(polls.data);
  const open = all.filter((p: any) => p.isActive);
  const closed = all.filter((p: any) => !p.isActive);
  const list = tab === 'open' ? open : closed;
  const waiting = open.filter((p: any) => !p.userHasVoted).length;
  const votes = open.reduce((n: number, p: any) => n + p.totalVotes, 0);

  const toggle = async (p: any) => {
    try {
      await pollsApi.toggle(p.id);
      toast.success(p.isActive ? 'Poll closed' : 'Poll reopened', p.isActive ? 'Everyone now sees the final result.' : 'People can vote again.');
      await qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e: any) { toast.error('Could not update', e.message); }
  };

  return (
    <Screen title="Polls" subtitle={admin ? 'Ask anything' : 'Have your say'} back tabBar={false} onRefresh={polls.refetch}
      right={admin ? <Button title="New poll" icon={Plus} small onPress={() => setCreating(true)} /> : undefined}>
      <Appear>
        <Hero gradient="lilac">
          <Row align="flex-start">
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" c={onHero.faint}>{admin ? 'Live polls' : 'Your vote counts'}</T>
              <T v="h1" c={onHero.strong}>{admin ? (open.length ? `${plural(open.length, 'poll')} open` : 'No poll running') : waiting ? `${plural(waiting, 'poll')} waiting` : 'All caught up'}</T>
              <T v="small" c={onHero.soft}>{admin ? 'Residents and staff vote from their phones. Results update by themselves.' : waiting ? 'Tap an answer below to vote.' : 'You have voted in every open poll.'}</T>
            </View>
            <View style={styles.heroIcon}><Vote size={26} color={colors.white} /></View>
          </Row>
          <HeroCells items={[
            { k: 'Open', v: String(open.length), active: tab === 'open', onPress: () => setTab('open') },
            { k: 'Closed', v: String(closed.length), active: tab === 'closed', onPress: () => setTab('closed') },
            { k: admin ? 'Votes' : 'To vote', v: String(admin ? votes : waiting) },
          ]} />
        </Hero>
      </Appear>

      {polls.error ? <ErrorBox message={(polls.error as Error).message} onRetry={polls.refetch} /> : polls.isLoading ? <Loading rows={2} h={220} /> : list.length === 0 ? (
        <Empty icon={Vote} tone="lilac" title={tab === 'open' ? 'No open polls' : 'No closed polls yet'}
          text={tab === 'open' ? (admin ? 'Ask a question about anything — food, timings, events — and everyone can vote.' : 'When the warden asks something, you can vote here.') : 'Finished polls and their results stay here.'}
          action={admin && tab === 'open' ? <Button title="Create a poll" icon={Plus} onPress={() => setCreating(true)} /> : undefined} />
      ) : list.map((p: any, i: number) => (
        <Appear key={p.id} i={i}>
          <PollCard
            poll={p}
            admin={admin}
            onToggle={() => toggle(p)}
            onEdit={() => setEditing(p)}
            onDelete={() => setRemoving(p)}
          />
        </Appear>
      ))}

      {admin && (
        <PollFormSheet
          open={creating || !!editing}
          poll={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => setTab('open')}
        />
      )}
      <Confirm open={!!removing} title="Delete this poll?" message="The poll and all its votes are removed for everyone." confirmLabel="Delete" danger
        onConfirm={async () => {
          try { await pollsApi.remove(removing.id); await qc.invalidateQueries({ queryKey: ['polls'] }); toast.success('Poll deleted'); }
          catch (e: any) { toast.error('Could not delete', e.message); throw e; }
        }}
        onClose={() => setRemoving(null)} />
    </Screen>
  );
}

const PollFormSheet = ({ open, poll, onClose, onSaved }: { open: boolean; poll?: any; onClose: () => void; onSaved: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [target, setTarget] = useState<Audience>('ALL');
  const [closes, setCloses] = useState('never');
  const [privacy, setPrivacy] = useState('named');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (poll) {
      setQuestion(poll.question || '');
      const rawOpts = (poll.options || []).map((o: any) => (typeof o === 'string' ? o : o.option));
      setOptions(rawOpts.length >= 2 ? rawOpts : ['', '']);
      setTarget(poll.target || 'ALL');
      if (poll.endsAt) {
        const ms = new Date(poll.endsAt).getTime() - Date.now();
        const days = Math.round(ms / 86400000);
        if (days <= 1) setCloses('1');
        else if (days <= 3) setCloses('3');
        else setCloses('7');
      } else {
        setCloses('never');
      }
      setPrivacy(poll.anonymous ? 'anon' : 'named');
      setError(null);
    } else {
      setQuestion('');
      setOptions(['', '']);
      setTarget('ALL');
      setCloses('never');
      setPrivacy('named');
      setError(null);
    }
  }, [open, poll]);

  const pickIdea = (i: (typeof IDEAS)[number]) => { setQuestion(i.q); setOptions([...i.o]); setError(null); };
  const setOption = (i: number, v: string) => { setOptions((list) => list.map((x, j) => (j === i ? v : x))); setError(null); };

  const submit = async () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) return setError('Write the question.');
    if (opts.length < 2) return setError('Add at least two answers.');
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return setError('Two answers are the same — make each one different.');
    setBusy(true);
    try {
      const endsAt = closes === 'never' ? null : new Date(Date.now() + Number(closes) * 86400000).toISOString();
      if (poll) {
        await pollsApi.update(poll.id, {
          question: question.trim(),
          options: opts,
          target,
          endsAt,
          anonymous: privacy === 'anon',
        });
        toast.success('Poll updated', 'Changes have been saved.');
      } else {
        await pollsApi.create({
          question: question.trim(),
          options: opts,
          target,
          endsAt,
          anonymous: privacy === 'anon',
        });
        toast.success('Poll is live', target === 'STAFF' ? 'Staff can vote now.' : target === 'STUDENTS' ? 'Residents can vote now.' : 'Everyone can vote now.');
      }
      await qc.invalidateQueries({ queryKey: ['polls'] });
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={poll ? 'Edit poll' : 'New poll'} subtitle={poll ? 'Update question, answers, or settings' : 'Ask anything — everyone votes from the app'}
      footer={<Button title={poll ? 'Save changes' : 'Start poll'} icon={poll ? Pencil : Vote} onPress={submit} loading={busy} full />}>
      {!poll && !question && (
        <View style={{ gap: 8 }}>
          <Row gap={6}><Sparkles size={14} color={colors.lilac700} /><T v="caption" w="bold" c={colors.lilac700}>Quick ideas</T></Row>
          <View style={styles.ideas}>
            {IDEAS.map((i) => (
              <Press key={i.q} onPress={() => pickIdea(i)} scaleTo={0.96} style={styles.idea} accessibilityRole="button">
                <T v="small" w="semibold" c={colors.lilac700} numberOfLines={1}>{i.t}</T>
              </Press>
            ))}
          </View>
        </View>
      )}
      <Field label="Question" required><Input value={question} onChangeText={(v) => { setQuestion(v); setError(null); }} placeholder="e.g. Which day for the special dinner?" multiline style={{ minHeight: 56 }} /></Field>
      <Field label="Answers" required hint="2 to 8 answers">
        <View style={{ gap: 8 }}>
          {options.map((o, i) => (
            <Row key={i} gap={8}>
              <View style={styles.num}><T v="caption" w="bold" c={colors.brand700}>{i + 1}</T></View>
              <View style={{ flex: 1 }}><Input value={o} onChangeText={(v) => setOption(i, v)} placeholder={`Answer ${i + 1}`} /></View>
              {options.length > 2 && <IconButton icon={X} label={`Remove answer ${i + 1}`} size={36} onPress={() => setOptions((l) => l.filter((_, j) => j !== i))} />}
            </Row>
          ))}
          {options.length < 8 && <Button title="Add answer" icon={Plus} kind="ghost" small onPress={() => setOptions((l) => [...l, ''])} />}
        </View>
      </Field>
      <Field label="Who can vote"><Choices pills value={target} onChange={setTarget} options={AUDIENCE} /></Field>
      <Field label="Voting closes"><Choices pills value={closes} onChange={setCloses} options={CLOSES} /></Field>
      <Field label="Votes" hint={privacy === 'anon' ? 'Nobody, not even you, sees who picked what.' : 'Only you see who picked what. Others see totals.'}>
        <Choices pills value={privacy} onChange={setPrivacy} options={PRIVACY} />
      </Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  heroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idea: { width: '48%', flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.lilac50, borderWidth: 1, borderColor: colors.lilac100 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
});
