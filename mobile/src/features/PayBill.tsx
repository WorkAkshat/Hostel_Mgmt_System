import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, ChevronDown, CircleCheck, Clock, Copy, Landmark, QrCode, Send, Smartphone, Wallet, XCircle } from 'lucide-react-native';
import { paymentsApi, type ClaimMethod, type PaymentDetails } from '../api';
import { fmtDate, isoDay, rupees } from '../lib/format';
import { colors } from '../ui/theme';
import { Button, Card, IconButton, Press, Row, Segmented, T } from '../ui/primitives';
import { DateTimeField, Field, Input } from '../ui/form';
import { ErrorBox, useToast } from '../ui/feedback';

export type PayableBill = { kind: 'invoice' | 'note'; id: string; amount: number; number: string; title: string };

const upiQuery = (d: PaymentDetails, b: PayableBill) =>
  `pa=${encodeURIComponent(d.upiId || '')}&pn=${encodeURIComponent(d.payeeName || 'Hari Pushp Tower')}&am=${Number(b.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${b.number} ${b.title}`.slice(0, 60))}`;
const upiLink = (d: PaymentDetails, b: PayableBill) => `upi://pay?${upiQuery(d, b)}`;

// Each app opens straight on the payment screen with the amount filled in.
// If the app isn't installed we fall back to the phone's "pay with" chooser.
// `home` opens the app without a payment (used until the hostel adds its UPI ID);
// `store` is the Play Store page when the app isn't installed.
const UPI_APPS = [
  { key: 'gpay', name: 'Google Pay', mark: 'G', bg: '#e8f0fe', fg: '#1a73e8', url: Platform.OS === 'ios' ? 'gpay://upi/pay?' : 'tez://upi/pay?', home: ['gpay://', 'tez://upi/'], store: 'com.google.android.apps.nbu.paisa.user' },
  { key: 'phonepe', name: 'PhonePe', mark: 'Pe', bg: '#f1e9fb', fg: '#5f259f', url: 'phonepe://pay?', home: ['phonepe://'], store: 'com.phonepe.app' },
  { key: 'paytm', name: 'Paytm', mark: 'P', bg: '#e5f7fd', fg: '#00a5e0', url: 'paytmmp://pay?', home: ['paytmmp://', 'paytm://'], store: 'net.one97.paytm' },
  { key: 'bhim', name: 'BHIM', mark: 'B', bg: '#fff1e6', fg: '#e8711a', url: 'bhim://upi/pay?', home: ['bhim://'], store: 'in.org.npci.upiapp' },
];

// Just open the app (no payee filled in); Play Store if it isn't installed
const openAppHome = async (a: (typeof UPI_APPS)[number]) => {
  for (const url of a.home) {
    try { await Linking.openURL(url); return 'app'; } catch { /* try the next one */ }
  }
  try {
    await Linking.openURL(Platform.OS === 'android' ? `market://details?id=${a.store}` : `https://play.google.com/store/apps/details?id=${a.store}`);
    return 'store';
  } catch { return null; }
};

