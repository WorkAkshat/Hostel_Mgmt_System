import { StyleSheet, View } from 'react-native';
import { ChevronRight, Megaphone } from 'lucide-react-native';
import { noticesApi } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { timeAgo } from '../lib/format';
import { go } from '../lib/nav';
import { colors } from '../ui/theme';
import { Badge, Press, T } from '../ui/primitives';

const FRESH = 10 * 86400000;

// Newest announcement from the last 10 days, at the top of the home screen
export default function AnnouncementBanner() {
  const { data } = useData(['notices'], () => noticesApi.all());
  const fresh = asList(data).filter((n: any) => Date.now() - new Date(n.createdAt).getTime() < FRESH);
  const n = fresh[0];
  if (!n) return null;
  const urgent = n.category === 'URGENT';
  return (
    <Press onPress={() => go('/notices')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Announcement: ${n.title}`} style={[styles.card, urgent && styles.urgent]}>
      <View style={[styles.icon, urgent && { backgroundColor: colors.danger }]}><Megaphone size={20} color={colors.white} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="label" c={urgent ? colors.danger : colors.lilac700}>{urgent ? 'Urgent' : 'Announcement'}</T>
          <T v="caption" c={colors.text3}>· {timeAgo(n.createdAt)}</T>
        </View>
        <T v="title" w="bold" numberOfLines={1}>{n.title}</T>
        <T v="small" c={colors.text2} numberOfLines={2}>{n.content}</T>
        {fresh.length > 1 && <View style={{ marginTop: 4 }}><Badge label={`+${fresh.length - 1} more`} tone="lilac" /></View>}
      </View>
      <ChevronRight size={18} color={colors.text3} />
    </Press>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.lilac50, borderWidth: 1, borderColor: colors.lilac100 },
  urgent: { backgroundColor: colors.dangerBg, borderColor: '#f5c9c6' },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.lilac500, alignItems: 'center', justifyContent: 'center' },
});
