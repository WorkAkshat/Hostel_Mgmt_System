import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Download, Dumbbell, PackageMinus, PackagePlus, Pencil, Plus, ShieldAlert, ShoppingBasket, Sofa, Trash2,
} from 'lucide-react';
import { inventory as api } from '../utils/api';
import CustomModal from '../components/CustomModal';
import FilterChips from '../components/ui/FilterChips';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';
import { EmptyPanel, ErrorPanel, PageHeader, SearchBox, SkeletonList } from '../components/ui/PageStates';
import { downloadCsv, fmtDate, rupees, todayIso } from '../utils/format';

const CAT = {
  CONSUMABLE: { label: 'Consumables', one: 'consumable', icon: ShoppingBasket, hint: 'Kitchen groceries, gas, cleaning supplies — log what comes in and what is used.', inLabel: 'Stock in', outLabel: 'Used', tile: 'bg-peach-50 text-peach-700' },
  FIXED_ASSET: { label: 'Fixed assets', one: 'fixed asset', icon: Sofa, hint: 'Furniture in rooms, solar plant, lift, water coolers, CCTV…', inLabel: 'Add', outLabel: 'Remove', tile: 'bg-mint-100 text-brand-700' },
  INVENTORY: { label: 'Other inventory', one: 'inventory item', icon: Dumbbell, hint: 'Gym machines, appliances, spare mattresses in the store…', inLabel: 'Add', outLabel: 'Remove', tile: 'bg-lilac-50 text-lilac-700' },
};
const CONDITION = {
  GOOD: { label: 'Good', chip: 'bg-[var(--success-bg)] text-[var(--success)]' },
  NEEDS_REPAIR: { label: 'Needs repair', chip: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
  DAMAGED: { label: 'Damaged', chip: 'bg-[var(--danger-bg)] text-[var(--danger)]' },
  DISPOSED: { label: 'Disposed', chip: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]' },
};
const UNITS = ['pcs', 'kg', 'g', 'L', 'packet', 'box', 'bag', 'cylinder'];
const num = (v) => String(v).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 10);
const qty = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
const monthNow = () => todayIso().slice(0, 7);
const shiftMonth = (m, d) => { const [y, mo] = m.split('-').map(Number); const x = new Date(y, mo - 1 + d, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
const monthName = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const ErrorNote = ({ children }) => (
  <div role="alert" className="flex items-center gap-2 p-3 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium">
    <ShieldAlert size={16} className="shrink-0" /> {children}
  </div>
);

// ── Add / edit item ──
const ItemModal = ({ open, item, defaultCategory, onClose, onSaved }) => {
  const [f, setF] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(item ? {
      name: item.name, category: item.category, location: item.location || '', floorNumber: item.floorNumber ?? '', unit: item.unit,
      minQuantity: item.minQuantity ?? '', unitCost: item.unitCost ?? '', condition: item.condition, purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : '', notes: item.notes || '',
    } : {
      name: '', category: defaultCategory, location: defaultCategory === 'CONSUMABLE' ? 'Kitchen' : '', floorNumber: '', unit: defaultCategory === 'CONSUMABLE' ? 'kg' : 'pcs',
      openingQuantity: '', minQuantity: '', unitCost: '', condition: 'GOOD', purchaseDate: '', notes: '',
    });
  }, [open, item, defaultCategory]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setError(null); };
  const consumable = f.category === 'CONSUMABLE';

  const submit = async (e) => {
    e.preventDefault();
    if (String(f.name || '').trim().length < 2) return setError('Give the item a name.');
    setSaving(true);
    const body = {
      name: f.name.trim(), category: f.category, location: f.location, floorNumber: f.floorNumber === '' ? null : f.floorNumber, unit: f.unit,
      minQuantity: consumable && f.minQuantity !== '' ? f.minQuantity : null, unitCost: f.unitCost === '' ? null : f.unitCost,
      condition: f.condition, purchaseDate: f.purchaseDate || null, notes: f.notes,
    };
    try {
      await (item ? api.updateItem(item.id, body) : api.createItem({ ...body, openingQuantity: f.openingQuantity || 0 }));
      onSaved(item ? 'Item updated' : 'Item added', f.name.trim());
    } catch (err) { setError(err.message || 'Could not save.'); } finally { setSaving(false); }
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title={item ? `Edit ${item.name}` : 'Add to stock'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <fieldset className="border-none p-0 m-0">
          <legend className="text-[13px] font-semibold mb-2 p-0">Type</legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CAT).map(([k, c]) => {
              const Icon = c.icon;
              const active = f.category === k;
              return (
                <button type="button" key={k} aria-pressed={active} onClick={() => set('category', k)}
                  className={`relative h-11 px-2 rounded-xl border flex items-center justify-center gap-2 text-[13px] cursor-pointer ${active ? 'border-transparent text-sun-900 font-semibold' : 'border-[var(--border-color)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-strong)]'}`}>
                  {active && <motion.span layoutId="inv-cat" className="absolute inset-0 rounded-xl bg-sun-300" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <Icon size={15} className="relative shrink-0" /><span className="relative truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Item name" required htmlFor="inv-name" full>
            <input id="inv-name" className="form-input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder={consumable ? 'e.g. Rice (Basmati)' : 'e.g. Study table, Treadmill, Solar inverter'} autoFocus />
          </Field>
          <Field label="Where" htmlFor="inv-loc" hint="Room, kitchen, gym, terrace…">
            <input id="inv-loc" className="form-input" value={f.location || ''} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Floor" htmlFor="inv-floor" hint="Leave blank if it is for the whole building">
            <input id="inv-floor" className="form-input" inputMode="numeric" value={f.floorNumber ?? ''} onChange={(e) => set('floorNumber', e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </Field>
          <Field label="Counted in" htmlFor="inv-unit">
            <select id="inv-unit" className="form-input" value={f.unit || 'pcs'} onChange={(e) => set('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          {!item && (
            <Field label="Quantity now" htmlFor="inv-open" hint="Becomes the opening stock entry">
              <input id="inv-open" className="form-input" inputMode="decimal" value={f.openingQuantity || ''} onChange={(e) => set('openingQuantity', num(e.target.value))} placeholder="0" />
            </Field>
          )}
          <Field label={`Price per ${f.unit || 'unit'} (₹)`} htmlFor="inv-cost">
            <input id="inv-cost" className="form-input" inputMode="decimal" value={f.unitCost ?? ''} onChange={(e) => set('unitCost', num(e.target.value))} placeholder="0" />
          </Field>
          {consumable ? (
            <Field label="Warn me when stock falls to" htmlFor="inv-min" hint="Shows under “Running low”">
              <input id="inv-min" className="form-input" inputMode="decimal" value={f.minQuantity ?? ''} onChange={(e) => set('minQuantity', num(e.target.value))} placeholder={`e.g. 5 ${f.unit || ''}`} />
            </Field>
          ) : (
            <Field label="Condition" htmlFor="inv-cond">
              <select id="inv-cond" className="form-input" value={f.condition || 'GOOD'} onChange={(e) => set('condition', e.target.value)}>
                {Object.entries(CONDITION).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Bought on" htmlFor="inv-date">
            <input id="inv-date" type="date" className="form-input" max={todayIso()} value={f.purchaseDate || ''} onChange={(e) => set('purchaseDate', e.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="inv-notes" full>
            <input id="inv-notes" className="form-input" value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Brand, vendor, warranty…" />
          </Field>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{item ? <Pencil size={15} /> : <Plus size={16} />} {saving ? 'Saving…' : item ? 'Save changes' : 'Add item'}</button>
        </div>
      </form>
    </CustomModal>
  );
};

// ── One item: stock in / used / count + history ──
const ItemDrawer = ({ item, onClose, onChanged, onEdit, onDelete }) => {
  const c = item ? CAT[item.category] : CAT.CONSUMABLE;
  const [type, setType] = useState('IN');
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayIso());
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadMoves = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    try { setMoves(await api.getMovements(item.id)); } catch { setMoves([]); } finally { setLoading(false); }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!item) return;
    setType(item.category === 'CONSUMABLE' ? 'OUT' : 'IN'); setAmount(''); setCost(''); setNote(''); setDate(todayIso()); setError(null);
    loadMoves();
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || (type !== 'ADJUST' && n <= 0)) return setError('Enter how many.');
    setSaving(true); setError(null);
    try {
      await api.addMovement(item.id, { type, quantity: n, unitCost: type === 'IN' && cost ? Number(cost) : null, note, date });
      setAmount(''); setCost(''); setNote('');
      await Promise.all([loadMoves(), onChanged(type === 'IN' ? `${c.inLabel}: ${n} ${item.unit}` : type === 'OUT' ? `${c.outLabel}: ${n} ${item.unit}` : `Stock set to ${n} ${item.unit}`, item.name)]);
    } catch (err) { setError(err.message || 'Could not save.'); } finally { setSaving(false); }
  };

  return (
    <CustomModal isOpen={!!item} onClose={onClose} title={item?.name || ''} size="lg">
      {item && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 rounded-2xl bg-[var(--bg-tertiary)] py-3">
            {[['In stock', `${qty(item.quantity)} ${item.unit}`], ['Price', item.unitCost ? `${rupees(item.unitCost)} / ${item.unit}` : '—'], ['Value', item.unitCost ? rupees(item.unitCost * item.quantity) : '—']].map(([k, v], i) => (
              <div key={k} className={`text-center px-2 ${i ? 'border-l border-[var(--border-color)]' : ''}`}>
                <div className="text-[12px] text-[var(--text-tertiary)]">{k}</div>
                <div className="text-[16px] font-bold truncate">{v}</div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] m-0">
            {[c.one[0].toUpperCase() + c.one.slice(1), item.location, item.floorNumber ? `Floor ${item.floorNumber}` : null].filter(Boolean).join(' · ')}
            {item.category !== 'CONSUMABLE' && <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${CONDITION[item.condition]?.chip}`}>{CONDITION[item.condition]?.label}</span>}
          </p>

          <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-4 rounded-2xl border border-[var(--border-color)]">
            <FilterChips id="inv-move" value={type} onChange={(v) => { setType(v); setError(null); }} options={[{ value: 'IN', label: c.inLabel }, { value: 'OUT', label: c.outLabel }, { value: 'ADJUST', label: 'Physical count' }]} />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label={type === 'ADJUST' ? `Counted (${item.unit})` : `How many (${item.unit})`} required htmlFor="mv-qty">
                <input id="mv-qty" className="form-input" inputMode="decimal" value={amount} onChange={(e) => { setAmount(num(e.target.value)); setError(null); }} placeholder="0" autoFocus />
              </Field>
              {type === 'IN' ? (
                <Field label={`Price / ${item.unit} (₹)`} htmlFor="mv-cost">
                  <input id="mv-cost" className="form-input" inputMode="decimal" value={cost} onChange={(e) => setCost(num(e.target.value))} placeholder={item.unitCost ? String(item.unitCost) : '0'} />
                </Field>
              ) : <div className="hidden sm:block" />}
              <Field label="Date" htmlFor="mv-date"><input id="mv-date" type="date" className="form-input" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Note" htmlFor="mv-note"><input id="mv-note" className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'OUT' ? 'e.g. Lunch' : 'e.g. Sharma Stores'} /></Field>
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="flex justify-end">
              <button type="submit" className="btn-brand" disabled={saving}>
                {type === 'IN' ? <PackagePlus size={16} /> : type === 'OUT' ? <PackageMinus size={16} /> : <ClipboardList size={16} />}
                {saving ? 'Saving…' : type === 'IN' ? c.inLabel : type === 'OUT' ? c.outLabel : 'Save count'}
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-[12px] font-bold tracking-wide uppercase text-[var(--text-tertiary)] m-0 mb-2">History</h3>
            {loading ? <SkeletonList count={2} height={44} columns="grid-cols-1" /> : moves.length === 0 ? <p className="text-[13px] text-[var(--text-tertiary)] m-0">No entries yet.</p> : (
              <div className="rounded-2xl border border-[var(--border-color)] divide-y divide-[var(--border-color)] max-h-[280px] overflow-y-auto">
                {moves.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{m.type === 'IN' ? c.inLabel : m.type === 'OUT' ? c.outLabel : 'Counted'}{m.note ? ` · ${m.note}` : ''}</div>
                      <div className="text-[12px] text-[var(--text-tertiary)]">{fmtDate(m.date, { year: 'numeric' })}{m.byName ? ` · ${m.byName}` : ''}{m.unitCost ? ` · ${rupees(m.unitCost)}/${item.unit}` : ''}</div>
                    </div>
                    <div className={`text-[13px] font-bold ${m.type === 'IN' ? 'text-[var(--success)]' : m.type === 'OUT' ? 'text-peach-700' : ''}`}>{m.type === 'IN' ? '+' : m.type === 'OUT' ? '−' : '='}{qty(m.quantity)} {item.unit}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between gap-2 pt-4 border-t border-[var(--border-color)]">
            <button type="button" className="btn-secondary text-[var(--danger)]" onClick={onDelete}><Trash2 size={15} /> Delete</button>
            <button type="button" className="btn-secondary" onClick={onEdit}><Pencil size={15} /> Edit details</button>
          </div>
        </div>
      )}
    </CustomModal>
  );
};

// Stock register page
const Inventory = () => {
  const toast = useToast();
  const [cat, setCat] = useState('CONSUMABLE');
  const [month, setMonth] = useState(monthNow());
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.getItems(), api.getSummary(month)]);
      setItems(Array.isArray(list) ? list : []);
      setSummary(sum);
      setError(null);
    } catch (err) { setError(err.message || 'Could not load stock.'); } finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => items.reduce((a, i) => ({ ...a, [i.category]: (a[i.category] || 0) + 1 }), {}), [items]);
  const s = search.trim().toLowerCase();
  const shown = items.filter((i) => i.category === cat && (!s || [i.name, i.location, i.notes].some((v) => v && v.toLowerCase().includes(s))));
  const open = items.find((i) => i.id === openId) || null;
  const flow = (summary?.monthFlow || []).filter((f) => f.category === 'CONSUMABLE');
  const low = summary?.lowStock || [];

  const saved = async (title, text) => { toast.success(title, text); setAdding(false); setEditing(null); await load(); };
  const exportCsv = () => downloadCsv(`stock-${cat.toLowerCase()}-${todayIso()}.csv`,
    ['Item', 'Type', 'Where', 'Floor', 'Quantity', 'Unit', 'Price per unit', 'Value', 'Condition', 'Bought on', 'Notes'],
    shown.map((i) => [i.name, CAT[i.category].label, i.location || '', i.floorNumber || '', i.quantity, i.unit, i.unitCost ?? '', i.unitCost ? Math.round(i.unitCost * i.quantity) : '', CONDITION[i.condition]?.label || '', i.purchaseDate ? i.purchaseDate.slice(0, 10) : '', i.notes || '']));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Stock register" subtitle="Fixed assets, other inventory and kitchen consumables">
        <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!shown.length}><Download size={15} /> Download</button>
        <button type="button" className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add item</button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(CAT).map(([k, c]) => {
          const Icon = c.icon;
          const active = cat === k;
          const sum = summary?.byCategory?.[k];
          return (
            <button key={k} type="button" onClick={() => setCat(k)} aria-pressed={active}
              className={`text-left rounded-[var(--border-radius-card)] border p-4 flex items-center gap-3 cursor-pointer transition-all ${active ? 'bg-brand-600 border-brand-600 text-white shadow-[var(--shadow-hover)]' : 'bg-white border-[var(--border-color)] hover:border-[var(--border-strong)]'}`}>
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${active ? 'bg-white/20 text-white' : c.tile}`}><Icon size={20} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold">{c.label}</span>
                <span className={`block text-[12px] ${active ? 'text-white/80' : 'text-[var(--text-tertiary)]'}`}>{counts[k] || 0} item{(counts[k] || 0) === 1 ? '' : 's'}{sum?.value ? ` · ${rupees(sum.value)}` : ''}{sum?.needsRepair ? ` · ${sum.needsRepair} need repair` : ''}</span>
              </span>
            </button>
          );
        })}
      </div>

      {cat === 'CONSUMABLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button type="button" className="w-8 h-8 rounded-lg bg-mint-100 flex items-center justify-center border-none cursor-pointer" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
              <div className="flex-1 text-center text-[14px] font-semibold">{monthName(month)}</div>
              <button type="button" className="w-8 h-8 rounded-lg bg-mint-100 flex items-center justify-center border-none cursor-pointer disabled:opacity-40" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthNow()} aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-end justify-between">
              <div><div className="text-[12px] text-[var(--text-tertiary)]">Bought this month</div><div className="text-[22px] font-bold">{rupees(flow.reduce((a, f) => a + (f.spent || 0), 0))}</div></div>
              <div className="text-right"><div className="text-[12px] text-[var(--text-tertiary)]">Items moved</div><div className="text-[22px] font-bold">{flow.length}</div></div>
            </div>
            {flow.length === 0 ? <p className="text-[13px] text-[var(--text-tertiary)] m-0">Nothing came in or was used in this month.</p> : (
              <table className="w-full text-[13px]">
                <thead><tr className="text-[11px] uppercase text-[var(--text-tertiary)]"><th className="text-left font-semibold py-1">Item</th><th className="text-right font-semibold">Came in</th><th className="text-right font-semibold">Used</th><th className="text-right font-semibold">Spent</th></tr></thead>
                <tbody>
                  {flow.map((f) => (
                    <tr key={f.itemId} className="border-t border-[var(--border-color)]">
                      <td className="py-1.5 font-semibold">{f.name}</td>
                      <td className="text-right text-[var(--success)]">+{qty(f.in)} {f.unit}</td>
                      <td className="text-right text-peach-700">−{qty(f.out)} {f.unit}</td>
                      <td className="text-right">{f.spent ? rupees(f.spent) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className={`rounded-[var(--border-radius-card)] p-4 flex flex-col gap-2 border ${low.length ? 'bg-[var(--danger-bg)] border-transparent' : 'bg-[var(--success-bg)] border-transparent'}`}>
            <div className={`flex items-center gap-2 font-bold text-[14px] ${low.length ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}><AlertTriangle size={16} /> {low.length ? 'Running low' : 'Stock is fine'}</div>
            {low.length === 0 ? <p className="text-[13px] text-[var(--success)] m-0">No consumable is below its alert level.</p> : low.map((l) => (
              <button key={l.id} type="button" onClick={() => setOpenId(l.id)} className="text-left text-[13px] text-[var(--danger)] bg-transparent border-none p-0 cursor-pointer hover:underline">
                {l.name}: {qty(l.quantity)} {l.unit} left (alert at {qty(l.minQuantity)})
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorPanel message={error} onRetry={() => { setLoading(true); load(); }} />}
      {items.length > 6 && <SearchBox value={search} onChange={setSearch} placeholder="Search item, place or note" />}

      {loading ? <SkeletonList count={6} height={76} columns="grid-cols-1 md:grid-cols-2" /> : shown.length === 0 ? (
        <EmptyPanel icon={CAT[cat].icon} title={`No ${CAT[cat].label.toLowerCase()} yet`} text={CAT[cat].hint}
          action={<button type="button" className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add {CAT[cat].one}</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shown.map((i) => {
            const Icon = CAT[i.category].icon;
            const isLow = i.category === 'CONSUMABLE' && i.minQuantity != null && i.quantity <= i.minQuantity;
            return (
              <button key={i.id} type="button" onClick={() => setOpenId(i.id)}
                className="text-left bg-white border border-[var(--border-color)] rounded-[var(--border-radius-card)] p-4 flex items-center gap-3 cursor-pointer hover:shadow-[var(--shadow-hover)] transition-shadow">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isLow ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : CAT[i.category].tile}`}><Icon size={19} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold truncate">{i.name}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)] truncate">
                    {[i.location, i.floorNumber ? `Floor ${i.floorNumber}` : null].filter(Boolean).join(' · ') || CAT[i.category].label}
                    {i.category !== 'CONSUMABLE' && i.condition !== 'GOOD' ? ` · ${CONDITION[i.condition]?.label}` : ''}
                    {isLow ? ' · Running low' : ''}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-[17px] font-bold ${isLow ? 'text-[var(--danger)]' : ''}`}>{qty(i.quantity)}</span>
                  <span className="block text-[12px] text-[var(--text-tertiary)]">{i.unit}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ItemModal open={adding || !!editing} item={editing} defaultCategory={cat} onClose={() => { setAdding(false); setEditing(null); }} onSaved={saved} />
      <ItemDrawer item={editing ? null : open} onClose={() => setOpenId(null)}
        onChanged={async (title, text) => { toast.success(title, text); await load(); }}
        onEdit={() => setEditing(open)} onDelete={() => setRemoving(open)} />
      <ConfirmDialog open={!!removing} title={`Delete ${removing?.name}?`} message="Its stock history is removed too." confirmLabel="Delete"
        onConfirm={async () => {
          try { await api.deleteItem(removing.id); toast.success('Item deleted', removing.name); setOpenId(null); await load(); } catch (err) { toast.error('Could not delete', err.message); }
        }}
        onClose={() => setRemoving(null)} />
    </div>
  );
};

export default Inventory;
