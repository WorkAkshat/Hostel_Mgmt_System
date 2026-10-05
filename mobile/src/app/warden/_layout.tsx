import { Tabs } from 'expo-router';
import { colors } from '../../ui/theme';
import { ClipboardCheck, DoorOpen, House, LayoutGrid, Users } from 'lucide-react-native';
import { makeTabBar } from '../../ui/TabBar';
import { useData } from '../../lib/query';
import { authApi, leavesApi, paymentsApi, studentsApi } from '../../api';
import { asList } from '../../api/client';

// Red count on "Requests" for anything waiting on the warden
const useBadges = () => {
  const leaves = useData(['leaves'], leavesApi.all);
  const regs = useData(['pending-users'], authApi.pending);
  const reqs = useData(['profile-requests'], studentsApi.profileRequests);
  const docs = useData(['documents', 'PENDING'], () => studentsApi.documents('PENDING'));
  const pays = useData(['payment-claims', 'PENDING'], () => paymentsApi.claims('PENDING'));
  const n = asList(leaves.data).filter((l: any) => l.status === 'PENDING').length + asList(regs.data).length
    + asList(reqs.data).filter((r: any) => r.status === 'PENDING').length + asList(docs.data).length + asList(pays.data).length;
  const out = asList(leaves.data).filter((l: any) => l.status === 'CHECKED_OUT' && new Date(l.endDate) < new Date()).length;
  return { requests: n, gate: out };
};

const TabBar = makeTabBar({ index: House, requests: ClipboardCheck, residents: Users, gate: DoorOpen, more: LayoutGrid }, useBadges);

export default function WardenTabs() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift', freezeOnBlur: true, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests' }} />
      <Tabs.Screen name="residents" options={{ title: 'Residents' }} />
      <Tabs.Screen name="gate" options={{ title: 'Gate' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
