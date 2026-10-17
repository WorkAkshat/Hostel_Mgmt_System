import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useQueryClient } from '@tanstack/react-query';
import { QrCode, Save } from 'lucide-react-native';
import { paymentsApi, type PaymentDetails } from '../../api';
import { useData } from '../../lib/query';
import { colors } from '../../ui/theme';
import { Button, Card, Row, T } from '../../ui/primitives';
import { Field, Input } from '../../ui/form';
import { ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Screen } from '../../ui/layout';
import { FloorSelect, useFloor, useFloors } from '../../features/floor';

const EMPTY: PaymentDetails = { upiId: '', payeeName: '', bankName: '', accountName: '', accountNo: '', ifsc: '', note: '' };

// Where residents send money: UPI ID (makes the QR on their bills) and bank details, per floor company
export default function PaymentSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const { floor: chosen, locked } = useFloor();
  const floors = useFloors();
  const { data, isLoading, error, refetch } = useData(['payment-settings'], paymentsApi.settings, { interval: false });
  const [floor, setFloor] = useState<string>(chosen !== 'all' ? chosen : '1');
  const [form, setForm] = useState<PaymentDetails>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setForm({ ...EMPTY, ...(data?.[floor] || {}) }); setErr(null); }, [data, floor]);
  const company = floors.find((f: any) => String(f.floorNumber) === floor)?.companyName;
  const set = (k: keyof PaymentDetails) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setErr(null); };

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await paymentsApi.saveSettings(floor, form);
      toast.success('Payment details saved', `Residents on floor ${floor} now see the QR on their bills.`);
      await qc.invalidateQueries({ queryKey: ['payment-settings'] });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen title="Payment details" subtitle="UPI & bank shown on residents' bills" back tabBar={false} onRefresh={refetch}>
      {!locked && <FloorSelect value={floor} onChange={setFloor} allowAll={false} />}
      {error ? <ErrorBox message={(error as Error).message} onRetry={refetch} /> : isLoading ? <Loading rows={3} /> : (
        <>
          <Card style={{ gap: 14 }}>
            <Row><QrCode size={18} color={colors.brand700} /><T v="title" style={{ flex: 1 }}>UPI · Floor {floor}{company ? ` · ${company}` : ''}</T></Row>
            <Field label="UPI ID" hint="Residents scan a QR made from this, with the exact bill amount filled in">
              <Input value={form.upiId} onChangeText={set('upiId')} autoCapitalize="none" placeholder="e.g. rajken@okicici" />
            </Field>
            <Field label="Name shown in the UPI app"><Input value={form.payeeName} onChangeText={set('payeeName')} placeholder={company || 'e.g. Rajken Enterprises'} /></Field>
            {form.upiId && /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(form.upiId) ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ padding: 10, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                  <QRCode value={`upi://pay?pa=${encodeURIComponent(form.upiId)}&pn=${encodeURIComponent(form.payeeName || company || 'Hari Pushp Tower')}&cu=INR`} size={120} />
                </View>
                <T v="caption" c={colors.text3}>Preview — scan it once to check the name is right</T>
              </View>
            ) : null}
          </Card>
          <Card style={{ gap: 14 }}>
            <T v="title">Bank transfer (optional)</T>
            <Field label="Bank name"><Input value={form.bankName} onChangeText={set('bankName')} placeholder="e.g. State Bank of India" /></Field>
            <Field label="Account holder"><Input value={form.accountName} onChangeText={set('accountName')} /></Field>
            <Row gap={10} align="flex-start">
              <View style={{ flex: 1.3 }}><Field label="Account number"><Input value={form.accountNo} onChangeText={(v) => set('accountNo')(v.replace(/\D/g, '').slice(0, 18))} keyboardType="number-pad" /></Field></View>
              <View style={{ flex: 1 }}><Field label="IFSC"><Input value={form.ifsc} onChangeText={(v) => set('ifsc')(v.toUpperCase().slice(0, 11))} autoCapitalize="characters" /></Field></View>
            </Row>
            <Field label="Note for residents (optional)"><Input value={form.note} onChangeText={set('note')} placeholder="e.g. Write your room number in the payment note" /></Field>
          </Card>
          {err && <ErrorBox message={err} />}
          <Button title={`Save for floor ${floor}`} icon={Save} kind="brand" onPress={save} loading={busy} full />
        </>
      )}
    </Screen>
  );
}
