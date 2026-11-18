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
    <Screen title="Gate Movement" subtitle="Approved leaves, daily passes & visitors" back right={<Bell />}>
      <GateBoard request={request} />
    </Screen>
  );
}
