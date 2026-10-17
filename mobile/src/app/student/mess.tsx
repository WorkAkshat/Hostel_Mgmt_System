import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, CircleCheck, Megaphone, MessageSquareWarning, Undo2 } from 'lucide-react-native';
import { messApi, noticesApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, isoDay, timeAgo } from '../../lib/format';
import { MEALS, WEEK_DAYS, dayName, mealState, normalizeMenu } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Badge, Button, Card, IconTile, Row, Segmented, T, tap } from '../../ui/primitives';
import { ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../ui/layout';
import { Hero, HeroCells, onHero } from '../../ui/blocks';
import { MEAL_ICONS } from '../../features/mealIcons';
import { go } from '../../lib/nav';


export default function StudentMess() {
  const qc = useQueryClient();
  const toast = useToast();
  const menu = useData(['menu'], messApi.menu, { interval: 300_000 });
  const skips = useData(['my-opt-outs'], messApi.myOptOuts);
  const logs = useData(['my-mess-attendance'], messApi.myAttendance);
  const notices = useData(['notices', 'MESS'], () => noticesApi.all('MESS'));
  const [which, setWhich] = useState<'today' | 'tomorrow'>('today');
  const [busy, setBusy] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(dayName());

  const date = new Date();
  if (which === 'tomorrow') date.setDate(date.getDate() + 1);
  const key = isoDay(date);
  const day = dayName(date);
  const week = menu.data ? normalizeMenu(menu.data) : null;
  const skipList = asList(skips.data);
  const ateToday = asList(logs.data).filter((l: any) => l.date === isoDay()).map((l: any) => l.mealType);

  // The meal being served now, or the next one (tomorrow's breakfast late at night)
  const nowMeal = MEALS.find((m) => mealState(m.window) !== 'over');
  const next = nowMeal ? { meal: nowMeal, day: dayName(), serving: mealState(nowMeal.window) === 'serving' } : { meal: MEALS[0], day: dayName(new Date(Date.now() + 86400000)), serving: false };
  const NextIcon = MEAL_ICONS[next.meal.key];
  const month = isoDay().slice(0, 7);
  const skippedMonth = skipList.filter((o: any) => String(o.date).startsWith(month)).length;
  const ateMonth = asList(logs.data).filter((l: any) => String(l.date).startsWith(month)).length;

  const skip = async (type: string, label: string) => {
    setBusy(type);
    try {
      await messApi.skip(type, key);
      toast.success(`${label} skipped`, 'The kitchen will cook one plate less.');
      await qc.invalidateQueries({ queryKey: ['my-opt-outs'] });
    } catch (e: any) { toast.error('Could not skip', e.message); } finally { setBusy(null); }
  };
  const undo = async (id: string, type: string, label: string) => {
    setBusy(type);
    try {
      await messApi.unskip(id);
      toast.success(`You're eating ${label.toLowerCase()} again`);
      await qc.invalidateQueries({ queryKey: ['my-opt-outs'] });
    } catch (e: any) { toast.error('Could not undo', e.message); } finally { setBusy(null); }
  };

  return (
    <Screen title="Mess" subtitle="Menu and meal skips" onRefresh={() => Promise.all([menu.refetch(), skips.refetch(), logs.refetch(), notices.refetch()])}>
      <Appear>
        <Hero gradient={next.serving ? 'sun' : 'brand'}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label" c={next.serving ? 'rgba(61,47,6,0.6)' : onHero.faint}>{next.serving ? 'Serving now' : next.day === dayName() ? 'Next meal' : 'Tomorrow'}</T>
              <T v="h1" c={next.serving ? colors.sun900 : onHero.strong}>{next.meal.label} · {next.meal.time.split('–')[0]}</T>
              <T v="small" c={next.serving ? colors.sun800 : onHero.soft} numberOfLines={2}>{week?.[next.day]?.[next.meal.key] || 'Menu not set yet'}</T>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <NextIcon size={24} color={next.serving ? colors.sun900 : colors.white} />
            </View>
          </View>
          <HeroCells dark={next.serving} items={[{ k: 'Eaten', v: String(ateMonth) }, { k: 'Skipped', v: String(skippedMonth) }, { k: 'Ends', v: (next.meal.time.split('–')[1] || next.meal.time).replace(/\s?[AP]M/, '').trim() }]} />
        </Hero>
      </Appear>

      <Segmented value={which} onChange={setWhich} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }]} />
      {menu.error ? <ErrorBox message={(menu.error as Error).message} onRetry={menu.refetch} /> : !week ? <Loading rows={4} h={76} /> : (
        <View style={{ gap: 10 }}>
          <T v="small" c={colors.text3}>{fmtDate(date, { weekday: 'long' })} · counts are for this month</T>
          {MEALS.map((m, i) => {
            const Icon = MEAL_ICONS[m.key];
            const state = mealState(m.window, date);
            const record = skipList.find((o: any) => o.date === key && o.mealType === m.type);
            const ate = which === 'today' && ateToday.includes(m.type);
            return (
              <Appear key={`${which}-${m.key}`} i={i}>
                <Card tone={state === 'serving' && !record ? 'sun' : undefined} style={[{ gap: 10 }, record && { borderStyle: 'dashed' }]}>
                  <Row>
                    <IconTile icon={Icon} tone={state === 'serving' && !record ? 'white' : 'peach'} />
                    <View style={{ flex: 1 }}>
                      <Row gap={6} style={{ flexWrap: 'wrap', rowGap: 0 }}><T v="title">{m.label}</T><T v="caption" c={colors.text3} numberOfLines={1}>{m.time}</T></Row>
                      <T v="small" c={record ? colors.text3 : colors.text2} style={record ? { textDecorationLine: 'line-through' } : undefined}>{week[day]?.[m.key] || 'Menu not set'}</T>
                    </View>
                    {ate ? <Badge label="Ate" tone="success" icon={CircleCheck} />
                      : record ? (state === 'upcoming'
                        ? <Button title="Undo" icon={Undo2} kind="secondary" small loading={busy === m.type} onPress={() => undo(record.id, m.type, m.label)} />
                        : <Badge label="Skipped" tone="white" />)
                      : state === 'upcoming' ? <Button title="Skip" kind="secondary" small loading={busy === m.type} onPress={() => skip(m.type, m.label)} />
                      : state === 'serving' ? <Badge label="Now" tone="sun" />
                      : <Badge label="Served" tone="white" />}
                  </Row>
                  {record && <T v="caption" c={colors.text3}>You skipped this meal{state === 'upcoming' ? ' — tap Undo if you will eat' : ''}.</T>}
                </Card>
              </Appear>
            );
          })}
        </View>
      )}

      <ListRow icon={MessageSquareWarning} tone="peach" title="Problem with the food?" sub="Tell the warden through the helpdesk" onPress={() => go({ pathname: '/helpdesk', params: { new: '1', category: 'Mess & Food' } })} />

      {asList(notices.data).length > 0 && (
        <Section title="Mess notices">
          {asList(notices.data).slice(0, 4).map((n: any) => <ListRow key={n.id} icon={Megaphone} title={n.title} sub={n.content} meta={timeAgo(n.createdAt)} />)}
        </Section>
      )}

      {week && (
        <Section title="This week's menu">
          <Card padded={false}>
            {WEEK_DAYS.map((d, i) => {
              const open = openDay === d;
              const isToday = d === dayName();
              return (
                <View key={d} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>
                  <Pressable onPress={() => { tap(); setOpenDay(open ? null : d); }} style={styles.dayHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                    <T v="title" style={{ flex: 1 }}>{d}</T>
                    {isToday && <Badge label="Today" tone="sun" />}
                    <ChevronDown size={18} color={colors.text3} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                  </Pressable>
                  {open && (
                    <View style={styles.dayBody}>
                      {MEALS.map((m) => (
                        <Row key={m.key} align="flex-start">
                          <T v="small" w="semibold" style={{ width: 82 }}>{m.label}</T>
                          <T v="small" c={colors.text2} style={{ flex: 1 }}>{week[d]?.[m.key] || '—'}</T>
                        </Row>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  dayBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
});
