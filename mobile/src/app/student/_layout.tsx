import { Tabs } from 'expo-router';
import { colors } from '../../ui/theme';
import { CalendarDays, House, Receipt, UserRound, UtensilsCrossed } from 'lucide-react-native';
import { makeTabBar } from '../../ui/TabBar';
import { useData } from '../../lib/query';
import { feesApi } from '../../api';
import { asList } from '../../api/client';

// Red count on "Bills" when something is unpaid
const useBadges = () => {
  const { data } = useData(['my-invoices'], feesApi.mine);
  return { bills: asList(data).filter((i: any) => i.status !== 'PAID').length };
};

const TabBar = makeTabBar({ index: House, leaves: CalendarDays, mess: UtensilsCrossed, bills: Receipt, me: UserRound }, useBadges);

export default function StudentTabs() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift', freezeOnBlur: true, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="leaves" options={{ title: 'Leaves' }} />
      <Tabs.Screen name="mess" options={{ title: 'Mess' }} />
      <Tabs.Screen name="bills" options={{ title: 'Bills' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
