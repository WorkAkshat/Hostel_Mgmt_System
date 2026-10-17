import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Search, type LucideIcon } from 'lucide-react-native';
import { colors, fonts, radius } from './theme';
import { Button, Press, Row, T, tap } from './primitives';
import { notifyInputFocus } from './keyboard';
import { Sheet } from './Sheet';

export const Field = ({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) => (
  <View style={{ gap: 6 }}>
    <T v="small" w="semibold">{label}{required ? <T v="small" c={colors.danger}> *</T> : null}</T>
    {children}
    {error ? <T v="caption" c={colors.danger}>{error}</T> : hint ? <T v="caption" c={colors.text3}>{hint}</T> : null}
  </View>
);

export const Input = ({ prefix, invalid, style, multiline, ...rest }: TextInputProps & { prefix?: string; invalid?: boolean; ref?: React.Ref<TextInput> }) => (
  <View style={[styles.input, multiline && { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: 10 }, invalid && styles.invalid]}>
    {prefix ? <T w="bold" c={rest.value ? colors.text : colors.text3} style={{ fontSize: 16 }}>{prefix}</T> : null}
    <TextInput
      maxFontSizeMultiplier={1.1}
      placeholderTextColor={colors.text3}
      multiline={multiline}
      numberOfLines={multiline ? undefined : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[styles.inputText, multiline && { minHeight: 76 }, style]}
      {...rest}
      onFocus={(e) => { notifyInputFocus(); rest.onFocus?.(e); }}
    />
  </View>
);

export const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
export const money = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 9);

