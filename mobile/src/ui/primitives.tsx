import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fonts, radius, shadow, Tone, tones } from './theme';

export const tap = (style: 'light' | 'medium' = 'light') => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

// ── Text ──
// includeFontPadding:false stops Android adding extra space above the custom font,
// which pushed labels off-centre inside buttons, chips and badges.
const VARIANTS: Record<string, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.7, textTransform: 'uppercase' },
};

type TProps = TextProps & {
  v?: keyof typeof VARIANTS;
  c?: string;
  w?: keyof typeof fonts;
  center?: boolean;
  style?: StyleProp<TextStyle>;
};
export const T = ({ v = 'body', c = colors.text, w, center, style, ...rest }: TProps) => (
  <Text maxFontSizeMultiplier={1.1} {...rest} style={[VARIANTS[v], styles.text, { color: c }, w ? { fontFamily: fonts[w] } : null, center ? { textAlign: 'center' } : null, style]} />
);

// ── Press: every tappable thing shrinks a little with a spring, so taps feel instant ──
const APressable = Animated.createAnimatedComponent(Pressable);
type PressProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; haptic?: 'light' | 'medium' | false; children?: ReactNode };
export const Press = ({ style, scaleTo = 0.97, haptic = 'light', onPress, onPressIn, onPressOut, disabled, children, ...rest }: PressProps) => {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { s.value = withSpring(scaleTo, { damping: 18, stiffness: 420 }); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, { damping: 14, stiffness: 320 }); onPressOut?.(e); }}
      onPress={(e) => { if (haptic) tap(haptic); onPress?.(e); }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
};

// ── Card ──
export const Card = ({ children, style, tone, onPress, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; onPress?: () => void; padded?: boolean }) => {
  const t = tone ? tones[tone] : null;
  const base = [styles.card, padded ? { padding: 14 } : { overflow: 'hidden' as const }, t && { backgroundColor: t.bg, borderColor: t.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Press onPress={onPress} scaleTo={0.985} accessibilityRole="button" style={base}>{children}</Press>;
};

// ── Button ──
type BtnKind = 'primary' | 'brand' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnKind, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.sun300, fg: colors.sun900, border: colors.sun300 },
  brand: { bg: colors.brand600, fg: colors.white, border: colors.brand600 },
  secondary: { bg: colors.white, fg: colors.text, border: colors.borderStrong },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBg },
  ghost: { bg: 'transparent', fg: colors.brand700, border: 'transparent' },
};
export const Button = ({
  title, onPress, kind = 'primary', icon: Icon, loading, disabled, small, style, full,
}: { title: string; onPress: () => void; kind?: BtnKind; icon?: LucideIcon; loading?: boolean; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; full?: boolean }) => {
  const k = BTN[kind];
  const off = disabled || loading;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      haptic={kind === 'primary' || kind === 'brand' ? 'medium' : 'light'}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: k.bg, borderColor: k.border, minHeight: small ? 40 : 50, paddingHorizontal: small ? 10 : 18, borderRadius: small ? 12 : 14, gap: small ? 6 : 8 },
        full && { alignSelf: 'stretch' },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={k.fg} /> : Icon ? <Icon size={small ? 16 : 18} color={k.fg} strokeWidth={2.2} /> : null}
      <T v={small ? 'small' : 'title'} w="bold" c={k.fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{title}</T>
    </Press>
  );
};

export const IconButton = ({ icon: Icon, onPress, label, tone = 'white', size = 42 }: { icon: LucideIcon; onPress: () => void; label: string; tone?: Tone; size?: number }) => (
  <Press
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    scaleTo={0.9}
    onPress={onPress}
    style={[styles.iconBtn, { width: size, height: size, borderRadius: size * 0.33, backgroundColor: tones[tone].bg, borderColor: tones[tone].border }]}
  >
    <Icon size={Math.round(size * 0.45)} color={tones[tone].fg} />
  </Press>
);

