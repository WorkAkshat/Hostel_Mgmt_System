import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { setOnline } from '../lib/query';
import { colors } from '../ui/theme';
import { T } from '../ui/primitives';

// Thin banner when the phone has no internet; React Query pauses and resumes with it
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      const on = s.isConnected !== false && s.isInternetReachable !== false;
      setOffline(!on);
      setOnline(on);
    });
    return () => unsub();
  }, []);
  if (!offline) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <WifiOff size={15} color={colors.white} />
      <T v="caption" w="semibold" c={colors.white}>No internet — showing the last saved data</T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6, backgroundColor: colors.brand800 },
});
