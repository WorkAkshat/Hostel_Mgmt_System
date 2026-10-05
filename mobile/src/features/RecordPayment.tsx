import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Banknote, CircleCheck, Landmark, ScrollText, Smartphone } from 'lucide-react-native';
import type { Payment, PayMethod } from '../api';
import { rupees } from '../lib/format';
import { colors } from '../ui/theme';
import { Button, Card, Row, T } from '../ui/primitives';
import { Choices, DateTimeField, Field, Input } from '../ui/form';
import { ErrorBox } from '../ui/feedback';
import { Sheet } from '../ui/Sheet';
import { isoDay } from '../lib/format';

const METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote, ref: 'Receipt book no. (optional)' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, ref: 'UPI transaction ID' },
  { value: 'BANK', label: 'Bank', icon: Landmark, ref: 'Bank reference / UTR' },
  { value: 'CHEQUE', label: 'Cheque', icon: ScrollText, ref: 'Cheque number' },
];

// Warden records money received against a bill
export default function RecordPayment({ bill, onClose, onSave }: { bill: { title: string; subtitle?: string; amount: number } | null; onClose: () => void; onSave: (p: Payment) => Promise<unknown> }) {
  const [method, setMethod] = useState('CASH');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bill) { setMethod('CASH'); setRef(''); setDate(new Date()); setError(null); }
  }, [bill]);

  const m = METHODS.find((x) => x.value === method)!;
  const save = async () => {
    if (method !== 'CASH' && !ref.trim()) return setError(`Enter the ${m.ref.toLowerCase()} so the payment can be traced.`);
    if (!date) return setError('Pick the date the money was received.');
    setBusy(true);
    setError(null);
    try {
      await onSave({ method: method as PayMethod, reference: ref.trim(), paidOn: isoDay(date) });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={!!bill} onClose={onClose} title="Record a payment" footer={<Button title="Mark as paid" icon={CircleCheck} kind="brand" onPress={save} loading={busy} full />}>
      {bill && (
        <Card tone="sun" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T v="title" numberOfLines={1}>{bill.title}</T>
            {bill.subtitle ? <T v="caption" c={colors.text2} numberOfLines={1}>{bill.subtitle}</T> : null}
          </View>
          <T v="h1">{rupees(bill.amount)}</T>
        </Card>
      )}
      <Field label="How was it paid?"><Choices value={method} onChange={(v) => { setMethod(v); setError(null); }} columns={4} options={METHODS.map(({ value, label, icon }) => ({ value, label, icon }))} /></Field>
      <Field label={m.ref} required={method !== 'CASH'}><Input value={ref} onChangeText={(v) => { setRef(v.slice(0, 40)); setError(null); }} autoCapitalize="characters" /></Field>
      <Field label="Received on" required><DateTimeField label="Received on" value={date} onChange={setDate} withTime={false} /></Field>
      <Row gap={6}><T v="caption" c={colors.text3}>The resident gets the receipt in their app right away.</T></Row>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
}