const AppTiles = ({ onPick }: { onPick: (a: (typeof UPI_APPS)[number]) => void }) => (
  <View style={styles.apps}>
    {UPI_APPS.map((a) => (
      <Press key={a.key} onPress={() => onPick(a)} scaleTo={0.94} style={styles.app} accessibilityRole="button" accessibilityLabel={`Pay with ${a.name}`}>
        <View style={[styles.appMark, { backgroundColor: a.bg }]}><T v="title" w="extrabold" c={a.fg}>{a.mark}</T></View>
        <T v="caption" w="semibold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{a.name}</T>
      </Press>
    ))}
  </View>
);

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
  const [opened, setOpened] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
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

  const openApp = async (name: string, url: string) => {
    if (!details) return;
    try {
      await Linking.openURL(url);
      setOpened(name);
    } catch {
      try {
        await Linking.openURL(upiLink(details, bill));
        setOpened('your UPI app');
        toast.info(`${name} isn't installed`, 'Pick another UPI app.');
      } catch {
        toast.error('No UPI app found', 'Install GPay, PhonePe or Paytm, or scan the QR from another phone.');
      }
    }
  };

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
  const demoOpen = async (a: (typeof UPI_APPS)[number]) => {
    const r = await openAppHome(a);
    if (r === 'store') toast.info(`${a.name} isn't installed`, 'Opened it in the Play Store.');
    else if (!r) toast.error(`Could not open ${a.name}`);
  };

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

      {/* No hostel UPI ID yet: the app buttons still open the apps, without a payee */}
      {method === 'UPI' && !hasUpi && Platform.OS !== 'web' && (
        <Card style={{ gap: 12 }}>
          <View style={styles.amount}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="caption" c={colors.text3}>Amount to pay</T>
              <T v="title" numberOfLines={1}>Hari Pushp Tower</T>
            </View>
            <T v="h1" c={colors.brand700}>{rupees(bill.amount)}</T>
          </View>
          <T v="label" c={colors.text3}>Pay with</T>
          <AppTiles onPick={demoOpen} />
          <T v="caption" c={colors.text3} center>The hostel's UPI ID isn't added yet, so the app opens without the payee. Once the office adds it, the amount fills in by itself.</T>
        </Card>
      )}

      {missing && !(method === 'UPI' && Platform.OS !== 'web') && (
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
          <View style={styles.missingIcon}>{method === 'UPI' ? <Smartphone size={26} color={colors.brand600} /> : <Landmark size={26} color={colors.brand600} />}</View>
          <T v="title" center>{method === 'UPI' ? 'UPI QR not added yet' : 'Bank details not added yet'}</T>
          <T v="small" c={colors.text2} center style={{ maxWidth: 280 }}>The hostel office hasn't added its {method === 'UPI' ? 'UPI ID' : 'bank account'} for your floor. Pay at the office for now — this QR appears here as soon as they add it.</T>
          <Button title="Pay at the office instead" kind="secondary" small onPress={() => setMethod('CASH')} />
        </Card>
      )}

      {method === 'UPI' && hasUpi && details && (
        <Card style={{ gap: 12 }}>
          <View style={styles.amount}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="caption" c={colors.text3}>Paying to</T>
              <T v="title" numberOfLines={1}>{details.payeeName || 'Hari Pushp Tower'}</T>
            </View>
            <T v="h1" c={colors.brand700}>{rupees(bill.amount)}</T>
          </View>
          {Platform.OS !== 'web' && (
            <>
              <T v="label" c={colors.text3}>Pay with</T>
              <AppTiles onPick={(a) => openApp(a.name, `${a.url}${upiQuery(details, bill)}`)} />
              <Button title="Other UPI app" icon={Wallet} kind="secondary" small full onPress={() => openApp('your UPI app', upiLink(details, bill))} />
            </>
          )}
          <Press onPress={() => setShowQr((v) => !v)} scaleTo={0.99} style={styles.qrToggle} accessibilityRole="button" accessibilityState={{ expanded: showQr || Platform.OS === 'web' }}>
            <QrCode size={18} color={colors.brand700} />
            <T v="small" w="bold" c={colors.brand700} style={{ flex: 1 }}>{Platform.OS === 'web' ? 'Scan the QR to pay' : 'Scan QR from another phone'}</T>
            {Platform.OS !== 'web' && <ChevronDown size={16} color={colors.brand700} style={{ transform: [{ rotate: showQr ? '180deg' : '0deg' }] }} />}
          </Press>
          {(showQr || Platform.OS === 'web') && (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={styles.qr}><QRCode value={upiLink(details, bill)} size={176} color={colors.text} backgroundColor={colors.white} /></View>
              <T v="caption" c={colors.text3} center>Works with any UPI app — amount is filled in</T>
            </View>
          )}
          <CopyRow k="UPI ID" v={details.upiId} />
        </Card>
      )}

      {opened && method !== 'CASH' && (
        <Card tone="mint" style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <CircleCheck size={20} color={colors.brand700} />
          <T v="small" c={colors.brand700} style={{ flex: 1 }}>Paid in {opened}? Copy the UTR / transaction ID from it and enter it below so the warden can confirm.</T>
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
  amount: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.mint50 },
  apps: { flexDirection: 'row', gap: 8 },
  app: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  appMark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qrToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.mint50 },
  qr: { padding: 12, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  missingIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' },
  copyRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
