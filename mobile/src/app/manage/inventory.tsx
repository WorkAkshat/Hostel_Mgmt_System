import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Boxes, ClipboardList, Dumbbell, PackageMinus, PackagePlus, Pencil, Plus, ShoppingBasket, Sofa, Trash, TriangleAlert } from 'lucide-react-native';
import { inventoryApi, type StockCategory } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, isoDay, monthKey, rupees } from '../../lib/format';
import { colors, type Tone } from '../../ui/theme';
import { Badge, Button, Card, Divider, Row, Segmented, T } from '../../ui/primitives';
import { Choices, DateTimeField, Field, Input, SearchInput, money } from '../../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen } from '../../ui/layout';
import { TileTabs } from '../../ui/blocks';
import { Sheet } from '../../ui/Sheet';
import MonthStepper from '../../features/MonthStepper';

const CAT: Record<StockCategory, { label: string; one: string; icon: any; tone: Tone; hint: string; inLabel: string; outLabel: string }> = {
  FIXED_ASSET: { label: 'Assets', one: 'Fixed asset', icon: Sofa, tone: 'mint', hint: 'Furniture, solar plant, lift, water cooler…', inLabel: 'Add', outLabel: 'Remove' },
  INVENTORY: { label: 'Inventory', one: 'Inventory item', icon: Dumbbell, tone: 'lilac', hint: 'Gym machines, appliances, spare mattresses…', inLabel: 'Add', outLabel: 'Remove' },
  CONSUMABLE: { label: 'Consumables', one: 'Consumable', icon: ShoppingBasket, tone: 'peach', hint: 'Kitchen groceries, gas, cleaning supplies…', inLabel: 'Stock in', outLabel: 'Used' },
};
const CONDITION: Record<string, { label: string; tone: Tone }> = {
  GOOD: { label: 'Good', tone: 'success' }, NEEDS_REPAIR: { label: 'Needs repair', tone: 'warning' }, DAMAGED: { label: 'Damaged', tone: 'danger' }, DISPOSED: { label: 'Disposed', tone: 'white' },
};
const UNITS = ['pcs', 'kg', 'g', 'L', 'packet', 'box', 'bag', 'cylinder'];
const qty = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN');

