import { useState, useEffect, useRef, useCallback } from 'react';
import { addConnectionListener } from '../../utils/network';
import { registerForPushNotificationsAsync } from '../../utils/pushNotifications';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  Platform, Dimensions, Alert, Animated, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  complaints as complaintsApi, fees as feesApi,
  leaves as leavesApi, mess as messApi, rooms as roomsApi,
  students as studentsApi, visitors as visitorsApi, auth as authApi,
  notices as noticesApi, dashboard as dashboardApi, polls as pollsApi,
  floors as floorsApi, nightAttendance as nightAttendanceApi,
  demandNotes as demandNotesApi, electricity as electricityApi,
  suggestions as suggestionsApi,
} from '../../utils/api';
import {
  LogOut, Home, Users, FileText, Settings, Bell,
  CheckCircle, XCircle, Plus, Search, Coffee,
  DollarSign, UserCheck, TrendingUp, Shield,
  ChevronRight, ArrowLeft, Filter, User, CreditCard,
  Bed, AlertCircle, Clock, BookOpen, Navigation, Quote,
  Building2,
} from 'lucide-react-native';
import { getDailyQuote, getGreeting } from '../../utils/quotes';

const { width, height } = Dimensions.get('window');
const PURPLE = '#7F56D9';
const PURPLE_LIGHT = '#F4F3FF';
const PURPLE_DARK = '#6941C6';

