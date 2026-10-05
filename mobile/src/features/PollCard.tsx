import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Vote } from 'lucide-react-native';
import { pollsApi } from '../api';
import { colors } from '../ui/theme';
import { Badge, Card, IconTile, Progress, Row, T, tap } from '../ui/primitives';
import { useToast } from '../ui/feedback';
import { timeAgo } from '../lib/format';

// One poll: vote buttons until you vote, then live results
export default function PollCard({ poll, admin, onToggle, onDelete }: { poll: any; admin?: boolean; onToggle?: () => void; onDelete?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const showResults = admin || poll.userHasVoted || !poll.isActive;

  const vote = async (option: string) => {
    setBusy(option);
    try {
      await pollsApi.vote(poll.id, option);
      toast.success('Vote saved', option);
      await qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e: any) {
      toast.error('Could not vote', e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Row align="flex-start">
        <IconTile icon={Vote} tone="lilac" />
        <View style={{ flex: 1 }}>
          <T v="title">{poll.question}</T>
          <T v="caption" c={colors.text3}>{poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'} · {timeAgo(poll.createdAt)}</T>
        </View>
        <Badge label={poll.isActive ? 'Open' : 'Closed'} tone={poll.isActive ? 'success' : 'white'} />
      </Row>
      {poll.options.map((o: any) => {
        const mine = poll.userVotedOption === o.option;
        return showResults ? (
          <View key={o.option} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                {mine && <CircleCheck size={14} color={colors.brand600} />}
                <T v="small" w={mine ? 'bold' : 'medium'}>{o.option}</T>
              </Row>
              <T v="small" w="bold">{o.percentage}%</T>
            </Row>
            <Progress value={o.percentage} max={100} color={mine ? colors.brand500 : colors.sun400} height={6} />
          </View>
        ) : (
          <Pressable key={o.option} disabled={!!busy} onPress={() => { tap(); vote(o.option); }} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.sun200 }, busy === o.option && { opacity: 0.6 }]}>
            <T v="small" w="semibold">{o.option}</T>
          </Pressable>
        );
      })}
      {admin && (
        <Row gap={14}>
          <Pressable onPress={onToggle} hitSlop={8}><T v="small" w="semibold" c={colors.brand700}>{poll.isActive ? 'Close poll' : 'Reopen poll'}</T></Pressable>
          <Pressable onPress={onDelete} hitSlop={8}><T v="small" w="semibold" c={colors.danger}>Delete</T></Pressable>
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  option: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
});
