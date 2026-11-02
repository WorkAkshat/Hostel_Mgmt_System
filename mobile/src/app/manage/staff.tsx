import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, CircleCheck, Contact, HandCoins, Landmark, MessageCircle, Phone, Plus, ScrollText, Smartphone, Trash2, Undo2 } from 'lucide-react-native';
import { staffAdvancesApi, staffApi, type PayMethod } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { call, whatsapp } from '../../lib/contact';
import { fmtDate, isoDay, plural, rupees } from '../../lib/format';
import { colors } from '../../ui/theme';
import { Avatar, Badge, Button, Card, IconButton, Row, Segmented, T } from '../../ui/primitives';
import { Choices, DateTimeField, Field, Input, Picker, SearchInput, money } from '../../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';

const DEPT: Record<string, { label: string; tone: 'mint' | 'peach' | 'lilac' | 'sun' | 'white' }> = {
  Warden: { label: 'Warden office', tone: 'mint' }, Mess: { label: 'Mess', tone: 'peach' }, Security: { label: 'Security', tone: 'lilac' },
  Cleaning: { label: 'Cleaning', tone: 'sun' }, Maintenance: { label: 'Maintenance', tone: 'white' },
};
const METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BANK', label: 'Bank', icon: Landmark },
  { value: 'CHEQUE', label: 'Cheque', icon: ScrollText },
];
const OTHER = '__other';

// Who an advance belongs to: a staff record, or just a name (cook / helper without app login)
type Person = { key: string; staffId?: string; name: string; staff?: any };
const personKey = (a: any) => (a.staffId ? `s:${a.staffId}` : `n:${String(a.staffName).trim().toLowerCase()}`);

