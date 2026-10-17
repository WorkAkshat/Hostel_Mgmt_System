import { Vote } from 'lucide-react-native';
import { pollsApi } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { go } from '../lib/nav';
import { Badge } from '../ui/primitives';
import { ListRow } from '../ui/layout';

// "New poll — tap to vote" row for home screens; hidden once you've voted everywhere
export default function PollNudge() {
  const polls = useData(['polls'], pollsApi.all);
  const waiting = asList(polls.data).filter((p: any) => p.isActive && !p.userHasVoted);
  if (!waiting.length) return null;
  return (
    <ListRow icon={Vote} tone="lilac" title={waiting.length === 1 ? 'New poll — vote now' : `${waiting.length} polls waiting for you`} sub={waiting[0].question}
      right={<Badge label="Vote" tone="lilac" />} onPress={() => go('/polls')} />
  );
}
