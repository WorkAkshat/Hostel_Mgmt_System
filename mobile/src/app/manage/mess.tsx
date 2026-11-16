import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock, Coffee, Cookie, Moon, Pencil, Save, Soup, Utensils } from 'lucide-react-native';
import { messApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { isoDay } from '../../lib/format';
import { MealConfig, WEEK_DAYS, dayName, getMergedMeals, mealState, normalizeMenu } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, IconTile, Press, Progress, Row, Segmented, T } from '../../ui/primitives';
import { Field, Input } from '../../ui/form';
import { ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';

const ICONS: Record<string, any> = { breakfast: Coffee, lunch: Soup, snacks: Cookie, dinner: Moon };

// Kitchen numbers (plates to cook after skips) and the weekly menu
export default function MessManage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [which, setWhich] = useState<'today' | 'tomorrow'>('today');
  const date = new Date();
  if (which === 'tomorrow') date.setDate(date.getDate() + 1);
  const kitchen = useData(['kitchen', isoDay(date)], () => messApi.kitchen(isoDay(date)));
  const stats = useData(['mess-stats'], messApi.stats);
  const menu = useData(['menu'], messApi.menu, { interval: 300_000 });
  const mealSettings = useData(['meal-settings'], messApi.mealSettings);
  const activeMeals = useMemo(() => getMergedMeals(mealSettings.data), [mealSettings.data]);

  const [editDay, setEditDay] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [editTimings, setEditTimings] = useState(false);
  const [mealDraft, setMealDraft] = useState<MealConfig[]>([]);
  const [savingTimings, setSavingTimings] = useState(false);

  const week = menu.data ? normalizeMenu(menu.data) : null;
  const day = dayName(date);
  const came = Object.fromEntries((stats.data?.mealStatsChartData || []).map((m: any) => [String(m.name).toLowerCase(), m.Attended]));
  const roster = kitchen.data?.totalEnrolledResidents ?? 0;
  const skippers = asList(kitchen.data?.optOutsList);

  const openTimingEdit = () => {
    setMealDraft(activeMeals.map((m) => ({ ...m })));
    setEditTimings(true);
  };

  const saveMealTimings = async () => {
    setSavingTimings(true);
    try {
      await messApi.saveMealSettings(mealDraft);
      toast.success('Meal timings & names saved', 'Updated across app and dashboard.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['meal-settings'] }),
        qc.invalidateQueries({ queryKey: ['menu'] }),
      ]);
      setEditTimings(false);
    } catch (e: any) {
      toast.error('Could not save', e.message);
    } finally {
      setSavingTimings(false);
    }
  };

  const openEdit = (d: string) => { setDraft({ ...(week?.[d] || {}) }); setEditDay(d); };
  const saveDay = async () => {
    if (!week || !editDay) return;
    setBusy(true);
    try {
      await messApi.saveMenu({ ...week, [editDay]: draft });
      toast.success(`${editDay}'s menu saved`, 'Students see it right away.');
      await qc.invalidateQueries({ queryKey: ['menu'] });
      setEditDay(null);
    } catch (e: any) { toast.error('Could not save', e.message); } finally { setBusy(false); }
  };

  return (
    <Screen
      title="Mess & kitchen"
      subtitle={`${roster} residents on the roster`}
      back
      tabBar={false}
      onRefresh={() => Promise.all([kitchen.refetch(), stats.refetch(), menu.refetch(), mealSettings.refetch()])}
    >
      <Segmented value={which} onChange={setWhich} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }]} />
      {kitchen.error ? <ErrorBox message={(kitchen.error as Error).message} onRetry={kitchen.refetch} /> : kitchen.isLoading ? <Loading rows={4} h={90} /> : activeMeals.map((m, i) => {
        const cook = kitchen.data?.expectedMealCounts?.[m.type] ?? roster;
        const skipped = kitchen.data?.optOutCounts?.[m.type] ?? 0;
        const state = mealState(m.window || [0, 1440], date);
        return (
          <Appear key={`${which}-${m.key}`} i={i}>
            <Card tone={state === 'serving' ? 'sun' : undefined} style={{ gap: 10 }}>
              <Row>
                <IconTile icon={ICONS[m.key] || Utensils} tone={state === 'serving' ? 'white' : 'peach'} />
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <T v="title">{m.label}</T>
                    {m.time ? <T v="caption" c={colors.text3}>· {m.time}</T> : null}
                    {state === 'serving' && <Badge label="Serving" tone="sun" />}
                  </Row>
                  <T v="small" c={colors.text2} numberOfLines={1}>{week?.[day]?.[m.key] || 'Menu not set'}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="h1">{cook}</T>
                  <T v="caption" c={colors.text3}>plates</T>
                </View>
              </Row>
              {skipped > 0 && <T v="caption" c={colors.warning}>{skipped} skipped this meal</T>}
              {which === 'today' && state !== 'upcoming' && came[m.key] != null && (
                <View style={{ gap: 4 }}>
                  <T v="caption" c={colors.text3}>{came[m.key]} of {cook} checked in</T>
                  <Progress value={came[m.key]} max={cook || 1} height={6} color={colors.sun400} />
                </View>
              )}
            </Card>
          </Appear>
        );
      })}

      {skippers.length > 0 && (
        <Section title={`Skipping ${which}`}>
          {skippers.map((o: any) => (
            <ListRow key={o.id} leading={<Avatar name={o.student?.user?.name} size={36} />} title={o.student?.user?.name || 'Student'} sub={`Room ${o.student?.room?.roomNumber || '—'}`} right={<Badge label={activeMeals.find((m) => m.type === o.mealType)?.label || o.mealType} tone="peach" />} />
          ))}
        </Section>
      )}

      {week && (
        <Section
          title="Weekly menu"
          action="Edit timings & names"
          onAction={openTimingEdit}
        >
          {WEEK_DAYS.map((d) => (
            <ListRow
              key={d}
              icon={ChefHat}
              tone={d === dayName() ? 'sun' : 'mint'}
              title={d}
              sub={activeMeals.map((m) => week[d]?.[m.key]).filter(Boolean).join(' · ') || 'Not set'}
              right={<Pencil size={16} color={colors.text3} />}
              chevron={false}
              onPress={() => openEdit(d)}
            />
          ))}
        </Section>
      )}

      {/* Edit Day Menu Sheet */}
      <Sheet open={!!editDay} onClose={() => setEditDay(null)} title={`${editDay} menu`} footer={<Button title="Save menu" icon={Save} kind="brand" onPress={saveDay} loading={busy} full />}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <T v="caption" c={colors.text3}>Dishes for {editDay}</T>
          <Press onPress={() => { setEditDay(null); setTimeout(openTimingEdit, 250); }}>
            <Row gap={4} style={{ alignItems: 'center' }}>
              <Clock size={13} color={colors.brand700} />
              <T v="small" w="bold" c={colors.brand700}>Change meal names / timings</T>
            </Row>
          </Press>
        </Row>
        {activeMeals.map((m) => (
          <Field key={m.key} label={`${m.label} · ${m.time}`}>
            <Input value={draft[m.key] || ''} onChangeText={(v) => setDraft((x) => ({ ...x, [m.key]: v }))} placeholder="e.g. Poha, tea" />
          </Field>
        ))}
      </Sheet>

      {/* Edit Meal Timings and Names Sheet */}
      <Sheet
        open={editTimings}
        onClose={() => setEditTimings(false)}
        title="Meal timings & names"
        subtitle="Customize names (e.g. Snacks → Tea Time) and serving hours"
        footer={
          <Button
            title="Save meal settings"
            icon={Save}
            kind="brand"
            onPress={saveMealTimings}
            loading={savingTimings}
            full
          />
        }
      >
        <View style={{ gap: 14 }}>
          {mealDraft.map((m, idx) => (
            <Card key={m.key} style={{ gap: 10, padding: 12 }}>
              <Row gap={8} style={{ alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={14} color={colors.brand700} />
                </View>
                <T v="small" w="bold">Meal #{idx + 1} ({m.key})</T>
              </Row>
              <Field label="Meal display name" hint="e.g. Breakfast, Lunch, Tea Time, Dinner">
                <Input
                  value={m.label}
                  onChangeText={(v) => setMealDraft((curr) => curr.map((item, i) => (i === idx ? { ...item, label: v } : item)))}
                  placeholder="e.g. Tea Time"
                />
              </Field>
              <Field label="Serving timing" hint="e.g. 7:30–9:00 AM, 4:30–5:30 PM">
                <Input
                  value={m.time}
                  onChangeText={(v) => setMealDraft((curr) => curr.map((item, i) => (i === idx ? { ...item, time: v } : item)))}
                  placeholder="e.g. 4:30–5:30 PM"
                />
              </Field>
            </Card>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
