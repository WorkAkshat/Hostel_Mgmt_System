import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Building2 } from 'lucide-react-native';
import { create } from 'zustand';
import { floorsApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { colors, shadow } from '../ui/theme';
import { T, tap } from '../ui/primitives';

// The floor a warden is looking at, shared by every warden screen
const useFloorStore = create<{ floor: string; setFloor: (f: string) => void }>((set) => ({
  floor: 'all',
  setFloor: (floor) => set({ floor }),
}));

export const useFloors = () => {
  const { data } = useData(['floors'], floorsApi.all, { interval: 120_000 });
  return asList(data);
};

// Floor wardens are fixed to their own floor; the chief warden can switch
export const useFloor = () => {
  const { user } = useAuth();
  const { floor, setFloor } = useFloorStore();
  const locked = user?.assignedFloor ? String(user.assignedFloor) : null;
  return { floor: locked || floor, setFloor, locked: !!locked };
};

// One-line floor switch: "Floor  All 1 2 3 4 5". Everything fits on screen,
// no sideways scrolling; a teal pill slides to the chosen floor.
export const FloorSelect = ({ value, onChange, allowAll = true }: { value: string; onChange: (v: string) => void; allowAll?: boolean }) => {
  const floors = useFloors();
  const opts = [...(allowAll ? [{ value: 'all', label: 'All' }] : []), ...floors.map((f: any) => ({ value: String(f.floorNumber), label: String(f.floorNumber) }))];
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const [w, setW] = useState(0);
  const itemW = opts.length ? w / opts.length : 0;
  const x = useSharedValue(0);
  useEffect(() => { if (itemW) x.value = withSpring(idx * itemW, { damping: 20, stiffness: 240 }); }, [idx, itemW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: itemW }));
  if (!floors.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.label}>
        <Building2 size={16} color={colors.brand700} />
        <T v="small" w="bold" c={colors.brand800}>Floor</T>
      </View>
      <View style={styles.track} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {itemW > 0 && <Animated.View pointerEvents="none" style={[styles.pill, pill]} />}
        {opts.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => { tap(); onChange(o.value); }} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.value === 'all' ? 'All floors' : `Floor ${o.label}`} hitSlop={4}>
              <T v="title" w="bold" c={on ? colors.white : colors.text2}>{o.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Shared floor switch used on warden pages
export const FloorChips = () => {
  const { floor, setFloor, locked } = useFloor();
  if (locked) return null;
  return <FloorSelect value={floor} onChange={setFloor} />;
};

export const onFloor = (room: any, floor: string) => floor === 'all' || String(room?.floorNumber) === floor;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 4, paddingLeft: 12, ...shadow.card },
  label: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  track: { flex: 1, flexDirection: 'row', height: 38 },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 12, backgroundColor: colors.brand600 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
