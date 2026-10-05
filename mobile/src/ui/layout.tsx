import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, interpolateColor, runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { goBack } from '../lib/nav';
import { colors, shadow, Tone, tones } from './theme';
import { IconTile, Press, T } from './primitives';
import { revealFocusedInput, useInputFocus, useKeyboardTop } from './keyboard';

// Page shell: safe-area header, scrollable body and pull-to-refresh.
// The header turns white with a soft divider once the page is scrolled.
export const Screen = ({
  title, subtitle, back, left, right, children, onRefresh, scroll = true, padded = true, tabBar = true, tint = !back,
}: { title?: string; subtitle?: string; back?: boolean; left?: ReactNode; right?: ReactNode; children: ReactNode; onRefresh?: () => Promise<unknown>; scroll?: boolean; padded?: boolean; tabBar?: boolean; tint?: boolean }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const y = useSharedValue(0);
  const scrollY = useRef(0);
  const setScrollY = (v: number) => { scrollY.current = v; };
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; runOnJS(setScrollY)(e.contentOffset.y); });

  // Keyboard: leave room only for what it really covers, and keep the focused box visible
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const root = useRef<View>(null);
  const [bottom, setBottom] = useState(0);
  const kbTop = useKeyboardTop();
  const kbRef = useRef<number | null>(null);
  kbRef.current = kbTop;
  const measure = () => root.current?.measureInWindow((_x, top, _w, h) => { if (h) setBottom(top + h); });
  const reveal = useCallback(() => { setTimeout(() => revealFocusedInput(scrollRef.current as any, scrollY.current, kbRef.current), 120); }, [scrollRef]);
  useInputFocus(reveal);
  useEffect(() => { if (kbTop != null) { measure(); reveal(); } }, [kbTop, reveal]);
  const covered = kbTop != null && bottom ? Math.max(0, bottom - kbTop) : 0;
  const headerAnim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(y.value, [0, 24], [tint ? 'rgba(255,255,255,0)' : colors.bg, colors.white]),
    borderBottomColor: interpolateColor(y.value, [0, 24], ['rgba(227,236,234,0)', colors.border]),
  }));
  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };
  const header = (title || back || right) ? (
    <Animated.View style={[styles.headerWrap, { paddingTop: insets.top + 8 }, headerAnim]}>
      <View style={styles.header}>
        {back && (
          <Press onPress={goBack} hitSlop={10} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.4} />
          </Press>
        )}
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          {title ? <T v={back ? 'h2' : 'h1'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{title}</T> : null}
          {subtitle ? <T v="small" c={colors.text2} numberOfLines={1}>{subtitle}</T> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </Animated.View>
  ) : <View style={{ height: insets.top }} />;

  const body = { paddingHorizontal: padded ? 16 : 0, paddingTop: 6, paddingBottom: covered ? covered + 24 : (tabBar ? 104 : 32) + insets.bottom, gap: 12, width: '100%' as const, maxWidth: 760, alignSelf: 'center' as const };

  return (
    <View ref={root} onLayout={measure} style={styles.root}>
      {tint && <LinearGradient pointerEvents="none" colors={[colors.mint200, colors.mint50, colors.bg]} locations={[0, 0.55, 1]} style={styles.tint} />}
      {header}
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand600} colors={[colors.brand600]} /> : undefined}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      )}
    </View>
  );
};

export const Section = ({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: ReactNode }) => (
  <View style={{ gap: 10 }}>
    <View style={styles.sectionHead}>
      <T v="h2">{title}</T>
      {action && onAction ? (
        <Press hitSlop={10} scaleTo={0.94} onPress={onAction} accessibilityRole="button" style={styles.sectionAction}>
          <T v="small" w="bold" c={colors.brand700}>{action}</T>
          <ChevronRight size={16} color={colors.brand700} strokeWidth={2.4} />
        </Press>
      ) : null}
    </View>
    {children}
  </View>
);

// Fades list items in one after another
export const Appear = ({ i = 0, children }: { i?: number; children: ReactNode }) => (
  <Animated.View entering={FadeInDown.duration(260).delay(Math.min(i, 6) * 35)}>{children}</Animated.View>
);

// Tappable row with icon, text and trailing content.
// `right` is display-only (amount, badge) and part of the tap area;
// `actions` holds its own buttons (call, WhatsApp) and sits beside the tap area.
export const ListRow = ({
  icon, tone = 'mint', leading, title, sub, meta, right, actions, onPress, chevron = !!onPress,
}: { icon?: LucideIcon; tone?: Tone; leading?: ReactNode; title: string; sub?: string; meta?: string; right?: ReactNode; actions?: ReactNode; onPress?: () => void; chevron?: boolean }) => {
  const main = (
    <>
      {leading || (icon ? <IconTile icon={icon} tone={tone} /> : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="title" numberOfLines={1}>{title}</T>
        {sub ? <T v="small" c={colors.text2} numberOfLines={2}>{sub}</T> : null}
        {meta ? <T v="caption" c={colors.text3} numberOfLines={1}>{meta}</T> : null}
      </View>
      {right}
      {onPress && chevron ? <ChevronRight size={18} color={colors.text3} strokeWidth={2.2} /> : null}
    </>
  );
  const body = onPress ? (
    <Press onPress={onPress} scaleTo={0.985} style={styles.rowMain} accessibilityRole="button">{main}</Press>
  ) : <View style={styles.rowMain}>{main}</View>;
  return (
    <View style={styles.row}>
      {body}
      {actions ? <View style={styles.rowRight}>{actions}</View> : null}
    </View>
  );
};

// Number tile for dashboards
export const Stat = ({ icon, tone = 'white', label, value, caption, onPress }: { icon: LucideIcon; tone?: Tone; label: string; value: string | number; caption?: string; onPress?: () => void }) => {
  const t = tones[tone];
  const content = (
    <>
      <View style={styles.statBlob} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconTile icon={icon} tone={tone === 'white' ? 'mint' : tone === 'sun' ? 'sun' : 'white'} size={30} />
        <T v="small" w="semibold" c={colors.text2} numberOfLines={1} style={{ flex: 1 }}>{label}</T>
      </View>
      <T v="h1" style={{ fontSize: 22, marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
      {caption ? <T v="caption" c={colors.text2} numberOfLines={1}>{caption}</T> : null}
    </>
  );
  const style = [styles.stat, { backgroundColor: t.bg === colors.brand600 ? colors.white : t.bg, borderColor: t.border }];
  return onPress ? (
    <Press onPress={onPress} accessibilityRole="button" style={style}>{content}</Press>
  ) : <View style={style}>{content}</View>;
};

// Equal-width tiles, `cols` per row
export const Grid = ({ children, cols = 2 }: { children: ReactNode[]; cols?: number }) => {
  const items = children.filter(Boolean);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {r.map((c, j) => <View key={j} style={{ flex: 1 }}>{c}</View>)}
          {Array.from({ length: cols - r.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { borderBottomWidth: 1, zIndex: 2 },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, minHeight: 52, width: '100%', maxWidth: 760, alignSelf: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 14 },
  stat: { borderRadius: 18, borderWidth: 1, padding: 12, overflow: 'hidden', ...shadow.card },
  statBlob: { position: 'absolute', right: -22, top: -22, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.45)' },
});
