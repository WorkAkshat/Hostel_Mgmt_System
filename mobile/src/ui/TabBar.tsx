import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, shadow } from './theme';
import { T, tap } from './primitives';
import { useKeyboardTop } from './keyboard';

// Floating bottom navigation. A yellow pill slides to the active tab.
// It sits over the content; Screen adds bottom padding so nothing hides behind it.
const noBadges = (): Record<string, number> => ({});
const PAD = 6;

export const makeTabBar = (icons: Record<string, LucideIcon>, useBadges: () => Record<string, number> = noBadges) =>
  function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const badges = useBadges();
    const typing = useKeyboardTop() != null;
    const routes = state.routes.filter((r) => (descriptors[r.key].options as any).href !== null);
    const active = Math.max(0, routes.findIndex((r) => r.key === state.routes[state.index]?.key));
    const [w, setW] = useState(0);
    const itemW = w ? (w - PAD * 2) / routes.length : 0;

    const x = useSharedValue(0);
    useEffect(() => {
      if (itemW) x.value = withSpring(PAD + active * itemW, { damping: 20, stiffness: 220, mass: 0.8 });
    }, [active, itemW, x]);
    const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: itemW }));

    if (typing) return null;
    return (
      <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bar} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {itemW > 0 && (
            <Animated.View pointerEvents="none" style={[styles.pillTrack, pill]}>
              <View style={styles.pill} />
            </Animated.View>
          )}
          {routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = index === active;
            const label = (options.title ?? route.name) as string;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => {
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) {
                    tap();
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={styles.item}
              >
                <TabIcon icon={icons[route.name]} focused={focused} badge={badges[route.name]} />
                <T v="caption" w={focused ? 'bold' : 'semibold'} c={focused ? colors.sun900 : colors.text3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 10.5, lineHeight: 14, alignSelf: 'stretch', textAlign: 'center' }}>{label}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

// Icon pops a little when its tab becomes active
const TabIcon = ({ icon: Icon, focused, badge }: { icon?: LucideIcon; focused: boolean; badge?: number }) => {
  const s = useSharedValue(1);
  useEffect(() => {
    if (focused) s.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 260 }));
  }, [focused, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.icon, anim]}>
      {Icon && <Icon size={22} color={focused ? colors.sun900 : colors.text3} strokeWidth={focused ? 2.4 : 2} />}
      {badge ? (
        <View style={styles.badge}>
          <T v="caption" w="bold" c={colors.white} style={{ fontSize: 10, lineHeight: 12 }}>{badge > 9 ? '9+' : badge}</T>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, alignItems: 'center' },
  bar: { flexDirection: 'row', width: '100%', maxWidth: 520, minHeight: 68, backgroundColor: colors.white, borderRadius: 26, borderWidth: 1, borderColor: colors.border, paddingHorizontal: PAD, ...shadow.lift, shadowOpacity: 0.14 },
  pillTrack: { position: 'absolute', top: 6, bottom: 6, left: 0, paddingHorizontal: 4 },
  pill: { flex: 1, borderRadius: 20, backgroundColor: colors.sun300 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 30, height: 26, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
});
