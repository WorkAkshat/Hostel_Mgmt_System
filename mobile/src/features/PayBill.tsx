import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, CircleCheck, Clock, Copy, Landmark, Send, Smartphone, XCircle } from 'lucide-react-native';
import { paymentsApi, type ClaimMethod, type PaymentDetails } from '../api';
import { fmtDate, isoDay, rupees } from '../lib/format';
import { colors } from '../ui/theme';
import { Button, Card, IconButton, Row, Segmented, T } from '../ui/primitives';
import { DateTimeField, Field, Input } from '../ui/form';
import { ErrorBox, useToast } from '../ui/feedback';

export type PayableBill = { kind: 'invoice' | 'note'; id: string; amount: number; number: string; title: string };

const upiLink = (d: PaymentDetails, b: PayableBill) =>
  `upi://pay?pa=${encodeURIComponent(d.upiId || '')}&pn=${encodeURIComponent(d.payeeName || 'Hari Pushp Tower')}&am=${Number(b.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${b.number} ${b.title}`.slice(0, 60))}`;

const CopyRow = ({ k, v }: { k: string; v?: string }) => {
  const toast = useToast();
  if (!v) return null;
  return (
    <Row style={styles.copyRow}>
      <View style={{ flex: 1 }}>
        <T v="caption" c={colors.text3}>{k}</T>
        <T v="title" selectable>{v}</T>
      </View>
      <IconButton icon={Copy} label={`Copy ${k}`} tone="mint" size={36} onPress={async () => { await Clipboard.setStringAsync(v); toast.success('Copied', v); }} />
    </Row>
  );
};

// Inside a resident's bill: how to pay (UPI QR, bank transfer or cash) and
// "I have paid" so the warden can confirm it. Shows the status of a sent payment.
export default function PayBill({ bill, details, claim }: { bill: PayableBill; details?: PaymentDetails; claim?: any }) {
  const qc = useQueryClient();
  const toast = useToast();
  const hasUpi = !!details?.upiId;
  const hasBank = !!details?.accountNo;
  const [method, setMethod] = useState<ClaimMethod>(hasUpi || !hasBank ? 'UPI' : 'BANK');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Details load after the sheet opens: jump to the first way that is set up
  useEffect(() => { if (hasUpi) setMethod('UPI'); else if (hasBank) setMethod('BANK'); else setMethod('UPI'); }, [hasUpi, hasBank]);

  if (claim?.status === 'PENDING') {
    return (
      <Card tone="lilac" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Clock size={22} color={colors.lilac700} />
        <View style={{ flex: 1 }}>
          <T v="title" c={colors.lilac700}>Payment sent · warden is checking</T>
          <T v="caption" c={colors.lilac700}>{rupees(claim.amount)} via {claim.method}{claim.reference ? ` · ${claim.reference}` : ''} · {fmtDate(claim.paidOn)}</T>
        </View>
      </Card>
    );
  }

  const send = async () => {
    if (method !== 'CASH' && ref.trim().length < 6) return setError('Enter the transaction ID (UTR / reference) from your payment app or bank.');
    if (!date) return setError('Pick the date you paid.');
    setBusy(true); setError(null);
    try {
      await paymentsApi.claim({ billKind: bill.kind === 'invoice' ? 'INVOICE' : 'NOTE', billId: bill.id, method, reference: ref.trim(), paidOn: isoDay(date) });
      toast.success('Sent to the warden', 'Your bill turns green once they confirm the payment.');
      await qc.invalidateQueries({ queryKey: ['my-payment-claims'] });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const options = [
    { value: 'UPI' as const, label: 'UPI / QR' },
    { value: 'BANK' as const, label: 'Bank' },
    { value: 'CASH' as const, label: 'At office' },
  ];
  const missing = (method === 'UPI' && !hasUpi) || (method === 'BANK' && !hasBank);

  return (
    <View style={{ gap: 12 }}>
      {claim?.status === 'REJECTED' && (
        <Card tone="danger" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <XCircle size={20} color={colors.danger} />
          <T v="small" c={colors.danger} style={{ flex: 1 }}>Your last payment was not confirmed: “{claim.reason}”. Check and send again.</T>
        </Card>
      )}
      <T v="label" c={colors.text3}>Pay this bill</T>
      <Segmented value={method} onChange={(v) => { setMethod(v); setError(null); }} options={options} />

      {missing && (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
          <View style={styles.missingIcon}>{method === 'UPI' ? <Smartphone size={26} color={colors.brand600} /> : <Landmark size={26} color={colors.brand600} />}</View>
          <T v="title" center>{method === 'UPI' ? 'UPI QR not added yet' : 'Bank details not added yet'}</T>
          <T v="small" c={colors.text2} center style={{ maxWidth: 280 }}>The hostel office hasn't added its {method === 'UPI' ? 'UPI ID' : 'bank account'} for your floor. Pay at the office for now — this QR appears here as soon as they add it.</T>
          <Button title="Pay at the office instead" kind="secondary" small onPress={() => setMethod('CASH')} />
        </Card>
      )}

      {method === 'UPI' && hasUpi && details && (
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <View style={styles.qr}><QRCode value={upiLink(details, bill)} size={176} color={colors.text} backgroundColor={colors.white} /></View>
          <T v="small" c={colors.text2} center>Scan with any UPI app (GPay, PhonePe, Paytm…) to pay {rupees(bill.amount)}</T>
          {Platform.OS !== 'web' && <Button title={`Pay ${rupees(bill.amount)} with UPI app`} icon={Smartphone} kind="brand" onPress={() => Linking.openURL(upiLink(details, bill)).catch(() => toast.error('No UPI app found', 'Scan the QR from another phone, or copy the UPI ID.'))} full />}
          <View style={{ alignSelf: 'stretch' }}>
            <CopyRow k="UPI ID" v={details.upiId} />
            {details.payeeName ? <T v="caption" c={colors.text3}>Paying to {details.payeeName}</T> : null}
          </View>
        </Card>
      )}

      {method === 'BANK' && hasBank && details && (
        <Card style={{ gap: 2 }}>
          <Row gap={8} style={{ marginBottom: 6 }}><Landmark size={18} color={colors.brand700} /><T v="title">{details.bankName || 'Bank transfer'}</T></Row>
          <CopyRow k="Account name" v={details.accountName} />
          <CopyRow k="Account number" v={details.accountNo} />
          <CopyRow k="IFSC" v={details.ifsc} />
          <T v="caption" c={colors.text3} style={{ marginTop: 6 }}>Transfer exactly {rupees(bill.amount)} and keep the UTR number.</T>
        </Card>
      )}

      {method === 'CASH' && (
        <Card tone="sun" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Banknote size={20} color={colors.sun800} />
          <T v="small" c={colors.sun900} style={{ flex: 1 }}>Pay at the hostel office — the warden records it and this bill turns green.</T>
        </Card>
      )}
      {details?.note ? <T v="caption" c={colors.text3}>{details.note}</T> : null}

      {method !== 'CASH' && !missing && (
        <Card style={{ gap: 12 }}>
          <T v="title">Already paid?</T>
          <Field label="Transaction ID / UTR" required hint="12 digits in your UPI app or bank SMS">
            <Input value={ref} onChangeText={(v) => { setRef(v.replace(/\s/g, '').slice(0, 40)); setError(null); }} autoCapitalize="characters" placeholder="e.g. 427812345678" />
          </Field>
          <Field label="Paid on"><DateTimeField label="Paid on" value={date} onChange={setDate} withTime={false} /></Field>
          {error && <ErrorBox message={error} />}
          <Button title="I have paid — send to warden" icon={Send} onPress={send} loading={busy} full />
        </Card>
      )}
      {claim?.status === 'APPROVED' && (
        <Row gap={6}><CircleCheck size={14} color={colors.success} /><T v="caption" c={colors.success}>Payment confirmed by {claim.decidedBy || 'the warden'}</T></Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  qr: { padding: 12, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  missingIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  copyRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