// ── Badge ──
export const Badge = ({ label, tone = 'mint', icon: Icon }: { label: string; tone?: Tone; icon?: LucideIcon }) => (
  <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
    {Icon && <Icon size={12} color={tones[tone].fg} />}
    <T v="caption" w="bold" c={tones[tone].fg} numberOfLines={1} style={{ fontSize: 11 }}>{label}</T>
  </View>
);

// ── Icon in a soft square ──
export const IconTile = ({ icon: Icon, tone = 'mint', size = 42 }: { icon: LucideIcon; tone?: Tone; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: tones[tone].bg, alignItems: 'center', justifyContent: 'center' }}>
    <Icon size={Math.round(size * 0.48)} color={tones[tone].fg} />
  </View>
);

// ── Avatar ──
export const initialsOf = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
export const Avatar = ({ name, uri, size = 42, tone = 'mint' }: { name?: string; uri?: string | null; size?: number; tone?: Tone }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tones[tone].bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {uri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" /> : <T w="bold" c={tones[tone].fg} style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.44) }}>{initialsOf(name)}</T>}
  </View>
);

// ── Chips (single choice) ──
// Everything visible at once: chips wrap to a second line instead of scrolling sideways.
export const Chips = <V extends string>({ options, value, onChange }: { options: { value: V; label: string; count?: number }[]; value: V; onChange: (v: V) => void; scroll?: boolean }) => (
  <View style={styles.chips}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <Press
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: on }}
          scaleTo={0.94}
          onPress={() => onChange(o.value)}
          style={[styles.chip, on ? styles.chipOn : null]}
        >
          <T v="small" w={on ? 'bold' : 'semibold'} c={on ? colors.white : colors.text2} numberOfLines={1}>{o.label}</T>
          {o.count != null && (
            <View style={[styles.chipCount, { backgroundColor: on ? 'rgba(255,255,255,0.25)' : colors.mint100 }]}>
              <T v="caption" w="bold" c={on ? colors.white : colors.brand700} style={{ fontSize: 11, lineHeight: 14 }}>{o.count}</T>
            </View>
          )}
        </Press>
      );
    })}
  </View>
);

// ── Segmented control (sliding white pill) ──
export const Segmented = <V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) => {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const pos = useSharedValue(idx);
  useEffect(() => { pos.value = withSpring(idx, { damping: 20, stiffness: 260 }); }, [idx, pos]);
  const n = options.length;
  const pill = useAnimatedStyle(() => ({ left: `${(pos.value / n) * 100}%` as any, width: `${100 / n}%` as any }));
  return (
    <View style={styles.segment}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, margin: 4 }}>
          <Animated.View style={[styles.segmentPill, pill]} />
        </View>
      </View>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => { tap(); onChange(o.value); }} style={styles.segmentItem} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <T v="small" w={on ? 'bold' : 'semibold'} c={on ? colors.text : colors.text3} numberOfLines={1}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
};

// ── Progress bar ──
export const Progress = ({ value, max, color = colors.brand500, height = 8, track = colors.mint100 }: { value: number; max: number; color?: string; height?: number; track?: string }) => {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 700 });
  }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color }, anim]} />
    </View>
  );
};

// ── Skeleton ──
export const Skeleton = ({ h = 80, style }: { h?: number; style?: StyleProp<ViewStyle> }) => {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height: h, borderRadius: radius.card, backgroundColor: colors.mint100 }, anim, style]} />;
};

export const Row = ({ children, gap = 10, style, align = 'center' }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle['alignItems'] }) => (
  <View style={[{ flexDirection: 'row', alignItems: align, gap }, style]}>{children}</View>
);

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.border }} />;

const styles = StyleSheet.create({
  text: { includeFontPadding: false },
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, flexShrink: 1, minWidth: 0 },
  iconBtn: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 9, minHeight: 22, paddingVertical: 2, borderRadius: radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  chipCount: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: colors.mint100, borderRadius: 14, padding: 4, minHeight: 46 },
  segmentPill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 11, backgroundColor: colors.white, ...shadow.card },
  segmentItem: { flex: 1, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
