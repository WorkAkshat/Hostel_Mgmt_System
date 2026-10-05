import { Tabs } from 'expo-router';
import { colors } from '../../ui/theme';
import { DoorOpen, UserRound } from 'lucide-react-native';
import { makeTabBar } from '../../ui/TabBar';

const TabBar = makeTabBar({ index: DoorOpen, account: UserRound });

export default function StaffTabs() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'shift', freezeOnBlur: true, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Gate' }} />
      <Tabs.Screen name="account" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
