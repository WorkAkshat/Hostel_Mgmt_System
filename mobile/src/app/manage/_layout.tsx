import { Stack } from 'expo-router';
import { colors } from '../../ui/theme';

// Warden tools opened from Home / More (roll call, fees, reports…)
export default function ManageLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260, freezeOnBlur: true, gestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }} />;
}
