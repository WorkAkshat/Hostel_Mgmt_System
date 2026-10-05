import { useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Coffee, Cookie, Moon, Pencil, Save, Soup } from 'lucide-react-native';
import { messApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { isoDay } from '../../lib/format';
import { MEALS, WEEK_DAYS, dayName, mealState, normalizeMenu } from '../../lib/hostel';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, IconTile, Progress, Row, Segmented, T } from '../../ui/primitives';
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
  const [editDay, setEditDay] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const week = menu.data ? normalizeMenu(menu.data) : null;
  const day = dayName(date);
  const came = Object.fromEntries((stats.data?.mealStatsChartData || []).map((m: any) => [String(m.name).toLowerCase(), m.Attended]));
  const roster = kitchen.data?.totalEnrolledResidents ?? 0;
  const skippers = asList(kitchen.data?.optOutsList);

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
    <Screen title="Mess & kitchen" subtitle={`${roster} residents on the roster`} back tabBar={false} onRefresh={() => Promise.all([kitchen.refetch(), stats.refetch(), menu.refetch()])}>
      <Segmented value={which} onChange={setWhich} options={[{ value: 'today', label: 'Today' }, { value: 'tomorrow', label: 'Tomorrow' }]} />
      {kitchen.error ? <ErrorBox message={(kitchen.error as Error).message} onRetry={kitchen.refetch} /> : kitchen.isLoading ? <Loading rows={4} h={90} /> : MEALS.map((m, i) => {
        const cook = kitchen.data?.expectedMealCounts?.[m.type] ?? roster;
        const skipped = kitchen.data?.optOutCounts?.[m.type] ?? 0;
        const state = mealState(m.window, date);
        return (
          <Appear key={`${which}-${m.key}`} i={i}>
            <Card tone={state === 'serving' ? 'sun' : undefined} style={{ gap: 10 }}>
              <Row>
                <IconTile icon={ICONS[m.key]} tone={state === 'serving' ? 'white' : 'peach'} />
                <View style={{ flex: 1 }}>
                  <Row gap={6}><T v="title">{m.label}</T>{state === 'serving' && <Badge label="Serving" tone="sun" />}</Row>
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
            <ListRow key={o.id} leading={<Avatar name={o.student?.user?.name} size={36} />} title={o.student?.user?.name || 'Student'} sub={`Room ${o.student?.room?.roomNumber || '—'}`} right={<Badge label={MEALS.find((m) => m.type === o.mealType)?.label || o.mealType} tone="peach" />} />
          ))}
        </Section>
      )}

      {week && (
        <Section title="Weekly menu">
          {WEEK_DAYS.map((d) => (
            <ListRow key={d} icon={ChefHat} tone={d === dayName() ? 'sun' : 'mint'} title={d} sub={MEALS.map((m) => week[d]?.[m.key]).filter(Boolean).join(' · ') || 'Not set'} right={<Pencil size={16} color={colors.text3} />} chevron={false} onPress={() => openEdit(d)} />
          ))}
        </Section>
      )}

      <Sheet open={!!editDay} onClose={() => setEditDay(null)} title={`${editDay} menu`} footer={<Button title="Save menu" icon={Save} kind="brand" onPress={saveDay} loading={busy} full />}>
        {MEALS.map((m) => (
          <Field key={m.key} label={`${m.label} · ${m.time}`}><Input value={draft[m.key] || ''} onChangeText={(v) => setDraft((x) => ({ ...x, [m.key]: v }))} placeholder="e.g. Poha, tea" /></Field>
        ))}
      </Sheet>
    </Screen>
  );
}
