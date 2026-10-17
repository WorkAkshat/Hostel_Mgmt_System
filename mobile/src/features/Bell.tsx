import { Pressable, StyleSheet, View } from 'react-native';
import { Bell as BellIcon } from 'lucide-react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../ui/theme';
import { T, tap } from '../ui/primitives';
import { useInbox } from './inbox';
import { go } from '../lib/nav';

// Header bell with unread count → Notifications screen
export default function Bell() {
  const { user } = useAuth();
  const { unread } = useInbox(user);
  return (
    <Pressable
      onPress={() => { tap(); go('/notifications'); }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
    >
      <BellIcon size={20} color={colors.text} />
      {unread > 0 && (
        <View style={styles.dot}><T v="caption" w="bold" c={colors.white} style={{ fontSize: 10 }}>{unread > 9 ? '9+' : unread}</T></View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
});
