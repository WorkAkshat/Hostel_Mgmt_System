import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Moon } from 'lucide-react-native';
import { Screen } from '../../ui/layout';
import { ListRow } from '../../ui/layout';
import Bell from '../../features/Bell';
import GateBoard from '../../features/GateBoard';
import { go } from '../../lib/nav';

export default function WardenGate() {
  const params = useLocalSearchParams<{ tab?: 'leaving' | 'out' | 'visitors' }>();
  const [request, setRequest] = useState<{ tab: 'leaving' | 'out' | 'visitors' }>();
  useEffect(() => {
    if (params.tab) { setRequest({ tab: params.tab }); router.setParams({ tab: undefined }); }
  }, [params.tab]);
  return (
    <Screen title="Gate" subtitle="Exits, returns and visitors" right={<Bell />}>
      <ListRow icon={Moon} tone="lilac" title="Night roll call" sub="Mark who's in the hostel tonight" onPress={() => go('/manage/roll-call')} />
      <GateBoard request={request} />
    </Screen>
  );
}
