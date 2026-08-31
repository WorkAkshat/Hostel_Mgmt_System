import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../config';

const fmtInr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function TallyAccountingScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedFloor, setAssignedFloor] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('combined');

  const [activeTab, setActiveTab] = useState<'daybook' | 'trial' | 'pnl' | 'bs' | 'voucher'>('daybook');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [daybook, setDaybook] = useState<any[]>([]);
  const [trial, setTrial] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);

  // Voucher state
  const [voucherType, setVoucherType] = useState('RECEIPT');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [debitHead, setDebitHead] = useState('ASSET-BANK');
  const [creditHead, setCreditHead] = useState('REV-HOSTEL');

  useEffect(() => {
    SecureStore.getItemAsync('userToken').then((t: string | null) => {
      if (t) setToken(t);
    });
    SecureStore.getItemAsync('userData').then((uStr: string | null) => {
      if (uStr) {
        const u = JSON.parse(uStr);
        setUserRole(u.role);
        if (u.assignedFloor) {
          setAssignedFloor(u.assignedFloor);
          setSelectedFloor(String(u.assignedFloor));
        }
      }
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (activeTab === 'daybook') {
        const res = await fetch(`${API_URL}/accounting/daybook?floorNumber=${selectedFloor}`, { headers });
        const data = await res.json();
        setDaybook(Array.isArray(data) ? data : []);
      } else if (activeTab === 'trial') {
        const res = await fetch(`${API_URL}/accounting/trial-balance?floorNumber=${selectedFloor}`, { headers });
        const data = await res.json();
        setTrial(data);
      } else if (activeTab === 'pnl') {
        const res = await fetch(`${API_URL}/accounting/profit-loss?floorNumber=${selectedFloor}`, { headers });
        const data = await res.json();
        setPnl(data);
      } else if (activeTab === 'bs') {
        const res = await fetch(`${API_URL}/accounting/balance-sheet?floorNumber=${selectedFloor}`, { headers });
        const data = await res.json();
        setBs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab, selectedFloor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePostVoucher = async () => {
    if (!amount || !narration) {
      Alert.alert('Validation Error', 'Please enter amount and narration description');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/accounting/vouchers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voucherType,
          amount: parseFloat(amount),
          narration,
          debitHeadCode: debitHead,
          creditHeadCode: creditHead,
          floorNumber: selectedFloor === 'combined' ? null : parseInt(selectedFloor, 10)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to post voucher');
      Alert.alert('Success', `Voucher ${data.voucherNo} posted to Tally ledger!`);
      setAmount('');
      setNarration('');
      setActiveTab('daybook');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tally Style Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📖 Tally ERP Ledger</Text>
          <View style={styles.fyBadge}><Text style={styles.fyTxt}>2026-27</Text></View>
        </View>

        {/* Firm Filter Buttons */}
        {!assignedFloor && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.firmBar}>
            {['combined', '1', '2', '3', '4', '5'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.firmChip, selectedFloor === f && styles.firmChipActive]}
                onPress={() => setSelectedFloor(f)}
              >
                <Text style={[styles.firmChipTxt, selectedFloor === f && styles.firmChipTxtActive]}>
                  {f === 'combined' ? '🌐 All Firms' : `Floor ${f}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'daybook', label: 'Day Book' },
          { id: 'trial', label: 'Trial Bal' },
          { id: 'pnl', label: 'P & L' },
          { id: 'bs', label: 'Bal Sheet' },
          { id: 'voucher', label: '+ Voucher' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
            onPress={() => setActiveTab(t.id as any)}
          >
            <Text style={[styles.tabTxt, activeTab === t.id && styles.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && activeTab !== 'voucher' ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* DAY BOOK */}
            {activeTab === 'daybook' && (
              <View>
                <Text style={styles.sectionTitle}>Day Book Vouchers Register</Text>
                {daybook.length === 0 ? (
                  <Text style={styles.emptyTxt}>No vouchers recorded.</Text>
                ) : (
                  daybook.map((v) => (
                    <View key={v.id} style={styles.voucherCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.vNo}>{v.voucherNo}</Text>
                        <Text style={styles.vType}>{v.voucherType}</Text>
                      </View>
                      <Text style={styles.vDesc}>{v.narration}</Text>
                      <View style={styles.cardFooter}>
                        <Text style={styles.vFirm}>{v.companyName || 'Consolidated'}</Text>
                        <Text style={styles.vAmt}>{fmtInr(v.amount)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TRIAL BALANCE */}
            {activeTab === 'trial' && trial && (
              <View>
                <Text style={styles.sectionTitle}>Trial Balance Summary</Text>
                {trial.summary?.map((r: any) => (
                  <View key={r.code} style={styles.trialRow}>
                    <View>
                      <Text style={styles.trialName}>{r.name}</Text>
                      <Text style={styles.trialCode}>{r.code} · {r.group}</Text>
                    </View>
                    <Text style={styles.trialAmt}>{fmtInr(Math.abs(r.netBalance))} {r.netBalance >= 0 ? 'Dr' : 'Cr'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* P & L */}
            {activeTab === 'pnl' && pnl && (
              <View>
                <Text style={styles.sectionTitle}>Profit & Loss Statement</Text>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Revenue Income</Text>
                  <Text style={[styles.metricVal, { color: '#10b981' }]}>{fmtInr(pnl.totalIncome)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Operating Expenses</Text>
                  <Text style={[styles.metricVal, { color: '#f43f5e' }]}>{fmtInr(pnl.totalExpenses)}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: '#0f172a' }]}>
                  <Text style={[styles.metricLabel, { color: '#34d399' }]}>Net Profit / Surplus</Text>
                  <Text style={[styles.metricVal, { color: '#6ee7b7' }]}>{fmtInr(pnl.netProfit)}</Text>
                </View>
              </View>
            )}

            {/* BALANCE SHEET */}
            {activeTab === 'bs' && bs && (
              <View>
                <Text style={styles.sectionTitle}>Balance Sheet</Text>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Current Assets & Bank Balances</Text>
                  <Text style={[styles.metricVal, { color: '#10b981' }]}>{fmtInr(bs.totalAssets)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Total Security Deposits & Liabilities</Text>
                  <Text style={[styles.metricVal, { color: '#64748b' }]}>{fmtInr(bs.totalLiabilities)}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: '#0f172a' }]}>
                  <Text style={[styles.metricLabel, { color: '#34d399' }]}>Capital & Reserves</Text>
                  <Text style={[styles.metricVal, { color: '#6ee7b7' }]}>{fmtInr(bs.capitalAndReserves)}</Text>
                </View>
              </View>
            )}

            {/* POST VOUCHER */}
            {activeTab === 'voucher' && (
              <View style={styles.formContainer}>
                <Text style={styles.sectionTitle}>Post Tally Voucher</Text>

                <Text style={styles.label}>Voucher Type</Text>
                <View style={styles.typeRow}>
                  {['RECEIPT', 'PAYMENT', 'JOURNAL'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, voucherType === t && styles.typeBtnActive]}
                      onPress={() => setVoucherType(t)}
                    >
                      <Text style={[styles.typeTxt, voucherType === t && styles.typeTxtActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 14000"
                  value={amount}
                  onChangeText={setAmount}
                />

                <Text style={styles.label}>Narration / Particulars</Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  multiline
                  placeholder="Narration details..."
                  value={narration}
                  onChangeText={setNarration}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handlePostVoucher}>
                  <Text style={styles.submitTxt}>Post Voucher to Tally Ledger</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f172a', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  backTxt: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  fyBadge: { backgroundColor: '#064e3b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fyTxt: { color: '#6ee7b7', fontSize: 11, fontWeight: 'bold' },
  firmBar: { marginTop: 12 },
  firmChip: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
  firmChipActive: { backgroundColor: '#10b981' },
  firmChipTxt: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  firmChipTxtActive: { color: '#ffffff' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 3, borderColor: '#10b981' },
  tabTxt: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  tabTxtActive: { color: '#10b981' },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  emptyTxt: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 13 },
  voucherCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vNo: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  vType: { fontSize: 10, fontWeight: 'bold', color: '#10b981', backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  vDesc: { fontSize: 12, color: '#475569', marginVertical: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 6 },
  vFirm: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  vAmt: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  trialRow: { backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  trialName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  trialCode: { fontSize: 10, color: '#94a3b8' },
  trialAmt: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  metricCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  metricVal: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  formContainer: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginTop: 12, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  typeTxt: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  typeTxtActive: { color: '#34d399' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  submitBtn: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitTxt: { color: '#34d399', fontSize: 13, fontWeight: '900' }
});
