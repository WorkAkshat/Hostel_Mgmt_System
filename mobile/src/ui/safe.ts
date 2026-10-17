import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Space taken by the phone's status bar (time, battery). Some Android phones report
// a 0 safe-area inset in Expo Go, which pushed headers under the clock — so never go
// below the status bar's real height.
export const useTopInset = () => {
  const insets = useSafeAreaInsets();
  const bar = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;
  return Math.max(insets.top, bar);
};
