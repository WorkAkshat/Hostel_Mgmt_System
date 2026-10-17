import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';
import { colors } from '../ui/theme';
import { T, tap } from '../ui/primitives';

// ‹ October 2026 › — never goes past the current month
export default function MonthStepper({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const atNow = value >= monthKey();
  return (
    <View style={styles.wrap}>
      <Pressable hitSlop={8} accessibilityLabel="Previous month" onPress={() => { tap(); onChange(shiftMonth(value, -1)); }} style={styles.btn}>
        <ChevronLeft size={18} color={colors.text} />
      </Pressable>
      <T v="title" style={{ flex: 1 }} center>{monthLabel(value)}</T>
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