// Stock register: fixed assets, other inventory and consumables. For consumables you
// log what came in and what was used, so the kitchen's monthly use is visible.
export default function Inventory() {
  const [cat, setCat] = useState<StockCategory>('CONSUMABLE');
  const [month, setMonth] = useState(monthKey());
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const items = useData(['inventory', 'items'], () => inventoryApi.items());
  const sum = useData(['inventory', 'summary', month], () => inventoryApi.summary(month));
  const all = asList(items.data);
  const counts = { FIXED_ASSET: 0, INVENTORY: 0, CONSUMABLE: 0 } as Record<StockCategory, number>;
  all.forEach((i: any) => { counts[i.category as StockCategory] = (counts[i.category as StockCategory] || 0) + 1; });
  const s = q.trim().toLowerCase();
  const shown = all.filter((i: any) => i.category === cat && (!s || [i.name, i.location, i.notes].some((v) => v && String(v).toLowerCase().includes(s))));
  const low = (sum.data?.lowStock || []) as any[];
  const flow = ((sum.data?.monthFlow || []) as any[]).filter((f) => f.category === 'CONSUMABLE');
  const open = all.find((i: any) => i.id === openId) || null;

  return (
    <Screen title="Stock register" subtitle="Assets & kitchen stock" back tabBar={false} onRefresh={() => Promise.all([items.refetch(), sum.refetch()])}
      right={<Button title="Add" icon={Plus} small onPress={() => setAdding(true)} />}>
      <TileTabs stacked value={cat} onChange={setCat} items={(Object.keys(CAT) as StockCategory[]).map((k) => ({ value: k, label: CAT[k].label, icon: CAT[k].icon, tone: CAT[k].tone, count: counts[k] }))} />

      {cat === 'CONSUMABLE' && (
        <>
          <MonthStepper value={month} onChange={setMonth} />
          <Card style={{ gap: 10 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <T v="caption" c={colors.text3}>Bought this month</T>
                <T v="h2">{rupees(flow.reduce((a, f) => a + (f.spent || 0), 0))}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T v="caption" c={colors.text3}>Items moved</T>
                <T v="h2">{flow.length}</T>
              </View>
            </Row>
            {flow.length > 0 && <Divider />}
            {flow.slice(0, 6).map((f) => (
              <Row key={f.itemId}>
                <T v="small" w="semibold" style={{ flex: 1 }} numberOfLines={1}>{f.name}</T>
                <T v="caption" c={colors.success}>+{qty(f.in)} in</T>
                <T v="caption" c={colors.peach700} style={{ minWidth: 70, textAlign: 'right' }}>−{qty(f.out)} {f.unit} used</T>
              </Row>
            ))}
            {flow.length === 0 && <T v="caption" c={colors.text3}>Nothing came in or was used in this month yet.</T>}
          </Card>
          {low.length > 0 && (
            <Card tone="danger" style={{ gap: 6 }}>
              <Row gap={8}><TriangleAlert size={18} color={colors.danger} /><T v="title" c={colors.danger}>Running low</T></Row>
              {low.map((l) => <T key={l.id} v="small" c={colors.danger}>{l.name}: {qty(l.quantity)} {l.unit} left (alert at {qty(l.minQuantity)})</T>)}
            </Card>
          )}
        </>
      )}

      {all.length > 5 && <SearchInput value={q} onChange={setQ} placeholder="Search item or place" />}
      {items.error ? <ErrorBox message={(items.error as Error).message} onRetry={items.refetch} /> : items.isLoading ? <Loading rows={4} h={70} /> : shown.length === 0 ? (
        <Empty icon={CAT[cat].icon} tone={CAT[cat].tone} title={`No ${CAT[cat].label.toLowerCase()} yet`} text={CAT[cat].hint} action={<Button title={`Add ${CAT[cat].one.toLowerCase()}`} icon={Plus} onPress={() => setAdding(true)} />} />
      ) : shown.map((i: any, idx: number) => {
        const isLow = i.category === 'CONSUMABLE' && i.minQuantity != null && i.quantity <= i.minQuantity;
        return (
          <Appear key={i.id} i={idx}>
            <ListRow icon={CAT[i.category as StockCategory].icon} tone={isLow ? 'danger' : CAT[i.category as StockCategory].tone} title={i.name}
              sub={[i.location, i.floorNumber ? `Floor ${i.floorNumber}` : null].filter(Boolean).join(' · ') || CAT[i.category as StockCategory].one}
              meta={i.category === 'CONSUMABLE' ? (isLow ? 'Running low' : i.unitCost ? `${rupees(i.unitCost)} / ${i.unit}` : undefined) : CONDITION[i.condition]?.label}
              right={<View style={{ alignItems: 'flex-end' }}><T v="title" w="bold" c={isLow ? colors.danger : colors.text}>{qty(i.quantity)}</T><T v="caption" c={colors.text3}>{i.unit}</T></View>}
              onPress={() => setOpenId(i.id)} chevron={false} />
          </Appear>
        );
      })}

      <ItemForm open={adding} onClose={() => setAdding(false)} defaultCategory={cat} />
      <ItemSheet item={open} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

const refreshKeys = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['inventory'] });

// ── Add / edit an item ──
const ItemForm = ({ open, onClose, defaultCategory, item }: { open: boolean; onClose: () => void; defaultCategory: StockCategory; item?: any }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(item ? {
      name: item.name, category: item.category, location: item.location || '', floorNumber: item.floorNumber ? String(item.floorNumber) : '', unit: item.unit,
      minQuantity: item.minQuantity != null ? String(item.minQuantity) : '', unitCost: item.unitCost != null ? String(item.unitCost) : '', condition: item.condition,
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null, notes: item.notes || '',
    } : { name: '', category: defaultCategory, location: defaultCategory === 'CONSUMABLE' ? 'Kitchen' : '', floorNumber: '', unit: defaultCategory === 'CONSUMABLE' ? 'kg' : 'pcs', openingQuantity: '', minQuantity: '', unitCost: '', condition: 'GOOD', purchaseDate: null, notes: '' });
  }, [open, item, defaultCategory]);
  const set = (k: string) => (v: any) => { setF((x: any) => ({ ...x, [k]: v })); setError(null); };
  const consumable = f.category === 'CONSUMABLE';

  const save = async () => {
    if (!String(f.name || '').trim()) return setError('Give the item a name.');
    setBusy(true); setError(null);
    const body: Record<string, unknown> = {
      name: f.name, category: f.category, location: f.location, floorNumber: f.floorNumber || null, unit: f.unit,
      minQuantity: consumable ? f.minQuantity || null : null, unitCost: f.unitCost || null, condition: f.condition,
      purchaseDate: f.purchaseDate ? isoDay(f.purchaseDate) : null, notes: f.notes,
    };
    try {
      if (item) await inventoryApi.update(item.id, body);
      else await inventoryApi.create({ ...body, openingQuantity: f.openingQuantity || 0 });
      toast.success(item ? 'Item updated' : 'Item added', f.name);
      await refreshKeys(qc);
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={item ? 'Edit item' : 'Add to stock'} footer={<Button title={item ? 'Save changes' : 'Add item'} icon={item ? Pencil : Plus} kind="brand" onPress={save} loading={busy} full />}>
      <Field label="Type"><Choices pills value={f.category || 'CONSUMABLE'} onChange={set('category')} options={(Object.keys(CAT) as StockCategory[]).map((k) => ({ value: k, label: CAT[k].label, icon: CAT[k].icon }))} /></Field>
      <Field label="Item name" required><Input value={f.name} onChangeText={set('name')} placeholder={consumable ? 'e.g. Rice (Basmati)' : f.category === 'INVENTORY' ? 'e.g. Treadmill' : 'e.g. Study table'} /></Field>
      <Row gap={10} align="flex-start">
        <View style={{ flex: 1.4 }}><Field label="Where"><Input value={f.location} onChangeText={set('location')} placeholder={consumable ? 'Kitchen' : 'e.g. Room 101, Gym, Terrace'} /></Field></View>
        <View style={{ flex: 1 }}><Field label="Floor"><Input value={f.floorNumber} onChangeText={(v) => set('floorNumber')(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="—" /></Field></View>
      </Row>
      <Field label="Counted in"><Choices pills value={f.unit || 'pcs'} onChange={set('unit')} options={UNITS.map((u) => ({ value: u, label: u }))} /></Field>
      <Row gap={10} align="flex-start">
        {!item && <View style={{ flex: 1 }}><Field label="Quantity now"><Input value={f.openingQuantity} onChangeText={(v) => set('openingQuantity')(money(v))} keyboardType="decimal-pad" placeholder="0" /></Field></View>}
        <View style={{ flex: 1 }}><Field label={`Price / ${f.unit || 'unit'}`}><Input prefix="₹" value={f.unitCost} onChangeText={(v) => set('unitCost')(money(v))} keyboardType="decimal-pad" placeholder="0" /></Field></View>
      </Row>
      {consumable ? (
        <Field label="Warn me when stock falls to" hint="Shows under “Running low”"><Input value={f.minQuantity} onChangeText={(v) => set('minQuantity')(money(v))} keyboardType="decimal-pad" placeholder={`e.g. 5 ${f.unit || ''}`} /></Field>
      ) : (
        <Field label="Condition"><Choices pills value={f.condition || 'GOOD'} onChange={set('condition')} options={Object.entries(CONDITION).map(([value, c]) => ({ value, label: c.label }))} /></Field>
      )}
      <Field label="Bought on (optional)"><DateTimeField label="Bought on" value={f.purchaseDate || null} onChange={set('purchaseDate')} withTime={false} /></Field>
      <Field label="Notes (optional)"><Input value={f.notes} onChangeText={set('notes')} placeholder="Brand, vendor, warranty…" /></Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

// ── One item: stock in / used / count, and its history ──
const ItemSheet = ({ item, onClose }: { item: any | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const moves = useData(['inventory', 'moves', item?.id], () => inventoryApi.movements(item.id), { enabled: !!item });
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => { if (item) { setType(item.category === 'CONSUMABLE' ? 'OUT' : 'IN'); setAmount(''); setCost(''); setNote(''); setDate(new Date()); setError(null); } }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = item ? CAT[item.category as StockCategory] : CAT.CONSUMABLE;
  const history = useMemo(() => asList(moves.data), [moves.data]);

  const save = async () => {
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || (type !== 'ADJUST' && n <= 0)) return setError('Enter how many.');
    setBusy(true); setError(null);
    try {
      await inventoryApi.move(item.id, { type, quantity: n, unitCost: type === 'IN' && cost ? Number(cost) : null, note, date: date ? isoDay(date) : undefined });
      toast.success(type === 'IN' ? `${c.inLabel}: ${n} ${item.unit}` : type === 'OUT' ? `${c.outLabel}: ${n} ${item.unit}` : `Stock set to ${n} ${item.unit}`, item.name);
      setAmount(''); setCost(''); setNote('');
      await refreshKeys(qc);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Sheet open={!!item && !editing} onClose={onClose} title={item?.name} subtitle={item ? [c.one, item.location, item.floorNumber ? `Floor ${item.floorNumber}` : null].filter(Boolean).join(' · ') : ''}
        footer={item && <Button title={type === 'ADJUST' ? 'Save count' : `${type === 'IN' ? c.inLabel : c.outLabel}${amount ? ` ${amount} ${item.unit}` : ''}`} icon={type === 'IN' ? PackagePlus : type === 'OUT' ? PackageMinus : ClipboardList} kind="brand" onPress={save} loading={busy} full />}>
        {item && (
          <>
            <View style={styles.stockRow}>
              {[{ k: 'In stock', v: `${qty(item.quantity)} ${item.unit}` }, { k: 'Price', v: item.unitCost ? `${rupees(item.unitCost)}/${item.unit}` : '—' }, { k: 'Value', v: item.unitCost ? rupees(item.unitCost * item.quantity) : '—' }].map((x, i) => (
                <View key={x.k} style={[styles.stockCell, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <T v="caption" c={colors.text3}>{x.k}</T><T v="title" w="bold" numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
                </View>
              ))}
            </View>
            {item.category !== 'CONSUMABLE' && <Row gap={6}><T v="small" c={colors.text3}>Condition</T><Badge label={CONDITION[item.condition]?.label || item.condition} tone={CONDITION[item.condition]?.tone || 'white'} /></Row>}
            <Segmented value={type} onChange={(v) => { setType(v); setError(null); }} options={[{ value: 'IN', label: c.inLabel }, { value: 'OUT', label: c.outLabel }, { value: 'ADJUST', label: 'Count' }]} />
            <Row gap={10} align="flex-start">
              <View style={{ flex: 1 }}>
                <Field label={type === 'ADJUST' ? `Counted (${item.unit})` : `How many (${item.unit})`} required>
                  <Input value={amount} onChangeText={(v) => { setAmount(money(v)); setError(null); }} keyboardType="decimal-pad" placeholder="0" />
                </Field>
              </View>
              {type === 'IN' && <View style={{ flex: 1 }}><Field label={`Price / ${item.unit}`}><Input prefix="₹" value={cost} onChangeText={(v) => setCost(money(v))} keyboardType="decimal-pad" placeholder={item.unitCost ? String(item.unitCost) : '0'} /></Field></View>}
            </Row>
            <Row gap={10} align="flex-start">
              <View style={{ flex: 1 }}><Field label="Date"><DateTimeField label="Date" value={date} onChange={setDate} withTime={false} /></Field></View>
              <View style={{ flex: 1 }}><Field label="Note"><Input value={note} onChangeText={setNote} placeholder={type === 'OUT' ? 'e.g. Lunch' : 'e.g. Sharma Stores'} /></Field></View>
            </Row>
            {error && <ErrorBox message={error} />}

            <T v="label" c={colors.text3} style={{ marginTop: 4 }}>History</T>
            {moves.isLoading ? <Loading rows={2} h={44} /> : history.length === 0 ? <T v="small" c={colors.text3}>No entries yet.</T> : (
              <Card padded={false}>
                {history.slice(0, 15).map((m: any, i: number) => (
                  <View key={m.id} style={[styles.move, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <T v="small" w="semibold">{m.type === 'IN' ? c.inLabel : m.type === 'OUT' ? c.outLabel : 'Counted'}{m.note ? ` · ${m.note}` : ''}</T>
                      <T v="caption" c={colors.text3}>{fmtDate(m.date, { year: 'numeric' })}{m.byName ? ` · ${m.byName}` : ''}</T>
                    </View>
                    <T v="small" w="bold" c={m.type === 'IN' ? colors.success : m.type === 'OUT' ? colors.peach700 : colors.text}>{m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : '='}{qty(m.quantity)} {item.unit}</T>
                  </View>
                ))}
              </Card>
            )}
            <Row gap={8}>
              <Button title="Edit details" icon={Pencil} kind="secondary" small onPress={() => setEditing(true)} style={{ flex: 1 }} />
              <Button title="Delete" icon={Trash} kind="danger" small onPress={() => setRemoving(true)} />
            </Row>
          </>
        )}
      </Sheet>
      <ItemForm open={!!item && editing} onClose={() => setEditing(false)} defaultCategory={item?.category || 'CONSUMABLE'} item={item} />
      <Confirm open={removing} title={`Delete ${item?.name}?`} message="Its stock history is removed too." confirmLabel="Delete" danger
        onConfirm={async () => { await inventoryApi.remove(item.id); toast.success('Item deleted'); await refreshKeys(qc); onClose(); }} onClose={() => setRemoving(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  stockRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 10 },
  stockCell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  move: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
});
