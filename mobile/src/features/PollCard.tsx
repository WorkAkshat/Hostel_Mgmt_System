import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, CircleCheck, Clock, EyeOff, Lock, LockOpen, Trash2, Users, Vote } from 'lucide-react-native';
import { pollsApi } from '../api';
import { colors } from '../ui/theme';
import { Badge, Button, Card, IconTile, Press, Row, T } from '../ui/primitives';
import { useToast } from '../ui/feedback';
import { plural, timeAgo } from '../lib/format';

const AUDIENCE: Record<string, string> = { ALL: 'Everyone', STUDENTS: 'Residents', STAFF: 'Staff' };

// "Closes in 2 days" / "Closes today 9:00 pm"
export const closesLabel = (endsAt?: string | null) => {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Voting ended';
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `Closes in ${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 24) return `Closes in ${plural(h, 'hour')}`;
  return `Closes in ${plural(Math.round(h / 24), 'day')}`;
};

// One answer: a tappable row whose background fills up to its share of the votes
const OptionRow = ({ label, pct, votes, mine, showResults, leading, busy, disabled, radio, onPress }: {
  label: string; pct: number; votes: number; mine: boolean; showResults: boolean; leading: boolean; busy: boolean; disabled: boolean; radio: boolean; onPress: () => void;
}) => {
  const fill = useSharedValue(0);
  useEffect(() => { fill.value = withTiming(showResults ? pct : 0, { duration: 650, easing: Easing.out(Easing.cubic) }); }, [pct, showResults]); // eslint-disable-line react-hooks/exhaustive-deps
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));
  return (
    <Press onPress={onPress} disabled={disabled} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ selected: mine }}
      style={[styles.option, mine && styles.optionMine]}>
      <Animated.View style={[styles.fill, { backgroundColor: mine ? colors.mint200 : leading ? colors.cream100 : colors.mint50 }, fillStyle]} />
      {radio && (
        <View style={[styles.radio, mine && styles.radioOn]}>
          {busy ? <ActivityIndicator size="small" color={mine ? colors.white : colors.brand600} /> : mine ? <CircleCheck size={16} color={colors.white} /> : null}
        </View>
      )}
      <T v="title" w={mine ? 'bold' : 'semibold'} style={{ flex: 1 }}>{label}</T>
      {showResults && (
        <View style={{ alignItems: 'flex-end' }}>
          <T v="title" w="bold" c={mine ? colors.brand700 : colors.text}>{pct}%</T>
          <T v="caption" c={colors.text3}>{votes}</T>
        </View>
      )}
    </Press>
  );
};

// A poll: residents tap an answer to vote (and can change it while it's open);
// results appear after voting. The warden always sees results and who voted.
export default function PollCard({ poll, admin, onToggle, onDelete }: { poll: any; admin?: boolean; onToggle?: () => void; onDelete?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [showVoters, setShowVoters] = useState(false);
  const open = poll.isActive;
  const showResults = admin || poll.userHasVoted || !open;
  const top = Math.max(0, ...poll.options.map((o: any) => o.votes));
  const closes = open ? closesLabel(poll.endsAt) : null;

  const vote = async (option: string) => {
    if (!open || busy) return;
    const changing = poll.userHasVoted;
    if (poll.userVotedOption === option) return;
    setBusy(option);
    try {
      await pollsApi.vote(poll.id, option);
      toast.success(changing ? 'Vote changed' : 'Thanks for voting!', option);
      await qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e: any) {
      toast.error('Could not vote', e.message);
    } finally {
      setBusy(null);
    }
  };
  const unvote = async () => {
    setBusy('__undo');
    try {
      await pollsApi.unvote(poll.id);
      await qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e: any) { toast.error('Could not remove vote', e.message); } finally { setBusy(null); }
  };

  const voters = admin && !poll.anonymous ? poll.options.flatMap((o: any) => (o.voters || []).map((v: any) => ({ ...v, option: o.option }))) : [];

  return (
    <Card style={{ gap: 12 }}>
      <Row align="flex-start">
        <IconTile icon={Vote} tone={open ? 'lilac' : 'white'} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T v="title" style={{ fontSize: 16, lineHeight: 22 }}>{poll.question}</T>
          <Row gap={6} style={{ flexWrap: 'wrap', rowGap: 2 }}>
            <T v="caption" c={colors.text3}>{plural(poll.totalVotes, 'vote')} · {timeAgo(poll.createdAt)}</T>
            {closes && <Row gap={3}><Clock size={11} color={colors.sun800} /><T v="caption" c={colors.sun800}>{closes}</T></Row>}
          </Row>
        </View>
        <Badge label={open ? 'Open' : 'Closed'} tone={open ? 'success' : 'white'} />
      </Row>

      {admin && (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Badge label={AUDIENCE[poll.target] || 'Everyone'} tone="lilac" icon={Users} />
          {poll.anonymous && <Badge label="Anonymous" tone="white" icon={EyeOff} />}
        </Row>
      )}

      <View style={{ gap: 8 }}>
        {poll.options.map((o: any) => (
          <OptionRow key={o.option} label={o.option} pct={o.percentage} votes={o.votes} mine={poll.userVotedOption === o.option}
            showResults={showResults} leading={top > 0 && o.votes === top} busy={busy === o.option}
            disabled={!open || !!busy || !!admin} radio={!admin} onPress={() => vote(o.option)} />
        ))}
      </View>

      {!admin && open && (
        poll.userHasVoted ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="caption" c={colors.text3} style={{ flex: 1 }}>Tap another answer to change your vote</T>
            <Press onPress={unvote} hitSlop={8} disabled={!!busy}><T v="caption" w="bold" c={colors.danger}>Remove vote</T></Press>
          </Row>
        ) : <T v="caption" c={colors.text3}>Tap an answer to vote — results show after you vote.</T>
      )}
      {!open && poll.userVotedOption && <T v="caption" c={colors.text3}>You voted “{poll.userVotedOption}”.</T>}

      {admin && voters.length > 0 && (
        <View style={styles.voters}>
          <Press onPress={() => setShowVoters((v) => !v)} scaleTo={0.99} style={styles.votersHead} accessibilityRole="button" accessibilityState={{ expanded: showVoters }}>
            <Users size={16} color={colors.brand700} />
            <T v="small" w="bold" c={colors.brand700} style={{ flex: 1 }}>Who voted ({voters.length})</T>
            <ChevronDown size={16} color={colors.brand700} style={{ transform: [{ rotate: showVoters ? '180deg' : '0deg' }] }} />
          </Press>
          {showVoters && voters.map((v: any, i: number) => (
            <Row key={i} gap={8} style={styles.voter}>
              <T v="small" w="semibold" numberOfLines={1} style={{ flex: 1 }}>{v.name}{v.room ? <T v="caption" c={colors.text3}> · Room {v.room}</T> : v.role === 'STAFF' ? <T v="caption" c={colors.text3}> · Staff</T> : null}</T>
              <T v="caption" c={colors.text2} numberOfLines={1} style={{ maxWidth: '45%' }}>{v.option}</T>
            </Row>
          ))}
        </View>
      )}

      {admin && (
        <Row gap={8}>
          <Button title={open ? 'Close poll' : 'Reopen'} icon={open ? Lock : LockOpen} kind="secondary" small onPress={() => onToggle?.()} style={{ flex: 1 }} />
          <Button title="Delete" icon={Trash2} kind="danger" small onPress={() => onDelete?.()} style={{ flex: 1 }} />
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  optionMine: { borderColor: colors.brand500 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  radioOn: { borderColor: colors.brand600, backgroundColor: colors.brand600 },
  voters: { borderRadius: 14, backgroundColor: colors.mint50, borderWidth: 1, borderColor: colors.mint200, overflow: 'hidden' },
  votersHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11 },
  voter: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.mint200 },
  teaserTrack: { height: 8, borderRadius: 4, backgroundColor: colors.lilac50, overflow: 'hidden' },
  teaserFill: { height: 8, borderRadius: 4, backgroundColor: colors.lilac700 },
});

// Small summary for the warden's home: the newest open poll and how it's going
export const PollTeaser = ({ poll, onPress }: { poll: any; onPress: () => void }) => {
  const lead = [...poll.options].sort((a: any, b: any) => b.votes - a.votes)[0];
  return (
    <Card onPress={onPress} style={{ gap: 10 }}>
      <Row align="flex-start">
        <IconTile icon={Vote} tone="lilac" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="title" numberOfLines={2}>{poll.question}</T>
          <T v="caption" c={colors.text3}>{plural(poll.totalVotes, 'vote')}{closesLabel(poll.endsAt) ? ` · ${closesLabel(poll.endsAt)}` : ''}</T>
        </View>
        <Badge label={poll.isActive ? 'Live' : 'Closed'} tone={poll.isActive ? 'success' : 'white'} />
      </Row>
      {poll.totalVotes > 0 && lead ? (
        <View style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small" w="semibold" numberOfLines={1} style={{ flex: 1 }}>Leading: {lead.option}</T>
            <T v="small" w="bold" c={colors.lilac700}>{lead.percentage}%</T>
          </Row>
          <View style={styles.teaserTrack}><View style={[styles.teaserFill, { width: `${lead.percentage}%` }]} /></View>
        </View>
      ) : <T v="small" c={colors.text3}>No votes yet — residents see it on their home screen.</T>}
    </Card>
  );
};
