import { Children, Fragment, ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { colors, Gradient, gradients, radius, shadow, Tone, tones } from './theme';
import { IconTile, Press, T } from './primitives';

// ── Hero: gradient card with soft decorative circles, white text inside ──
export const Hero = ({ children, gradient = 'brand', style, onPress }: { children: ReactNode; gradient?: Gradient; style?: StyleProp<ViewStyle>; onPress?: () => void }) => {
  const body = (
    <LinearGradient colors={gradients[gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      <View pointerEvents="none" style={[styles.blob, { right: -40, top: -50, width: 160, height: 160 }]} />
      <View pointerEvents="none" style={[styles.blob, { right: 40, bottom: -70, width: 120, height: 120, opacity: 0.6 }]} />
      {children}
    </LinearGradient>
  );
  const shell = [styles.heroShadow, { backgroundColor: gradients[gradient][1] }];
  if (!onPress) return <View style={shell}>{body}</View>;
  return (
    <Press onPress={onPress} scaleTo={0.985} accessibilityRole="button" style={shell}>
      {body}
    </Press>
  );
};

// Text colours that read well on a gradient
export const onHero = { strong: colors.white, soft: 'rgba(255,255,255,0.82)', faint: 'rgba(255,255,255,0.62)' };
export const onSun = { strong: colors.sun900, soft: colors.sun800, faint: 'rgba(61,47,6,0.6)' };

// Frosted cells along the bottom of a hero (Floor · Sharing · AC)
// `active` turns a cell white, so the cells can double as tabs.
export const HeroCells = ({ items, dark, big }: { items: { k: string; v: string; onPress?: () => void; active?: boolean }[]; dark?: boolean; big?: boolean }) => (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    {items.map((x) => {
      const inner = (
        <>
          <T v="caption" c={x.active ? colors.brand600 : dark ? onSun.faint : onHero.faint} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{x.k}</T>
          <T v={big ? 'h1' : 'title'} w="bold" c={x.active ? colors.brand900 : dark ? onSun.strong : onHero.strong} numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
        </>
      );
      const style = [styles.cell, dark && styles.cellDark, x.active && styles.cellOn];
      return x.onPress ? (
        <Press key={x.k} accessibilityRole="button" accessibilityState={{ selected: !!x.active }} scaleTo={0.94} onPress={x.onPress} style={style}>{inner}</Press>
      ) : <View key={x.k} style={style}>{inner}</View>;
    })}
  </View>
);

// Small pill on a hero (status, floor…)
export const HeroPill = ({ label, icon: Icon, dark }: { label: string; icon?: LucideIcon; dark?: boolean }) => (
  <View style={[styles.pill, dark && styles.cellDark]}>
    {Icon && <Icon size={12} color={dark ? onSun.strong : colors.white} />}
    <T v="caption" w="bold" c={dark ? onSun.strong : colors.white}>{label}</T>
  </View>
);

// ── Menu: grouped rows in one card, like phone settings ──
export const Menu = ({ title, children }: { title?: string; children: ReactNode }) => {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {title ? <T v="label" c={colors.text3} style={{ paddingHorizontal: 4 }}>{title}</T> : null}
      <View style={styles.menu}>
        {items.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.menuLine} />}
            {c}
          </Fragment>
        ))}
      </View>
    </View>
  );
};

export const MenuItem = ({ icon, tone = 'mint', title, sub, right, onPress, danger }: { icon: LucideIcon; tone?: Tone; title: string; sub?: string; right?: ReactNode; onPress: () => void; danger?: boolean }) => (
  <Press onPress={onPress} scaleTo={0.98} accessibilityRole="button" style={styles.menuItem}>
    <IconTile icon={icon} tone={danger ? 'danger' : tone} size={38} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <T v="title" c={danger ? colors.danger : colors.text} numberOfLines={1}>{title}</T>
      {sub ? <T v="caption" c={colors.text3} numberOfLines={1}>{sub}</T> : null}
    </View>
    {right}
    {!danger && <ChevronRight size={18} color={colors.text3} strokeWidth={2.2} />}
  </Press>
);