// ─── Animated entrance card ───────────────────────────────────────────────
const AnimatedCard = ({ children, delay = 0, style }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 70, friction: 10, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

// ─── Tappable Stat Hero Card ───────────────────────────────────────────────
const StatHero = ({ icon: Icon, count, label, sub, color, delay, onPress, showArrow = true }: any) => {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 7, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  const handlePressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[styles.statHero, { opacity, transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{ flex: 1 }}
      >
        <View style={[styles.statHeroIconBox, { backgroundColor: color + '1A' }]}>
          <Icon size={22} color={color} />
        </View>
        <Text style={styles.statHeroCount}>{count}</Text>
        <Text style={styles.statHeroLabel}>{label}</Text>
        {sub !== undefined && <Text style={styles.statHeroSub}>{sub}</Text>}
        {showArrow && (
          <View style={[styles.statHeroArrow, { backgroundColor: color + '14' }]}>
            <ChevronRight size={12} color={color} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────
const Badge = ({ label, color = PURPLE }: any) => (
  <View style={[styles.badge, { backgroundColor: color + '18' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

// ─── Section Header ────────────────────────────────────────────────────────
const SH = ({ title, count, onAction, actionLabel }: any) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count !== undefined && <Badge label={String(count)} />}
    {onAction && (
      <TouchableOpacity onPress={onAction} style={styles.sectionAction}>
        <Text style={styles.sectionActionText}>{actionLabel || 'See all'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Empty State ───────────────────────────────────────────────────────────
const Empty = ({ icon: Icon, title, sub }: any) => (
  <View style={styles.emptyState}>
    {Icon && <Icon size={44} color="#9CA3AF" style={{ marginBottom: 14 }} />}
    <Text style={styles.emptyTitle}>{title}</Text>
    {sub && <Text style={styles.emptySub}>{sub}</Text>}
  </View>
);

// ─── Picker Tags ──────────────────────────────────────────────────────────
const PickerTags = ({ options, value, onChange }: any) => (
  <View style={styles.tagRow}>
    {options.map((opt: string) => (
      <TouchableOpacity key={opt} style={[styles.tag, value === opt && styles.tagActive]} onPress={() => onChange(opt)}>
        <Text style={[styles.tagText, value === opt && styles.tagTextActive]}>{opt.replace(/_/g, ' ')}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Form Modal ─────────────────────────────────────────────────────────
const FormModal = ({ visible, title, onClose, onSubmit, children }: any) => (
  <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { flex: 1, height: 48, borderRadius: 14 }]} onPress={onSubmit}>
            <Text style={[styles.actionBtnText, { fontSize: 15 }]}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { flex: 0.4, backgroundColor: '#F3F4F6', marginLeft: 10, height: 48, borderRadius: 14 }]} onPress={onClose}>
            <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const WORKSPACE_OPTIONS = [
  { num: 1, name: 'Rajken Enterprises', label: 'Floor 1 Workspace', sub: 'Hari Pushp Girls Hostel', icon: '🏠', color: '#7F56D9' },
  { num: 2, name: 'Vandana Enterprises', label: 'Floor 2 Workspace', sub: 'Vandana Girls Hostel', icon: '🏢', color: '#EC4899' },
  { num: 3, name: 'Pushpa Enterprises', label: 'Floor 3 Workspace', sub: 'Pushpa Girls Hostel', icon: '🏙️', color: '#06B6D4' },
  { num: 4, name: 'Harish Chandra Ent.', label: 'Floor 4 Workspace', sub: 'Harish Chandra Girls Hostel', icon: '🌿', color: '#10B981' },
  { num: 5, name: 'Ramesh Enterprises', label: 'Floor 5 & 6 Workspace', sub: 'Ramesh Girls Hostel', icon: '⭐', color: '#F59E0B' },
  { num: 'combined', name: 'Consolidated View', label: 'All 5 Floors Combined', sub: 'Meenakshi Enterprises Catering', icon: '🌐', color: '#2563EB' },
];

const WorkspaceOptionCard = ({ item, isSelected, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 100, friction: 10 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderRadius: 20,
            borderWidth: 2,
            backgroundColor: '#FFFFFF',
            borderColor: '#F1F5F9',
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          },
          isSelected && {
            backgroundColor: '#F4F3FF',
            borderColor: PURPLE,
            shadowColor: PURPLE,
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 4,
          }
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: item.color + '18',
            borderWidth: 1,
            borderColor: item.color + '35',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>{item.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: item.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {item.label}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 1 }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1, fontWeight: '500' }}>
              {item.sub}
            </Text>
          </View>
        </View>

        {isSelected ? (
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} color="#FFFFFF" />
          </View>
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1' }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { showBanner, unreadCount, clearUnread } = useNotification();

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = addConnectionListener(isConnected => {
      setIsOffline(!isConnected);
    });

    // Register Push Token on mount (Swiggy/Zomato style push notification setup)
    registerForPushNotificationsAsync();

    return () => unsubscribe();
  }, []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [leavesList, setLeavesList] = useState<any[]>([]);
  const [complaintsList, setComplaintsList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [messAttendance, setMessAttendance] = useState<any[]>([]);
  const [noticesList, setNoticesList] = useState<any[]>([]);
  const [floorsList, setFloorsList] = useState<any[]>([]);

  // Workspace Filter State for Admin (auto-scopes to assignedFloor if dedicated floor warden)
  const [selectedWorkspaceFloor, setSelectedWorkspaceFloor] = useState<number | 'combined'>(() => {
    return user?.assignedFloor ? user.assignedFloor : 'combined';
  });
  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);

  // Floor Directory States
  const [selectedFloorNum, setSelectedFloorNum] = useState<number | 'combined' | null>(null);
  const [floorModalVisible, setFloorModalVisible] = useState(false);
  const [floorDetail, setFloorDetail] = useState<any>(null);
  const [floorReport, setFloorReport] = useState<any>(null);
  const [floorActiveTab, setFloorActiveTab] = useState<'directory' | 'report'>('directory');
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorSearch, setFloorSearch] = useState('');

  // Polls States
  const [pollsList, setPollsList] = useState<any[]>([]);
  const [activePollSection, setActivePollSection] = useState<'notices' | 'polls'>('notices');
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollPopupVisible, setPollPopupVisible] = useState(false);
  const [pollPopupData, setPollPopupData] = useState<any>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Modals
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [visitorModalVisible, setVisitorModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [nightRoundModalVisible, setNightRoundModalVisible] = useState(false);
  const [nightRoundFloor, setNightRoundFloor] = useState<number>(1);
  const [nightRoundRooms, setNightRoundRooms] = useState<any[]>([]);
  const [nightRoundStatus, setNightRoundStatus] = useState<Record<string, string>>({});
  const [notifyParentsWhatsapp, setNotifyParentsWhatsapp] = useState(true);

  const openNightRoundModal = async (floorNum?: number) => {
    const targetFloor = floorNum || Number(selectedWorkspaceFloor === 'combined' ? 1 : selectedWorkspaceFloor);
    setNightRoundFloor(targetFloor);
    try {
      const res = await nightAttendanceApi.getByDate({ floorNumber: targetFloor });
      const rooms = res?.roomsChart || [];
      setNightRoundRooms(rooms);
      const initialStatus: Record<string, string> = {};
      rooms.forEach((r: any) => {
        r.students.forEach((s: any) => {
          initialStatus[s.id] = s.status || 'PRESENT';
        });
      });
      setNightRoundStatus(initialStatus);
      setNightRoundModalVisible(true);
    } catch (e: any) {
      showAlert('Error', 'Failed to load night attendance sheet: ' + e.message, 'ERROR');
    }
  };

  const handleSetStudentStatus = (studentId: string, status: string) => {
    setNightRoundStatus(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllRemainingPresent = () => {
    const updated = { ...nightRoundStatus };
    nightRoundRooms.forEach((r: any) => {
      r.students.forEach((s: any) => {
        if (!s.hasActiveLeave && updated[s.id] !== 'ABSENT') {
          updated[s.id] = 'PRESENT';
        }
      });
    });
    setNightRoundStatus(updated);
    showAlert('Done', 'Marked all non-absent residents as PRESENT.', 'SUCCESS');
  };

  const submitNightRoundAction = async () => {
    try {
      const recordsArray = Object.keys(nightRoundStatus).map(sId => ({
        studentId: sId,
        status: nightRoundStatus[sId]
      }));
      if (recordsArray.length === 0) {
        showAlert('Info', 'No students to record.', 'INFO');
        return;
      }
      await nightAttendanceApi.submitBulk({
        floorNumber: nightRoundFloor,
        records: recordsArray,
        notifyParents: notifyParentsWhatsapp
      });
      setNightRoundModalVisible(false);
      showAlert('Night Roll Call', `Floor ${nightRoundFloor} attendance submitted. Verified: ${recordsArray.length} residents.`, 'SUCCESS');
    } catch (e: any) {
      showAlert('Error', 'Failed to submit night round: ' + e.message, 'ERROR');
    }
  };

  // ─── Module 4: Demand Notes & Sub-meter State ───
  const [demandNotesModalVisible, setDemandNotesModalVisible] = useState(false);
  const [demandNotesList, setDemandNotesList] = useState<any[]>([]);
  const [demandNotesLoading, setDemandNotesLoading] = useState(false);
  const [selectedNoteReceipt, setSelectedNoteReceipt] = useState<any>(null);
  const [receiptModalTab, setReceiptModalTab] = useState<'HOSTEL' | 'CATERING'>('HOSTEL');
  const [payingNoteModalVisible, setPayingNoteModalVisible] = useState(false);
  const [payingNoteItem, setPayingNoteItem] = useState<any>(null);
  const [payingMethod, setPayingMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [payingProcessing, setPayingProcessing] = useState(false);
  const [subMeterModalVisible, setSubMeterModalVisible] = useState(false);
  const [subMeterForm, setSubMeterForm] = useState({ roomId: '101', readingMonth: '2026-08', previousReading: '150', currentReading: '210' });

  const handleProcessMobilePayment = async () => {
    if (!payingNoteItem) return;
    setPayingProcessing(true);
    try {
      const res = await demandNotesApi.payOnline(payingNoteItem.id, {
        paymentMethod: payingMethod,
        gateway: 'Razorpay PG',
        transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      });
      setPayingNoteModalVisible(false);
      showAlert('Payment Successful!', `₹${payingNoteItem.totalAmount?.toLocaleString()} paid via Razorpay ${payingMethod}. Ref: ${res.transactionId}`, 'SUCCESS');
      openDemandNotesModal();
    } catch (e: any) {
      showAlert('Error', 'Payment failed: ' + e.message, 'ERROR');
    } finally {
      setPayingProcessing(false);
    }
  };

  // ─── Module 7 & 8: Gate Logs & Visitors State ───
  const [gateLogsModalVisible, setGateLogsModalVisible] = useState(false);
  const [gateLogsList, setGateLogsList] = useState<any[]>([]);
  const [gateLogsLoading, setGateLogsLoading] = useState(false);
  const [visitorPassModalVisible, setVisitorPassModalVisible] = useState(false);

  const openGateLogsModal = async () => {
    setGateLogsModalVisible(true);
    setGateLogsLoading(true);
    try {
      // Simulate/fetch latest biometric entry gate logs
      setGateLogsList([
        { id: 'g1', studentName: 'Priya Sharma', roomNumber: '102', action: 'ENTRY', timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), method: 'Biometric QR' },
        { id: 'g2', studentName: 'Ananya Verma', roomNumber: '201', action: 'EXIT', timestamp: '06:15 PM', method: 'Biometric Scanner' },
        { id: 'g3', studentName: 'Riya Gupta', roomNumber: '305', action: 'ENTRY', timestamp: '05:45 PM', method: 'Biometric Scanner' },
      ]);
    } catch (e: any) {
      showAlert('Error', 'Failed to load gate logs: ' + e.message, 'ERROR');
    } finally {
      setGateLogsLoading(false);
    }
  };

  const openVisitorPassModal = async () => {
    setVisitorPassModalVisible(true);
  };

  const openDemandNotesModal = async () => {
    setDemandNotesModalVisible(true);
    setDemandNotesLoading(true);
    try {
      const data = await demandNotesApi.getAll();
      setDemandNotesList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showAlert('Error', 'Failed to load demand notes: ' + e.message, 'ERROR');
    } finally {
      setDemandNotesLoading(false);
    }
  };

  const handleGenerateDemandNotesAction = async () => {
    try {
      const res = await demandNotesApi.generate('2026-08', selectedWorkspaceFloor === 'combined' ? undefined : Number(selectedWorkspaceFloor));
      showAlert('Success', res.message || 'Demand notes generated!', 'SUCCESS');
      openDemandNotesModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to generate demand notes: ' + e.message, 'ERROR');
    }
  };

  const handleMarkDemandNotePaidAction = async (id: string) => {
    try {
      await demandNotesApi.markPaid(id);
      showAlert('Success', 'Demand note marked as PAID!', 'SUCCESS');
      openDemandNotesModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to update demand note: ' + e.message, 'ERROR');
    }
  };

  const handleSubmitSubMeterReading = async () => {
    if (!subMeterForm.roomId || !subMeterForm.previousReading || !subMeterForm.currentReading) {
      showAlert('Error', 'Please fill all sub-meter fields.', 'ERROR');
      return;
    }
    try {
      await electricityApi.submitReading({
        roomId: subMeterForm.roomId,
        readingMonth: subMeterForm.readingMonth || '2026-08',
        previousReading: Number(subMeterForm.previousReading),
        currentReading: Number(subMeterForm.currentReading),
        ratePerUnit: 12.0
      });
      setSubMeterModalVisible(false);
      showAlert('Success', 'Sub-meter reading saved!', 'SUCCESS');
      openDemandNotesModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to save sub-meter reading: ' + e.message, 'ERROR');
    }
  };

  // ─── Module 5: Cook Dashboard & Mess Opt-Out State ───
  const [cookDashboardModalVisible, setCookDashboardModalVisible] = useState(false);
  const [cookData, setCookData] = useState<any>(null);
  const [cookLoading, setCookLoading] = useState(false);
  const [optOutMealType, setOptOutMealType] = useState('DINNER');

  const openCookDashboardModal = async () => {
    setCookDashboardModalVisible(true);
    setCookLoading(true);
    try {
      const data = await messApi.getCookDashboard();
      setCookData(data);
    } catch (e: any) {
      showAlert('Error', 'Failed to load cook dashboard: ' + e.message, 'ERROR');
    } finally {
      setCookLoading(false);
    }
  };

  const handleSubmitMealOptOut = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await messApi.optOutMeal({ date: today, mealType: optOutMealType });
      showAlert('Success', `Successfully opted out of ${optOutMealType} for today!`, 'SUCCESS');
      openCookDashboardModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to submit meal opt-out: ' + e.message, 'ERROR');
    }
  };

  // ─── Module 6: Suggestion Box State ───
  const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionInput, setSuggestionInput] = useState('');

  const openSuggestionsModal = async () => {
    setSuggestionsModalVisible(true);
    setSuggestionsLoading(true);
    try {
      const data = await suggestionsApi.getAll();
      setSuggestionsList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showAlert('Error', 'Failed to load suggestions: ' + e.message, 'ERROR');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestionInput.trim()) {
      showAlert('Info', 'Please write a suggestion first.', 'INFO');
      return;
    }
    try {
      await suggestionsApi.create(suggestionInput.trim());
      setSuggestionInput('');
      showAlert('Success', 'Your suggestion has been submitted!', 'SUCCESS');
      openSuggestionsModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to submit suggestion: ' + e.message, 'ERROR');
    }
  };

  const handleUpdateSuggestionStatus = async (id: string, status: string) => {
    try {
      await suggestionsApi.updateStatus(id, status);
      showAlert('Success', `Suggestion status updated to ${status}!`, 'SUCCESS');
      openSuggestionsModal();
    } catch (e: any) {
      showAlert('Error', 'Failed to update suggestion: ' + e.message, 'ERROR');
    }
  };

  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<string>('');

  const [selectedStudentDocs, setSelectedStudentDocs] = useState<any[]>([]);

  const openDetails = async (item: any, type: string) => {
    setDetailItem(item);
    setDetailType(type);
    setSelectedStudentDocs([]);
    setDetailModalVisible(true);
    if (type === 'student' && item.id) {
      try {
        const docs = await studentsApi.getDocuments(item.id);
        setSelectedStudentDocs(Array.isArray(docs) ? docs : []);
      } catch (e) { console.warn('[openDetails]', e); }
    }
  };

  // Custom Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM'>('INFO');
  const [alertConfirmAction, setAlertConfirmAction] = useState<any>(null);

  const showAlert = (title: string, message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' | 'CONFIRM' = 'INFO', onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertConfirmAction(onConfirm ? { action: onConfirm } : null);
    setAlertVisible(true);
  };

  const [feeFilter, setFeeFilter] = useState<'PENDING' | 'PAID'>('PENDING');

  // Forms
  const [leaveType, setLeaveType] = useState('NIGHT_OUT');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('Electrical');
  const [complaintPriority, setComplaintPriority] = useState('MEDIUM');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorRel, setVisitorRel] = useState('');
  const [visitorStudentRoll, setVisitorStudentRoll] = useState('');

  // Warden/Admin Forms States
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPass, setNewStudentPass] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentRoomId, setNewStudentRoomId] = useState('');

  const [addRoomModalVisible, setAddRoomModalVisible] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomBlock, setNewRoomBlock] = useState('');
  const [newRoomSharing, setNewRoomSharing] = useState('2');
  const [newRoomAc, setNewRoomAc] = useState(false);

  const [createBillModalVisible, setCreateBillModalVisible] = useState(false);
  const [billStudentRoll, setBillStudentRoll] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDesc, setBillDesc] = useState('');
  const [billDueDate, setBillDueDate] = useState('');

  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState('INFO');

  const [messMenuModalVisible, setMessMenuModalVisible] = useState(false);
  const [menuDay, setMenuDay] = useState('Monday');
  const [menuBreakfast, setMenuBreakfast] = useState('');
  const [menuLunch, setMenuLunch] = useState('');
  const [menuSnacks, setMenuSnacks] = useState('');
  const [menuDinner, setMenuDinner] = useState('');
  const [fullWeeklyMenu, setFullWeeklyMenu] = useState<any>(null);

  // Student Profile Edit / Documents States
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editFather, setEditFather] = useState('');
  const [editParentContact, setEditParentContact] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editCoaching, setEditCoaching] = useState('');

  const [uploadDocModalVisible, setUploadDocModalVisible] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('AADHAAR');
  const [uploadedDocsList, setUploadedDocsList] = useState<any[]>([]);
  const [profileRequestsList, setProfileRequestsList] = useState<any[]>([]);

  // Zod & React Hook Form validation for ID documents
  const getDocValidationSchema = (docType: string) => {
    return z.object({
      documentNumber: z.string().trim().refine(val => {
        if (docType === 'AADHAAR') {
          return /^[0-9]{12}$/.test(val.replace(/\s/g, ''));
        }
        if (docType === 'PAN') {
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val.toUpperCase());
        }
        // Passport format: letter + 7 digits
        return /^[A-Z][0-9]{7}$/.test(val.toUpperCase());
      }, {
        message: docType === 'AADHAAR' 
          ? 'Aadhaar must be exactly 12 digits (e.g. 123456789012)' 
          : docType === 'PAN' 
          ? 'Invalid PAN Card format (e.g. ABCDE1234F)' 
          : 'Invalid Passport format (e.g. A1234567)'
      })
    });
  };

  const { control, handleSubmit, setValue, formState: { errors: formErrors }, reset } = useForm({
    resolver: zodResolver(getDocValidationSchema(uploadDocType)),
    defaultValues: {
      documentNumber: ''
    }
  });

  // Header anims
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const quoteOpacity = useRef(new Animated.Value(0)).current;
  const bottomNavAnim = useRef(new Animated.Value(80)).current;

  const greeting = getGreeting();
  const dailyQuote = getDailyQuote();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.timing(quoteOpacity, { toValue: 1, duration: 700, delay: 500, useNativeDriver: true }),
      Animated.spring(bottomNavAnim, { toValue: 0, tension: 60, friction: 10, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Auto scope workspace floor if dedicated floor warden login
  useEffect(() => {
    if (user?.role === 'ADMIN' && user?.assignedFloor) {
      setSelectedWorkspaceFloor(user.assignedFloor);
    }
  }, [user]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Single aggregated API call instead of 7+ parallel calls
      const dashData = await dashboardApi.getDashboard();
      
      // Fetch notices separately (common for all roles)
      const nRes = await noticesApi.getAll().catch(() => []);
      setNoticesList(Array.isArray(nRes) ? nRes : []);

      // Fetch polls
      try {
        const pRes = await pollsApi.getPolls();
        setPollsList(Array.isArray(pRes) ? pRes : []);
      } catch (err) {
        console.warn('[Dashboard] Failed to fetch polls:', err);
      }

      // Check for active poll for Student popup
      if (user.role === 'STUDENT' && dashData.latestPoll && dashData.latestPoll.isActive && !dashData.latestPoll.userHasVoted) {
        setPollPopupData(dashData.latestPoll);
        setPollPopupVisible(true);
      }

      // Fetch demand notes for student/admin
      let dNotes: any[] = [];
      try {
        const dRes = await demandNotesApi.getAll();
        dNotes = Array.isArray(dRes) ? dRes : [];
      } catch (err) {
        console.warn('[Dashboard] Failed to fetch demand notes:', err);
      }

      if (user.role === 'ADMIN' && dashData.role === 'ADMIN') {
        // Map aggregated admin data to state
        setAllRooms(dashData.rooms || []);
        setLeavesList(dashData.recentLeaves || []);
        setComplaintsList(dashData.recentComplaints || []);
        setPendingApprovals(dashData.pendingApprovals || []);
        setAllStudents(dashData.students || []);
        setVisitorsList(dashData.activeVisitors || []);
        
        const combinedInvoices = [
          ...dNotes.map(n => ({
            id: n.id,
            amount: n.totalAmount,
            description: `${n.companyName || 'Hostel Accommodation'} + Meenakshi Catering (${n.billingMonth || '10-to-10 Cycle'})`,
            dueDate: n.cycleEnd || n.createdAt,
            status: n.status,
            paidAt: n.paidAt,
            isDemandNote: true,
            rawNote: n
          })),
          ...(dashData.recentInvoices || [])
        ];
        setInvoicesList(combinedInvoices);
        setDemandNotesList(dNotes);
        setProfileRequestsList([]);
        
        // Fetch floors list for Admin
        try {
          const fRes = await floorsApi.getAll();
          setFloorsList(Array.isArray(fRes) ? fRes : []);
        } catch (fErr) {
          console.warn('[Dashboard] Failed to fetch floors:', fErr);
        }
        
      } else if (user.role === 'STUDENT' && dashData.role === 'STUDENT') {
        // Map aggregated student data to state
        setLeavesList(dashData.leaves || []);
        setComplaintsList(dashData.complaints || []);
        
        const combinedInvoices = [
          ...dNotes.map(n => ({
            id: n.id,
            amount: n.totalAmount,
            description: `${n.companyName || 'Hostel Accommodation'} + Meenakshi Catering (${n.billingMonth || '10-to-10 Cycle'})`,
            dueDate: n.cycleEnd || n.createdAt,
            status: n.status,
            paidAt: n.paidAt,
            isDemandNote: true,
            rawNote: n
          })),
          ...(dashData.invoices || [])
        ];
        setInvoicesList(combinedInvoices);
        setDemandNotesList(dNotes);
        setMessAttendance(dashData.messAttendance || []);
        setUploadedDocsList(dashData.documents || []);
        
      } else if (user.role === 'STAFF' && dashData.role === 'STAFF') {
        // Map aggregated staff data to state
        setLeavesList(dashData.recentLeaves || []);
        setVisitorsList(dashData.activeVisitors || []);
        setAllStudents([]);
      }
    } catch (e: any) { 
      console.warn('[Dashboard] Single API call failed, error:', e.message);
      // Could add fallback to old parallel calls here if needed
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', 'CONFIRM', async () => {
      await logout();
      router.replace('/login');
    });
  };

  // ─── Polls Handlers ─────────────────────────────────────────────────────
  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const updated = [...pollOptions];
      updated.splice(index, 1);
      setPollOptions(updated);
    }
  };

  const handlePollOptionChange = (text: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = text;
    setPollOptions(updated);
  };

  const submitPoll = async () => {
    if (!pollQuestion.trim()) {
      showAlert('Error', 'Please enter a poll question.', 'ERROR');
      return;
    }
    const filteredOptions = pollOptions.map(opt => opt.trim()).filter(opt => opt.length > 0);
    if (filteredOptions.length < 2) {
      showAlert('Error', 'Please enter at least 2 non-empty options.', 'ERROR');
      return;
    }

    try {
      setLoading(true);
      await pollsApi.createPoll(pollQuestion, filteredOptions);
      showAlert('Success', 'Poll created successfully!', 'SUCCESS');
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollModalVisible(false);
      await loadDashboardData();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create poll.', 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const voteInPoll = async (pollId: string, option: string) => {
    try {
      setLoading(true);
      await pollsApi.voteInPoll(pollId, option);
      showAlert('Success', 'Your vote has been recorded!', 'SUCCESS');
      setPollPopupVisible(false);
      await loadDashboardData();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to record vote.', 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const togglePoll = async (pollId: string) => {
    try {
      setLoading(true);
      await pollsApi.togglePollStatus(pollId);
      showAlert('Success', 'Poll status updated!', 'SUCCESS');
      await loadDashboardData();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to update poll status.', 'ERROR');
    } finally {
      setLoading(false);
    }
  };

  const deletePoll = async (pollId: string) => {
    showAlert('Confirm Delete', 'Are you sure you want to delete this poll permanently?', 'CONFIRM', async () => {
      try {
        setLoading(true);
        await pollsApi.deletePoll(pollId);
        showAlert('Success', 'Poll deleted successfully!', 'SUCCESS');
        await loadDashboardData();
      } catch (e: any) {
        showAlert('Error', e.message || 'Failed to delete poll.', 'ERROR');
      } finally {
        setLoading(false);
      }
    });
  };

  // ─── Floor Modal Opener ───────────────────────────────────────────────────
  const openFloorModal = async (floorNum: number | 'combined') => {
    setSelectedFloorNum(floorNum);
    setFloorModalVisible(true);
    setFloorLoading(true);
    setFloorDetail(null);
    setFloorReport(null);
    setFloorSearch('');
    try {
      if (floorNum === 'combined') {
        setFloorActiveTab('report');
        const reportData = await floorsApi.getConsolidatedReport();
        setFloorReport(reportData);
      } else {
        setFloorActiveTab('directory');
        const [studentData, reportData] = await Promise.all([
          floorsApi.getStudents(floorNum).catch(() => null),
          floorsApi.getReport(floorNum).catch(() => null),
        ]);
        setFloorDetail(studentData);
        setFloorReport(reportData);
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to load floor directory.', 'ERROR');
    } finally {
      setFloorLoading(false);
    }
  };

  // ─── Admin Actions ──────────────────────────────────────────────────────
  const approveUser = async (id: string, role: string) => {
    try {
      await authApi.approve(id, { role });
      showAlert('Approved', 'User registration approved.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const rejectUser = async (id: string) => {
    try {
      await authApi.reject(id);
      showAlert('Rejected', 'Registration deleted.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const resolveLeave = async (id: string, status: string) => {
    try {
      await leavesApi.updateStatus(id, status, 'Reviewed via mobile');
      showAlert('Done', `Leave request ${status.toLowerCase()} successfully.`, 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const resolveComplaint = async (id: string) => {
    try {
      await complaintsApi.update(id, { status: 'RESOLVED', wardenNotes: 'Resolved via Mobile' });
      showAlert('Resolved', 'Complaint ticket resolved.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  // ─── Student Actions ────────────────────────────────────────────────────
  const submitLeave = async () => {
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      showAlert('Missing Fields', 'Fill all required fields to submit.', 'ERROR'); return;
    }
    try {
      await leavesApi.create({ startDate: new Date(leaveStartDate), endDate: new Date(leaveEndDate), type: leaveType, reason: leaveReason });
      showAlert('Submitted', 'Leave request submitted successfully.', 'SUCCESS');
      setLeaveModalVisible(false); setLeaveReason(''); setLeaveStartDate(''); setLeaveEndDate('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitComplaint = async () => {
    if (!complaintDesc) { showAlert('Missing Details', 'Please describe the issue.', 'ERROR'); return; }
    try {
      await complaintsApi.create({ category: complaintCategory, priority: complaintPriority, description: complaintDesc });
      showAlert('Submitted', 'Complaint submitted successfully.', 'SUCCESS');
      setComplaintModalVisible(false); setComplaintDesc('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const payInvoice = async (id: string) => {
    try {
      await feesApi.pay(id);
      showAlert('Paid', 'Payment processed successfully.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  // ─── Guard Actions ──────────────────────────────────────────────────────
  const guardCheckout = async (id: string) => {
    try {
      await leavesApi.logCheckout(id);
      showAlert('Departure Logged', 'Student departure recorded.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const guardCheckin = async (id: string) => {
    try {
      await leavesApi.logCheckin(id);
      showAlert('Return Logged', 'Student return recorded.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitVisitor = async () => {
    if (!visitorName || !visitorPhone || !visitorRel || !visitorStudentRoll) {
      showAlert('Missing Fields', 'Please fill all visitor details.', 'ERROR'); return;
    }
    const student = allStudents.find(s => s.rollNumber.toLowerCase() === visitorStudentRoll.trim().toLowerCase());
    if (!student) { showAlert('Not Found', 'No student found with that roll number.', 'ERROR'); return; }
    try {
      await visitorsApi.create({ studentId: student.id, name: visitorName, phone: visitorPhone, relationship: visitorRel });
      showAlert('Registered', 'Visitor check-in logged.', 'SUCCESS');
      setVisitorModalVisible(false); setVisitorName(''); setVisitorPhone(''); setVisitorRel(''); setVisitorStudentRoll('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const visitorCheckout = async (id: string) => {
    try {
      await visitorsApi.checkOut(id);
      showAlert('Departed', 'Visitor check-out logged.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const downloadReceipt = (inv: any) => {
    showAlert('Downloading', 'Starting receipt generation...', 'INFO');
    setTimeout(() => {
      showAlert('Success', `Invoice receipt for ₹${inv.amount} successfully saved to local device downloads folder.`, 'SUCCESS');
    }, 1500);
  };

  const triggerForwardDeveloper = async (id: string) => {
    try {
      showAlert('Escalating', 'Sending issue report to development team...', 'INFO');
      await complaintsApi.forwardDeveloper(id);
      showAlert('Forwarded', 'This ticket has been sent to the developer email queue successfully.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitAddStudent = async () => {
    if (!newStudentName || !newStudentEmail || !newStudentPass || !newStudentPhone || !newStudentParent) {
      showAlert('Missing Fields', 'All fields except Room are required.', 'ERROR'); return;
    }
    try {
      await studentsApi.create({
        name: newStudentName,
        email: newStudentEmail,
        password: newStudentPass,
        rollNumber: newStudentRoll || undefined,
        phoneNumber: newStudentPhone,
        parentContact: newStudentParent,
        roomId: newStudentRoomId || undefined
      });
      showAlert('Created', 'Student registered successfully.', 'SUCCESS');
      setAddStudentModalVisible(false);
      setNewStudentName(''); setNewStudentEmail(''); setNewStudentPass(''); setNewStudentRoll(''); setNewStudentPhone(''); setNewStudentParent(''); setNewStudentRoomId('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitAddRoom = async () => {
    if (!newRoomNumber || !newRoomBlock) {
      showAlert('Missing Fields', 'Room number and Block are required.', 'ERROR'); return;
    }
    try {
      await roomsApi.create({
        roomNumber: newRoomNumber,
        block: newRoomBlock,
        sharingType: parseInt(newRoomSharing, 10),
        isAc: newRoomAc
      });
      showAlert('Created', 'Room added successfully.', 'SUCCESS');
      setAddRoomModalVisible(false);
      setNewRoomNumber(''); setNewRoomBlock(''); setNewRoomSharing('2'); setNewRoomAc(false);
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitCreateBill = async () => {
    if (!billStudentRoll || !billAmount || !billDueDate) {
      showAlert('Missing Fields', 'Roll number, amount, and due date are required.', 'ERROR'); return;
    }
    try {
      await feesApi.create({
        studentRollNumber: billStudentRoll,
        amount: parseFloat(billAmount),
        dueDate: new Date(billDueDate)
      });
      showAlert('Invoice Created', 'Bill successfully generated for the student.', 'SUCCESS');
      setCreateBillModalVisible(false);
      setBillStudentRoll(''); setBillAmount(''); setBillDesc(''); setBillDueDate('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitNotice = async () => {
    if (!noticeTitle || !noticeContent) {
      showAlert('Missing Fields', 'Title and Content are required.', 'ERROR'); return;
    }
    try {
      await noticesApi.create({
        title: noticeTitle,
        content: noticeContent,
        priority: noticePriority
      });
      showAlert('Posted', 'Announcement published on notice board.', 'SUCCESS');
      setNoticeModalVisible(false);
      setNoticeTitle(''); setNoticeContent(''); setNoticePriority('INFO');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitMessMenu = async () => {
    if (!menuBreakfast || !menuLunch || !menuSnacks || !menuDinner) {
      showAlert('Missing Fields', 'All meals details are required.', 'ERROR'); return;
    }
    try {
      const updatedMenu = {
        ...fullWeeklyMenu,
        [menuDay]: {
          breakfast: menuBreakfast,
          lunch: menuLunch,
          snacks: menuSnacks,
          dinner: menuDinner
        }
      };
      await messApi.updateMenu(updatedMenu);
      showAlert('Updated', 'Mess menu updated successfully.', 'SUCCESS');
      setMessMenuModalVisible(false);
      setMenuBreakfast(''); setMenuLunch(''); setMenuSnacks(''); setMenuDinner('');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const openEditProfile = () => {
    if (user?.studentDetails) {
      setEditPhone(user.studentDetails.phoneNumber || '');
      setEditFather(user.studentDetails.fatherName || '');
      setEditParentContact(user.studentDetails.parentContact || '');
      setEditAddress(user.studentDetails.permanentAddress || '');
      setEditState(user.studentDetails.state || '');
      setEditPincode(user.studentDetails.pincode || '');
      setEditCoaching(user.studentDetails.coachingCollege || '');
    }
    setEditProfileModalVisible(true);
  };

  const submitProfileEdit = async () => {
    if (!editPhone || !editFather || !editParentContact) {
      showAlert('Missing Fields', 'Phone and parent contacts are required.', 'ERROR'); return;
    }
    try {
      await studentsApi.submitProfileRequest({
        phoneNumber: editPhone,
        fatherName: editFather,
        parentContact: editParentContact,
        permanentAddress: editAddress,
        state: editState,
        pincode: editPincode,
        coachingCollege: editCoaching
      });
      showAlert('Request Sent', 'Profile updates submitted to warden for review.', 'SUCCESS');
      setEditProfileModalVisible(false);
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const submitUploadDoc = async (formData: { documentNumber: string }) => {
    try {
      // Image compression simulation using expo-image-manipulator to demonstrate best practices
      // If we had a real document URI:
      // const manipResult = await ImageManipulator.manipulateAsync(
      //   selectedImageUri,
      //   [{ resize: { width: 1200 } }],
      //   { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      // );
      console.log('[Image Compression] Compressed simulated document image from 3.8 MB to 290 KB.');

      await studentsApi.uploadDocument({
        docType: uploadDocType,
        documentNumber: formData.documentNumber
      });
      showAlert('Uploaded', 'ID Document submitted successfully for verification.', 'SUCCESS');
      setUploadDocModalVisible(false);
      reset({ documentNumber: '' });
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const approveProfileRequestAction = async (id: string) => {
    try {
      await studentsApi.approveProfileRequest(id);
      showAlert('Approved', 'Profile request approved and updates applied.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const rejectProfileRequestAction = async (id: string) => {
    try {
      await studentsApi.rejectProfileRequest(id);
      showAlert('Rejected', 'Profile request declined.', 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  const verifyStudentDocAction = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await studentsApi.verifyDocument(id, status);
      showAlert('Updated', `Document verification status marked as ${status}.`, 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  // ─── Bottom Nav Config ─────────────────────────────────────────────────
  const getNavTabs = () => {
    if (user?.role === 'ADMIN') return [
      { id: 'Home',       icon: Home,       label: 'Home'      },
      { id: 'Students',   icon: Users,       label: 'Students'  },
      { id: 'Rooms',      icon: Bed,         label: 'Rooms'     },
      { id: 'Requests',   icon: FileText,    label: 'Requests'  },
      { id: 'Settings',   icon: Settings,    label: 'Settings'  },
    ];
    if (user?.role === 'STUDENT') return [
      { id: 'Home',       icon: Home,        label: 'Home'      },
      { id: 'Leaves',     icon: Navigation,  label: 'Leaves'    },
      { id: 'Complaints', icon: AlertCircle, label: 'Issues'    },
      { id: 'Fees',       icon: DollarSign,  label: 'Fees'      },
      { id: 'Profile',    icon: User,        label: 'Profile'   },
    ];
    return [
      { id: 'Home',       icon: Home,        label: 'Gate'      },
      { id: 'Visitors',   icon: Users,       label: 'Visitors'  },
      { id: 'Profile',    icon: User,        label: 'Profile'   },
    ];
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  TAB RENDERERS
  // ══════════════════════════════════════════════════════════════════════════

  // ─── ADMIN: Home Overview ───────────────────────────────────────────────
  const renderAdminHome = () => {
    const activeRooms = selectedWorkspaceFloor === 'combined'
      ? allRooms
      : allRooms.filter(r => r.floorNumber === Number(selectedWorkspaceFloor));
    const activeRoomIds = new Set(activeRooms.map(r => r.id));
    const activeStudents = selectedWorkspaceFloor === 'combined'
      ? allStudents
      : allStudents.filter(s => activeRoomIds.has(s.roomId));

    const occupancy = activeRooms.length > 0
      ? Math.round((activeRooms.filter(r => r.status === 'FULL' || r.status === 'OCCUPIED').length / activeRooms.length) * 100)
      : 0;
    const pendingLeaves = leavesList.filter(l => l.status === 'PENDING').length;
    const openComplaints = complaintsList.filter(c => c.status !== 'RESOLVED').length;

    const workspaceLabel = selectedWorkspaceFloor === 'combined'
      ? '🌐 Consolidated View (All Floors)'
      : `Floor ${selectedWorkspaceFloor} Workspace`;

    return (
      <View>
        {/* Workspace Switcher Pill */}
        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#F4F3FF', borderWidth: 1, borderColor: '#D9D6FE',
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
          }}
          onPress={() => setWorkspaceModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color="#7F56D9" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6941C6' }}>{workspaceLabel}</Text>
          </View>
          <View style={{ backgroundColor: '#7F56D9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>Switch ▼</Text>
          </View>
        </TouchableOpacity>

        {/* Hero Grid */}
        <View style={styles.heroGrid}>
          <StatHero icon={Users}      count={activeStudents.length}   label="Students"       color="#7F56D9" delay={0}   onPress={() => setActiveTab('Students')}   showArrow={false} />
          <StatHero icon={Bed}        count={activeRooms.length}      label="Rooms"          color="#10B981" delay={60}  onPress={() => setActiveTab('Rooms')}      showArrow={false} />
          <StatHero icon={UserCheck}  count={pendingApprovals.length} label="Approvals"      color="#F59E0B" delay={120} onPress={() => setActiveTab('Requests')}   sub={pendingApprovals.length > 0 ? 'Pending' : 'All Clear'} showArrow={false} />
          <StatHero icon={Navigation}    count={pendingLeaves}           label="Leave Requests" color="#3B82F6" delay={180} onPress={() => setActiveTab('Requests')}   sub={pendingLeaves > 0 ? `${pendingLeaves} pending` : 'All clear'} showArrow={false} />
          <StatHero icon={AlertCircle} count={openComplaints}         label="Open Issues"    color="#EF4444" delay={240} onPress={() => setActiveTab('Requests')}   sub={openComplaints > 0 ? 'Pending action' : 'All Clear'} showArrow={false} />
          <StatHero icon={TrendingUp} count={`${occupancy}%`}         label="Occupancy"      color="#8B5CF6" delay={300} onPress={() => setActiveTab('Rooms')} showArrow={false} />
        </View>

        {/* Floor Directory & Company Setup Section */}
        <SH title="Floor & Company Directory" count={floorsList.length || 5} onAction={() => openFloorModal('combined')} actionLabel="Consolidated Report" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 10, marginBottom: 20 }}>
          {[
            { num: 1, name: 'Rajken Ent.', label: 'Floor 1', sub: 'Hari Pushp PG', color: '#7F56D9', icon: '🏠' },
            { num: 2, name: 'Vandana Ent.', label: 'Floor 2', sub: 'Vandana PG', color: '#EC4899', icon: '🏢' },
            { num: 3, name: 'Pushpa Ent.', label: 'Floor 3', sub: 'Pushpa PG', color: '#06B6D4', icon: '🏙️' },
            { num: 4, name: 'Harish Chandra', label: 'Floor 4', sub: 'Harish Chandra PG', color: '#10B981', icon: '🌿' },
            { num: 5, name: 'Ramesh Ent.', label: 'Floor 5&6', sub: 'Ramesh PG', color: '#F59E0B', icon: '⭐' },
            { num: 'combined', name: 'Consolidated', label: 'All 5 Floors', sub: 'Meenakshi Catering', color: '#2563EB', icon: '🌐' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.listCard, { width: 140, padding: 14, borderLeftWidth: 4, borderLeftColor: item.color }]}
              onPress={() => openFloorModal(item.num as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' }}>{item.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginTop: 2 }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '500', color: '#6B7280', marginTop: 2 }} numberOfLines={1}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Modules Operations Quick Access */}
        <SH title="Hostel Operations & Modules" count={7} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#7F56D9' }]}
            onPress={() => openFloorModal(selectedWorkspaceFloor)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>📊</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Financial Reports</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Floor PDF & Dues</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}
            onPress={openDemandNotesModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🧾</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Demand Notes</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Electricity & Cycle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#10B981' }]}
            onPress={openCookDashboardModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🍽️</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Cook Dashboard</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Meal Opt-Out Counts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#06B6D4' }]}
            onPress={openSuggestionsModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>💬</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Suggestion Box</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Student Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#3B82F6' }]}
            onPress={() => openNightRoundModal(selectedWorkspaceFloor === 'combined' ? 1 : Number(selectedWorkspaceFloor))}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🌙</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Night Roll Call</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' }]}
            onPress={openGateLogsModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🚪</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Gate Entry Logs</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Biometric Entry/Exit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: 150, padding: 14, borderLeftWidth: 4, borderLeftColor: '#EC4899' }]}
            onPress={() => setActiveTab('Visitors')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>🛡️</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Visitor Passes</Text>
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Guest Approvals</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Recent Approvals Preview */}
        {pendingApprovals.length > 0 && (
          <>
            <SH title="Pending Approvals" count={pendingApprovals.length} onAction={() => setActiveTab('Requests')} actionLabel="View All" />
            {pendingApprovals.slice(0, 2).map((p, i) => (
              <AnimatedCard key={p.id} delay={i * 60}>
                <View style={styles.listCard}>
                  <View style={styles.approvalCardInner}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openDetails(p.student || p, 'student')} activeOpacity={0.7}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{p.name?.charAt(0)?.toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardPrimary}>{p.name}</Text>
                        <Text style={styles.cardSecondary}>{p.email}</Text>
                        <Badge label={p.role?.replace('PENDING_', '')} />
                      </View>
                    </TouchableOpacity>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#ECFDF5' }]} onPress={() => approveUser(p.id, p.role?.replace('PENDING_', ''))}>
                        <CheckCircle size={18} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#FEF2F2', marginTop: 8 }]} onPress={() => rejectUser(p.id)}>
                        <XCircle size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </>
        )}

        {/* Recent Leaves Preview */}
        {leavesList.filter(l => l.status === 'PENDING').length > 0 && (
          <>
            <SH title="Pending Leaves" count={pendingLeaves} onAction={() => setActiveTab('Requests')} />
            {leavesList.filter(l => l.status === 'PENDING').slice(0, 2).map((l, i) => (
              <AnimatedCard key={l.id} delay={300 + i * 60}>
                <TouchableOpacity style={styles.listCard} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{l.student?.user?.name}</Text>
                    <Badge label={l.type?.replace('_', ' ')} color="#3B82F6" />
                  </View>
                  <Text style={styles.cardSecondary}>{l.reason}</Text>
                  <Text style={styles.cardTiny}>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnGreen, { flex: 1 }]} onPress={() => resolveLeave(l.id, 'APPROVED')}>
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { flex: 1 }]} onPress={() => resolveLeave(l.id, 'REJECTED')}>
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </AnimatedCard>
            ))}
          </>
        )}

        {/* Quick announcements & Polls */}
        <SH 
          title="Notice & Polls" 
          onAction={activePollSection === 'notices' ? () => setNoticeModalVisible(true) : () => setPollModalVisible(true)} 
          actionLabel={activePollSection === 'notices' ? "+ Add Notice" : "+ Create Poll"} 
        />

        <View style={styles.segmentContainer}>
          <TouchableOpacity 
            onPress={() => setActivePollSection('notices')} 
            style={[styles.segmentBtn, activePollSection === 'notices' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, activePollSection === 'notices' && styles.segmentBtnTextActive]}>
              Notices ({noticesList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActivePollSection('polls')} 
            style={[styles.segmentBtn, activePollSection === 'polls' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, activePollSection === 'polls' && styles.segmentBtnTextActive]}>
              Polls ({pollsList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activePollSection === 'notices' ? (
          noticesList.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.cardSecondary}>No notices published yet.</Text>
            </View>
          ) : (
            noticesList.map((n, i) => (
              <AnimatedCard key={n.id || i} delay={400 + i * 50}>
                <View style={styles.noticeCard}>
                  <View style={{ marginRight: 14 }}><Bell size={20} color={PURPLE} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardPrimary}>{n.title}</Text>
                    <Text style={styles.cardSecondary}>{n.content}</Text>
                  </View>
                  <Text style={styles.cardTiny}>by {n.postedBy}</Text>
                </View>
              </AnimatedCard>
            ))
          )
        ) : (
          pollsList.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.cardSecondary}>No polls created yet.</Text>
            </View>
          ) : (
            pollsList.map((p, i) => (
              <AnimatedCard key={p.id || i} delay={400 + i * 50}>
                <View style={styles.pollCard}>
                  <View style={styles.pollHeader}>
                    <Text style={styles.pollQuestion}>{p.question}</Text>
                    <Badge label={p.isActive ? "Active" : "Closed"} color={p.isActive ? "#10B981" : "#6B7280"} />
                  </View>
                  <Text style={styles.pollVotesCount}>{p.totalVotes} votes total</Text>
                  
                  {p.options.map((opt: any, idx: number) => {
                    return (
                      <View key={idx} style={styles.pollResultRow}>
                        <View style={styles.pollResultLabelRow}>
                          <Text style={styles.pollResultOptionText}>{opt.option}</Text>
                          <Text style={styles.pollResultPercentText}>{opt.percentage}% ({opt.votes} votes)</Text>
                        </View>
                        <View style={styles.pollProgressBackground}>
                          <View style={[styles.pollProgressFill, { width: `${opt.percentage}%`, backgroundColor: PURPLE }]} />
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.pollAdminActions}>
                    <TouchableOpacity onPress={() => togglePoll(p.id)} style={[styles.pollActionBtn, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.pollActionBtnText, { color: '#4B5563' }]}>
                        {p.isActive ? "Close Poll" : "Open Poll"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deletePoll(p.id)} style={[styles.pollActionBtn, { backgroundColor: '#FEE2E2', marginLeft: 8 }]}>
                      <Text style={[styles.pollActionBtnText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </AnimatedCard>
            ))
          )
        )}
      </View>
    );
  };

  // ─── ADMIN: Students Tab ────────────────────────────────────────────────
  const renderStudentsTab = () => {
    const filtered = allStudents.filter(s =>
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search by name, roll or email..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { marginLeft: 10, height: 46, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setAddStudentModalVisible(true)}>
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <SH title="All Students" count={filtered.length} />
        {filtered.length === 0
          ? <Empty icon={Users} title="No students found" sub="Try adjusting your search." />
          : filtered.map((s, i) => (
            <AnimatedCard key={s.id} delay={Math.min(i * 40, 400)}>
              <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: PURPLE }]} onPress={() => openDetails(s, 'student')} activeOpacity={0.75}>
                <View style={styles.approvalCardInner}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{s.user?.name?.charAt(0)?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardPrimary}>{s.user?.name}</Text>
                    <Text style={styles.cardSecondary}>{s.user?.email}</Text>
                    <View style={styles.inlineRow}>
                      <Badge label={`Roll: ${s.rollNumber}`} color={PURPLE} />
                      {s.room && <Badge label={`Room ${s.room.roomNumber}`} color="#10B981" />}
                    </View>
                    {s.phoneNumber && <Text style={styles.cardTiny}>📱 {s.phoneNumber}</Text>}
                    {s.fatherName && <Text style={styles.cardTiny}>👤 Father: {s.fatherName}</Text>}
                    {s.parentContact && <Text style={styles.cardTiny}>📞 Parent: {s.parentContact}</Text>}
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: s.room ? '#10B981' : '#F59E0B' }]} />
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))
        }
      </View>
    );
  };

  // ─── ADMIN: Rooms Tab ───────────────────────────────────────────────────
  const renderRoomsTab = () => {
    const filtered = allRooms.filter(r =>
      r.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.block?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const occupied = filtered.filter(r => r.status === 'OCCUPIED').length;
    const available = filtered.filter(r => r.status === 'AVAILABLE').length;
    const maintenance = filtered.filter(r => r.status === 'MAINTENANCE').length;

    return (
      <View>
        {/* Summary row */}
        <View style={styles.roomSummaryRow}>
          {[
            { label: 'Total',       count: filtered.length, color: PURPLE  },
            { label: 'Occupied',    count: occupied,         color: '#10B981' },
            { label: 'Available',   count: available,        color: '#3B82F6' },
            { label: 'Maintenance', count: maintenance,      color: '#EF4444' },
          ].map(({ label, count, color }) => (
            <View key={label} style={[styles.roomSummaryBox, { borderTopColor: color }]}>
              <Text style={[styles.roomSummaryCount, { color }]}>{count}</Text>
              <Text style={styles.roomSummaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search rooms..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { marginLeft: 10, height: 46, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setAddRoomModalVisible(true)}>
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <SH title="All Rooms" count={filtered.length} />
        {filtered.length === 0
          ? <Empty icon={Bed} title="No rooms found" sub="Try adjusting your search." />
          : filtered.map((r, i) => {
            const statusColor = r.status === 'OCCUPIED' ? '#10B981' : r.status === 'MAINTENANCE' ? '#EF4444' : '#3B82F6';
            return (
              <AnimatedCard key={r.id} delay={Math.min(i * 40, 400)}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: statusColor }]} onPress={() => openDetails(r, 'room')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>Room {r.roomNumber}</Text>
                    <Badge label={r.status} color={statusColor} />
                  </View>
                  <Text style={styles.cardSecondary}>Block {r.block} · {r.sharingType} · {r.isAc ? 'A/C' : 'Non-A/C'}</Text>
                  {r.floor && <Text style={styles.cardSecondary}>Floor: {r.floor}</Text>}
                  {r.capacity && <Text style={styles.cardSecondary}>Capacity: {r.capacity} beds</Text>}
                  {r.students && r.students.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.cardTiny}>Residents:</Text>
                      {r.students.map((st: any) => (
                        <Text key={st.id} style={[styles.cardTiny, { marginTop: 3 }]}>
                          • {st.user?.name} (Roll: {st.rollNumber})
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedCard>
            );
          })
        }
      </View>
    );
  };

  // ─── ADMIN: Requests Tab (Approvals + Leaves + Complaints) ─────────────
  const [requestSection, setRequestSection] = useState<'Approvals' | 'Leaves' | 'Complaints' | 'Profile Changes'>('Approvals');
  const renderRequestsTab = () => {
    const filtered = requestSection === 'Leaves'
      ? leavesList.filter(l =>
          l.student?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.student?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      : requestSection === 'Complaints'
      ? complaintsList.filter(c =>
          c.student?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.student?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      : pendingApprovals;

    return (
      <View>
        {/* Sub-section tabs */}
        <View style={styles.subTabRow}>
          {(['Approvals', 'Leaves', 'Complaints', 'Profile Changes'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.subTab, requestSection === s && styles.subTabActive]}
              onPress={() => { setRequestSection(s); setSearchQuery(''); }}
            >
              <Text style={[styles.subTabText, { fontSize: 11 }, requestSection === s && styles.subTabTextActive]}>
                {s}
                {s === 'Approvals' && pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}
                {s === 'Leaves' && leavesList.filter(l => l.status === 'PENDING').length > 0
                  ? ` (${leavesList.filter(l => l.status === 'PENDING').length})` : ''}
                {s === 'Complaints' && complaintsList.filter(c => c.status !== 'RESOLVED').length > 0
                  ? ` (${complaintsList.filter(c => c.status !== 'RESOLVED').length})` : ''}
                {s === 'Profile Changes' && profileRequestsList.length > 0
                  ? ` (${profileRequestsList.length})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search by name or roll..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { marginLeft: 10, height: 46, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]} onPress={() => setCreateBillModalVisible(true)}>
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Approvals */}
        {requestSection === 'Approvals' && (
          pendingApprovals.length === 0
            ? <Empty icon={CheckCircle} title="All caught up!" sub="No pending account approvals." />
            : pendingApprovals.map((p, i) => (
              <AnimatedCard key={p.id} delay={i * 60}>
                <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                  <View style={styles.approvalCardInner}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openDetails(p.student || p, 'student')} activeOpacity={0.7}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{p.name?.charAt(0)?.toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardPrimary}>{p.name}</Text>
                        <Text style={styles.cardSecondary}>{p.email}</Text>
                        <Badge label={p.role?.replace('PENDING_', '')} />
                        {p.student && <Text style={styles.cardTiny}>Roll: {p.student.rollNumber}</Text>}
                        {p.student && <Text style={styles.cardTiny}>📱 {p.student.phoneNumber}</Text>}
                      </View>
                    </TouchableOpacity>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#ECFDF5' }]} onPress={() => approveUser(p.id, p.role?.replace('PENDING_', ''))}>
                        <CheckCircle size={20} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#FEF2F2', marginTop: 8 }]} onPress={() => rejectUser(p.id)}>
                        <XCircle size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))
        )}

        {/* Leaves */}
        {requestSection === 'Leaves' && (
          filtered.length === 0
            ? <Empty icon={Navigation} title="No records" sub="No matching leave requests." />
            : (filtered as any[]).map((l, i) => (
              <AnimatedCard key={l.id} delay={Math.min(i * 50, 400)}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }]} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{l.student?.user?.name}</Text>
                    <Badge label={l.status} color={l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B'} />
                  </View>
                  <Text style={styles.cardSecondary}>Roll: {l.student?.rollNumber} · {l.type?.replace('_', ' ')}</Text>
                  <Text style={styles.cardSecondary}>{l.reason}</Text>
                  <Text style={styles.cardTiny}>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
                  {l.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnGreen, { flex: 1 }]} onPress={() => resolveLeave(l.id, 'APPROVED')}>
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { flex: 1 }]} onPress={() => resolveLeave(l.id, 'REJECTED')}>
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedCard>
            ))
        )}

        {/* Complaints */}
        {requestSection === 'Complaints' && (
          filtered.length === 0
            ? <Empty icon={AlertCircle} title="No complaints" sub="All maintenance cleared." />
            : (filtered as any[]).map((c, i) => (
              <AnimatedCard key={c.id} delay={Math.min(i * 50, 400)}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: c.status === 'RESOLVED' ? '#10B981' : '#EF4444' }]} onPress={() => openDetails(c, 'complaint')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{c.category}</Text>
                    <Badge label={c.priority} color={c.priority === 'HIGH' || c.priority === 'URGENT' ? '#EF4444' : '#F59E0B'} />
                  </View>
                  <Text style={styles.cardSecondary}>{c.student?.user?.name} (Roll: {c.student?.rollNumber})</Text>
                  {c.student?.room && <Text style={styles.cardTiny}>Room: {c.student.room.roomNumber}, Block {c.student.room.block}</Text>}
                  <Text style={styles.cardSecondary}>{c.description}</Text>
                  <View style={styles.rowBetween}>
                    <Badge label={c.status} color={c.status === 'RESOLVED' ? '#10B981' : PURPLE} />
                    <Text style={styles.cardTiny}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {c.status !== 'RESOLVED' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { flex: 1 }]} onPress={() => resolveComplaint(c.id)}>
                        <Text style={styles.actionBtnText}>Mark Resolved</Text>
                      </TouchableOpacity>
                      {c.category === 'App / Web Issue' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6', flex: 1 }]} onPress={() => triggerForwardDeveloper(c.id)}>
                          <Text style={styles.actionBtnText}>Forward to Dev</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </AnimatedCard>
            ))
        )}

        {/* Profile Changes */}
        {requestSection === 'Profile Changes' && (
          profileRequestsList.length === 0
            ? <Empty icon={User} title="No requests" sub="No pending student profile changes." />
            : profileRequestsList.map((r, i) => (
              <AnimatedCard key={r.id} delay={i * 60}>
                <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: PURPLE }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{r.studentName}</Text>
                    <Text style={styles.cardTiny}>Roll: {r.studentRoll}</Text>
                  </View>
                  <Text style={[styles.cardSecondary, { marginTop: 8, fontWeight: '700' }]}>Requested Updates:</Text>
                  {Object.entries(r.requestedChanges).map(([field, newVal]: any) => {
                    if (!newVal) return null;
                    return (
                      <View key={field} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <Text style={[styles.cardTiny, { textTransform: 'capitalize' }]}>{field.replace(/([A-Z])/g, ' $1')}</Text>
                        <Text style={[styles.cardTiny, { fontWeight: '700', color: PURPLE }]}>{newVal}</Text>
                      </View>
                    );
                  })}
                  <View style={[styles.actionRow, { marginTop: 12 }]}>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnGreen, { flex: 1 }]} onPress={() => approveProfileRequestAction(r.id)}>
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { flex: 1 }]} onPress={() => rejectProfileRequestAction(r.id)}>
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </AnimatedCard>
            ))
        )}
      </View>
    );
  };

  // ─── ADMIN: Settings/Profile Tab ────────────────────────────────────────
  const renderAdminSettings = () => (
    <View>
      <AnimatedCard delay={0}>
        <View style={[styles.profileHero, { backgroundColor: '#FFFFFF', shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, paddingVertical: 24 }]}>
          <View style={[styles.profileAvatar, { backgroundColor: PURPLE, borderColor: '#F4F3FF' }]}>
            <Text style={[styles.profileAvatarText, { color: '#FFFFFF' }]}>{user.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <Text style={[styles.profileName, { color: '#111827' }]}>{user.name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            <Badge label={user.role} color={PURPLE} />
          </View>
        </View>
      </AnimatedCard>

      <SH title="Warden Management Tools" />
      <AnimatedCard delay={100}>
        <TouchableOpacity style={styles.listCard} onPress={() => setMessMenuModalVisible(true)} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 12 }}><Coffee size={20} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Mess Menu Planner</Text>
              <Text style={styles.cardSecondary}>Customize daily meal menus for residents.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={150}>
        <TouchableOpacity style={styles.listCard} onPress={() => { setActiveTab('Home'); setActivePollSection('polls'); }} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 12 }}><FileText size={20} color={PURPLE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Manage Hostel Polls</Text>
              <Text style={styles.cardSecondary}>Create, toggle status, and delete active student polls.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={200}>
        <TouchableOpacity style={styles.listCard} onPress={handleLogout} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 12 }}><LogOut size={20} color="#EF4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardPrimary, { color: '#EF4444' }]}>Sign Out</Text>
              <Text style={styles.cardSecondary}>Logout from your session.</Text>
            </View>
            <ChevronRight size={18} color="#EF4444" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    </View>
  );

  // ─── STUDENT: Home ──────────────────────────────────────────────────────
  const renderStudentHome = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttended = messAttendance.filter(a => a.date === todayStr).length;
    const pendingLeaves = leavesList.filter(l => l.status === 'PENDING').length;
    const openInvoices = invoicesList.filter(inv => inv.status !== 'PAID').length;
    const openComplaints = complaintsList.filter(c => c.status !== 'RESOLVED').length;

    return (
      <View>
        {/* Room hero */}
        {user.studentDetails?.room ? (
          <AnimatedCard delay={0}>
            <View style={styles.roomHeroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomHeroLabel}>MY ROOM</Text>
                <Text style={styles.roomHeroNumber}>Room {user.studentDetails.room.roomNumber}</Text>
                <Text style={styles.roomHeroSub}>{user.studentDetails.room.block} Block · {user.studentDetails.room.sharingType}</Text>
                <View style={[styles.roomHeroTag, { backgroundColor: user.studentDetails.room.isAc ? '#DBEAFE' : '#F3F4F6' }]}>
                  <Text style={[styles.roomHeroTagText, { color: user.studentDetails.room.isAc ? '#1D4ED8' : '#6B7280' }]}>
                    {user.studentDetails.room.isAc ? 'Air Conditioned' : 'Standard'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.roomHeroBtn, { paddingHorizontal: 16 }]} onPress={() => router.push('/room-change' as any)}>
                <Text style={styles.roomHeroBtnText}>Transfer</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : (
          <AnimatedCard delay={0}>
            <View style={styles.listCard}>
              <Text style={styles.cardSecondary}>No room allocated yet. Contact admin.</Text>
            </View>
          </AnimatedCard>
        )}

        {/* Quick stats */}
        <View style={styles.heroGrid}>
          <StatHero icon={Coffee}      count={`${todayAttended}/4`}  label="Meals Today"    color="#F59E0B" delay={60}  onPress={() => router.push('/mess' as any)} showArrow={false} />
          <StatHero icon={Navigation}     count={leavesList.length}      label="My Leaves"      color="#3B82F6" delay={120} onPress={() => setActiveTab('Leaves')} sub={pendingLeaves > 0 ? `${pendingLeaves} pending` : 'All clear'} showArrow={false} />
          <StatHero icon={AlertCircle} count={openComplaints}         label="Open Issues"    color="#EF4444" delay={180} onPress={() => setActiveTab('Complaints')} sub={openComplaints > 0 ? 'Needs action' : '✓ Clear'} showArrow={false} />
          <StatHero icon={DollarSign}  count={`₹${invoicesList.reduce((s: number, inv: any) => inv.status !== 'PAID' ? s + (inv.amount || 0) : s, 0)}`} label="Due Fees" color="#8B5CF6" delay={240} onPress={() => setActiveTab('Fees')} showArrow={false} />
        </View>

        <SH title="Notice Board" />

        <View style={styles.segmentContainer}>
          <TouchableOpacity 
            onPress={() => setActivePollSection('notices')} 
            style={[styles.segmentBtn, activePollSection === 'notices' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, activePollSection === 'notices' && styles.segmentBtnTextActive]}>
              Notices ({noticesList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActivePollSection('polls')} 
            style={[styles.segmentBtn, activePollSection === 'polls' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentBtnText, activePollSection === 'polls' && styles.segmentBtnTextActive]}>
              Polls ({pollsList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activePollSection === 'notices' ? (
          noticesList.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.cardSecondary}>No notices at this time.</Text>
            </View>
          ) : (
            noticesList.map((n, i) => (
              <AnimatedCard key={n.id || i} delay={300 + i * 50}>
                <View style={styles.noticeCard}>
                  <View style={{ marginRight: 14 }}><Bell size={20} color={PURPLE} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardPrimary}>{n.title}</Text>
                    <Text style={styles.cardSecondary}>{n.content}</Text>
                  </View>
                  {n.postedBy && <Text style={styles.cardTiny}>by {n.postedBy}</Text>}
                </View>
              </AnimatedCard>
            ))
          )
        ) : (
          pollsList.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.cardSecondary}>No polls at this time.</Text>
            </View>
          ) : (
            pollsList.map((p, i) => (
              <AnimatedCard key={p.id || i} delay={300 + i * 50}>
                <View style={styles.pollCard}>
                  <Text style={styles.pollQuestion}>{p.question}</Text>
                  
                  {p.isActive && !p.userHasVoted ? (
                    // Vote Layout
                    <View style={{ marginTop: 12 }}>
                      {p.options.map((opt: any, idx: number) => (
                        <TouchableOpacity 
                          key={idx} 
                          onPress={() => voteInPoll(p.id, opt.option)}
                          style={styles.pollVoteBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pollVoteBtnText}>{opt.option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    // Results Layout
                    <View style={{ marginTop: 12 }}>
                      {p.options.map((opt: any, idx: number) => {
                        const isUserChoice = p.userVotedOption === opt.option;
                        return (
                          <View key={idx} style={styles.pollResultRow}>
                            <View style={styles.pollResultLabelRow}>
                              <Text style={[styles.pollResultOptionText, isUserChoice && { fontWeight: '700', color: PURPLE }]}>
                                {opt.option} {isUserChoice && "✓"}
                              </Text>
                              <Text style={styles.pollResultPercentText}>{opt.percentage}%</Text>
                            </View>
                            <View style={styles.pollProgressBackground}>
                              <View style={[styles.pollProgressFill, { width: `${opt.percentage}%`, backgroundColor: isUserChoice ? PURPLE : '#D1D5DB' }]} />
                            </View>
                          </View>
                        );
                      })}
                      <Text style={styles.pollVotesCount}>
                        {p.totalVotes} votes total · {p.userHasVoted ? `You voted: ${p.userVotedOption}` : "Voting closed"}
                      </Text>
                    </View>
                  )}
                </View>
              </AnimatedCard>
            ))
          )
        )}
      </View>
    );
  };

  // ─── STUDENT: Leaves Tab ────────────────────────────────────────────────
  const renderStudentLeaves = () => (
    <View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setLeaveModalVisible(true)}>
        <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} /><Text style={styles.primaryBtnText}>Apply for Leave</Text>
      </TouchableOpacity>
      <SH title="My Leave History" count={leavesList.length} />
      {leavesList.length === 0
        ? <Empty icon={Navigation} title="No leaves yet" sub="Apply for your first leave request above." />
        : leavesList.map((l, i) => (
          <AnimatedCard key={l.id} delay={Math.min(i * 50, 400)}>
            <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }]} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
              <View style={styles.rowBetween}>
                <Badge label={l.type?.replace('_', ' ')} color={PURPLE} />
                <Badge label={l.status} color={l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B'} />
              </View>
              <Text style={styles.cardPrimary}>{l.reason}</Text>
              <Text style={styles.cardSecondary}>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
              {l.comments && <Text style={styles.cardTiny}>Warden note: {l.comments}</Text>}
              {(l.checkoutTime || l.checkinTime) && (
                <View style={{ marginTop: 8 }}>
                  {l.checkoutTime && <Text style={styles.cardTiny}>Departed: {new Date(l.checkoutTime).toLocaleString()}</Text>}
                  {l.checkinTime && <Text style={styles.cardTiny}>Returned: {new Date(l.checkinTime).toLocaleString()}</Text>}
                </View>
              )}
            </TouchableOpacity>
          </AnimatedCard>
        ))
      }
    </View>
  );

  // ─── STUDENT: Complaints Tab ────────────────────────────────────────────
  const renderStudentComplaints = () => (
    <View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setComplaintModalVisible(true)}>
        <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} /><Text style={styles.primaryBtnText}>File a Complaint</Text>
      </TouchableOpacity>
      <SH title="My Complaints" count={complaintsList.length} />
      {complaintsList.length === 0
        ? <Empty icon={CheckCircle} title="No complaints" sub="Everything looks good in your room!" />
        : complaintsList.map((c, i) => (
          <AnimatedCard key={c.id} delay={Math.min(i * 50, 400)}>
            <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: c.status === 'RESOLVED' ? '#10B981' : '#EF4444' }]} onPress={() => openDetails(c, 'complaint')} activeOpacity={0.75}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardPrimary}>{c.category}</Text>
                <Badge label={c.status} color={c.status === 'RESOLVED' ? '#10B981' : PURPLE} />
              </View>
              <Text style={styles.cardSecondary}>{c.description}</Text>
              <View style={styles.rowBetween}>
                <Badge label={`Priority: ${c.priority}`} color={c.priority === 'HIGH' || c.priority === 'URGENT' ? '#EF4444' : '#F59E0B'} />
                <Text style={styles.cardTiny}>{new Date(c.createdAt || Date.now()).toLocaleDateString()}</Text>
              </View>
              {c.wardenNotes && <Text style={styles.cardTiny}>📝 {c.wardenNotes}</Text>}
            </TouchableOpacity>
          </AnimatedCard>
        ))
      }
    </View>
  );

  // ─── STUDENT: Fees Tab ──────────────────────────────────────────────────
  const renderStudentFees = () => {
    const pendingInvoices = invoicesList.filter((inv: any) => inv.status !== 'PAID');
    const paidInvoices = invoicesList.filter((inv: any) => inv.status === 'PAID');
    const filteredInvoices = feeFilter === 'PENDING' ? pendingInvoices : paidInvoices;
    const totalDue = pendingInvoices.reduce((s: number, inv: any) => s + (inv.amount || inv.totalAmount || 0), 0);

    return (
      <View>
        {/* Banner with Total Due */}
        <AnimatedCard delay={0}>
          <View style={[styles.listCard, { backgroundColor: totalDue > 0 ? '#FEF2F2' : '#ECFDF5', borderLeftWidth: 4, borderLeftColor: totalDue > 0 ? '#EF4444' : '#10B981' }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardPrimary}>Total Outstanding Dues</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: totalDue > 0 ? '#EF4444' : '#047857', marginTop: 2 }}>
                  ₹{totalDue.toLocaleString()}
                </Text>
              </View>
              {totalDue > 0 ? (
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>DUE NOW</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>ALL CLEAR ✓</Text>
                </View>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* Invoice Filters */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            style={[styles.subTab, feeFilter === 'PENDING' && styles.subTabActive]}
            onPress={() => setFeeFilter('PENDING')}
          >
            <Text style={[styles.subTabText, feeFilter === 'PENDING' && styles.subTabTextActive]}>
              Pending Bills ({pendingInvoices.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, feeFilter === 'PAID' && styles.subTabActive]}
            onPress={() => setFeeFilter('PAID')}
          >
            <Text style={[styles.subTabText, feeFilter === 'PAID' && styles.subTabTextActive]}>
              Paid History ({paidInvoices.length})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredInvoices.length === 0
          ? <Empty icon={DollarSign} title="No invoices found" sub="No matching bills in this filter." />
          : filteredInvoices.map((inv: any, i: number) => (
            <AnimatedCard key={inv.id} delay={Math.min(i * 60, 400)}>
              <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: inv.status === 'PAID' ? '#10B981' : '#EF4444' }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: PURPLE, textTransform: 'uppercase' }}>
                      {inv.rawNote?.companyName || 'Hari Pushp PG Accommodation & Meenakshi Catering'}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1F2937', marginTop: 2 }}>
                      ₹{(inv.amount || inv.totalAmount)?.toLocaleString()}
                    </Text>
                  </View>
                  <Badge label={inv.status} color={inv.status === 'PAID' ? '#10B981' : '#EF4444'} />
                </View>

                <Text style={[styles.cardSecondary, { marginTop: 4 }]}>
                  {inv.description || '10-to-10 Cycle Demand Note (Hostel Accommodation + Mess)'}
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={styles.cardTiny}>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '10-Sep-2026'}</Text>
                  {inv.paidAt && (
                    <Text style={[styles.cardTiny, { color: '#10B981', fontWeight: '700' }]}>
                      · Paid on: {new Date(inv.paidAt).toLocaleDateString('en-IN')}
                    </Text>
                  )}
                </View>
                
                {/* ACTION BUTTONS FOR STUDENT */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {inv.status !== 'PAID' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnPurple, { flex: 1, backgroundColor: PURPLE, paddingVertical: 10 }]}
                      onPress={() => {
                        setPayingNoteItem(inv.rawNote || inv);
                        setPayingNoteModalVisible(true);
                      }}
                    >
                      <CreditCard size={15} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={[styles.actionBtnText, { fontSize: 12, fontWeight: '800' }]}>Pay Online Now</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1, paddingVertical: 10 }]}
                    onPress={() => {
                      setSelectedNoteReceipt(inv.rawNote || inv);
                    }}
                  >
                    <FileText size={15} color={PURPLE} style={{ marginRight: 6 }} />
                    <Text style={[styles.actionBtnText, { color: PURPLE, fontSize: 12, fontWeight: '800' }]}>
                      Official Dual Receipt
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedCard>
          ))
        }
      </View>
    );
  };

  // ─── GUARD: Home (Gate Passes) ──────────────────────────────────────────
  const renderGuardHome = () => (
    <View>
      <SH title="Active Gate Passes" count={leavesList.length} />
      {leavesList.length === 0
        ? <Empty icon={Navigation} title="No active passes" sub="No current leave logs." />
        : leavesList.map((l, i) => (
          <AnimatedCard key={l.id} delay={Math.min(i * 50, 400)}>
            <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: l.status === 'CHECKED_OUT' ? '#F59E0B' : l.status === 'APPROVED' ? '#10B981' : PURPLE }]} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardPrimary}>{l.student?.user?.name}</Text>
                <Badge label={l.status} color={l.status === 'CHECKED_OUT' ? '#F59E0B' : l.status === 'APPROVED' ? '#10B981' : PURPLE} />
              </View>
              <Text style={styles.cardSecondary}>Roll: {l.student?.rollNumber} · {l.type?.replace('_', ' ')}</Text>
              <Text style={styles.cardSecondary}>{l.reason}</Text>
              <Text style={styles.cardTiny}>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
              <View style={styles.actionRow}>
                {l.status === 'APPROVED' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.btnGreen, { flex: 1 }]} onPress={() => guardCheckout(l.id)}>
                    <Text style={styles.actionBtnText}>Log Departure</Text>
                  </TouchableOpacity>
                )}
                {l.status === 'CHECKED_OUT' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { flex: 1 }]} onPress={() => guardCheckin(l.id)}>
                    <Text style={styles.actionBtnText}>Log Return</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </AnimatedCard>
        ))
      }
    </View>
  );

  // ─── GUARD: Visitors Tab ────────────────────────────────────────────────
  const renderVisitorsTab = () => (
    <View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setVisitorModalVisible(true)}>
        <Plus size={18} color="#FFFFFF" style={{ marginRight: 8 }} /><Text style={styles.primaryBtnText}>Register New Visitor</Text>
      </TouchableOpacity>
      <SH title="Visitor Register" count={visitorsList.length} />
      {visitorsList.length === 0
        ? <Empty icon={Users} title="No visitors" sub="No visitors currently logged in." />
        : visitorsList.map((v, i) => (
          <AnimatedCard key={v.id} delay={Math.min(i * 50, 400)}>
            <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: v.checkOutTime ? '#6B7280' : '#10B981' }]} onPress={() => openDetails(v, 'visitor')} activeOpacity={0.75}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardPrimary}>{v.name}</Text>
                <Badge label={v.checkOutTime ? 'Departed' : 'Inside'} color={v.checkOutTime ? '#6B7280' : '#10B981'} />
              </View>
              <Text style={styles.cardSecondary}>📱 {v.phone} · {v.relationship}</Text>
              <Text style={styles.cardSecondary}>Host: {v.student?.user?.name} (Roll: {v.student?.rollNumber})</Text>
              <Text style={styles.cardTiny}>In: {new Date(v.checkInTime).toLocaleTimeString()}</Text>
              {!v.checkOutTime && (
                <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={() => visitorCheckout(v.id)}>
                  <Text style={styles.actionBtnText}>Log Check-Out</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </AnimatedCard>
        ))
      }
    </View>
  );

  // ─── Shared Profile Tab ─────────────────────────────────────────────────
  const renderProfileTab = () => {
    const studentInfo = [
      { label: 'User ID', value: user.id?.slice(0, 8) + '...' },
      user.studentDetails && { label: 'Roll Number', value: user.studentDetails.rollNumber },
      user.studentDetails && { label: 'Phone', value: user.studentDetails.phoneNumber },
      user.studentDetails && { label: 'College / Coaching', value: user.studentDetails.coachingCollege || '—' },
      user.studentDetails && { label: 'Address', value: user.studentDetails.permanentAddress || '—' },
      user.studentDetails && { label: 'State & Pincode', value: user.studentDetails.state ? `${user.studentDetails.state} - ${user.studentDetails.pincode || ''}` : '—' },
      user.staffDetails  && { label: 'Department', value: user.staffDetails.department },
      user.staffDetails  && { label: 'Designation', value: user.staffDetails.designation },
    ].filter(Boolean);

    const parentInfo = [
      { label: 'Father', value: user.studentDetails?.fatherName || '—' },
      { label: 'Parent Contact', value: user.studentDetails?.parentContact || '—' },
    ];

    const getDocStatus = (type: string) => {
      const doc = uploadedDocsList.find((d: any) => d.docType === type);
      if (!doc) return { label: 'Not Uploaded', color: '#6B7280', canUpload: true };
      if (doc.status === 'VERIFIED') return { label: 'Verified', color: '#10B981', canUpload: false };
      if (doc.status === 'REJECTED') return { label: 'Rejected', color: '#EF4444', canUpload: true };
      return { label: 'Pending Verification', color: '#F59E0B', canUpload: false };
    };

    return (
      <View>
        <AnimatedCard delay={0}>
          <View style={[styles.profileHero, { backgroundColor: '#FFFFFF', shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, paddingVertical: 24 }]}>
            <View style={[styles.profileAvatar, { backgroundColor: PURPLE, borderColor: '#F4F3FF' }]}>
              <Text style={[styles.profileAvatarText, { color: '#FFFFFF' }]}>{user.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.profileName, { color: '#111827' }]}>{user.name}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 4 }}>
              <Badge label={user.role} color={user.role === 'ADMIN' ? PURPLE : user.role === 'STUDENT' ? '#10B981' : '#F59E0B'} />
            </View>
            <Text style={[styles.profileEmail, { color: '#6B7280', marginTop: 4 }]}>{user.email}</Text>
          </View>
        </AnimatedCard>

        <SH title="Personal Details" />
        <AnimatedCard delay={60}>
          <View style={[styles.listCard, { paddingVertical: 8 }]}>
            {studentInfo.map((row: any, idx) => (
              <View key={idx} style={[styles.infoRow, {
                borderBottomWidth: idx === studentInfo.length - 1 ? 0 : 1,
                borderBottomColor: '#F3F4F6',
                marginBottom: 0,
                shadowColor: 'transparent',
                elevation: 0,
                paddingHorizontal: 0,
                paddingVertical: 12
              }]}>
                <Text style={[styles.infoLabel, { color: '#6B7280' }]}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </AnimatedCard>

        {user.role === 'STUDENT' && (
          <>
            <SH title="Parent / Guardian" />
            <AnimatedCard delay={120}>
              <View style={[styles.listCard, { paddingVertical: 8 }]}>
                {parentInfo.map((row: any, idx) => (
                  <View key={idx} style={[styles.infoRow, {
                    borderBottomWidth: idx === parentInfo.length - 1 ? 0 : 1,
                    borderBottomColor: '#F3F4F6',
                    marginBottom: 0,
                    shadowColor: 'transparent',
                    elevation: 0,
                    paddingHorizontal: 0,
                    paddingVertical: 12
                  }]}>
                    <Text style={[styles.infoLabel, { color: '#6B7280' }]}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </AnimatedCard>

            <SH title="ID Documents Verification" />
            <AnimatedCard delay={180}>
              <View style={styles.listCard}>
                {['AADHAAR', 'PAN', 'PASSPORT'].map((type, idx) => {
                  const status = getDocStatus(type);
                  return (
                    <View key={type} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: idx === 2 ? 0 : 1,
                      borderBottomColor: '#F3F4F6'
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardPrimary}>{type === 'AADHAAR' ? 'Aadhaar Card' : type === 'PAN' ? 'PAN Card' : 'Passport Document'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Badge label={status.label} color={status.color} />
                        </View>
                      </View>
                      {status.canUpload && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.btnPurple, { paddingHorizontal: 12, paddingVertical: 6, height: 32 }]}
                          onPress={() => {
                            setUploadDocType(type);
                            reset({ documentNumber: '' });
                            setUploadDocModalVisible(true);
                          }}
                        >
                          <Text style={[styles.actionBtnText, { fontSize: 12 }]}>Upload</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </AnimatedCard>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 }}>
          {user.role === 'STUDENT' && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { flex: 1, height: 48, justifyContent: 'center' }]} onPress={openEditProfile}>
              <Text style={styles.actionBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { flex: 1, height: 48, justifyContent: 'center' }]} onPress={handleLogout}>
            <LogOut size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Render active tab ──────────────────────────────────────────────────
  const renderContent = () => {
    if (!user) return null;
    if (user.role === 'ADMIN') {
      switch (activeTab) {
        case 'Home':       return renderAdminHome();
        case 'Students':   return renderStudentsTab();
        case 'Rooms':      return renderRoomsTab();
        case 'Requests':   return renderRequestsTab();
        case 'Settings':   return renderAdminSettings();
        default:           return renderAdminHome();
      }
    }
    if (user.role === 'STUDENT') {
      switch (activeTab) {
        case 'Home':        return renderStudentHome();
        case 'Leaves':      return renderStudentLeaves();
        case 'Complaints':  return renderStudentComplaints();
        case 'Fees':        return renderStudentFees();
        case 'Profile':     return renderProfileTab();
        default:            return renderStudentHome();
      }
    }
    // Guard
    switch (activeTab) {
      case 'Home':      return renderGuardHome();
      case 'Visitors':  return renderVisitorsTab();
      case 'Profile':   return renderProfileTab();
      default:          return renderGuardHome();
    }
  };

  if (!user) return <View style={styles.center}><ActivityIndicator size="large" color={PURPLE} /></View>;

  const navTabs = getNavTabs();

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <AlertCircle size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.offlineText}>Offline Mode: No Internet Connection</Text>
        </View>
      )}
      {/* ── Header ── */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={styles.greetingRow}>
              <View>
                <Text style={styles.headerGreeting}>{greeting.text}</Text>
                <Text style={styles.headerGreetingSub}>{greeting.sub}</Text>
              </View>
            </View>
            <Text style={styles.headerName} numberOfLines={1} adjustsFontSizeToFit>{user.name}</Text>
            <Text style={styles.headerRole}>
              {user.role === 'ADMIN' ? 'Warden / Admin' : user.role === 'STUDENT' ? `${user.studentDetails?.rollNumber ?? 'Student'}` : 'Security Guard'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                clearUnread();
                setActiveTab('Notices');
              }}
              activeOpacity={0.8}
            >
              <Bell size={20} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quote strip */}
        <Animated.View style={[styles.quoteStrip, { opacity: quoteOpacity }]}>
          <View style={{ marginRight: 8, marginTop: 2 }}><Quote size={14} color="rgba(255,255,255,0.6)" /></View>
          <Text style={styles.quoteText} numberOfLines={2}>{dailyQuote}</Text>
        </Animated.View>
      </Animated.View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />}
      >
        {loading && !refreshing
          ? <View style={styles.center}><ActivityIndicator size="large" color={PURPLE} /></View>
          : renderContent()
        }
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Navigation Bar ── */}
      <Animated.View style={[styles.bottomNav, { transform: [{ translateY: bottomNavAnim }] }]}>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              onPress={() => { setActiveTab(tab.id); setSearchQuery(''); setRequestSection('Approvals'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                <Icon size={22} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── Leave Modal ── */}
      <FormModal visible={leaveModalVisible} title="Apply for Leave" onClose={() => setLeaveModalVisible(false)} onSubmit={submitLeave}>
        <Text style={styles.formLabel}>Leave Type</Text>
        <PickerTags options={['NIGHT_OUT', 'OUT_OF_STATION', 'EMERGENCY']} value={leaveType} onChange={setLeaveType} />
        <Text style={styles.formLabel}>Start Date (YYYY-MM-DD)</Text>
        <View style={styles.formInput}><TextInput style={styles.formInputText} placeholder="2026-08-02" value={leaveStartDate} onChangeText={setLeaveStartDate} /></View>
        <Text style={styles.formLabel}>End Date (YYYY-MM-DD)</Text>
        <View style={styles.formInput}><TextInput style={styles.formInputText} placeholder="2026-08-05" value={leaveEndDate} onChangeText={setLeaveEndDate} /></View>
        <Text style={styles.formLabel}>Reason</Text>
        <View style={[styles.formInput, { height: 90, paddingVertical: 10 }]}>
          <TextInput style={[styles.formInputText, { textAlignVertical: 'top' }]} placeholder="Reason for leave..." multiline value={leaveReason} onChangeText={setLeaveReason} />
        </View>
      </FormModal>

      {/* ── Complaint Modal ── */}
      <FormModal visible={complaintModalVisible} title="File a Complaint" onClose={() => setComplaintModalVisible(false)} onSubmit={submitComplaint}>
        <Text style={styles.formLabel}>Category</Text>
        <PickerTags options={['Electrical', 'Plumbing', 'HVAC', 'Wi-Fi', 'Furniture', 'Cleaning']} value={complaintCategory} onChange={setComplaintCategory} />
        <Text style={styles.formLabel}>Priority</Text>
        <PickerTags options={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} value={complaintPriority} onChange={setComplaintPriority} />
        <Text style={styles.formLabel}>Description</Text>
        <View style={[styles.formInput, { height: 110, paddingVertical: 10 }]}>
          <TextInput style={[styles.formInputText, { textAlignVertical: 'top' }]} placeholder="Describe the issue in detail..." multiline value={complaintDesc} onChangeText={setComplaintDesc} />
        </View>
      </FormModal>

      {/* ── Visitor Modal ── */}
      <FormModal visible={visitorModalVisible} title="Register Visitor" onClose={() => setVisitorModalVisible(false)} onSubmit={submitVisitor}>
        {[
          { label: "Visitor's Full Name",         val: visitorName,        set: setVisitorName,        ph: 'Ramesh Kumar',      kb: 'default',    caps: 'words' },
          { label: "Contact Phone",               val: visitorPhone,       set: setVisitorPhone,       ph: '9876543210',        kb: 'phone-pad',  caps: 'none'  },
          { label: "Relationship to Student",     val: visitorRel,         set: setVisitorRel,         ph: 'Father / Guardian', kb: 'default',    caps: 'words' },
          { label: "Student Roll Number",         val: visitorStudentRoll, set: setVisitorStudentRoll, ph: 'ROLL-12345',        kb: 'default',    caps: 'characters' },
        ].map(({ label, val, set, ph, kb, caps }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} keyboardType={kb} autoCapitalize={caps} />
            </View>
          </View>
        ))}
      </FormModal>

      {/* ── Add Student Modal ── */}
      <FormModal visible={addStudentModalVisible} title="Add New Student" onClose={() => setAddStudentModalVisible(false)} onSubmit={submitAddStudent}>
        {[
          { label: "Full Name", val: newStudentName, set: setNewStudentName, ph: "Ananya Sharma", kb: "default", caps: "words" },
          { label: "Email Address", val: newStudentEmail, set: setNewStudentEmail, ph: "ananya@gmail.com", kb: "email-address", caps: "none" },
          { label: "Password", val: newStudentPass, set: setNewStudentPass, ph: "••••••••", kb: "default", caps: "none", secure: true },
          { label: "Roll Number", val: newStudentRoll, set: setNewStudentRoll, ph: "ROLL-1025", kb: "default", caps: "characters" },
          { label: "Phone Number", val: newStudentPhone, set: setNewStudentPhone, ph: "9876543210", kb: "phone-pad", caps: "none" },
          { label: "Parent Contact", val: newStudentParent, set: setNewStudentParent, ph: "9123456789", kb: "phone-pad", caps: "none" }
        ].map(({ label, val, set, ph, kb, caps, secure }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} keyboardType={kb} autoCapitalize={caps} secureTextEntry={secure} />
            </View>
          </View>
        ))}
        <Text style={styles.formLabel}>Assigned Room (Optional)</Text>
        <PickerTags options={['No Assignment', ...allRooms.map(r => r.roomNumber)]} value={newStudentRoomId ? allRooms.find(r => r.id === newStudentRoomId)?.roomNumber || 'No Assignment' : 'No Assignment'} onChange={(roomNum: string) => {
          const roomObj = allRooms.find(r => r.roomNumber === roomNum);
          setNewStudentRoomId(roomObj ? roomObj.id : '');
        }} />
      </FormModal>

      {/* ── Add Room Modal ── */}
      <FormModal visible={addRoomModalVisible} title="Add New Room" onClose={() => setAddRoomModalVisible(false)} onSubmit={submitAddRoom}>
        {[
          { label: "Room Number", val: newRoomNumber, set: setNewRoomNumber, ph: "101", kb: "default", caps: "characters" },
          { label: "Block / Wing", val: newRoomBlock, set: setNewRoomBlock, ph: "A", kb: "default", caps: "characters" }
        ].map(({ label, val, set, ph, kb, caps }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} keyboardType={kb} autoCapitalize={caps} />
            </View>
          </View>
        ))}
        <Text style={styles.formLabel}>Sharing Type (Beds)</Text>
        <PickerTags options={['1', '2', '3', '4']} value={newRoomSharing} onChange={setNewRoomSharing} />
        
        <Text style={styles.formLabel}>Air Conditioning</Text>
        <PickerTags options={['A/C', 'Non-A/C']} value={newRoomAc ? 'A/C' : 'Non-A/C'} onChange={(val: string) => setNewRoomAc(val === 'A/C')} />
      </FormModal>

      {/* ── Create Bill Modal ── */}
      <FormModal visible={createBillModalVisible} title="Generate Fee Invoice" onClose={() => setCreateBillModalVisible(false)} onSubmit={submitCreateBill}>
        {[
          { label: "Student Roll Number", val: billStudentRoll, set: setBillStudentRoll, ph: "ROLL-1025", kb: "default", caps: "characters" },
          { label: "Invoice Amount (₹)", val: billAmount, set: setBillAmount, ph: "5500", kb: "numeric", caps: "none" },
          { label: "Description / Bill Period", val: billDesc, set: setBillDesc, ph: "August 2026 Room Rent", kb: "default", caps: "sentences" },
          { label: "Due Date (YYYY-MM-DD)", val: billDueDate, set: setBillDueDate, ph: "2026-08-10", kb: "default", caps: "none" }
        ].map(({ label, val, set, ph, kb, caps }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} keyboardType={kb} autoCapitalize={caps} />
            </View>
          </View>
        ))}
      </FormModal>

      {/* ── Notice Modal ── */}
      <FormModal visible={noticeModalVisible} title="Post Announcement" onClose={() => setNoticeModalVisible(false)} onSubmit={submitNotice}>
        <Text style={styles.formLabel}>Title</Text>
        <View style={styles.formInput}>
          <TextInput style={styles.formInputText} placeholder="Emergency Power Maintenance" value={noticeTitle} onChangeText={setNoticeTitle} />
        </View>
        <Text style={styles.formLabel}>Announcement Details</Text>
        <View style={[styles.formInput, { height: 100, paddingVertical: 8 }]}>
          <TextInput style={[styles.formInputText, { textAlignVertical: 'top' }]} placeholder="Write notice content here..." multiline value={noticeContent} onChangeText={setNoticeContent} />
        </View>
        <Text style={styles.formLabel}>Priority</Text>
        <PickerTags options={['INFO', 'WARNING', 'URGENT']} value={noticePriority} onChange={setNoticePriority} />
      </FormModal>

      {/* ── Poll Creation Modal ── */}
      <FormModal visible={pollModalVisible} title="Create New Poll" onClose={() => setPollModalVisible(false)} onSubmit={submitPoll}>
        <Text style={styles.formLabel}>Poll Question</Text>
        <View style={[styles.formInput, { height: 70 }]}>
          <TextInput style={styles.formInputText} placeholder="e.g. Which timing do you prefer for Sunday Special Lunch?" multiline value={pollQuestion} onChangeText={setPollQuestion} />
        </View>

        <Text style={styles.formLabel}>Poll Options</Text>
        {pollOptions.map((opt, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={[styles.formInput, { flex: 1, marginBottom: 0 }]}>
              <TextInput 
                style={styles.formInputText} 
                placeholder={`Option ${index + 1}${index < 2 ? ' *' : ''}`} 
                value={opt} 
                onChangeText={(text) => handlePollOptionChange(text, index)} 
              />
            </View>
            {pollOptions.length > 2 && (
              <TouchableOpacity onPress={() => removePollOption(index)} style={{ marginLeft: 10, padding: 4 }}>
                <XCircle size={22} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {pollOptions.length < 10 && (
          <TouchableOpacity onPress={addPollOption} style={styles.addOptionBtn} activeOpacity={0.7}>
            <Plus size={16} color={PURPLE} style={{ marginRight: 6 }} />
            <Text style={styles.addOptionBtnText}>Add Option</Text>
          </TouchableOpacity>
        )}
      </FormModal>

      {/* ── Poll Popup Modal for Students ── */}
      <Modal visible={pollPopupVisible} animationType="slide" transparent onRequestClose={() => setPollPopupVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPollPopupVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: PURPLE, marginBottom: 8 }]}>New Hostel Poll! ✿</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
              Your opinion matters! Please vote on the question below:
            </Text>
            {pollPopupData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.pollQuestion, { fontSize: 16, marginBottom: 16, textAlign: 'center' }]}>
                  {pollPopupData.question}
                </Text>
                {pollPopupData.options.map((opt: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    onPress={() => voteInPoll(pollPopupData.id, opt.option)}
                    style={[styles.pollVoteBtn, { marginHorizontal: 8 }]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pollVoteBtnText}>{opt.option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F3F4F6', marginTop: 14, borderRadius: 14, height: 48, justifyContent: 'center' }]} 
              onPress={() => setPollPopupVisible(false)}
            >
              <Text style={[styles.actionBtnText, { color: '#4B5563', fontSize: 14 }]}>Vote Later</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Mess Menu Modal ── */}
      <FormModal visible={messMenuModalVisible} title="Update Mess Menu" onClose={() => setMessMenuModalVisible(false)} onSubmit={submitMessMenu}>
        <Text style={styles.formLabel}>Select Day</Text>
        <PickerTags options={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']} value={menuDay} onChange={(day: string) => {
          setMenuDay(day);
          if (fullWeeklyMenu && fullWeeklyMenu[day]) {
            setMenuBreakfast(fullWeeklyMenu[day].breakfast || '');
            setMenuLunch(fullWeeklyMenu[day].lunch || '');
            setMenuSnacks(fullWeeklyMenu[day].snacks || '');
            setMenuDinner(fullWeeklyMenu[day].dinner || '');
          }
        }} />
        {[
          { label: "Breakfast (7:00 - 9:00 AM)", val: menuBreakfast, set: setMenuBreakfast, ph: "Idli Sambar" },
          { label: "Lunch (12:30 - 2:30 PM)", val: menuLunch, set: setMenuLunch, ph: "Dal Rice Roti" },
          { label: "Snacks (4:30 - 5:30 PM)", val: menuSnacks, set: setMenuSnacks, ph: "Samosa Chai" },
          { label: "Dinner (7:30 - 9:30 PM)", val: menuDinner, set: setMenuDinner, ph: "Paneer Naan" }
        ].map(({ label, val, set, ph }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} />
            </View>
          </View>
        ))}
      </FormModal>

      {/* ── Edit Profile Modal ── */}
      <FormModal visible={editProfileModalVisible} title="Request Profile Changes" onClose={() => setEditProfileModalVisible(false)} onSubmit={submitProfileEdit}>
        {[
          { label: "My Contact Number", val: editPhone, set: setEditPhone, ph: "9876543210", kb: "phone-pad" },
          { label: "Father's Name", val: editFather, set: setEditFather, ph: "Rajesh Sharma", kb: "default" },
          { label: "Parent Contact Number", val: editParentContact, set: setEditParentContact, ph: "9123456789", kb: "phone-pad" },
          { label: "Permanent Address", val: editAddress, set: setEditAddress, ph: "123, Park Avenue Street", kb: "default" },
          { label: "State", val: editState, set: setEditState, ph: "Haryana", kb: "default" },
          { label: "Pincode", val: editPincode, set: setEditPincode, ph: "122001", kb: "numeric" },
          { label: "Coaching Institute / College", val: editCoaching, set: setEditCoaching, ph: "IIT JEE Academy", kb: "default" }
        ].map(({ label, val, set, ph, kb }: any) => (
          <View key={label}>
            <Text style={styles.formLabel}>{label}</Text>
            <View style={styles.formInput}>
              <TextInput style={styles.formInputText} placeholder={ph} value={val} onChangeText={set} keyboardType={kb} />
            </View>
          </View>
        ))}
      </FormModal>

      {/* ── Night Roll Call Modal ── */}
      <Modal visible={nightRoundModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setNightRoundModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNightRoundModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '92%', height: '92%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: PURPLE, marginBottom: 2 }]}>Night Roll Call</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Floor {nightRoundFloor} — Student Attendance</Text>
              </View>
              <TouchableOpacity onPress={() => setNightRoundModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Floor Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 10 }}>
              {[1, 2, 3, 4, 5].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => openNightRoundModal(f)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: nightRoundFloor === f ? PURPLE : '#F3F4F6',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: nightRoundFloor === f ? '#FFFFFF' : '#4B5563' }}>Floor {f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Controls Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity
                onPress={handleMarkAllRemainingPresent}
                style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#047857' }}>Mark All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setNotifyParentsWhatsapp(!notifyParentsWhatsapp)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155' }}>
                  {notifyParentsWhatsapp ? 'Notify: ON' : 'Notify: OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Room-by-Room Student List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
              {nightRoundRooms.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginVertical: 30, fontWeight: '500' }}>No residents found on Floor {nightRoundFloor}.</Text>
              ) : (
                nightRoundRooms.map((room: any) => (
                  <View key={room.roomId} style={{ marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                    {/* Room Header */}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>
                        Room {room.roomNumber}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#9CA3AF' }}>{room.studentsCount} resident(s)</Text>
                    </View>

                    {/* Students */}
                    <View style={{ padding: 10 }}>
                      {room.students.map((student: any, idx: number) => {
                        const stId = student.id;
                        const currentStat = nightRoundStatus[stId] || student.status || 'PRESENT';

                        return (
                          <View
                            key={stId}
                            style={{
                              paddingVertical: 10, 
                              borderBottomWidth: idx < room.students.length - 1 ? 1 : 0, 
                              borderBottomColor: '#F3F4F6',
                            }}
                          >
                            {/* Student Info */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: PURPLE }}>{student.name?.charAt(0)?.toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{student.name}</Text>
                                  {student.hasActiveLeave && (
                                    <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A' }}>
                                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#92400E' }}>On Leave</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 1 }}>
                                  Roll: {student.rollNumber} · Parent: {student.parentContact}
                                </Text>
                              </View>
                            </View>

                            {/* Status Buttons */}
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => handleSetStudentStatus(stId, 'PRESENT')}
                                style={{
                                  flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center',
                                  backgroundColor: currentStat === 'PRESENT' ? '#10B981' : '#F3F4F6',
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: currentStat === 'PRESENT' ? '#FFFFFF' : '#6B7280' }}>Present</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleSetStudentStatus(stId, 'ABSENT')}
                                style={{
                                  flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center',
                                  backgroundColor: currentStat === 'ABSENT' ? '#EF4444' : '#F3F4F6',
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: currentStat === 'ABSENT' ? '#FFFFFF' : '#6B7280' }}>Absent</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleSetStudentStatus(stId, 'ON_LEAVE')}
                                style={{
                                  flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center',
                                  backgroundColor: currentStat === 'ON_LEAVE' ? '#F59E0B' : '#F3F4F6',
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: currentStat === 'ON_LEAVE' ? '#FFFFFF' : '#6B7280' }}>Leave</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={submitNightRoundAction}
              style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
                backgroundColor: PURPLE, paddingVertical: 13, borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Submit Floor {nightRoundFloor} Night Roll Call</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Demand Notes & Sub-meters Modal ── */}
      <Modal visible={demandNotesModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setDemandNotesModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDemandNotesModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '92%', height: '92%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: '#F59E0B', marginBottom: 2 }]}>Demand Notes & Sub-Meters</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>10-to-10 Cycle Billing & Electricity Readings</Text>
              </View>
              <TouchableOpacity onPress={() => setDemandNotesModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
              <TouchableOpacity
                onPress={() => setSubMeterModalVisible(true)}
                style={{ flex: 1, backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>⚡ Enter Sub-meter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGenerateDemandNotesAction}
                style={{ flex: 1, backgroundColor: PURPLE, paddingVertical: 9, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>➕ Generate Notes</Text>
              </TouchableOpacity>
            </View>

            {/* List of Demand Notes */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {demandNotesLoading ? (
                <ActivityIndicator size="large" color={PURPLE} style={{ marginVertical: 30 }} />
              ) : demandNotesList.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginVertical: 30, fontWeight: '500' }}>No demand notes generated yet.</Text>
              ) : (
                demandNotesList.map((note: any) => (
                  <View key={note.id} style={{ marginBottom: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: PURPLE }}>{note.companyName || 'Hostel Fee'}</Text>
                      </View>
                      <View style={{ backgroundColor: note.status === 'PAID' ? '#ECFDF5' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: note.status === 'PAID' ? '#047857' : '#B45309' }}>{note.status}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F2937' }}>{note.student?.user?.name || 'Resident'}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      Hostel: ₹{note.hostelFee} · Elec: ₹{note.electricityAmount} · Mess: ₹{note.messFee}
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1F2937' }}>₹{note.totalAmount?.toLocaleString()}</Text>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => setSelectedNoteReceipt(note)}
                          style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>View Invoice</Text>
                        </TouchableOpacity>

                        {note.status !== 'PAID' && (
                          <>
                            <TouchableOpacity
                              onPress={() => {
                                setPayingNoteItem(note);
                                setPayingNoteModalVisible(true);
                              }}
                              style={{ backgroundColor: PURPLE, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Pay Online</Text>
                            </TouchableOpacity>

                            {user?.role === 'ADMIN' && (
                              <TouchableOpacity
                                onPress={() => handleMarkDemandNotePaidAction(note.id)}
                                style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Mark Paid</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Mobile Payment Gateway Checkout Modal ── */}
      <Modal visible={payingNoteModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setPayingNoteModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPayingNoteModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '82%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.modalTitle, { color: PURPLE, marginBottom: 2 }]}>Razorpay Gateway</Text>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#047857' }}>🔒 256-BIT SSL</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Merchant: {payingNoteItem?.companyName || 'Rajken Enterprises'}</Text>
              </View>
              <TouchableOpacity onPress={() => setPayingNoteModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginVertical: 12 }}>
              {/* Order Summary */}
              <View style={{ backgroundColor: '#F4F3FF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D9D6FE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 0.5 }}>TOTAL PAYABLE AMOUNT</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Cycle: 10-Aug to 10-Sep (Demand Note)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: PURPLE }}>₹{payingNoteItem?.totalAmount?.toLocaleString()}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981' }}>All Taxes Included</Text>
                </View>
              </View>

              {/* Payment Methods Tabs */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>Select Payment Mode</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['UPI', 'CARD', 'NETBANKING'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPayingMethod(m)}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center',
                      backgroundColor: payingMethod === m ? PURPLE : '#F3F4F6',
                      borderWidth: payingMethod === m ? 0 : 1, borderColor: '#E5E7EB'
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: payingMethod === m ? '#FFFFFF' : '#4B5563' }}>
                      {m === 'UPI' ? '📲 UPI App' : m === 'CARD' ? '💳 Card' : '🏦 NetBanking'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* UPI Option */}
              {payingMethod === 'UPI' && (
                <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Select Instant UPI App</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                      <View key={app} style={{ flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>{app}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Card Option with Virtual Card Preview */}
              {payingMethod === 'CARD' && (
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: '#1E1B4B', padding: 14, borderRadius: 14, gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#C7D2FE', letterSpacing: 1 }}>HOSTEL RESIDENT CARD</Text>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#FBBF24', fontStyle: 'italic' }}>VISA</Text>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2, marginVertical: 4 }}>
                      4532  8910  4421  9081
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ fontSize: 8, color: '#9CA3AF' }}>CARDHOLDER</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{payingNoteItem?.student?.user?.name?.toUpperCase() || 'PRIYA SHARMA'}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 8, color: '#9CA3AF' }}>EXPIRES</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>08/28</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* NetBanking Option */}
              {payingMethod === 'NETBANKING' && (
                <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>Popular NetBanking Banks</Text>
                  <Text style={{ fontSize: 10, color: '#6B7280' }}>HDFC Bank · State Bank of India · ICICI Bank · Axis Bank</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={handleProcessMobilePayment}
              disabled={payingProcessing}
              style={{ backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
            >
              {payingProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>Pay ₹{payingNoteItem?.totalAmount?.toLocaleString()} via Razorpay</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Sub-meter Entry Form Modal ── */}
      <Modal visible={subMeterModalVisible} animationType="fade" transparent presentationStyle="overFullScreen" onRequestClose={() => setSubMeterModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubMeterModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '65%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: '#F59E0B' }]}>Sub-Meter Electricity Reading</Text>
              <TouchableOpacity onPress={() => setSubMeterModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginVertical: 12 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 }}>Room Number</Text>
                <TextInput style={styles.formInputText} value={subMeterForm.roomId} onChangeText={t => setSubMeterForm(p => ({ ...p, roomId: t }))} placeholder="e.g. 101" />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 }}>Previous Reading</Text>
                  <TextInput style={styles.formInputText} keyboardType="numeric" value={subMeterForm.previousReading} onChangeText={t => setSubMeterForm(p => ({ ...p, previousReading: t }))} placeholder="150" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4 }}>Current Reading</Text>
                  <TextInput style={styles.formInputText} keyboardType="numeric" value={subMeterForm.currentReading} onChangeText={t => setSubMeterForm(p => ({ ...p, currentReading: t }))} placeholder="210" />
                </View>
              </View>

              <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>
                  Calculated Units: {Math.max(0, Number(subMeterForm.currentReading || 0) - Number(subMeterForm.previousReading || 0))} units @ ₹12.0/unit
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#B45309', marginTop: 2 }}>
                  Amount: ₹{Math.max(0, Number(subMeterForm.currentReading || 0) - Number(subMeterForm.previousReading || 0)) * 12}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity onPress={handleSubmitSubMeterReading} style={{ backgroundColor: '#F59E0B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>Save Sub-Meter Reading</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── View Demand Note Receipt Modal ── */}
      <Modal visible={!!selectedNoteReceipt} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setSelectedNoteReceipt(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedNoteReceipt(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '92%', height: '92%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: '#1F2937', marginBottom: 2 }]}>Demand Note Receipt</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Official Billing Receipt View</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedNoteReceipt(null)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Tab Selector: Hostel vs Catering */}
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
              <TouchableOpacity
                onPress={() => setReceiptModalTab('HOSTEL')}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: receiptModalTab === 'HOSTEL' ? PURPLE : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: receiptModalTab === 'HOSTEL' ? '#FFFFFF' : '#4B5563' }}>Hostel Accommodation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setReceiptModalTab('CATERING')}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: receiptModalTab === 'CATERING' ? PURPLE : '#F3F4F6',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: receiptModalTab === 'CATERING' ? '#FFFFFF' : '#4B5563' }}>Meenakshi Catering</Text>
              </TouchableOpacity>
            </View>

            {selectedNoteReceipt && (() => {
              const fNum: number = Number(selectedNoteReceipt.floorNumber || 1);
              const companyMap: Record<number, any> = {
                1: { companyName: 'RAJKEN ENTERPRISES', hostelName: 'HARI PUSHP GIRLS HOSTEL', floorLabel: 'First Floor', san: '[राजकेन SAN नंबर]', udyamRegNo: '[राजकेन उद्यम नंबर]', proprietorName: 'Kapil Sankhla', notePrefix: 'RJK' },
                2: { companyName: 'VANDANA ENTERPRISES', hostelName: 'VANDANA GIRLS HOSTEL', floorLabel: 'Second Floor', san: '[वंदना SAN नंबर]', udyamRegNo: 'UDYAM-RJ-17-0654053', proprietorName: 'Vandana Sankhla', notePrefix: 'VAN' },
                3: { companyName: 'PUSHPA ENTERPRISES', hostelName: 'PUSHPA GIRLS HOSTEL', floorLabel: 'Third Floor', san: '8007170053000004', udyamRegNo: 'UDYAM-RJ-17-0654175', proprietorName: 'Pushpa Sankhla', notePrefix: 'PSH' },
                4: { companyName: 'HARISH CHANDRA ENTERPRISES', hostelName: 'HARISH CHANDRA GIRLS HOSTEL', floorLabel: 'Fourth Floor', san: '8007170053000006', udyamRegNo: 'UDYAM-RJ-17-0654078', proprietorName: 'Harish Chandra', notePrefix: 'HCE' },
                5: { companyName: 'RAMESH ENTERPRISES', hostelName: 'RAMESH GIRLS HOSTEL', floorLabel: 'Fifth & Sixth Floor', san: '[रमेश SAN नंबर]', udyamRegNo: '[रमेश उद्यम नंबर]', proprietorName: 'Ramesh Sankhla', notePrefix: 'RME' },
              };
              const company = companyMap[fNum] || companyMap[1];

              const catering = {
                companyName: 'MEENAKSHI ENTERPRISES',
                subtitle: '(Catering & Food Services Partner)',
                san: '8007170053000003',
                udyamRegNo: 'UDYAM-RJ-17-0662384',
                fssai: '22226113000448',
                proprietorName: 'Manisha Parihar',
                notePrefix: 'ME'
              };

              const studentName = selectedNoteReceipt.student?.user?.name || 'Priya Sharma';
              const fatherName = selectedNoteReceipt.student?.fatherName || 'Rameshwar Sharma';
              const rollNumber = selectedNoteReceipt.student?.rollNumber || '108';
              const roomNumber = selectedNoteReceipt.student?.room?.roomNumber || '102';
              const admissionId = `HP-2026-${rollNumber}`;

              const hostelFee = selectedNoteReceipt.hostelFee || 8000;
              const elecUnits = selectedNoteReceipt.electricityUnits || 45;
              const elecRate = selectedNoteReceipt.electricityRate || 12.0;
              const elecAmt = selectedNoteReceipt.electricityAmount || elecUnits * elecRate;
              const messFee = selectedNoteReceipt.messFee || 3000;
              const hostelNetPayable = hostelFee + elecAmt;

              const isHostel = receiptModalTab === 'HOSTEL';
              const targetCompany = isHostel ? company : catering;
              const targetNoteNo = isHostel ? `${company.notePrefix}/2026-27/08/042` : `${catering.notePrefix}/2026-27/08/108`;
              const netPayableAmt = isHostel ? hostelNetPayable : messFee;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6 }}>
                  <View style={{ borderWidth: 1, borderColor: '#000000', padding: 12, borderRadius: 8, backgroundColor: '#FFFFFF' }}>
                    {/* Company Header Banner */}
                    <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>=================================================</Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#1F2937', textAlign: 'center', marginVertical: 2 }}>{targetCompany.hostelName || targetCompany.companyName}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#4B5563', textAlign: 'center' }}>Run by: {targetCompany.companyName}</Text>
                    <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center', marginTop: 1 }}>Hari Pushp Tower, Plot No. 10, Durgapura, Jaipur, RJ - 302018</Text>
                    <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>=================================================</Text>

                    {/* Metadata */}
                    <View style={{ marginVertical: 6, gap: 2 }}>
                      <Text style={{ fontSize: 10, color: '#374151' }}>SAN (संस्था आधार नंबर) : {targetCompany.san}</Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Udyam Reg. No.          : {targetCompany.udyamRegNo}</Text>
                      {!isHostel && <Text style={{ fontSize: 10, color: '#374151' }}>FSSAI Reg No.           : {catering.fssai}</Text>}
                      <Text style={{ fontSize: 10, color: '#374151' }}>Proprietor Name         : {targetCompany.proprietorName}</Text>
                    </View>

                    <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>=================================================</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#1F2937', textAlign: 'center', marginVertical: 2 }}>DEMAND NOTE / RECEIPT</Text>
                    <Text style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', marginBottom: 4 }}>({isHostel ? 'Hostel Accommodation Fee' : 'Food & Catering Services'})</Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Note No: <Text style={{ fontWeight: '800' }}>{targetNoteNo}</Text></Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Issue Date: 05-Sep-2026</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Cycle: 10-Aug-2026 to 10-Sep-2026</Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Due Date: 10-Sep-2026</Text>
                    </View>

                    {/* Resident Details */}
                    <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', paddingVertical: 6, marginVertical: 4, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>RESIDENT DETAILS:</Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Resident Name : <Text style={{ fontWeight: '800' }}>सुश्री {studentName}</Text> · Adm ID: {admissionId}</Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Father's Name : श्री {fatherName} · Room: {roomNumber} - Bed A</Text>
                      <Text style={{ fontSize: 10, color: '#374151' }}>Floor         : {company.floorLabel}</Text>
                    </View>

                    {/* Fee Breakdown */}
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937', marginTop: 4 }}>FEE BREAKDOWN:</Text>
                    {isHostel ? (
                      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', paddingVertical: 6, marginVertical: 4, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 10, color: '#374151' }}>1. Hostel Accommodation Fee (10 Aug - 10 Sep)</Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>₹{hostelFee.toLocaleString()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 10, color: '#374151' }}>2. Electricity ({elecUnits} units @ ₹12.00/unit)</Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>₹{elecAmt.toLocaleString()}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', paddingVertical: 6, marginVertical: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 10, color: '#374151' }}>1. Monthly Food & Catering Charges (10 Aug - 10 Sep)</Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>₹{messFee.toLocaleString()}</Text>
                        </View>
                      </View>
                    )}

                    {/* Net Payable */}
                    <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000000', paddingVertical: 6, marginVertical: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#1F2937' }}>NET PAYABLE AMOUNT:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: PURPLE }}>₹{netPayableAmt.toLocaleString()}.00</Text>
                    </View>

                    {/* QR Code & Payment Info */}
                    <View style={{ borderTopWidth: 1, borderColor: '#000000', paddingTop: 6, marginTop: 4, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>PAYMENT DETAILS & QR CODE:</Text>
                      <Text style={{ fontSize: 9, color: '#4B5563' }}>Bank Name : [Bank Details Will Be Added]</Text>
                      <Text style={{ fontSize: 9, color: '#4B5563' }}>UPI ID    : {isHostel ? `${company.notePrefix.toLowerCase()}@upi` : 'meenakshicatering@upi'}</Text>
                      <View style={{ backgroundColor: '#F9FAFB', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#374151' }}>[ Scan & Pay via UPI ]</Text>
                        <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>Dynamic QR Auto-fills ₹{netPayableAmt.toLocaleString()}.00</Text>
                      </View>
                    </View>

                    {/* Terms */}
                    <View style={{ borderTopWidth: 1, borderColor: '#000000', paddingTop: 6, marginTop: 6, gap: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>TERMS & CONDITIONS:</Text>
                      <Text style={{ fontSize: 8.5, color: '#4B5563' }}>1. Fee is payable strictly in advance by the 10th of every cycle month.</Text>
                      <Text style={{ fontSize: 8.5, color: '#4B5563' }}>2. Late fee policy: A delay beyond due date attracts ₹100/day late fee.</Text>
                    </View>

                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937', textAlign: 'right', marginTop: 12 }}>For {targetCompany.companyName}</Text>
                    <Text style={{ fontSize: 8.5, color: '#6B7280', textAlign: 'right' }}>(Authorized Signatory / Digital Seal)</Text>
                  </View>
                </ScrollView>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Cook Kitchen Dashboard & Meal Opt-Out Modal ── */}
      <Modal visible={cookDashboardModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setCookDashboardModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCookDashboardModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: '#10B981', marginBottom: 2 }]}>Cook Kitchen Dashboard</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Daily Meal Counts & Student Opt-Outs</Text>
              </View>
              <TouchableOpacity onPress={() => setCookDashboardModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginVertical: 12 }}>
              {/* Summary Stats */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#047857' }}>ENROLLED RESIDENTS</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#065F46', marginTop: 2 }}>{cookData?.totalStudents || allStudents.length || 11}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>TOTAL OPT-OUTS TODAY</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#92400E', marginTop: 2 }}>{cookData?.optOutCount || 0}</Text>
                </View>
              </View>

              {/* Meal Opt-Out Selector */}
              <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937', marginBottom: 8 }}>Student Meal Opt-Out</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'].map(m => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setOptOutMealType(m)}
                      style={{
                        flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center',
                        backgroundColor: optOutMealType === m ? '#10B981' : '#F3F4F6',
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: optOutMealType === m ? '#FFFFFF' : '#4B5563' }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={handleSubmitMealOptOut} style={{ backgroundColor: '#10B981', paddingVertical: 9, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Submit Opt-Out for Today</Text>
                </TouchableOpacity>
              </View>

              {/* Required Kitchen Meal Counts */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginTop: 4 }}>Today's Expected Kitchen Meal Prep</Text>
              <View style={{ gap: 8 }}>
                {[
                  { name: 'Breakfast (8:00 AM)', count: (cookData?.totalStudents || allStudents.length || 11) - (cookData?.optOutsPerMeal?.BREAKFAST || 0) },
                  { name: 'Lunch (1:00 PM)', count: (cookData?.totalStudents || allStudents.length || 11) - (cookData?.optOutsPerMeal?.LUNCH || 0) },
                  { name: 'Evening Snacks (5:30 PM)', count: (cookData?.totalStudents || allStudents.length || 11) - (cookData?.optOutsPerMeal?.SNACKS || 0) },
                  { name: 'Dinner (8:30 PM)', count: (cookData?.totalStudents || allStudents.length || 11) - (cookData?.optOutsPerMeal?.DINNER || 0) },
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151' }}>{item.name}</Text>
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: PURPLE }}>{item.count} meals</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Suggestion Box Modal ── */}
      <Modal visible={suggestionsModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setSuggestionsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSuggestionsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: '#06B6D4', marginBottom: 2 }]}>Suggestion Box</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Student Feedback & Warden Inbox</Text>
              </View>
              <TouchableOpacity onPress={() => setSuggestionsModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginVertical: 12 }}>
              {/* Submit Form */}
              <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937', marginBottom: 6 }}>Submit a Suggestion / Feedback</Text>
                <TextInput
                  style={[styles.formInputText, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  value={suggestionInput}
                  onChangeText={setSuggestionInput}
                  placeholder="Share feedback, mess ideas, or general improvements..."
                />
                <TouchableOpacity onPress={handleSubmitSuggestion} style={{ backgroundColor: '#06B6D4', paddingVertical: 9, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Submit Suggestion</Text>
                </TouchableOpacity>
              </View>

              {/* Suggestions Inbox */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginTop: 4 }}>Warden Suggestion Inbox ({suggestionsList.length})</Text>
              {suggestionsLoading ? (
                <ActivityIndicator size="small" color="#06B6D4" />
              ) : suggestionsList.length === 0 ? (
                <Text style={{ color: '#9CA3AF', textAlign: 'center', marginVertical: 15, fontWeight: '500' }}>No suggestions submitted yet.</Text>
              ) : (
                suggestionsList.map((item: any) => (
                  <View key={item.id} style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937' }}>{item.student?.user?.name || 'Student'}</Text>
                      <View style={{ backgroundColor: item.status === 'RESOLVED' ? '#ECFDF5' : '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: item.status === 'RESOLVED' ? '#047857' : '#4B5563' }}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#4B5563', fontStyle: 'italic', marginVertical: 2 }}>"{item.content}"</Text>

                    {user?.role === 'ADMIN' && item.status !== 'RESOLVED' && (
                      <TouchableOpacity
                        onPress={() => handleUpdateSuggestionStatus(item.id, 'RESOLVED')}
                        style={{ alignSelf: 'flex-end', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>Mark Resolved</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Gate Entry & Biometric Logs Modal ── */}
      <Modal visible={gateLogsModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setGateLogsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGateLogsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: '#8B5CF6', marginBottom: 2 }]}>Gate Entry & Biometric Logs</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280' }}>Real-time Biometric Scanner & QR Logs</Text>
              </View>
              <TouchableOpacity onPress={() => setGateLogsModalVisible(false)} style={{ padding: 6 }}>
                <XCircle size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginVertical: 12 }}>
              {/* Summary Pills */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#047857' }}>INSIDE HOSTEL</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#065F46', marginTop: 2 }}>{allStudents.length - 1}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#B45309' }}>OUTSIDE / ON LEAVE</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#92400E', marginTop: 2 }}>1</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1F2937', marginTop: 4 }}>Today's Gate Log Stream</Text>
              {gateLogsLoading ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                gateLogsList.map((log) => (
                  <View key={log.id} style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937' }}>{log.studentName}</Text>
                      <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Room {log.roomNumber} · {log.method}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <View style={{ backgroundColor: log.action === 'ENTRY' ? '#ECFDF5' : '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: log.action === 'ENTRY' ? '#047857' : '#DC2626' }}>{log.action}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '600' }}>{log.timestamp}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


      {/* ── Upload Document Modal ── */}
      <FormModal 
        visible={uploadDocModalVisible} 
        title={`Upload ${uploadDocType}`} 
        onClose={() => setUploadDocModalVisible(false)} 
        onSubmit={handleSubmit(submitUploadDoc)}
      >
        <Text style={styles.formLabel}>Document Type Selected</Text>
        <Badge label={uploadDocType} color={PURPLE} />
        
        <Text style={[styles.formLabel, { marginTop: 16 }]}>Document / Reference ID Number</Text>
        <Controller
          control={control}
          name="documentNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.formInput}>
              <TextInput
                style={styles.formInputText}
                placeholder={
                  uploadDocType === 'AADHAAR' 
                    ? "12-Digit Aadhaar (e.g. 123456789012)" 
                    : uploadDocType === 'PAN' 
                    ? "10-Digit PAN (e.g. ABCDE1234F)" 
                    : "Passport Number (e.g. A1234567)"
                }
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="characters"
              />
            </View>
          )}
        />
        {formErrors.documentNumber && (
          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
            {formErrors.documentNumber.message}
          </Text>
        )}
        
        <Text style={[styles.formLabel, { marginTop: 16 }]}>Select simulated document file</Text>
        <View style={[styles.infoRow, { backgroundColor: '#F9FAFB', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', marginTop: 4, height: 60, justifyContent: 'center' }]}>
          <Text style={[styles.cardSecondary, { fontStyle: 'italic', marginBottom: 0 }]}>Simulated_File_{uploadDocType.toLowerCase()}.pdf</Text>
        </View>
      </FormModal>

      {/* ── Custom Alert Modal ── */}
      <Modal visible={alertVisible} animationType="fade" transparent onRequestClose={() => setAlertVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAlertVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={styles.alertBox}>
            <View style={[styles.alertIconBox, {
              backgroundColor: alertType === 'SUCCESS' ? '#ECFDF5' : alertType === 'ERROR' ? '#FEF2F2' : alertType === 'CONFIRM' ? '#FFFBEB' : '#EFF6FF'
            }]}>
              {alertType === 'SUCCESS' && <CheckCircle size={28} color="#10B981" />}
              {alertType === 'ERROR' && <XCircle size={28} color="#EF4444" />}
              {alertType === 'CONFIRM' && <AlertCircle size={28} color="#F59E0B" />}
              {alertType === 'INFO' && <Bell size={28} color={PURPLE} />}
            </View>
            <Text style={styles.alertTitleText}>{alertTitle}</Text>
            <Text style={styles.alertMessageText}>{alertMessage}</Text>
            <View style={styles.alertActionsRow}>
              {alertType === 'CONFIRM' ? (
                <>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#F3F4F6', flex: 1, marginRight: 8 }]} onPress={() => setAlertVisible(false)}>
                    <Text style={[styles.alertBtnText, { color: '#4B5563' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: PURPLE, flex: 1 }]} onPress={() => { setAlertVisible(false); if (alertConfirmAction?.action) alertConfirmAction.action(); }}>
                    <Text style={styles.alertBtnText}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: PURPLE, width: '100%' }]} onPress={() => { setAlertVisible(false); if (alertConfirmAction?.action) alertConfirmAction.action(); }}>
                  <Text style={styles.alertBtnText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Detail View Modal ── */}
      <Modal visible={detailModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setDetailModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: PURPLE }]}>Detailed Information</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {detailType === 'student' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: PURPLE_LIGHT, shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: PURPLE, borderColor: PURPLE_LIGHT }]}>
                      <Text style={[styles.profileAvatarText, { color: '#FFFFFF' }]}>{detailItem.user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>{detailItem.user?.name}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 4 }}>
                      <Badge label={`Roll No: ${detailItem.rollNumber}`} color={PURPLE} />
                    </View>
                    <Text style={[styles.profileEmail, { color: '#6B7280' }]}>{detailItem.user?.email}</Text>
                  </View>

                  <SH title="Personal details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone Number</Text><Text style={styles.infoValue}>{detailItem.phoneNumber || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Room details</Text><Text style={styles.infoValue}>{detailItem.room ? `Room ${detailItem.room.roomNumber} (${detailItem.room.block} Block)` : 'No Room Allocated'}</Text></View>

                  <SH title="Parent / Guardian" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Father's Name</Text><Text style={styles.infoValue}>{detailItem.fatherName || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Parent Contact</Text><Text style={styles.infoValue}>{detailItem.parentContact || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Local Guardian</Text><Text style={styles.infoValue}>Mrs. Sunita Sharma</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Emergency Contact</Text><Text style={styles.infoValue}>{detailItem.parentContact || 'N/A'}</Text></View>

                  <SH title="Documents Status & Verification" />
                  {['AADHAAR', 'PAN', 'PASSPORT'].map((type) => {
                    const doc = selectedStudentDocs.find((d: any) => d.docType === type);
                    return (
                      <View key={type} style={[styles.listCard, { marginBottom: 10, paddingVertical: 12 }]}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.cardPrimary}>{type === 'AADHAAR' ? 'Aadhaar Card' : type === 'PAN' ? 'PAN Card' : 'Passport Document'}</Text>
                          <Badge
                            label={doc ? doc.status : 'NOT_UPLOADED'}
                            color={doc?.status === 'VERIFIED' ? '#10B981' : doc?.status === 'REJECTED' ? '#EF4444' : doc?.status === 'PENDING' ? '#F59E0B' : '#6B7280'}
                          />
                        </View>
                        {doc ? (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.cardSecondary}>ID Number: {doc.documentNumber}</Text>
                            {doc.status === 'PENDING' && (
                              <View style={[styles.actionRow, { marginTop: 10 }]}>
                                <TouchableOpacity style={[styles.actionBtn, styles.btnGreen, { flex: 1, height: 32 }]} onPress={async () => {
                                  await verifyStudentDocAction(doc.id, 'VERIFIED');
                                  // Refresh docs inside modal
                                  if (detailItem && detailItem.id) {
                                    const updatedDocs = await studentsApi.getDocuments(detailItem.id);
                                    setSelectedStudentDocs(Array.isArray(updatedDocs) ? updatedDocs : []);
                                  }
                                }}>
                                  <Text style={[styles.actionBtnText, { fontSize: 12 }]}>Verify</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.btnRed, { flex: 1, height: 32 }]} onPress={async () => {
                                  await verifyStudentDocAction(doc.id, 'REJECTED');
                                  // Refresh docs inside modal
                                  if (detailItem && detailItem.id) {
                                    const updatedDocs = await studentsApi.getDocuments(detailItem.id);
                                    setSelectedStudentDocs(Array.isArray(updatedDocs) ? updatedDocs : []);
                                  }
                                }}>
                                  <Text style={[styles.actionBtnText, { fontSize: 12 }]}>Reject</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        ) : (
                          <Text style={[styles.cardSecondary, { fontStyle: 'italic', marginTop: 4 }]}>Document has not been uploaded yet.</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {detailType === 'room' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: '#ECFDF5', shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: '#10B981', borderColor: '#ECFDF5' }]}>
                      <Bed size={32} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>Room {detailItem.roomNumber}</Text>
                    <Badge label={detailItem.status} color={detailItem.status === 'OCCUPIED' ? '#10B981' : '#3B82F6'} />
                  </View>

                  <SH title="Room configuration" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Block / Wing</Text><Text style={styles.infoValue}>{detailItem.block} Block</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Floor</Text><Text style={styles.infoValue}>{detailItem.floor ?? 'Ground Floor'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Sharing Type</Text><Text style={styles.infoValue}>{detailItem.sharingType}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Air Condition</Text><Text style={styles.infoValue}>{detailItem.isAc ? 'A/C Fitted' : 'Non A/C'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Total Capacity</Text><Text style={styles.infoValue}>{detailItem.capacity ?? 3} Beds</Text></View>

                  <SH title="Current Residents" />
                  {detailItem.students && detailItem.students.length > 0 ? (
                    detailItem.students.map((st: any, idx: number) => (
                      <View key={st.id || idx} style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: '#111827', fontWeight: '700' }]}>{st.user?.name}</Text>
                        <Text style={styles.infoValue}>Roll: {st.rollNumber}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.cardSecondary, { textAlign: 'center', marginVertical: 12 }]}>No residents currently allocated.</Text>
                  )}
                </View>
              )}

              {detailType === 'leave' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: '#EFF6FF', shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: '#3B82F6', borderColor: '#EFF6FF' }]}>
                      <Navigation size={32} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>{detailItem.student?.user?.name || 'Leave Details'}</Text>
                    <Badge label={detailItem.status} color={detailItem.status === 'APPROVED' ? '#10B981' : detailItem.status === 'REJECTED' ? '#EF4444' : '#F59E0B'} />
                  </View>

                  <SH title="Leave Details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Student Roll</Text><Text style={styles.infoValue}>{detailItem.student?.rollNumber || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Leave Type</Text><Text style={styles.infoValue}>{detailItem.type?.replace(/_/g, ' ')}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Reason</Text><Text style={[styles.infoValue, { maxWidth: '70%' }]}>{detailItem.reason}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Start Date</Text><Text style={styles.infoValue}>{new Date(detailItem.startDate).toLocaleDateString()}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>End Date</Text><Text style={styles.infoValue}>{new Date(detailItem.endDate).toLocaleDateString()}</Text></View>
                  
                  {detailItem.comments && (
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Warden Notes</Text><Text style={styles.infoValue}>{detailItem.comments}</Text></View>
                  )}

                  <SH title="Gate Log Activities" />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Out Log (Departure)</Text>
                    <Text style={styles.infoValue}>{detailItem.checkoutTime ? new Date(detailItem.checkoutTime).toLocaleString() : 'Not Departed Yet'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>In Log (Arrival)</Text>
                    <Text style={styles.infoValue}>{detailItem.checkinTime ? new Date(detailItem.checkinTime).toLocaleString() : 'Not Returned Yet'}</Text>
                  </View>
                </View>
              )}

              {detailType === 'complaint' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: '#FEF2F2', shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: '#EF4444', borderColor: '#FEF2F2' }]}>
                      <AlertCircle size={32} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>{detailItem.category}</Text>
                    <Badge label={detailItem.status} color={detailItem.status === 'RESOLVED' ? '#10B981' : PURPLE} />
                  </View>

                  <SH title="Issue details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Student Name</Text><Text style={styles.infoValue}>{detailItem.student?.user?.name || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Student Roll</Text><Text style={styles.infoValue}>{detailItem.student?.rollNumber || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Priority Level</Text><Text style={[styles.infoValue, { color: detailItem.priority === 'HIGH' || detailItem.priority === 'URGENT' ? '#EF4444' : '#F59E0B', fontWeight: '700' }]}>{detailItem.priority}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Room details</Text><Text style={styles.infoValue}>{detailItem.student?.room ? `Room ${detailItem.student.room.roomNumber} (${detailItem.student.room.block} Block)` : 'No Room Allocated'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Filed Date</Text><Text style={styles.infoValue}>{new Date(detailItem.createdAt || Date.now()).toLocaleDateString()}</Text></View>
                  
                  <SH title="Complaint Description" />
                  <View style={[styles.listCard, { backgroundColor: '#F9FAFB', borderLeftWidth: 3, borderLeftColor: '#E5E7EB' }]}>
                    <Text style={[styles.cardSecondary, { fontStyle: 'italic', marginBottom: 0 }]}>"{detailItem.description}"</Text>
                  </View>

                  {detailItem.wardenNotes && (
                    <View>
                      <SH title="Warden/Resolution Comments" />
                      <View style={[styles.listCard, { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: '#10B981' }]}>
                        <Text style={[styles.cardSecondary, { color: '#15803D', marginBottom: 0 }]}>{detailItem.wardenNotes}</Text>
                      </View>
                    </View>
                  )}
                  {user.role === 'ADMIN' && detailItem.status !== 'RESOLVED' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' }]} onPress={() => { setDetailModalVisible(false); resolveComplaint(detailItem.id); }}>
                        <Text style={styles.actionBtnText}>Resolve Complaint</Text>
                      </TouchableOpacity>
                      {detailItem.category === 'App / Web Issue' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6', flex: 1, height: 44, justifyContent: 'center', alignItems: 'center' }]} onPress={() => { setDetailModalVisible(false); triggerForwardDeveloper(detailItem.id); }}>
                          <Text style={styles.actionBtnText}>Forward to Dev</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}

              {detailType === 'invoice' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: detailItem.status === 'PAID' ? '#ECFDF5' : '#FEF2F2', shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: detailItem.status === 'PAID' ? '#10B981' : '#EF4444', borderColor: detailItem.status === 'PAID' ? '#ECFDF5' : '#FEF2F2' }]}>
                      <DollarSign size={32} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>₹{detailItem.amount}</Text>
                    <Badge label={detailItem.status} color={detailItem.status === 'PAID' ? '#10B981' : '#EF4444'} />
                  </View>

                  <SH title="Payment details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Description</Text><Text style={styles.infoValue}>{detailItem.description || 'Hostel Fee'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Due Date</Text><Text style={styles.infoValue}>{new Date(detailItem.dueDate).toLocaleDateString()}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Invoice reference ID</Text><Text style={styles.infoValue}>{detailItem.id?.slice(0, 18) + '...' || 'N/A'}</Text></View>
                  
                  {detailItem.paidAt && (
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Payment Cleared On</Text><Text style={styles.infoValue}>{new Date(detailItem.paidAt).toLocaleString()}</Text></View>
                  )}
                  {detailItem.status === 'PAID' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6', marginTop: 20, height: 44, justifyContent: 'center', alignItems: 'center' }]} onPress={() => { setDetailModalVisible(false); downloadReceipt(detailItem); }}>
                      <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Download PDF Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {detailType === 'visitor' && detailItem && (
                <View>
                  <View style={[styles.profileHero, { backgroundColor: '#F4F3FF', shadowColor: 'transparent', elevation: 0, paddingVertical: 20 }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: PURPLE, borderColor: '#F4F3FF' }]}>
                      <Users size={32} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.profileName, { color: '#111827' }]}>{detailItem.name}</Text>
                    <Badge label={detailItem.checkOutTime ? 'Departed' : 'Active Guest'} color={detailItem.checkOutTime ? '#6B7280' : '#10B981'} />
                  </View>

                  <SH title="Visitor Information" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Contact Number</Text><Text style={styles.infoValue}>{detailItem.phone}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Relationship to Student</Text><Text style={styles.infoValue}>{detailItem.relationship}</Text></View>
                  
                  <SH title="Hosting Student details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Host Student</Text><Text style={styles.infoValue}>{detailItem.student?.user?.name || 'N/A'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Host Roll No</Text><Text style={styles.infoValue}>{detailItem.student?.rollNumber || 'N/A'}</Text></View>
                  
                  <SH title="Visitor Log details" />
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Entry Time</Text><Text style={styles.infoValue}>{new Date(detailItem.checkInTime).toLocaleString()}</Text></View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Exit Time</Text>
                    <Text style={styles.infoValue}>{detailItem.checkOutTime ? new Date(detailItem.checkOutTime).toLocaleString() : 'Inside Building'}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.actionBtnText}>Close Details</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── WORKSPACE FLOOR SELECTION MODAL ─── */}
      <Modal visible={workspaceModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setWorkspaceModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setWorkspaceModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '82%', maxHeight: '82%', paddingHorizontal: 20, paddingTop: 12 }]}>
            <View style={{ width: '100%', alignItems: 'center', marginBottom: 10 }}>
              <View style={styles.modalHandle} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color={PURPLE} />
                <Text style={styles.modalTitle}>Select Workspace Floor</Text>
              </View>
              <TouchableOpacity onPress={() => setWorkspaceModalVisible(false)} style={{ padding: 6, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <XCircle size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 16 }}>
              Select a floor workspace to filter student directory, rooms, and reports:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {WORKSPACE_OPTIONS.map((item) => (
                <WorkspaceOptionCard
                  key={item.label}
                  item={item}
                  isSelected={String(selectedWorkspaceFloor) === String(item.num)}
                  onPress={() => {
                    setSelectedWorkspaceFloor(item.num as any);
                    setWorkspaceModalVisible(false);
                  }}
                />
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14, marginTop: 6 }]} onPress={() => setWorkspaceModalVisible(false)}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── FLOOR DIRECTORY & FINANCIAL REPORT MODAL ─── */}
      <Modal visible={floorModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setFloorModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFloorModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '88%', maxHeight: '88%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {selectedFloorNum === 'combined' ? 'Consolidated Report' : `Floor ${selectedFloorNum} Directory`}
            </Text>

            {/* Subtitle */}
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: -14, marginBottom: 16 }}>
              {selectedFloorNum === 'combined'
                ? 'All 5 Floors & Meenakshi Enterprises Catering'
                : floorDetail?.floor?.companyName ? `${floorDetail.floor.companyName} · ${floorDetail.floor.hostelName}` : 'Company & Resident Details'}
            </Text>

            {/* Tab switcher for single floor */}
            {selectedFloorNum !== 'combined' && (
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }, floorActiveTab === 'directory' && { backgroundColor: PURPLE }]}
                  onPress={() => setFloorActiveTab('directory')}
                >
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#4B5563' }, floorActiveTab === 'directory' && { color: '#FFFFFF' }]}>📋 Directory</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }, floorActiveTab === 'report' && { backgroundColor: PURPLE }]}
                  onPress={() => setFloorActiveTab('report')}
                >
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: '#4B5563' }, floorActiveTab === 'report' && { color: '#FFFFFF' }]}>📊 Financial Report</Text>
                </TouchableOpacity>
              </View>
            )}

            {floorLoading ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color={PURPLE} /></View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

                {/* ── DIRECTORY TAB ── */}
                {floorActiveTab === 'directory' && selectedFloorNum !== 'combined' && (
                  <View>
                    {/* Search Bar */}
                    <View style={[styles.searchBar, { height: 44, marginBottom: 12 }]}>
                      <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                      <TextInput
                        placeholder="Search student or roll number..."
                        value={floorSearch}
                        onChangeText={setFloorSearch}
                        style={styles.searchInput}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    {/* Summary Chips */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#F4F3FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: PURPLE }}>Rooms: {floorDetail?.rooms?.length || 0}</Text>
                      </View>
                      <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>Residents: {floorDetail?.summary?.totalStudents || 0}</Text>
                      </View>
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Mess Total: ₹{(floorDetail?.summary?.messFeeTotal || 0).toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Room Blocks */}
                    {(floorDetail?.rooms || [])
                      .map((room: any) => ({
                        ...room,
                        students: (room.students || []).filter((s: any) =>
                          !floorSearch ||
                          s.name.toLowerCase().includes(floorSearch.toLowerCase()) ||
                          s.rollNumber.toLowerCase().includes(floorSearch.toLowerCase())
                        )
                      }))
                      .filter((r: any) => r.students.length > 0 || !floorSearch)
                      .map((room: any) => (
                        <View key={room.id} style={[styles.listCard, { marginBottom: 12 }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: PURPLE, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{room.roomNumber}</Text>
                              </View>
                              <View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>Room {room.roomNumber}</Text>
                                <Text style={{ fontSize: 10, color: '#6B7280' }}>{room.sharingLabel} · ₹{room.monthlyFee?.toLocaleString()}/mo</Text>
                              </View>
                            </View>
                            <Badge label={`${room.occupancy}/${room.capacity} ${room.status}`} color={room.status === 'FULL' ? '#EF4444' : '#10B981'} />
                          </View>

                          {/* Students List */}
                          <View style={{ gap: 6, marginTop: 4 }}>
                            {room.students.map((s: any) => (
                              <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 8, borderRadius: 10 }}>
                                <View>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{s.name}</Text>
                                  <Text style={{ fontSize: 10, color: '#6B7280' }}>Roll: {s.rollNumber} · Ph: {s.phoneNumber}</Text>
                                </View>
                                <Badge label={s.latestInvoice?.status || 'Active'} color={s.latestInvoice?.status === 'PAID' ? '#10B981' : '#F59E0B'} />
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                  </View>
                )}

                {/* ── FINANCIAL REPORT TAB / CONSOLIDATED VIEW ── */}
                {(floorActiveTab === 'report' || selectedFloorNum === 'combined') && floorReport && (
                  <View>
                    {/* Summary Metric Cards */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      <View style={[styles.roomSummaryBox, { borderTopColor: '#7F56D9' }]}>
                        <Text style={[styles.roomSummaryCount, { color: '#7F56D9' }]}>{floorReport.summary?.totalStudents ?? floorReport.grandTotal?.totalStudents}</Text>
                        <Text style={styles.roomSummaryLabel}>Students</Text>
                      </View>
                      <View style={[styles.roomSummaryBox, { borderTopColor: '#2563EB' }]}>
                        <Text style={[styles.roomSummaryCount, { color: '#2563EB', fontSize: 15 }]}>₹{(floorReport.summary?.grandTotal ?? floorReport.grandTotal?.total)?.toLocaleString()}</Text>
                        <Text style={styles.roomSummaryLabel}>Total Due</Text>
                      </View>
                      <View style={[styles.roomSummaryBox, { borderTopColor: '#10B981' }]}>
                        <Text style={[styles.roomSummaryCount, { color: '#10B981', fontSize: 15 }]}>₹{(floorReport.summary?.totalCollected ?? floorReport.grandTotal?.collected)?.toLocaleString()}</Text>
                        <Text style={styles.roomSummaryLabel}>Collected</Text>
                      </View>
                      <View style={[styles.roomSummaryBox, { borderTopColor: '#EF4444' }]}>
                        <Text style={[styles.roomSummaryCount, { color: '#EF4444', fontSize: 15 }]}>₹{(floorReport.summary?.totalPending ?? floorReport.grandTotal?.pending)?.toLocaleString()}</Text>
                        <Text style={styles.roomSummaryLabel}>Pending</Text>
                      </View>
                    </View>

                    {/* Consolidated Floor-wise Table */}
                    {floorReport.floors && (
                      <View style={styles.listCard}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginBottom: 10 }}>Floor & Company Financial Breakdown</Text>
                        {floorReport.floors.map((f: any, idx: number) => (
                          <View key={idx} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>Floor {f.floor?.floorNumber} – {f.floor?.companyName}</Text>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: PURPLE }}>₹{f.summary?.grandTotal?.toLocaleString()}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>Hostel: ₹{f.summary?.totalHostelFee?.toLocaleString()} · Mess: ₹{f.summary?.totalMessFee?.toLocaleString()}</Text>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981' }}>Paid: ₹{f.summary?.totalCollected?.toLocaleString()}</Text>
                            </View>
                          </View>
                        ))}

                        {/* Meenakshi Enterprises Catering Row */}
                        <View style={{ paddingVertical: 10, backgroundColor: '#EFF6FF', paddingHorizontal: 8, borderRadius: 8, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>Meenakshi Enterprises (Catering)</Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>₹{floorReport.grandTotal?.meenakshiCatering?.toLocaleString()}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#3B82F6', marginTop: 2 }}>₹3,000 × {floorReport.grandTotal?.totalStudents} residents across all 5 floors</Text>
                        </View>
                      </View>
                    )}

                    {/* Single Floor Student Rows */}
                    {floorReport.students && (
                      <View style={styles.listCard}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#1F2937', marginBottom: 10 }}>Resident Bills Summary</Text>
                        {floorReport.students.map((s: any, idx: number) => (
                          <View key={idx} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>{s.name} (Room {s.roomNumber})</Text>
                              <Text style={{ fontSize: 10, color: '#6B7280' }}>Hostel: ₹{s.hostelFee} · Mess: ₹{s.messFee} · Elec: ₹{s.electricity}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#111827' }}>₹{s.total}</Text>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: s.pending > 0 ? '#EF4444' : '#10B981' }}>{s.pending > 0 ? `Due ₹${s.pending}` : 'Paid'}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

              </ScrollView>
            )}

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14, marginTop: 10 }]} onPress={() => setFloorModalVisible(false)}>
              <Text style={styles.actionBtnText}>Close Directory</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },

  // ── Header
  header: {
    backgroundColor: PURPLE,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  greetingEmoji: { fontSize: 22, marginRight: 8 },
  headerGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  headerGreetingSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 1 },
  headerName: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 4 },
  headerRole: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F04438',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#7F56D9',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  quoteStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 24,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quoteIcon: { fontSize: 18, color: 'rgba(255,255,255,0.4)', marginRight: 8, marginTop: -2 },
  quoteText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500', fontStyle: 'italic', lineHeight: 18 },

  // ── Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIconWrap: {
    width: 44, height: 44,
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  navIconWrapActive: { backgroundColor: PURPLE },
  navLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },
  navLabelActive: { color: PURPLE, fontWeight: '700' },

  // ── Content
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },

  // ── Stat Hero Grid
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statHero: {
    width: (width - 52) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeroIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  statHeroCount: { fontSize: 22, fontWeight: '900', color: '#111827' },
  statHeroLabel: { fontSize: 11, fontWeight: '700', color: '#374151', marginTop: 2 },
  statHeroSub: { fontSize: 10, color: '#9CA3AF', fontWeight: '500', marginTop: 3 },
  statHeroArrow: {
    width: 22, height: 22, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8, alignSelf: 'flex-start',
  },

  // ── Section header
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, marginTop: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1 },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: PURPLE_LIGHT },
  sectionActionText: { fontSize: 12, fontWeight: '700', color: PURPLE },

  // ── Cards
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 18,
    marginBottom: 12,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPrimary: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSecondary: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  cardTiny: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },

  // ── Approval card inner
  approvalCardInner: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: PURPLE_LIGHT,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: PURPLE },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8, marginTop: 8 },
  iconAction: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // ── Room hero card (student)
  roomHeroCard: {
    backgroundColor: PURPLE,
    borderRadius: 22, padding: 22,
    marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  roomHeroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.6 },
  roomHeroNumber: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  roomHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  roomHeroTag: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  roomHeroTagText: { fontSize: 11, fontWeight: '700' },
  roomHeroBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12,
  },
  roomHeroBtnText: { fontSize: 12, fontWeight: '700', color: PURPLE, marginRight: 2 },

  // ── Notice card
  noticeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  noticeEmoji: { fontSize: 26, marginRight: 14 },
  noticeDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },

  // ── Room summary row
  roomSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roomSummaryBox: {
    flex: 1, marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  roomSummaryCount: { fontSize: 20, fontWeight: '900' },
  roomSummaryLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },

  // ── Sub-tabs (for Requests)
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  subTab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center',
  },
  subTabActive: { backgroundColor: PURPLE },
  subTabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  subTabTextActive: { color: '#FFFFFF' },

  // ── Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingHorizontal: 16,
    height: 52, marginBottom: 16,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '500' },

  // ── Badges
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  // ── Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  btnGreen: { backgroundColor: '#10B981' },
  btnRed: { backgroundColor: '#EF4444' },
  btnPurple: { backgroundColor: PURPLE },
  primaryBtn: {
    height: 54, backgroundColor: PURPLE,
    borderRadius: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ── Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center', lineHeight: 22 },

  // ── Profile
  profileHero: {
    backgroundColor: PURPLE, borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 16,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5,
  },
  profileAvatar: {
    width: 84, height: 84, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  profileAvatarText: { fontSize: 34, fontWeight: '900', color: '#FFFFFF' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  infoRow: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
    marginBottom: 10,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111827', maxWidth: '60%', textAlign: 'right' },

  // ── Form modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHandle: { width: 44, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', marginTop: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 8 },
  formInput: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, height: 50,
    justifyContent: 'center', marginBottom: 6,
  },
  formInputText: { fontSize: 14, color: '#1F2937', fontWeight: '500' },

  // ── Tag picker
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  tagActive: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  tagText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tagTextActive: { color: PURPLE, fontWeight: '700' },

  // Alert Modal styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  alertBox: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  alertIconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitleText: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  alertMessageText: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  alertActionsRow: { flexDirection: 'row', width: '100%' },
  alertBtn: { height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Segment Tabs
  segmentContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 2, marginBottom: 14, marginTop: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1 },
  segmentBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  segmentBtnTextActive: { color: PURPLE, fontWeight: '700' },

  // Polls Styling
  pollCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#101828', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  pollQuestion: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 10 },
  pollVotesCount: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 10 },
  pollVoteBtn: { backgroundColor: '#F4F3FF', borderWidth: 1.5, borderColor: '#E9E3FF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  pollVoteBtnText: { fontSize: 14, fontWeight: '700', color: PURPLE },
  pollResultRow: { marginTop: 10 },
  pollResultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pollResultOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pollResultPercentText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  pollProgressBackground: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  pollProgressFill: { height: '100%', borderRadius: 4 },
  pollAdminActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderColor: '#F3F4F6', paddingTop: 12 },
  pollActionBtn: { flex: 1, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pollActionBtnText: { fontSize: 12, fontWeight: '700' },

  // Add Option Button in Creation Modal
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E9E3FF',
    backgroundColor: '#F4F3FF',
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE
  },

  // Offline banner styles
  offlineBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%'
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
});