// Staff directory — call or WhatsApp in one tap — plus salary advances:
// give an advance, then take it back (fully or in parts) from salary.
export default function Staff() {
  const staff = useData(['staff'], staffApi.all);
  const adv = useData(['staff-advances'], () => staffAdvancesApi.list());
  const [tab, setTab] = useState<'people' | 'advances'>('people');
  const [q, setQ] = useState('');
  const [giving, setGiving] = useState<Person | 'new' | null>(null);
  const [viewing, setViewing] = useState<Person | null>(null);

  const advances = asList(adv.data?.advances);
  const totals = adv.data?.totals || { given: 0, recovered: 0, outstanding: 0 };
  // Outstanding per person
  const owed = useMemo(() => {
    const m: Record<string, { total: number; count: number; name: string; staffId?: string }> = {};
    advances.forEach((a: any) => {
      const k = personKey(a);
      const e = (m[k] ||= { total: 0, count: 0, name: a.staffName, staffId: a.staffId || undefined });
      e.total += a.outstanding;
      if (a.outstanding > 0) e.count += 1;
    });
    return m;
  }, [advances]);
  const people = asList(staff.data);
  const others = Object.entries(owed).filter(([k]) => k.startsWith('n:')).map(([k, v]) => ({ key: k, name: v.name, total: v.total }));
  const s = q.trim().toLowerCase();
  const list = people.filter((m: any) => !s || [m.user?.name, m.designation, m.department, m.phoneNumber].some((v) => v && String(v).toLowerCase().includes(s)));
  const withDues = Object.values(owed).filter((o) => o.total > 0).length;

  return (
    <Screen title="Staff" subtitle={`${people.length} staff · salary advances`} back tabBar={false} onRefresh={() => Promise.all([staff.refetch(), adv.refetch()])}
      right={<Button title="Advance" icon={Plus} small onPress={() => setGiving('new')} />}>
      {/* Advances at a glance */}
      <Card tone={totals.outstanding > 0 ? 'sun' : undefined} style={{ gap: 10 }}>
        <Row>
          <HandCoins size={20} color={colors.sun800} />
          <T v="title" style={{ flex: 1 }}>Salary advances</T>
          {withDues > 0 && <Badge label={`${withDues} to recover`} tone="warning" />}
        </Row>
        <View style={styles.cells}>
          {[{ k: 'Outstanding', v: rupees(totals.outstanding), c: totals.outstanding ? colors.sun900 : colors.text }, { k: 'Given', v: rupees(totals.given), c: colors.text }, { k: 'Recovered', v: rupees(totals.recovered), c: colors.success }].map((x, i) => (
            <View key={x.k} style={[styles.cell, i > 0 && styles.cellLine]}>
              <T v="caption" c={colors.text3}>{x.k}</T>
              <T v="title" w="bold" c={x.c} numberOfLines={1} adjustsFontSizeToFit>{x.v}</T>
            </View>
          ))}
        </View>
      </Card>

      <Segmented value={tab} onChange={setTab} options={[{ value: 'people', label: 'Staff' }, { value: 'advances', label: `Advances${advances.length ? ` (${advances.length})` : ''}` }]} />

      {tab === 'people' ? (
        <>
          {people.length > 5 && <SearchInput value={q} onChange={setQ} placeholder="Name, role or phone" />}
          {staff.error ? <ErrorBox message={(staff.error as Error).message} onRetry={staff.refetch} /> : staff.isLoading ? <Loading rows={4} h={70} /> : list.length === 0 && others.length === 0 ? (
            <Empty icon={Contact} title="No staff found" text="Add guards, cooks and cleaners from the website." />
          ) : (
            <>
              {list.map((m: any, i: number) => {
                const d = DEPT[m.department] || { label: m.department, tone: 'white' as const };
                const due = owed[`s:${m.id}`]?.total || 0;
                const person: Person = { key: `s:${m.id}`, staffId: m.id, name: m.user?.name, staff: m };
                return (
                  <Appear key={m.id} i={i}>
                    <ListRow leading={<Avatar name={m.user?.name} tone={d.tone === 'white' ? 'mint' : d.tone} />} title={m.user?.name}
                      sub={due > 0 ? `${rupees(due)} advance to recover` : m.designation} meta={[d.label, m.phoneNumber].filter(Boolean).join(' · ')}
                      onPress={() => setViewing(person)} chevron={false}
                      actions={<Row gap={6}><IconButton icon={MessageCircle} label="WhatsApp" tone="success" size={34} onPress={() => whatsapp(m.phoneNumber)} /><IconButton icon={Phone} label="Call" tone="mint" size={34} onPress={() => call(m.phoneNumber)} /></Row>} />
                  </Appear>
                );
              })}
              {others.length > 0 && (
                <Section title="Others (no app login)">
                  {others.map((o) => (
                    <ListRow key={o.key} leading={<Avatar name={o.name} tone="sun" />} title={o.name} sub={o.total > 0 ? `${rupees(o.total)} advance to recover` : 'All advances recovered'}
                      onPress={() => setViewing({ key: o.key, name: o.name })} />
                  ))}
                </Section>
              )}
              <T v="caption" c={colors.text3} center>Tap a person to give an advance or record what was taken back from salary.</T>
            </>
          )}
        </>
      ) : adv.error ? <ErrorBox message={(adv.error as Error).message} onRetry={adv.refetch} /> : adv.isLoading ? <Loading rows={3} h={70} /> : advances.length === 0 ? (
        <Empty icon={HandCoins} tone="sun" title="No advances yet" text="When you give someone money ahead of their salary, add it here so it isn't forgotten." action={<Button title="Give an advance" icon={Plus} onPress={() => setGiving('new')} />} />
      ) : advances.map((a: any, i: number) => (
        <Appear key={a.id} i={i}>
          <ListRow leading={<Avatar name={a.staffName} tone={a.settled ? 'success' : 'sun'} />} title={a.staffName}
            sub={`${rupees(a.amount)} on ${fmtDate(a.givenOn, { year: 'numeric' })} · ${a.method}`} meta={a.note || undefined}
            right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T v="title" w="bold" c={a.settled ? colors.success : colors.sun900}>{a.settled ? 'Recovered' : rupees(a.outstanding)}</T>{!a.settled && <T v="caption" c={colors.text3}>to recover</T>}</View>}
            onPress={() => setViewing({ key: personKey(a), staffId: a.staffId || undefined, name: a.staffName })} chevron={false} />
        </Appear>
      ))}

      <GiveAdvance open={!!giving} person={giving === 'new' ? null : giving} staff={people} onClose={() => setGiving(null)} />
      <PersonSheet person={viewing} advances={viewing ? advances.filter((a: any) => personKey(a) === viewing.key) : []} onClose={() => setViewing(null)} onGive={(p) => { setViewing(null); setGiving(p); }} />
    </Screen>
  );
}