// Grid of tappable choices (leave type, payment method…)
export const Choices = <V extends string>({ options, value, onChange, columns = 2, pills }: { options: { value: V; label: string; hint?: string; icon?: LucideIcon }[]; value: V; onChange: (v: V) => void; columns?: number; pills?: boolean }) => {
  // Long lists (expense type, category…): small pills that wrap, sized to their words
  if (pills) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          const Icon = o.icon;
          return (
            <Press key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} scaleTo={0.94} onPress={() => onChange(o.value)} style={[styles.pill, on && styles.choiceOn]}>
              {Icon && <Icon size={16} color={on ? colors.sun900 : colors.text2} />}
              <T v="small" w="semibold" c={on ? colors.sun900 : colors.text} numberOfLines={1}>{o.label}</T>
            </Press>
          );
        })}
      </View>
    );
  }
  const rows: (typeof options)[] = [];
  for (let i = 0; i < options.length; i += columns) rows.push(options.slice(i, i + columns));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {r.map((o) => {
            const on = o.value === value;
            const Icon = o.icon;
            return (
              <Press
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                scaleTo={0.95}
                onPress={() => onChange(o.value)}
                style={[styles.choice, on && styles.choiceOn]}
              >
                {Icon && <Icon size={20} color={on ? colors.sun900 : colors.text2} />}
                <T v="small" w="semibold" c={on ? colors.sun900 : colors.text} center numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{o.label}</T>
                {o.hint ? <T v="caption" c={on ? colors.sun800 : colors.text3} center numberOfLines={2}>{o.hint}</T> : null}
              </Press>
            );
          })}
          {Array.from({ length: columns - r.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
};

// Searchable list in a sheet (rooms, students…)
export type PickItem = { value: string; label: string; sub?: string };
export const Picker = ({ label, value, items, onChange, placeholder = 'Choose', searchable }: { label: string; value: string; items: PickItem[]; onChange: (v: string) => void; placeholder?: string; searchable?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [qtext, setQ] = useState('');
  const current = items.find((i) => i.value === value);
  const shown = useMemo(() => {
    const s = qtext.trim().toLowerCase();
    return s ? items.filter((i) => `${i.label} ${i.sub || ''}`.toLowerCase().includes(s)) : items;
  }, [items, qtext]);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.input} accessibilityRole="button" accessibilityLabel={label}>
        <T style={{ flex: 1 }} c={current ? colors.text : colors.text3} numberOfLines={1}>{current ? current.label : placeholder}</T>
        <ChevronDown size={18} color={colors.text3} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {searchable && <Input value={qtext} onChangeText={setQ} placeholder="Search" autoFocus />}
        <View style={{ gap: 6 }}>
          {shown.map((i) => {
            const on = i.value === value;
            return (
              <Pressable key={i.value} onPress={() => { onChange(i.value); setOpen(false); setQ(''); }} style={[styles.pickRow, on && { backgroundColor: colors.sun200 }]}>
                <T v="title" w={on ? 'bold' : 'semibold'}>{i.label}</T>
                {i.sub ? <T v="caption" c={colors.text3}>{i.sub}</T> : null}
              </Pressable>
            );
          })}
          {!shown.length && <T v="small" c={colors.text3} center style={{ paddingVertical: 20 }}>Nothing matches.</T>}
        </View>
      </Sheet>
    </>
  );
};

// ── Date + time picker (pure JS, same on every platform) ──
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TIMES = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00'];
const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDateTime = (d: Date) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const DateTimeField = ({ label, value, onChange, minDate, withTime = true }: { label: string; value: Date | null; onChange: (d: Date) => void; minDate?: Date; withTime?: boolean }) => {
  const [open, setOpen] = useState(false);
  const base = value || minDate || new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [day, setDay] = useState<Date | null>(value);
  const [time, setTime] = useState(value ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : '18:00');

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const min = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(view.y, view.m, i + 1))];

  const confirm = () => {
    if (!day) return;
    const [h, mi] = withTime ? time.split(':').map(Number) : [0, 0];
    onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, mi));
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.input} accessibilityRole="button" accessibilityLabel={label}>
        <CalendarDays size={18} color={colors.text3} />
        <T style={{ flex: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} c={value ? colors.text : colors.text3}>{value ? (withTime ? fmtDateTime(value) : value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : 'Pick a date'}</T>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}
        footer={<Button title="Done" onPress={confirm} disabled={!day} full />}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable hitSlop={10} onPress={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} style={styles.navBtn} accessibilityLabel="Previous month"><ChevronLeft size={18} color={colors.text} /></Pressable>
          <T v="title">{MONTHS[view.m]} {view.y}</T>
          <Pressable hitSlop={10} onPress={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} style={styles.navBtn} accessibilityLabel="Next month"><ChevronRight size={18} color={colors.text} /></Pressable>
        </Row>
        <View style={styles.grid}>
          {WD.map((w, i) => <T key={`w${i}`} v="caption" c={colors.text3} center style={styles.cell}>{w}</T>)}
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const off = !!(min && d < min);
            const on = !!day && d.toDateString() === day.toDateString();
            const today = d.toDateString() === new Date().toDateString();
            return (
              <Pressable key={d.toISOString()} disabled={off} onPress={() => { tap(); setDay(d); }} style={[styles.cell, styles.dayCell, on && { backgroundColor: colors.sun300 }, today && !on && { borderWidth: 1, borderColor: colors.brand300 }]}>
                <T v="small" w={on ? 'bold' : 'medium'} c={off ? colors.borderStrong : on ? colors.sun900 : colors.text}>{d.getDate()}</T>
              </Pressable>
            );
          })}
        </View>
        {withTime && (
          <View style={{ gap: 8 }}>
            <T v="small" w="semibold">Time</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {TIMES.map((t) => {
                const on = t === time;
                const [h] = t.split(':').map(Number);
                return (
                  <Pressable key={t} onPress={() => { tap(); setTime(t); }} style={[styles.timeChip, on && { backgroundColor: colors.sun300, borderColor: colors.sun300 }]}>
                    <T v="small" w={on ? 'bold' : 'medium'} c={on ? colors.sun900 : colors.text2}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </Sheet>
    </>
  );
};

export const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <View style={styles.input}>
    <Search size={17} color={colors.text3} />
    <TextInput maxFontSizeMultiplier={1.1} numberOfLines={1} onFocus={notifyInputFocus} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.text3} style={styles.inputText} returnKeyType="search" />
  </View>
);

const styles = StyleSheet.create({
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text, paddingVertical: 0, outlineStyle: 'none' } as any,
  invalid: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  choice: { flex: 1, minHeight: 62, paddingHorizontal: 4, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 3 },
  choiceOn: { backgroundColor: colors.sun300, borderColor: colors.sun300 },
  pickRow: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bg, gap: 2 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, height: 40, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 12 },
  timeChip: { height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
