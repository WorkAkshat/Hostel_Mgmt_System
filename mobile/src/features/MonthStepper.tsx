import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { monthCycleLabel, monthKey, monthLabel, shiftMonth } from '../lib/format';
import { colors } from '../ui/theme';
import { T, tap } from '../ui/primitives';

// ‹ 10 Oct – 10 Nov 2026 › — 10-to-10 month cycle
export default function MonthStepper({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const atNow = value >= monthKey();
  return (
    <View style={styles.wrap}>
      <Pressable hitSlop={8} accessibilityLabel="Previous month" onPress={() => { tap(); onChange(shiftMonth(value, -1)); }} style={styles.btn}>
        <ChevronLeft size={18} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <T v="title" center numberOfLines={1}>{monthCycleLabel(value)}</T>
        <T v="caption" c={colors.text3} center>{monthLabel(value)} · 10 to 10</T>
      </View>
      <Pressable hitSlop={8} accessibilityLabel="Next month" disabled={atNow} onPress={() => { tap(); onChange(shiftMonth(value, 1)); }} style={[styles.btn, atNow && { opacity: 0.35 }]}>
        <ChevronRight size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 4 },
  btn: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
});