const refresh = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['staff-advances'] });

// ── Give an advance ──
const GiveAdvance = ({ open, person, staff, onClose }: { open: boolean; person: Person | null; staff: any[]; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [who, setWho] = useState('');
  const [otherName, setOtherName] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setWho(person ? (person.staffId || OTHER) : ''); setOtherName(person && !person.staffId ? person.name : '');
    setAmount(''); setMethod('CASH'); setRef(''); setDate(new Date()); setNote(''); setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = who === OTHER ? otherName.trim() : staff.find((m) => m.id === who)?.user?.name || '';
  const save = async () => {
    if (!who) return setError('Choose who you gave the advance to.');
    if (who === OTHER && otherName.trim().length < 2) return setError('Type their name.');
    if (!(Number(amount) > 0)) return setError('Enter the amount.');
    if (!date) return setError('Pick the date.');
    setBusy(true); setError(null);
    try {
      await staffAdvancesApi.create({ ...(who === OTHER ? { staffName: otherName.trim() } : { staffId: who }), amount: Number(amount), method: method as PayMethod, reference: ref.trim(), note: note.trim(), givenOn: isoDay(date) });
      toast.success('Advance saved', `${rupees(amount)} to ${name}`);
      await refresh(qc);
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Give an advance" subtitle={person ? person.name : 'Money given ahead of salary'}
      footer={<Button title={`Save advance${Number(amount) ? ` · ${rupees(amount)}` : ''}`} icon={HandCoins} kind="brand" onPress={save} loading={busy} full />}>
      {!person && (
        <Field label="Given to" required>
          <Picker label="Choose staff" searchable value={who} onChange={(v) => { setWho(v); setError(null); }} placeholder="Choose staff"
            items={[...staff.map((m) => ({ value: m.id, label: m.user?.name || 'Staff', sub: [m.designation, m.department].filter(Boolean).join(' · ') })), { value: OTHER, label: 'Someone else', sub: 'Cook, helper… not in the staff list' }]} />
        </Field>
      )}
      {who === OTHER && <Field label="Their name" required><Input value={otherName} onChangeText={(v) => { setOtherName(v.slice(0, 80)); setError(null); }} placeholder="e.g. Ramesh (cook)" /></Field>}
      <Row gap={10} align="flex-start">
        <View style={{ flex: 1 }}><Field label="Amount" required><Input prefix="₹" value={amount} onChangeText={(v) => { setAmount(money(v)); setError(null); }} keyboardType="decimal-pad" placeholder="0" /></Field></View>
        <View style={{ flex: 1 }}><Field label="Given on"><DateTimeField label="Given on" value={date} onChange={setDate} withTime={false} /></Field></View>
      </Row>
      <Field label="How was it given?"><Choices value={method} onChange={setMethod} columns={4} options={METHODS} /></Field>
      {method !== 'CASH' && <Field label="Reference (optional)"><Input value={ref} onChangeText={(v) => setRef(v.slice(0, 40))} autoCapitalize="characters" placeholder="UTR / cheque no." /></Field>}
      <Field label="Note (optional)"><Input value={note} onChangeText={(v) => setNote(v.slice(0, 300))} placeholder="e.g. Festival advance, cut ₹1000 a month" /></Field>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

// ── One person's advances: take back from salary, remove a mistake ──
const PersonSheet = ({ person, advances, onClose, onGive }: { person: Person | null; advances: any[]; onClose: () => void; onGive: (p: Person) => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [recovering, setRecovering] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<any>(null);
  const due = advances.reduce((s, a) => s + a.outstanding, 0);

  const startRecover = (a: any) => { setRecovering(a); setAmount(String(a.outstanding)); setDate(new Date()); setError(null); };
  const saveRecover = async () => {
    if (!(Number(amount) > 0)) return setError('Enter the amount taken back.');
    if (Number(amount) > recovering.outstanding) return setError(`Only ${rupees(recovering.outstanding)} is left on this advance.`);
    setBusy(true); setError(null);
    try {
      await staffAdvancesApi.recover(recovering.id, { amount: Number(amount), on: date ? isoDay(date) : undefined });
      toast.success('Recovery saved', Number(amount) >= recovering.outstanding ? 'This advance is fully recovered.' : `${rupees(recovering.outstanding - Number(amount))} still to recover.`);
      await refresh(qc);
      setRecovering(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Sheet open={!!person && !recovering} onClose={onClose} title={person?.name} subtitle={due > 0 ? `${rupees(due)} still to recover` : advances.length ? 'All advances recovered' : 'No advances yet'}
        footer={person && <Button title="Give an advance" icon={Plus} kind="brand" onPress={() => onGive(person)} full />}>
        {person?.staff?.phoneNumber && (
          <Row gap={8}>
            <Button title="Call" icon={Phone} kind="secondary" small onPress={() => call(person.staff.phoneNumber)} style={{ flex: 1 }} />
            <Button title="WhatsApp" icon={MessageCircle} kind="secondary" small onPress={() => whatsapp(person.staff.phoneNumber)} style={{ flex: 1 }} />
          </Row>
        )}
        {advances.length === 0 ? <T v="small" c={colors.text3}>No advances given to {person?.name} yet.</T> : advances.map((a) => (
          <Card key={a.id} style={{ gap: 8 }}>
            <Row align="flex-start">
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="title">{rupees(a.amount)} · {a.method}</T>
                <T v="caption" c={colors.text3}>Given {fmtDate(a.givenOn, { year: 'numeric' })}{a.createdBy ? ` by ${a.createdBy}` : ''}{a.reference ? ` · ${a.reference}` : ''}</T>
                {a.note ? <T v="caption" c={colors.text2}>{a.note}</T> : null}
              </View>
              {a.settled ? <Badge label="Recovered" tone="success" icon={CircleCheck} /> : <Badge label={`${rupees(a.outstanding)} due`} tone="warning" />}
            </Row>
            {a.recoveredAmount > 0 && !a.settled && <T v="caption" c={colors.success}>{rupees(a.recoveredAmount)} taken back so far{a.recoveredOn ? ` (last on ${fmtDate(a.recoveredOn)})` : ''}</T>}
            <Row gap={8}>
              {!a.settled && <Button title="Take back" icon={Undo2} kind="secondary" small onPress={() => startRecover(a)} style={{ flex: 1 }} />}
              <IconButton icon={Trash2} label="Remove this entry" tone="danger" size={38} onPress={() => setRemoving(a)} />
            </Row>
          </Card>
        ))}
      </Sheet>

      <Sheet open={!!recovering} onClose={() => setRecovering(null)} title="Take back advance" subtitle={recovering ? `${person?.name} · ${rupees(recovering.outstanding)} left` : ''}
        footer={<Button title={`Save${Number(amount) ? ` · ${rupees(amount)}` : ''}`} icon={CircleCheck} kind="brand" onPress={saveRecover} loading={busy} full />}>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}><Field label="Amount taken back" required hint="e.g. cut from this month's salary"><Input prefix="₹" value={amount} onChangeText={(v) => { setAmount(money(v)); setError(null); }} keyboardType="decimal-pad" /></Field></View>
          <View style={{ flex: 1 }}><Field label="On"><DateTimeField label="On" value={date} onChange={setDate} withTime={false} /></Field></View>
        </Row>
        {error && <ErrorBox message={error} />}
      </Sheet>

      <Confirm open={!!removing} title="Remove this advance?" message={removing ? `${rupees(removing.amount)} given to ${removing.staffName} on ${fmtDate(removing.givenOn)}. Use this only for an entry made by mistake.` : ''} confirmLabel="Remove" danger
        onConfirm={async () => { await staffAdvancesApi.remove(removing.id); toast.success('Entry removed'); await refresh(qc); }} onClose={() => setRemoving(null)} />
    </>
  );
};

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 14, paddingVertical: 10 },
  cell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  cellLine: { borderLeftWidth: 1, borderLeftColor: colors.border },
});
