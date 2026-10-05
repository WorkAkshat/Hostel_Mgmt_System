import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, Bug, Bus, ChefHat, Droplets, Landmark, Package, PencilRuler, Plus, Sparkles, Users, UtensilsCrossed, Wallet, Wifi, Wrench, Zap } from 'lucide-react-native';
import { accountingApi } from '../../api';
import { asList } from '../../api/client';
import { useData } from '../../lib/query';
import { fmtDate, isoDay, monthKey, rupees } from '../../lib/format';
import { colors } from '../../ui/theme';
import { Button, Card, Row, T } from '../../ui/primitives';
import { Choices, DateTimeField, Field, Input, money } from '../../ui/form';
import { ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, ListRow, Screen, Section } from '../../ui/layout';
import { useFloor } from '../../features/floor';

const CATS = [
  { value: 'EXP-CLEANING', label: 'Cleaning', icon: Sparkles },
  { value: 'EXP-MAINT', label: 'Repairs', icon: Wrench },
  { value: 'EXP-KITCHEN', label: 'Kitchen', icon: ChefHat },
  { value: 'EXP-WATER', label: 'Water', icon: Droplets },
  { value: 'EXP-ELEC-UTIL', label: 'Electricity', icon: Zap },
  { value: 'EXP-INTERNET', label: 'Internet', icon: Wifi },
  { value: 'EXP-STAFF-SALARY', label: 'Salary', icon: Users },
  { value: 'EXP-MESS-PAYMENT', label: 'Catering', icon: UtensilsCrossed },
  { value: 'EXP-TRANSPORT', label: 'Transport', icon: Bus },
  { value: 'EXP-STATIONERY', label: 'Stationery', icon: PencilRuler },
  { value: 'EXP-PEST-CONTROL', label: 'Pest control', icon: Bug },
  { value: 'EXP-OTHERS', label: 'Other', icon: Package },
];

// Log everyday spending; it goes into the Tally ledger as a payment voucher
export default function Expenses() {
  const qc = useQueryClient();
  const toast = useToast();
  const { floor } = useFloor();
  const book = useData(['daybook', floor], () => accountingApi.dayBook(floor === 'all' ? 'combined' : floor));
  const [cat, setCat] = useState('EXP-CLEANING');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('ASSET-CASH');
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'amount' | 'note' | string | null>(null);

  const payments = useMemo(() => asList(book.data).filter((v: any) => v.voucherType === 'PAYMENT'), [book.data]);
  const monthSpend = payments.filter((v: any) => monthKey(new Date(v.date)) === monthKey()).reduce((a: number, v: any) => a + (Number(v.debitAmount) || 0), 0);

  const save = async () => {
    if (!(Number(amount) > 0)) return setError('amount');
    if (note.trim().length < 3) return setError('note');
    setBusy(true);
    setError(null);
    try {
      const res = await accountingApi.voucher({
        voucherType: 'PAYMENT', amount: Number(amount), narration: note.trim(), date: isoDay(date || new Date()),
        debitHeadCode: cat, creditHeadCode: mode, floorNumber: floor === 'all' ? null : floor,
      });
      toast.success('Expense recorded', `${res.voucherNo || ''} · ${rupees(amount)}`);
      setAmount(''); setNote('');
      await qc.invalidateQueries({ queryKey: ['daybook'] });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen title="Expenses" subtitle={`Spent this month: ${rupees(monthSpend)}`} back tabBar={false} onRefresh={book.refetch}>
      <Card style={{ gap: 14 }}>
        <Field label="What was it for?"><Choices pills value={cat} onChange={setCat} options={CATS} /></Field>
        <Row gap={10} align="flex-start">
          <View style={{ flex: 1 }}>
            <Field label="Amount" required error={error === 'amount' ? 'Type the amount' : undefined}>
              <Input prefix="₹" value={amount} onChangeText={(v) => { setAmount(money(v)); setError(null); }} keyboardType="decimal-pad" placeholder="0" invalid={error === 'amount'} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Date"><DateTimeField label="Date" value={date} onChange={setDate} withTime={false} /></Field>
          </View>
        </Row>
        <Field label="Paid from"><Choices pills value={mode} onChange={setMode} options={[{ value: 'ASSET-CASH', label: 'Cash', icon: Banknote }, { value: 'ASSET-BANK', label: 'Bank / UPI', icon: Landmark }]} /></Field>
        <Field label="Details" required error={error === 'note' ? 'Write who was paid and for what' : undefined}>
          <Input value={note} onChangeText={(v) => { setNote(v.slice(0, 200)); setError(null); }} placeholder="e.g. Brooms from Sharma Stores" invalid={error === 'note'} />
        </Field>
        {error && error !== 'amount' && error !== 'note' && <ErrorBox message={error} />}
        <Button title="Record expense" icon={Plus} onPress={save} loading={busy} full />
      </Card>

      <Section title="Recent expenses">
        {book.isLoading ? <Loading rows={3} h={64} /> : payments.length === 0 ? <T v="small" c={colors.text3}>Nothing recorded yet.</T> : payments.slice(0, 15).map((v: any, i: number) => (
          <Appear key={`${v.id}-${i}`} i={i}>
            <ListRow icon={Wallet} tone="peach" title={v.narration} sub={`${v.debitHead} · ${fmtDate(v.date)}`} right={<T v="title" w="bold">{rupees(v.debitAmount)}</T>} />
          </Appear>
        ))}
      </Section>
    </Screen>
  );
}
