import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, CircleCheck, HandCoins, Landmark, ScrollText, Send, Smartphone } from 'lucide-react-native';
import { feesApi, visitorsApi, type ChargeCategory, type PayMethod } from '../api';
import { asList } from '../api/client';
import { useData } from '../lib/query';
import { fmtDate, isoDay, rupees } from '../lib/format';
import { colors } from '../ui/theme';
import { Button, Press, Row, Segmented, T } from '../ui/primitives';
import { Choices, DateTimeField, Field, Input, Picker, money } from '../ui/form';
import { ErrorBox, useToast } from '../ui/feedback';
import { Sheet } from '../ui/Sheet';
import { CHARGE_TYPES, dueLabel, useAllBills, useRecordBill } from './dues';

const METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote, ref: 'Receipt book no. (optional)' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, ref: 'UPI transaction ID' },
  { value: 'BANK', label: 'Bank', icon: Landmark, ref: 'Bank reference / UTR' },
  { value: 'CHEQUE', label: 'Cheque', icon: ScrollText, ref: 'Cheque number' },
];

export type ChargeMode = 'ask' | 'paid';

// Warden, for one resident:
//  • "Ask to pay" — a fine, damage, deposit or anything else. It shows up in the
//    resident's Bills with the UPI QR, like any other bill.
//  • "Add payment" — money received: against a pending bill, or for something else
//    (advance, deposit…), saved as paid with a receipt.
export default function ChargeSheet({ open, onClose, student, mode: startMode = 'ask' }: {
  open: boolean; onClose: () => void; student?: { id: string; name: string; room?: string | null } | null; mode?: ChargeMode;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const record = useRecordBill();
  const all = useAllBills();
  const residents = useData(['gate-residents'], visitorsApi.residents, { enabled: open && !student, interval: false });

  const [mode, setMode] = useState<ChargeMode>(startMode);
  const [who, setWho] = useState('');
  const [category, setCategory] = useState<ChargeCategory>('FINE');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState<Date | null>(null);
  const [billKey, setBillKey] = useState<string>('other');
  const [method, setMethod] = useState('CASH');
  const [ref, setRef] = useState('');
  const [paidOn, setPaidOn] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(startMode); setWho(student?.id || ''); setCategory(startMode === 'paid' ? 'ADVANCE' : 'FINE'); setTitle(''); setAmount(''); setNote('');
    setDue(new Date(Date.now() + 7 * 86400000)); setMethod('CASH'); setRef(''); setPaidOn(new Date()); setError(null); setBillKey('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const studentId = student?.id || who;
  const unpaid = useMemo(() => all.bills.filter((b) => b.studentId === studentId && b.state !== 'paid').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()), [all.bills, studentId]);
  // "Add payment" starts on the oldest pending bill, if there is one
  useEffect(() => { if (open && mode === 'paid' && !billKey) setBillKey(unpaid[0]?.key || 'other'); }, [open, mode, unpaid, billKey]);

  const bill = mode === 'paid' ? unpaid.find((b) => b.key === billKey) : undefined;
  const type = CHARGE_TYPES.find((c) => c.value === category)!;
  const types = CHARGE_TYPES.filter((c) => (mode === 'ask' ? c.ask : c.paid));
  const m = METHODS.find((x) => x.value === method)!;
  const value = bill ? bill.amount : Number(amount) || 0;
  const name = student?.name || asList(residents.data).find((r: any) => r.id === who)?.name || 'the resident';

  const switchMode = (v: ChargeMode) => {
    setMode(v); setError(null);
    if (v === 'paid') { setBillKey(unpaid[0]?.key || 'other'); if (category === 'FINE') setCategory('ADVANCE'); }
    else if (category === 'ADVANCE') setCategory('FINE');
  };

  const save = async () => {
    setError(null);
    if (!studentId) return setError('Choose the resident.');
    if (!bill) {
      if (!(Number(amount) > 0)) return setError('Enter the amount.');
      if (category === 'OTHER' && title.trim().length < 2) return setError('Write what this is for.');
    }
    if (mode === 'paid') {
      if (method !== 'CASH' && ref.trim().length < 4) return setError(`Enter the ${m.ref.toLowerCase()} so the payment can be traced.`);
      if (!paidOn) return setError('Pick the date the money was received.');
    }
    setBusy(true);
    try {
      if (bill) {
        await record(bill, { method: method as PayMethod, reference: ref.trim(), paidOn: isoDay(paidOn!) });
        toast.success('Payment recorded', `${rupees(bill.amount)} from ${name} · ${bill.title}`);
      } else {
        await feesApi.charge({
          studentId, category, title: title.trim() || type.title, amount: Number(amount), note: note.trim() || undefined,
          ...(mode === 'ask'
            ? { dueDate: due ? isoDay(due) : undefined }
            : { paid: true, method: method as PayMethod, reference: ref.trim(), paidOn: isoDay(paidOn!) }),
        });
        toast.success(mode === 'ask' ? 'Sent to the resident' : 'Payment recorded', mode === 'ask' ? `${name} sees ${rupees(amount)} in their Bills and can pay by UPI.` : `${rupees(amount)} from ${name} — receipt is in their app.`);
        await Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['student', studentId] })]);
      }
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'ask' ? 'Ask for money' : 'Add a payment'} subtitle={student ? student.name + (student.room ? ` · Room ${student.room}` : '') : 'Pick a resident'}
      footer={<Button title={mode === 'ask' ? `Send request${value ? ` · ${rupees(value)}` : ''}` : `Save payment${value ? ` · ${rupees(value)}` : ''}`} icon={mode === 'ask' ? Send : CircleCheck} kind="brand" onPress={save} loading={busy} full />}>
      <Segmented value={mode} onChange={switchMode} options={[{ value: 'ask', label: 'Ask to pay' }, { value: 'paid', label: 'Add payment' }]} />

      {!student && (
        <Field label="Resident" required>
          <Picker label="Choose resident" searchable value={who} onChange={(v) => { setWho(v); setBillKey(''); setError(null); }} placeholder={residents.isLoading ? 'Loading…' : 'Search by name, room or roll no.'}
            items={asList(residents.data).map((r: any) => ({ value: r.id, label: r.name, sub: [r.roomNumber ? `Room ${r.roomNumber}` : 'No room', r.rollNumber].filter(Boolean).join(' · ') }))} />
        </Field>
      )}

      {/* Add payment: which bill is it for? */}
      {mode === 'paid' && studentId && unpaid.length > 0 && (
        <Field label="What is this payment for?">
          <View style={{ gap: 8 }}>
            {[...unpaid.map((b) => ({ key: b.key, t: b.title, s: dueLabel(b), a: b.amount })), { key: 'other', t: 'Something else', s: 'Advance, deposit, fine paid on the spot…', a: 0 }].map((o) => {
              const on = billKey === o.key;
              return (
                <Press key={o.key} onPress={() => { setBillKey(o.key); setError(null); }} scaleTo={0.98} style={[styles.pick, on && styles.pickOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                  <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.dot} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="title" numberOfLines={1}>{o.t}</T>
                    <T v="caption" c={colors.text3} numberOfLines={1}>{o.s}</T>
                  </View>
                  {o.a ? <T v="title" w="bold">{rupees(o.a)}</T> : null}
                </Press>
              );
            })}
          </View>
        </Field>
      )}

      {/* A new charge (or a payment that isn't for a pending bill) */}
      {!bill && (
        <>
          <Field label={mode === 'ask' ? 'What is it for?' : 'Paid for'}>
            <Choices pills value={category} onChange={(v) => { setCategory(v); setError(null); }} options={types.map((c) => ({ value: c.value, label: c.label }))} />
          </Field>
          <Field label="Title" required={category === 'OTHER'} hint={mode === 'ask' ? 'The resident sees this on the bill' : undefined}>
            <Input value={title} onChangeText={(v) => { setTitle(v.slice(0, 80)); setError(null); }} placeholder={type.title || 'e.g. Extra mattress'} />
          </Field>
          <Row gap={10} align="flex-start">
            <View style={{ flex: 1 }}>
              <Field label="Amount" required><Input prefix="₹" value={amount} onChangeText={(v) => { setAmount(money(v)); setError(null); }} keyboardType="decimal-pad" placeholder="0" /></Field>
            </View>
            {mode === 'ask' && (
              <View style={{ flex: 1 }}>
                <Field label="Pay by"><DateTimeField label="Pay by" value={due} onChange={setDue} withTime={false} minDate={new Date()} /></Field>
              </View>
            )}
          </Row>
          <Field label="Note (optional)"><Input value={note} onChangeText={(v) => setNote(v.slice(0, 300))} placeholder={mode === 'ask' ? 'e.g. Chair broken in room 204 on 3 Oct' : 'Anything to remember'} multiline /></Field>
        </>
      )}

      {/* How the money came in */}
      {mode === 'paid' && (
        <>
          <Field label="How was it paid?"><Choices value={method} onChange={(v) => { setMethod(v); setError(null); }} columns={4} options={METHODS.map(({ value: v, label, icon }) => ({ value: v, label, icon }))} /></Field>
          <Row gap={10} align="flex-start">
            <View style={{ flex: 1.2 }}>
              <Field label={method === 'CASH' ? 'Receipt no.' : 'Reference'} required={method !== 'CASH'}><Input value={ref} onChangeText={(v) => { setRef(v.slice(0, 40)); setError(null); }} autoCapitalize="characters" placeholder={method === 'CASH' ? 'Optional' : 'UTR / cheque no.'} /></Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Received on"><DateTimeField label="Received on" value={paidOn} onChange={setPaidOn} withTime={false} /></Field>
            </View>
          </Row>
        </>
      )}

      <Row gap={8} align="flex-start" style={styles.hint}>
        <HandCoins size={16} color={colors.brand700} />
        <T v="caption" c={colors.brand700} style={{ flex: 1 }}>
          {mode === 'ask'
            ? `${name === 'the resident' ? 'The resident' : name} gets it in Bills with the UPI QR and pay buttons${due ? `, due ${fmtDate(due)}` : ''}.`
            : 'Saved as paid — the receipt shows in the resident’s app and in your reports.'}
        </T>
      </Row>
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  pickOn: { borderColor: colors.brand500, backgroundColor: colors.mint50 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand600 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand600 },
  hint: { padding: 12, borderRadius: 12, backgroundColor: colors.mint50 },
});