// ── Category tiles: big tappable tabs with an icon and a count ──
export type TileTab<V extends string> = { value: V; label: string; icon: LucideIcon; tone: Tone; count?: number };
export const TileTabs = <V extends string>({ items, value, onChange, stacked }: { items: TileTab<V>[]; value: V; onChange: (v: V) => void; stacked?: boolean }) => {
  // stacked: all tiles in one row, icon + count on top and the label underneath
  if (stacked) {
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {items.map((t) => {
          const on = t.value === value;
          return (
            <Press key={t.value} onPress={() => onChange(t.value)} scaleTo={0.95} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, ${t.count ?? 0}`}
              style={[styles.tile, styles.tileStacked, on && styles.tileOn]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                <View style={[styles.tileIcon, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : tones[t.tone].bg }]}><t.icon size={18} color={on ? colors.white : tones[t.tone].fg} /></View>
                {t.count != null && <T v="h2" c={on ? colors.white : colors.text}>{t.count}</T>}
              </View>
              <T v="caption" w="bold" c={on ? colors.white : colors.text} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ alignSelf: 'stretch', fontSize: 11.5 }}>{t.label}</T>
            </Press>
          );
        })}
      </View>
    );
  }
  const rows: TileTab<V>[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {r.map((t) => {
            const on = t.value === value;
            return (
              <Press key={t.value} onPress={() => onChange(t.value)} scaleTo={0.96} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, ${t.count ?? 0} waiting`}
                style={[styles.tile, on && styles.tileOn]}>
                <View style={[styles.tileIcon, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : tones[t.tone].bg }]}>
                  <t.icon size={18} color={on ? colors.white : tones[t.tone].fg} />
                </View>
                <T v="small" w="bold" c={on ? colors.white : colors.text} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flex: 1 }}>{t.label}</T>
                {t.count != null && (
                  <View style={[styles.tileCount, t.count > 0 && !on && { backgroundColor: colors.sun300 }, on && { backgroundColor: colors.white }]}>
                    <T v="caption" w="bold" c={on ? colors.brand700 : t.count > 0 ? colors.sun900 : colors.text3} style={{ lineHeight: 14 }}>{t.count}</T>
                  </View>
                )}
              </Press>
            );
          })}
          {r.length < 2 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
};

// ── Quick actions: round icon tiles with a label underneath ──
export type QuickAction = { icon: LucideIcon; tone: Tone; label: string; onPress: () => void; badge?: number };
export const QuickActions = ({ items, cols = 4 }: { items: QuickAction[]; cols?: number }) => {
  const rows: QuickAction[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={styles.quick}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {r.map((a) => (
            <Press key={a.label} onPress={a.onPress} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={a.label} style={styles.quickItem}>
              <View style={[styles.quickIcon, { backgroundColor: tones[a.tone].bg, borderColor: tones[a.tone].border }]}>
                <a.icon size={22} color={tones[a.tone].fg} />
                {a.badge ? <View style={styles.quickBadge}><T v="caption" w="bold" c={colors.white} style={{ fontSize: 10 }}>{a.badge > 9 ? '9+' : a.badge}</T></View> : null}
              </View>
              <T v="caption" w="semibold" center numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ lineHeight: 15, alignSelf: 'stretch' }}>{a.label}</T>
            </Press>
          ))}
          {Array.from({ length: cols - r.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  heroShadow: { borderRadius: 24, ...shadow.lift, shadowColor: colors.brand900, shadowOpacity: 0.18 },
  hero: { borderRadius: 22, padding: 16, gap: 12, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  cell: { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  cellOn: { backgroundColor: colors.white, borderColor: colors.white },
  cellDark: { backgroundColor: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.5)' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  menu: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  menuLine: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.white },
  quick: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 4, gap: 12, ...shadow.card },
  quickItem: { flex: 1, alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 54, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, ...shadow.card },
  tileStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 8, paddingVertical: 10 },
  tileOn: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileCount: { minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  quickBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
});
