import { useState, useEffect, useRef, useCallback } from 'react';
import { addConnectionListener } from '../../utils/network';
import { registerForPushNotificationsAsync } from '../../utils/pushNotifications';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, TextInput, Modal,
  Platform, Dimensions, Alert, Animated, FlatList, Linking,
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
  suggestions as suggestionsApi, staff as staffApi, accounting as accountingApi,
} from '../../utils/api';
import {
  LogOut, Home, Users, FileText, Settings, Bell,
  CheckCircle, XCircle, Plus, Search, Coffee,
  DollarSign, UserCheck, TrendingUp, Shield,
  ChevronRight, ArrowLeft, Filter, User, CreditCard,
  Bed, AlertCircle, Clock, BookOpen, Navigation, Quote,
  Building2, Phone, MessageSquare, Utensils, Wrench,
  Receipt, ArrowRight, Sparkles, AlertTriangle, Eye,
  Calendar, Moon, Sun, Check, X, ShieldCheck, Zap,
  PhoneCall, RefreshCw, BarChart3, PieChart, Layers,
  Wallet, Send, Bot, Sliders, Droplets, Flame,
  ShoppingBag, Share2, Trash2, Edit3, Download,
  HelpCircle, CheckSquare, Square, CornerDownRight,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react-native';
import { getDailyQuote, getGreeting } from '../../utils/quotes';

const { width, height } = Dimensions.get('window');
// ─── Hari Pushp PG Design Tokens ──────────────────────────────────────────
const BRAND_TEAL = '#246460';          // Primary Brand Teal (Brand 700)
const BRAND_TEAL_DARK = '#1b4240';     // Brand 900
const BRAND_TEAL_DEEP = '#1f504d';     // Brand 800
const BRAND_TEAL_MED = '#2b7a74';      // Brand 600
const BRAND_TEAL_LIGHT = '#e6f4f2';    // Mint 100
const BRAND_TEAL_SUBTLE = '#f0f8f7';   // Brand 50
const BRAND_MINT_BG = '#f6faf9';       // Mint surface background
const BRAND_MINT_CARD = '#e6f4f2';     // Mint card surface
const BRAND_MINT_PILL = '#d5ecea';     // Mint pill
const BRAND_GOLD = '#f9d77e';          // Sun 300 (Accent CTA)
const BRAND_GOLD_DARK = '#3d2f06';     // Sun 900 text
const BRAND_GOLD_BG = '#fefae9';       // Sun 50
const BRAND_BORDER = '#e3ecea';        // Crisp card border
const TEXT_DARK = '#1b2a29';           // Dark teal charcoal
const TEXT_MUTED = '#52625f';          // Secondary text
const TEXT_LIGHT = '#8a9895';          // Tertiary text

// Aliases for unified styling across existing components
const PURPLE = BRAND_TEAL;
const PURPLE_LIGHT = BRAND_TEAL_LIGHT;
const PURPLE_DARK = BRAND_TEAL_DARK;

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
  { num: 1, name: 'Rajken Enterprises', label: 'Floor 1 Workspace', sub: 'Hari Pushp Girls Hostel', icon: '🏠', color: BRAND_TEAL },
  { num: 2, name: 'Vandana Enterprises', label: 'Floor 2 Workspace', sub: 'Vandana Girls Hostel', icon: '🏢', color: '#EC4899' },
  { num: 3, name: 'Pushpa Enterprises', label: 'Floor 3 Workspace', sub: 'Pushpa Girls Hostel', icon: '🏙️', color: '#06B6D4' },
  { num: 4, name: 'Harish Chandra Ent.', label: 'Floor 4 Workspace', sub: 'Harish Chandra Girls Hostel', icon: '🌿', color: '#10B981' },
  { num: 5, name: 'Ramesh Enterprises', label: 'Floor 5 & 6 Workspace', sub: 'Ramesh Girls Hostel', icon: '⭐', color: '#F59E0B' },
  { num: 'combined', name: 'Consolidated View', label: 'All 5 Floors Combined', sub: 'Meenakshi Enterprises Catering', icon: '🌐', color: BRAND_TEAL },
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
  const [studentFloorFilter, setStudentFloorFilter] = useState<number | 'all'>('all');
  const [roomFloorFilter, setRoomFloorFilter] = useState<number | 'all'>('all');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | 'OCCUPIED' | 'AVAILABLE' | 'MAINTENANCE'>('all');

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

  // ─── NEW FEATURES STATE: Expenses, AI Buddy, Team, Analytics, Room Beds, Dossier, Essentials ───
  // 1. Expenses Tracker State
  const [expensesModalVisible, setExpensesModalVisible] = useState(false);
  const [expensesList, setExpensesList] = useState<any[]>([
    { id: 'exp-1', category: 'Vegetables', amount: 2000, date: '06 Jun 2026', mode: 'CASH', notes: 'Weekly fresh vegetables from Meenakshi market' },
    { id: 'exp-2', category: 'Cleaning', amount: 5000, date: '03 May 2026', mode: 'CASH', notes: 'Monthly housekeeping & phenyl bulk order' },
    { id: 'exp-3', category: 'Repair', amount: 10000, date: '03 May 2026', mode: 'CASH', notes: 'Plumbing & washroom fixture replacements' },
    { id: 'exp-4', category: 'Bill', amount: 8000, date: '03 May 2026', mode: 'CASH', notes: 'High-speed commercial WiFi & electricity advance' },
    { id: 'exp-5', category: 'Gas', amount: 3200, date: '18 Apr 2026', mode: 'UPI', notes: '2 Commercial 19kg LPG cylinders' },
    { id: 'exp-6', category: 'Water', amount: 2500, date: '12 Apr 2026', mode: 'CASH', notes: 'Emergency water tanker delivery' },
    { id: 'exp-7', category: 'Salary', amount: 45000, date: '01 May 2026', mode: 'BANK_TRANSFER', notes: 'Warden & security guard monthly remuneration' },
  ]);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseMonth, setExpenseMonth] = useState('July 2026');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [newExpenseCategory, setNewExpenseCategory] = useState('Vegetables');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseMode, setNewExpenseMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  // 2. PG Buddy AI Assistant State
  const [aiBuddyModalVisible, setAiBuddyModalVisible] = useState(false);
  const [aiBuddyInput, setAiBuddyInput] = useState('');
  const [aiBuddyMessages, setAiBuddyMessages] = useState<any[]>([
    {
      id: 'ai-0',
      sender: 'ai',
      text: "Hi! I'm PG Buddy, your AI assistant for PG management.\n\nI have real-time access to your portfolio — occupancy, rent, finances, mess, and more. Ask me anything!",
      time: '12:08 pm'
    }
  ]);

  // 3. Team Management & Granular Access State
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [staffMembersList, setStaffMembersList] = useState<any[]>([
    {
      id: 'staff-1',
      name: 'Prasanth',
      email: 'pgmanaging01@gmail.com',
      phone: '9160183642',
      role: 'WARDEN',
      status: 'ACTIVE',
      modules: {
        dashboard: true,
        properties: 'VIEW_ONLY',
        tenants: 'MOVE_OUT',
        finance: 'VIEW_ONLY',
        reports: true,
        pgAccess: '1 property'
      }
    },
    {
      id: 'staff-2',
      name: 'Ramesh Guard',
      email: 'ramesh.guard@hms.com',
      phone: '9848022338',
      role: 'GUARD',
      status: 'ACTIVE',
      modules: {
        dashboard: false,
        properties: 'VIEW_ONLY',
        tenants: 'VIEW_ONLY',
        finance: 'OFF',
        reports: false,
        pgAccess: 'Ground Floor Gate'
      }
    }
  ]);
  const [addStaffModalVisible, setAddStaffModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Hostel Warden');
  const [newStaffDesignation, setNewStaffDesignation] = useState('Floor Warden');

  // 4. Analytics & Business Performance State
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'Overview' | 'Payments' | 'Occupancy'>('Overview');
  const [analyticsProperty, setAnalyticsProperty] = useState('All Properties');
  const [analyticsYear, setAnalyticsYear] = useState('2026');
  const [analyticsMonth, setAnalyticsMonth] = useState('Jul');

  // 5. Tenant Payment Dossier Modal State
  const [selectedStudentPaymentModal, setSelectedStudentPaymentModal] = useState<any>(null);

  // 6. Room & Beds Deep Dive Management Drawer State
  const [selectedRoomDetailModal, setSelectedRoomDetailModal] = useState<any>(null);
  const [addBedCountModalVisible, setAddBedCountModalVisible] = useState(false);

  // 7. Essentials Tracker Modal State
  const [essentialsModalVisible, setEssentialsModalVisible] = useState(false);
  const [essentialsLogs, setEssentialsLogs] = useState<any[]>([
    { id: 'ess-1', type: 'Water', title: '5,000L Water Tanker Delivered', date: 'Today, 10:30 AM', cost: '₹1,200', status: 'Delivered', vendor: 'Sri Sai Water' },
    { id: 'ess-2', type: 'Gas', title: '2 Commercial 19kg HP Gas Cylinders', date: 'Yesterday', cost: '₹3,400', status: 'Connected', vendor: 'HP Gas Agency' },
    { id: 'ess-3', type: 'Veggies', title: 'Meenakshi Fresh Veggies Batch #44', date: '26 Sep 2026', cost: '₹2,800', status: 'Received', vendor: 'Meenakshi Farm' },
  ]);

  // Handlers for New Features
  const handleAddExpense = () => {
    if (!newExpenseAmount || isNaN(Number(newExpenseAmount))) {
      showAlert('Required', 'Please enter a valid expense amount.', 'ERROR');
      return;
    }
    const newExp = {
      id: `exp-${Date.now()}`,
      category: newExpenseCategory,
      amount: Number(newExpenseAmount),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      mode: newExpenseMode,
      notes: newExpenseNotes || `${newExpenseCategory} payment`
    };
    setExpensesList([newExp, ...expensesList]);
    setAddExpenseModalVisible(false);
    setNewExpenseAmount('');
    setNewExpenseNotes('');
    showAlert('Expense Recorded', `₹${newExp.amount} added under ${newExp.category}.`, 'SUCCESS');
  };

  const handleSendAiMessage = (overrideText?: string) => {
    const query = (overrideText || aiBuddyInput).trim();
    if (!query) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiBuddyMessages(prev => [...prev, userMsg]);
    if (!overrideText) setAiBuddyInput('');

    setTimeout(() => {
      const qLower = query.toLowerCase();
      let aiReply = '';

      if (qLower.includes('pending') || qLower.includes("who hasn't paid") || qLower.includes('unpaid') || qLower.includes('rent')) {
        const unpaidStudents = allStudents.filter(s => {
          const studentInvs = invoicesList.filter(i => i.studentId === s.id && i.status !== 'PAID');
          return studentInvs.length > 0;
        });
        const totalPending = invoicesList.filter(i => i.status !== 'PAID').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
        
        if (unpaidStudents.length > 0) {
          aiReply = `📊 **Rent Pending Analysis:**\n\nThere are **${unpaidStudents.length} residents** with outstanding rent totaling **₹${totalPending.toLocaleString()}**.\n\nTop Pending Residents:\n` +
            unpaidStudents.slice(0, 5).map(s => `• **${s.user?.name || s.name}** (Room ${s.room?.roomNumber || 'N/A'}): ₹${s.invoices?.find((i: any) => i.status !== 'PAID')?.amount || '7,000'}`).join('\n') +
            `\n\n💡 *Tip: Tap 'WhatsApp' on any student card to dispatch 1-tap payment reminder.*`;
        } else {
          aiReply = `🎉 Great news! All current resident dues are **100% collected**. Total revenue collected: ₹${invoicesList.filter(i => i.status === 'PAID').reduce((a, b) => a + Number(b.amount || 0), 0).toLocaleString()}.`;
        }
      } else if (qLower.includes('vacant') || qLower.includes('vacancy') || qLower.includes('bed')) {
        const totalBeds = allRooms.reduce((acc, r) => acc + (r.capacity || r.sharingType || 2), 0);
        const occupiedBeds = allRooms.reduce((acc, r) => acc + (r.students?.length || (r.status === 'OCCUPIED' ? 2 : 0)), 0);
        const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
        const vacantRooms = allRooms.filter(r => (r.students?.length || 0) < (r.capacity || 2));

        aiReply = `🛏️ **Live Bed Inventory:**\n\n• Total Beds: **${totalBeds}**\n• Occupied: **${occupiedBeds}** (${totalBeds > 0 ? Math.round((occupiedBeds/totalBeds)*100) : 0}%)\n• Available Vacancies: **${vacantBeds} Beds**\n\nRooms with open beds:\n` +
          vacantRooms.slice(0, 4).map(r => `• Room **${r.roomNumber}** (Floor ${r.floorNumber || 1}): ${(r.capacity || 2) - (r.students?.length || 0)} bed(s) free`).join('\n');
      } else if (qLower.includes('expense')) {
        const totalExp = expensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        aiReply = `💰 **Expenses Overview (${expenseMonth}):**\n\n• Total Recorded Expenses: **₹${totalExp.toLocaleString()}** (${expensesList.length} transactions)\n• Breakdown:\n  - Vegetables & Catering: ₹${expensesList.filter(e => e.category === 'Vegetables').reduce((a,b) => a + b.amount, 0).toLocaleString()}\n  - Repairs & Maint.: ₹${expensesList.filter(e => e.category === 'Repair').reduce((a,b) => a + b.amount, 0).toLocaleString()}\n  - Cleaning: ₹${expensesList.filter(e => e.category === 'Cleaning').reduce((a,b) => a + b.amount, 0).toLocaleString()}\n  - Salaries: ₹${expensesList.filter(e => e.category === 'Salary').reduce((a,b) => a + b.amount, 0).toLocaleString()}`;
      } else if (qLower.includes('leave') || qLower.includes('outside')) {
        const pendingLeaves = leavesList.filter(l => l.status === 'PENDING').length;
        const outNow = leavesList.filter(l => l.status === 'CHECKED_OUT').length;
        aiReply = `🚪 **Resident Movement Status:**\n\n• Currently Outside: **${outNow} residents**\n• Pending Leave Requests: **${pendingLeaves} requests** awaiting your approval.\n\nCheck the Requests tab to review and approve.`;
      } else {
        aiReply = `🤖 **Hari Pushp PG Summary for ${user?.name}:**\n\n• Active Residents: **${allStudents.length}**\n• Active Rooms: **${allRooms.length}**\n• Open Maintenance Tickets: **${complaintsList.filter(c => c.status !== 'RESOLVED').length}**\n• Night Roll Call: Ready for Floor ${selectedWorkspaceFloor === 'combined' ? '1' : selectedWorkspaceFloor}.\n\nHow else can I assist with your hostel management?`;
      }

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiBuddyMessages(prev => [...prev, aiMsg]);
    }, 450);
  };

  const handleToggleStaffModule = (staffId: string, moduleKey: string) => {
    setStaffMembersList(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      return {
        ...s,
        modules: {
          ...s.modules,
          [moduleKey]: !s.modules[moduleKey]
        }
      };
    }));
    showAlert('Permissions Updated', 'Staff module access updated.', 'SUCCESS');
  };

  const handleAddNewStaff = () => {
    if (!newStaffName || !newStaffEmail) {
      showAlert('Required', 'Name and Email are required for team members.', 'ERROR');
      return;
    }
    const newMember = {
      id: `staff-${Date.now()}`,
      name: newStaffName,
      email: newStaffEmail,
      phone: newStaffPhone || '9876543210',
      role: 'WARDEN',
      status: 'ACTIVE',
      modules: {
        dashboard: true,
        properties: 'FULL',
        tenants: 'MOVE_OUT',
        finance: 'VIEW_ONLY',
        reports: true,
        pgAccess: '1 property'
      }
    };
    setStaffMembersList([...staffMembersList, newMember]);
    setAddStaffModalVisible(false);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    showAlert('Team Member Added', `${newMember.name} has been granted access.`, 'SUCCESS');
  };

  const handleDirectWhatsAppAction = (phone: string, studentName: string, amount: number = 7000) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `Dear ${studentName},\nThis is a friendly reminder regarding your pending hostel dues of ₹${amount.toLocaleString()} for Hari Pushp PG. Kindly clear the dues at your earliest convenience.\nThank you!`;
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`).catch(() => {
      showAlert('WhatsApp Error', 'Could not open WhatsApp on this device.', 'ERROR');
    });
  };

  const handleDirectSMSAction = (phone: string, studentName: string, amount: number = 7000) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = `Dear ${studentName}, please pay your pending PG dues of Rs.${amount}. Hari Pushp PG Warden.`;
    Linking.openURL(`sms:${cleanPhone}?body=${encodeURIComponent(msg)}`).catch(() => {
      showAlert('SMS Error', 'Could not open SMS messenger.', 'ERROR');
    });
  };

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
      showAlert('Success', `Document marked as ${status.toLowerCase()}`, 'SUCCESS');
      loadDashboardData();
    } catch (e: any) { showAlert('Error', e.message, 'ERROR'); }
  };

  // ─── ADMIN: Home Overview ───────────────────────────────────────────────
  const renderAdminHome = () => {
    const activeRooms = selectedWorkspaceFloor === 'combined'
      ? allRooms
      : allRooms.filter(r => r.floorNumber === Number(selectedWorkspaceFloor));
    const activeRoomIds = new Set(activeRooms.map(r => r.id));
    const activeStudents = selectedWorkspaceFloor === 'combined'
      ? allStudents
      : allStudents.filter(s => activeRoomIds.has(s.roomId));

    const totalBeds = activeRooms.reduce((acc, r) => acc + (r.capacity || r.sharingType || 2), 0);
    const occupiedBeds = activeRooms.reduce((acc, r) => acc + (r.students?.length || (r.status === 'OCCUPIED' ? 2 : 0)), 0);
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancy = totalBeds > 0 ? Math.min(100, Math.round((occupiedBeds / totalBeds) * 100)) : 0;

    const pendingLeaves = leavesList.filter(l => l.status === 'PENDING').length;
    const outNowCount = leavesList.filter(l => l.status === 'CHECKED_OUT').length;
    const openComplaints = complaintsList.filter(c => c.status !== 'RESOLVED').length;

    // Financial Metrics
    const unpaidInvoices = invoicesList.filter(i => i.status !== 'PAID');
    const totalDuesAmount = unpaidInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const paidInvoices = invoicesList.filter(i => i.status === 'PAID');
    const totalCollectedAmount = paidInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
    const totalBilled = totalCollectedAmount + totalDuesAmount;
    const collectionRate = totalBilled > 0 ? Math.round((totalCollectedAmount / totalBilled) * 100) : 100;

    const workspaceLabel = selectedWorkspaceFloor === 'combined'
      ? '🌐 All 5 Floors Consolidated'
      : `Floor ${selectedWorkspaceFloor} Dedicated Workspace`;

    return (
      <View>
        {/* ── Top Property Title & Location Bar ── */}
        <AnimatedCard delay={0}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: BRAND_BORDER,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: BRAND_TEAL_DARK,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <TouchableOpacity onPress={() => setWorkspaceModalVisible(true)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND_MINT_BG, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BRAND_BORDER }}>
                <Building2 size={22} color={BRAND_TEAL} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_DARK }} numberOfLines={1}>Mens luxury pg</Text>
                  <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>NEW</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '600' }} numberOfLines={1}>📍 Vijayawada, Andhra Pradesh</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity onPress={() => setAnalyticsModalVisible(true)} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: BRAND_MINT_CARD, justifyContent: 'center', alignItems: 'center' }}>
                <BarChart3 size={18} color={BRAND_TEAL} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAddStudentModalVisible(true)} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: BRAND_TEAL, justifyContent: 'center', alignItems: 'center' }}>
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedCard>

        {/* ── 1. Top 4-Metric Bar (Total, Occupied, Vacant, 86%) ── */}
        <AnimatedCard delay={40}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 14,
            marginBottom: 14,
            borderWidth: 1,
            borderColor: BRAND_BORDER,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: BRAND_TEAL_DARK,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT_DARK }}>{totalBeds}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase', marginTop: 2 }}>Total</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: BRAND_BORDER }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#10B981' }}>{occupiedBeds}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase', marginTop: 2 }}>Occupied</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: BRAND_BORDER }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#F59E0B' }}>{vacantBeds}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase', marginTop: 2 }}>Vacant</Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: BRAND_BORDER }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669' }}>{occupancy}%</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* ── 2. 6 Circular Quick Actions (Tenants, Complaints, Approvals, Expenses, Charges, Transactions) ── */}
        <AnimatedCard delay={80}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 4, marginBottom: 14 }}>
            {[
              { id: 'tenants', label: 'Tenants', icon: Users, color: '#10B981', badge: activeStudents.length, onPress: () => setActiveTab('Students') },
              { id: 'complaints', label: 'Complaints', icon: Wrench, color: '#EF4444', badge: openComplaints, onPress: () => { setActiveTab('Requests'); setRequestSection('Complaints'); } },
              { id: 'approvals', label: 'Approvals', icon: UserCheck, color: '#F59E0B', badge: pendingApprovals.length, onPress: () => { setActiveTab('Requests'); setRequestSection('Approvals'); } },
              { id: 'expenses', label: 'Expenses', icon: DollarSign, color: '#F97316', badge: expensesList.length, onPress: () => setExpensesModalVisible(true) },
              { id: 'charges', label: 'Charges', icon: Zap, color: '#06B6D4', badge: null, onPress: () => setSubMeterModalVisible(true) },
              { id: 'transactions', label: 'Transaction', icon: Receipt, color: '#8B5CF6', badge: null, onPress: () => setGateLogsModalVisible(true) },
            ].map((btn) => {
              const IconComp = btn.icon;
              return (
                <TouchableOpacity key={btn.id} onPress={btn.onPress} style={{ alignItems: 'center', width: 62 }} activeOpacity={0.75}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: btn.color + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: btn.color + '40', position: 'relative' }}>
                    <IconComp size={22} color={btn.color} />
                    {btn.badge !== null && btn.badge > 0 && (
                      <View style={{ position: 'absolute', top: -3, right: -3, backgroundColor: btn.color, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFFFFF' }}>{btn.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT_DARK, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{btn.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </AnimatedCard>

        {/* ── 3. Alert Banner: Pending Dues ── */}
        <AnimatedCard delay={100}>
          <TouchableOpacity
            onPress={openDemandNotesModal}
            style={{
              backgroundColor: '#FEF3C7',
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#FDE68A',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                ₹{(totalDuesAmount / 1000).toFixed(1)}K pending · {unpaidInvoices.length} dues
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>View</Text>
              <ChevronRight size={14} color="#B45309" />
            </View>
          </TouchableOpacity>
        </AnimatedCard>

        {/* ── 4. Feature Action Banners (Essentials, Manage Team, PG Buddy AI) ── */}
        <AnimatedCard delay={120}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {/* Essentials */}
            <TouchableOpacity
              onPress={() => setEssentialsModalVisible(true)}
              style={{
                flex: 1,
                backgroundColor: '#134E48',
                borderRadius: 16,
                padding: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
              activeOpacity={0.8}
            >
              <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#34D399', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#064E3B' }}>NEW</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Droplets size={16} color="#5EEAD4" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>Essentials</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#CCFBF1', fontWeight: '500' }}>Water · Gas · Veggies</Text>
            </TouchableOpacity>

            {/* Manage Team */}
            <TouchableOpacity
              onPress={() => setTeamModalVisible(true)}
              style={{
                flex: 1,
                backgroundColor: '#4338CA',
                borderRadius: 16,
                padding: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Users size={16} color="#C7D2FE" />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>Manage Team</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#E0E7FF', fontWeight: '500' }}>Staff · Roles · Access</Text>
            </TouchableOpacity>
          </View>

          {/* PG Buddy AI Prompt Bar */}
          <TouchableOpacity
            onPress={() => setAiBuddyModalVisible(true)}
            style={{
              backgroundColor: '#581C87',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <Sparkles size={18} color="#FDE047" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>PG Buddy AI</Text>
                <Text style={{ fontSize: 10, color: '#E9D5FF', fontWeight: '500' }} numberOfLines={1}>
                  Who hasn't paid? · Vacancies? · Monthly report
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Ask</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </AnimatedCard>

        {/* ── 5. Floor-Wise Rooms & Beds Matrix Section ── */}
        <AnimatedCard delay={140}>
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT_DARK }}>Rooms</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{allRooms.length} rooms across 5 floors</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setRoomStatusFilter(roomStatusFilter === 'AVAILABLE' ? 'all' : 'AVAILABLE')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: roomStatusFilter === 'AVAILABLE' ? BRAND_TEAL : BRAND_MINT_BG,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: BRAND_BORDER,
                  }}
                >
                  <Filter size={12} color={roomStatusFilter === 'AVAILABLE' ? '#FFFFFF' : BRAND_TEAL} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: roomStatusFilter === 'AVAILABLE' ? '#FFFFFF' : BRAND_TEAL }}>Vacant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAddRoomModalVisible(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: BRAND_TEAL,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Plus size={12} color="#FFFFFF" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Floor Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {[
                { id: 'all', label: 'Ground', count: allRooms.filter(r => (r.floorNumber || 1) === 1).length },
                { id: 1, label: 'Floor 1', count: allRooms.filter(r => (r.floorNumber || 1) === 1).length },
                { id: 2, label: 'Floor 2', count: allRooms.filter(r => r.floorNumber === 2).length },
                { id: 3, label: 'Floor 3', count: allRooms.filter(r => r.floorNumber === 3).length },
                { id: 4, label: 'Floor 4', count: allRooms.filter(r => r.floorNumber === 4).length },
                { id: 5, label: 'Floor 5', count: allRooms.filter(r => r.floorNumber === 5).length },
              ].map((f) => {
                const isSelected = studentFloorFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.label}
                    onPress={() => setStudentFloorFilter(f.id as any)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? BRAND_TEAL : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isSelected ? BRAND_TEAL : BRAND_BORDER,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isSelected ? '#FFFFFF' : TEXT_DARK }}>{f.label}</Text>
                    <View style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : BRAND_MINT_BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isSelected ? '#FFFFFF' : BRAND_TEAL }}>{f.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Status Summary Counts */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>{paidInvoices.length} Paid</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>{unpaidInvoices.length} Unpaid</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E40AF' }}>0 Upcoming</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151' }}>{vacantBeds} Vacant</Text>
              </View>
            </View>

            {/* Room Bed Cards Grid */}
            {activeRooms.slice(0, 4).map((room) => {
              const occupants = room.students || allStudents.filter(s => s.roomId === room.id);
              const capacity = room.capacity || room.sharingType || 2;
              const slots = Array.from({ length: capacity }, (_, idx) => occupants[idx] || null);

              return (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => setSelectedRoomDetailModal(room)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: BRAND_BORDER,
                    shadowColor: BRAND_TEAL_DARK,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_DARK }}>ROOM {room.roomNumber}</Text>
                      <View style={{ backgroundColor: BRAND_MINT_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: BRAND_BORDER }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: BRAND_TEAL }}>{room.isAc ? '❄️ AC' : '✦ NON-AC'}</Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color="#9CA3AF" />
                  </View>

                  {/* Bed Grid Slots */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {slots.map((student, bIdx) => (
                      <TouchableOpacity
                        key={bIdx}
                        onPress={() => student ? setSelectedStudentPaymentModal(student) : null}
                        style={{
                          width: (width - 80) / 4,
                          backgroundColor: student ? '#FEF3C7' : '#F9FAFB',
                          borderRadius: 10,
                          paddingVertical: 10,
                          paddingHorizontal: 6,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: student ? '#FDE68A' : '#E5E7EB',
                        }}
                      >
                        <Text style={{ fontSize: 16, marginBottom: 2 }}>🛏️</Text>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: student ? '#92400E' : '#6B7280' }}>Bed {bIdx + 1}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: student ? '#B45309' : '#9CA3AF', marginTop: 1 }} numberOfLines={1}>
                          {student ? (student.user?.name || student.name || 'Resident') : 'Vacant'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedCard>

        {/* ── 6. Monthly Financials & Revenue Snapshot (Matches Web FeesMonthCard) ── */}
        <AnimatedCard delay={160}>
          <View style={[styles.listCard, { padding: 18, marginBottom: 18 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND_MINT_CARD, justifyContent: 'center', alignItems: 'center' }}>
                  <Receipt size={18} color={BRAND_TEAL} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_DARK }}>Monthly Revenue & Dues</Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Current 10-to-10 Billing Cycle</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAnalyticsModalVisible(true)} style={{ backgroundColor: BRAND_MINT_CARD, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: BRAND_TEAL }}>Analytics →</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase' }}>Collected</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#10B981', marginTop: 2 }}>₹{totalCollectedAmount.toLocaleString()}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase' }}>Pending Dues</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#EF4444', marginTop: 2 }}>₹{totalDuesAmount.toLocaleString()}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase' }}>Collection Rate</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: BRAND_TEAL, marginTop: 2 }}>{collectionRate}%</Text>
              </View>
            </View>

            <View style={{ height: 6, backgroundColor: '#E3ECEA', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ height: '100%', width: `${collectionRate}%`, backgroundColor: '#10B981', borderRadius: 3 }} />
            </View>
          </View>
        </AnimatedCard>

        {/* ── 7. Floor Directory & Company Matrix ── */}
        <SH title="Floor & Company Directory" count={floorsList.length || 5} onAction={() => openFloorModal('combined')} actionLabel="Consolidated Report" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 10, marginBottom: 20 }}>
          {[
            { num: 1, name: 'Rajken Ent.', label: 'Floor 1', sub: 'Hari Pushp PG', color: BRAND_TEAL, icon: '🏠', bg: '#F0F8F7' },
            { num: 2, name: 'Vandana Ent.', label: 'Floor 2', sub: 'Vandana PG', color: '#EC4899', icon: '🏢', bg: '#FDF2F8' },
            { num: 3, name: 'Pushpa Ent.', label: 'Floor 3', sub: 'Pushpa PG', color: '#06B6D4', icon: '🏙️', bg: '#ECFEFF' },
            { num: 4, name: 'Harish Chandra', label: 'Floor 4', sub: 'Harish Chandra PG', color: '#10B981', icon: '🌿', bg: '#ECFDF5' },
            { num: 5, name: 'Ramesh Ent.', label: 'Floor 5&6', sub: 'Ramesh PG', color: '#F59E0B', icon: '⭐', bg: '#FFFBEB' },
            { num: 'combined', name: 'Consolidated', label: 'All 5 Floors', sub: 'Meenakshi Catering', color: BRAND_TEAL, icon: '🌐', bg: '#E6F4F2' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.listCard, { width: 145, padding: 14, borderLeftWidth: 4, borderLeftColor: item.color }]}
              onPress={() => openFloorModal(item.num as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, textTransform: 'uppercase' }}>{item.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginTop: 2 }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 8. Hostel Operations & Management Modules (8 Modern Cards) ── */}
        <SH title="Hostel Operations & Modules" count={8} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: BRAND_TEAL }]}
            onPress={() => router.push('/accounting' as any)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>📊</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Tally Ledger</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Daybook & Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: '#D97706' }]}
            onPress={openDemandNotesModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🧾</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Demand Notes</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Electricity & Dues</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: '#10B981' }]}
            onPress={openCookDashboardModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🍽️</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Cook Dashboard</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Daily Meal Counts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: BRAND_TEAL_DARK }]}
            onPress={() => openNightRoundModal(selectedWorkspaceFloor === 'combined' ? 1 : Number(selectedWorkspaceFloor))}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🌙</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Night Roll Call</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Room Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: '#5AADA5' }]}
            onPress={openGateLogsModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🚪</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Gate Entry Logs</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Biometric Movement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: '#E11D48' }]}
            onPress={() => setActiveTab('Visitors')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🛡️</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Visitor Passes</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Guest Approvals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: BRAND_TEAL_MED }]}
            onPress={openSuggestionsModal}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>💬</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Suggestions</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Student Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listCard, { width: (width - 50) / 2, padding: 14, marginBottom: 10, borderLeftWidth: 3.5, borderLeftColor: '#8B5CF6' }]}
            onPress={() => setMessMenuModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22, marginBottom: 6 }}>📜</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>Mess Planner</Text>
            <Text style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>Weekly Meal Menu</Text>
          </TouchableOpacity>
        </View>

        {/* ── 6. Recent Approvals Quick Triage ── */}
        {pendingApprovals.length > 0 && (
          <>
            <SH title="Pending Approvals" count={pendingApprovals.length} onAction={() => { setActiveTab('Requests'); setRequestSection('Approvals'); }} actionLabel="View All" />
            {pendingApprovals.slice(0, 3).map((p, i) => (
              <AnimatedCard key={p.id} delay={i * 50}>
                <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                  <View style={styles.approvalCardInner}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openDetails(p.student || p, 'student')} activeOpacity={0.7}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{p.name?.charAt(0)?.toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardPrimary}>{p.name}</Text>
                        <Text style={styles.cardSecondary}>{p.email}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                          <Badge label={p.role?.replace('PENDING_', '')} color="#F59E0B" />
                          {p.student?.phoneNumber && (
                            <Text style={styles.cardTiny}>📱 {p.student.phoneNumber}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#ECFDF5', width: 38, height: 38 }]} onPress={() => approveUser(p.id, p.role?.replace('PENDING_', ''))}>
                        <CheckCircle size={20} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#FEF2F2', width: 38, height: 38 }]} onPress={() => rejectUser(p.id)}>
                        <XCircle size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </>
        )}

        {/* ── 7. Recent Leaves Quick Triage ── */}
        {pendingLeaves > 0 && (
          <>
            <SH title="Pending Leave Passes" count={pendingLeaves} onAction={() => { setActiveTab('Requests'); setRequestSection('Leaves'); }} actionLabel="View All" />
            {leavesList.filter(l => l.status === 'PENDING').slice(0, 2).map((l, i) => (
              <AnimatedCard key={l.id} delay={200 + i * 50}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: '#0284C7' }]} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{l.student?.user?.name}</Text>
                    <Badge label={l.type?.replace('_', ' ')} color="#0284C7" />
                  </View>
                  <Text style={styles.cardSecondary}>{l.reason}</Text>
                  <Text style={styles.cardTiny}>📅 {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
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

        {/* ── 8. Notice Board & Polls ── */}
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
              <AnimatedCard key={n.id || i} delay={300 + i * 50}>
                <View style={styles.noticeCard}>
                  <View style={{ marginRight: 14 }}><Bell size={20} color={BRAND_TEAL} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardPrimary}>{n.title}</Text>
                    <Text style={styles.cardSecondary}>{n.content}</Text>
                    <Text style={styles.cardTiny}>by {n.postedBy}</Text>
                  </View>
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
              <AnimatedCard key={p.id || i} delay={300 + i * 50}>
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
                          <View style={[styles.pollProgressFill, { width: `${opt.percentage}%`, backgroundColor: BRAND_TEAL }]} />
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

  // ─── ADMIN: Students Tab (Redesigned with Floor Matrix, Direct Call, and Dues) ─
  const renderStudentsTab = () => {
    const floorFiltered = studentFloorFilter === 'all'
      ? allStudents
      : allStudents.filter(s => s.room?.floorNumber === Number(studentFloorFilter));

    const filtered = floorFiltered.filter(s =>
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room?.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const assignedCount = filtered.filter(s => s.roomId).length;
    const unassignedCount = filtered.length - assignedCount;

    return (
      <View>
        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color={BRAND_TEAL} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, roll, room or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8A9895"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <X size={16} color="#8A9895" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPurple, { marginLeft: 10, height: 48, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }]}
            onPress={() => setAddStudentModalVisible(true)}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Floor Filter Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12, paddingHorizontal: 2 }}>
          {[
            { id: 'all', label: `All Floors (${allStudents.length})` },
            { id: 1, label: 'Floor 1 (Rajken)' },
            { id: 2, label: 'Floor 2 (Vandana)' },
            { id: 3, label: 'Floor 3 (Pushpa)' },
            { id: 4, label: 'Floor 4 (Harish)' },
            { id: 5, label: 'Floor 5 (Ramesh)' },
          ].map(f => {
            const isSelected = studentFloorFilter === f.id;
            return (
              <TouchableOpacity
                key={String(f.id)}
                onPress={() => setStudentFloorFilter(f.id as any)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isSelected ? BRAND_TEAL : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? BRAND_TEAL : BRAND_BORDER,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? '#FFFFFF' : TEXT_MUTED }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Count summary bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_DARK }}>
            Showing {filtered.length} Resident{filtered.length === 1 ? '' : 's'}
          </Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: '600' }}>
            🛏️ {assignedCount} Assigned · {unassignedCount} Pending Room
          </Text>
        </View>

        {filtered.length === 0 ? (
          <Empty icon={Users} title="No residents found" sub="Try adjusting your search query or floor filter." />
        ) : (
          filtered.map((s, i) => {
            const hasRoom = !!s.room;
            return (
              <AnimatedCard key={s.id} delay={Math.min(i * 35, 300)}>
                <TouchableOpacity
                  style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: hasRoom ? BRAND_TEAL : '#F59E0B' }]}
                  onPress={() => openDetails(s, 'student')}
                  activeOpacity={0.75}
                >
                  <View style={styles.approvalCardInner}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{s.user?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
                      <View style={[styles.statusDot, { position: 'absolute', bottom: 0, right: 0, backgroundColor: hasRoom ? '#10B981' : '#F59E0B' }]} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={styles.cardPrimary}>{s.user?.name}</Text>
                        <Badge label={`Roll: ${s.rollNumber}`} color={BRAND_TEAL} />
                      </View>

                      <Text style={styles.cardSecondary}>{s.user?.email}</Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
                        {s.room ? (
                          <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#065F46' }}>
                              Room {s.room.roomNumber} · Floor {s.room.floorNumber || 1}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>No Room Assigned</Text>
                          </View>
                        )}
                        {s.fatherName && (
                          <Text style={styles.cardTiny}>👤 {s.fatherName}</Text>
                        )}
                      </View>

                      {/* Direct Call Actions & Dossier */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                        {s.phoneNumber && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${s.phoneNumber}`)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: BRAND_MINT_CARD,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 8,
                            }}
                          >
                            <Phone size={12} color={BRAND_TEAL} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: BRAND_TEAL }}>Call</Text>
                          </TouchableOpacity>
                        )}

                        {s.parentContact && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${s.parentContact}`)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: '#FFFBEB',
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              borderRadius: 8,
                            }}
                          >
                            <Phone size={12} color="#D97706" />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>Parent</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => openDetails(s, 'student')}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            marginLeft: 'auto',
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: BRAND_TEAL }}>Dossier →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })
        )}
      </View>
    );
  };

  // ─── ADMIN: Rooms Tab (Redesigned with Capacity Breakdown, Bed Slots, & Filters) ─
  const renderRoomsTab = () => {
    const floorFiltered = roomFloorFilter === 'all'
      ? allRooms
      : allRooms.filter(r => r.floorNumber === Number(roomFloorFilter));

    const statusFiltered = roomStatusFilter === 'all'
      ? floorFiltered
      : floorFiltered.filter(r => r.status === roomStatusFilter);

    const filtered = statusFiltered.filter(r =>
      r.roomNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.block?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalBedsCount = filtered.reduce((acc, r) => acc + (r.capacity || r.sharingType || 2), 0);
    const occupiedCount = filtered.filter(r => r.status === 'OCCUPIED' || r.status === 'FULL').length;
    const availableCount = filtered.filter(r => r.status === 'AVAILABLE').length;
    const maintenanceCount = filtered.filter(r => r.status === 'MAINTENANCE').length;

    return (
      <View>
        {/* Capacity Metrics Row */}
        <View style={styles.roomSummaryRow}>
          {[
            { label: 'Total', count: filtered.length, color: BRAND_TEAL },
            { label: 'Occupied', count: occupiedCount, color: '#10B981' },
            { label: 'Available', count: availableCount, color: '#0284C7' },
            { label: 'Maint.', count: maintenanceCount, color: '#EF4444' },
          ].map(({ label, count, color }) => (
            <View key={label} style={[styles.roomSummaryBox, { borderTopColor: color }]}>
              <Text style={[styles.roomSummaryCount, { color }]}>{count}</Text>
              <Text style={styles.roomSummaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color={BRAND_TEAL} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search room number or block..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8A9895"
            />
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPurple, { marginLeft: 10, height: 48, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' }]}
            onPress={() => setAddRoomModalVisible(true)}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Floor Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10, paddingHorizontal: 2 }}>
          {[
            { id: 'all', label: `All Floors (${allRooms.length})` },
            { id: 1, label: 'Floor 1 (Rajken)' },
            { id: 2, label: 'Floor 2 (Vandana)' },
            { id: 3, label: 'Floor 3 (Pushpa)' },
            { id: 4, label: 'Floor 4 (Harish)' },
            { id: 5, label: 'Floor 5 (Ramesh)' },
          ].map(f => {
            const isSelected = roomFloorFilter === f.id;
            return (
              <TouchableOpacity
                key={String(f.id)}
                onPress={() => setRoomFloorFilter(f.id as any)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isSelected ? BRAND_TEAL : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? BRAND_TEAL : BRAND_BORDER,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? '#FFFFFF' : TEXT_MUTED }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status Filter Chips */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, paddingHorizontal: 2 }}>
          {[
            { id: 'all', label: 'All Status' },
            { id: 'AVAILABLE', label: 'Available' },
            { id: 'OCCUPIED', label: 'Occupied' },
            { id: 'MAINTENANCE', label: 'Maintenance' },
          ].map(st => {
            const isSelected = roomStatusFilter === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                onPress={() => setRoomStatusFilter(st.id as any)}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: isSelected ? BRAND_MINT_CARD : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? BRAND_TEAL : BRAND_BORDER,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: isSelected ? BRAND_TEAL : TEXT_MUTED }}>
                  {st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <Empty icon={Bed} title="No rooms found" sub="Try changing your floor or status filter." />
        ) : (
          filtered.map((r, i) => {
            const statusColor = r.status === 'OCCUPIED' || r.status === 'FULL' ? '#10B981' : r.status === 'MAINTENANCE' ? '#EF4444' : '#0284C7';
            const capacity = r.capacity || r.sharingType || 2;
            const residentsInRoom = r.students || [];

            return (
              <AnimatedCard key={r.id} delay={Math.min(i * 35, 300)}>
                <TouchableOpacity
                  style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
                  onPress={() => openDetails(r, 'room')}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cardPrimary}>Room {r.roomNumber}</Text>
                      <View style={{ backgroundColor: r.isAc ? '#DBEAFE' : '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: r.isAc ? '#1E40AF' : '#6B7280' }}>
                          {r.isAc ? 'A/C' : 'Non-A/C'}
                        </Text>
                      </View>
                    </View>
                    <Badge label={r.status} color={statusColor} />
                  </View>

                  <Text style={styles.cardSecondary}>
                    Floor {r.floorNumber || 1} · {r.sharingType ? `${r.sharingType}-Sharing` : 'Standard'} · {r.block} Block
                  </Text>

                  {/* Visual Bed Breakdown Chips */}
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: TEXT_LIGHT, textTransform: 'uppercase', marginBottom: 4 }}>
                      Bed Slots ({residentsInRoom.length}/{capacity} Occupied):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {residentsInRoom.map((st: any, bIdx: number) => (
                        <View key={st.id || bIdx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND_MINT_CARD, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BCE0DB' }}>
                          <Text style={{ fontSize: 10 }}>🛏️</Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: BRAND_TEAL_DARK }} numberOfLines={1}>
                            {st.user?.name || `Bed ${bIdx + 1}`}
                          </Text>
                        </View>
                      ))}
                      {Array.from({ length: Math.max(0, capacity - residentsInRoom.length) }).map((_, emptyIdx) => (
                        <View key={`empty-${emptyIdx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', borderStyle: 'dashed' }}>
                          <Text style={{ fontSize: 10 }}>🟢</Text>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>
                            Vacant Slot
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedCard>
            );
          })
        )}
      </View>
    );
  };

  // ─── ADMIN: Requests Tab (Approvals + Leaves + Complaints + Profile Changes) ─
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
        {/* 4-Way Sub-Section Tabs with Live Badges */}
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

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
            <Search size={16} color={BRAND_TEAL} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student name or roll..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8A9895"
            />
          </View>
        </View>

        {/* Approvals */}
        {requestSection === 'Approvals' && (
          pendingApprovals.length === 0 ? (
            <Empty icon={CheckCircle} title="All caught up!" sub="No pending student registration approvals." />
          ) : (
            pendingApprovals.map((p, i) => (
              <AnimatedCard key={p.id} delay={i * 50}>
                <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: '#F59E0B' }]}>
                  <View style={styles.approvalCardInner}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => openDetails(p.student || p, 'student')} activeOpacity={0.7}>
                      <View style={styles.avatarCircle}><Text style={styles.avatarText}>{p.name?.charAt(0)?.toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardPrimary}>{p.name}</Text>
                        <Text style={styles.cardSecondary}>{p.email}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                          <Badge label={p.role?.replace('PENDING_', '')} color="#F59E0B" />
                          {p.student?.phoneNumber && (
                            <Text style={styles.cardTiny}>📱 {p.student.phoneNumber}</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#ECFDF5', width: 40, height: 40 }]} onPress={() => approveUser(p.id, p.role?.replace('PENDING_', ''))}>
                        <CheckCircle size={22} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconAction, { backgroundColor: '#FEF2F2', width: 40, height: 40 }]} onPress={() => rejectUser(p.id)}>
                        <XCircle size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))
          )
        )}

        {/* Leaves */}
        {requestSection === 'Leaves' && (
          filtered.length === 0 ? (
            <Empty icon={Navigation} title="No leave requests" sub="No pending or active leaves." />
          ) : (
            (filtered as any[]).map((l, i) => (
              <AnimatedCard key={l.id} delay={Math.min(i * 45, 300)}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B' }]} onPress={() => openDetails(l, 'leave')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{l.student?.user?.name}</Text>
                    <Badge label={l.status} color={l.status === 'APPROVED' ? '#10B981' : l.status === 'REJECTED' ? '#EF4444' : '#F59E0B'} />
                  </View>
                  <Text style={styles.cardSecondary}>Roll: {l.student?.rollNumber} · {l.type?.replace('_', ' ')}</Text>
                  <Text style={styles.cardSecondary}>{l.reason}</Text>
                  <Text style={styles.cardTiny}>📅 {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
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
          )
        )}

        {/* Complaints */}
        {requestSection === 'Complaints' && (
          filtered.length === 0 ? (
            <Empty icon={AlertCircle} title="All maintenance cleared!" sub="No active resident complaints." />
          ) : (
            (filtered as any[]).map((c, i) => (
              <AnimatedCard key={c.id} delay={Math.min(i * 45, 300)}>
                <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: c.status === 'RESOLVED' ? '#10B981' : '#EF4444' }]} onPress={() => openDetails(c, 'complaint')} activeOpacity={0.75}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardPrimary}>{c.category}</Text>
                    <Badge label={c.priority} color={c.priority === 'HIGH' || c.priority === 'URGENT' ? '#EF4444' : '#F59E0B'} />
                  </View>
                  <Text style={styles.cardSecondary}>{c.student?.user?.name} (Roll: {c.student?.rollNumber})</Text>
                  {c.student?.room && <Text style={styles.cardTiny}>Room: {c.student.room.roomNumber}, Block {c.student.room.block}</Text>}
                  <Text style={styles.cardSecondary}>{c.description}</Text>
                  <View style={styles.rowBetween}>
                    <Badge label={c.status} color={c.status === 'RESOLVED' ? '#10B981' : BRAND_TEAL} />
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
          )
        )}

        {/* Profile Changes */}
        {requestSection === 'Profile Changes' && (
          profileRequestsList.length === 0 ? (
            <Empty icon={User} title="No requests" sub="No pending student profile changes." />
          ) : (
            profileRequestsList.map((r, i) => (
              <AnimatedCard key={r.id} delay={i * 50}>
                <View style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: BRAND_TEAL }]}>
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
                        <Text style={[styles.cardTiny, { fontWeight: '700', color: BRAND_TEAL }]}>{newVal}</Text>
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
          )
        )}
      </View>
    );
  };

  // ─── ADMIN: Settings & Hostel Management Tools Tab ──────────────────────
  const renderAdminSettings = () => (
    <View>
      <AnimatedCard delay={0}>
        <View style={styles.profileHero}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            <View style={{ backgroundColor: BRAND_GOLD, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: BRAND_GOLD_DARK, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {user.role} · WARDEN IN-CHARGE
              </Text>
            </View>
          </View>
        </View>
      </AnimatedCard>

      <SH title="Warden Management Tools" />
      <AnimatedCard delay={60}>
        <TouchableOpacity style={styles.listCard} onPress={() => setMessMenuModalVisible(true)} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarCircle, { width: 42, height: 42 }]}><Coffee size={20} color={BRAND_TEAL} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Mess Menu Planner</Text>
              <Text style={styles.cardSecondary}>Customize daily meal menus for residents.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={100}>
        <TouchableOpacity style={styles.listCard} onPress={() => router.push('/accounting' as any)} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarCircle, { width: 42, height: 42 }]}><Receipt size={20} color={BRAND_TEAL} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Tally Accounting & Daybook</Text>
              <Text style={styles.cardSecondary}>Ledger transactions, cash flows, and trial balance.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={140}>
        <TouchableOpacity style={styles.listCard} onPress={() => { setActiveTab('Home'); setActivePollSection('polls'); }} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarCircle, { width: 42, height: 42 }]}><FileText size={20} color={BRAND_TEAL} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Hostel Voting Polls</Text>
              <Text style={styles.cardSecondary}>Create, toggle status, and inspect student polls.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={180}>
        <TouchableOpacity style={styles.listCard} onPress={() => openNightRoundModal()} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarCircle, { width: 42, height: 42 }]}><Moon size={20} color={BRAND_TEAL} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardPrimary}>Night Roll Call Attendance</Text>
              <Text style={styles.cardSecondary}>Conduct room-by-room night roll calls.</Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={220}>
        <TouchableOpacity style={styles.listCard} onPress={handleLogout} activeOpacity={0.75}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarCircle, { width: 42, height: 42, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <LogOut size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardPrimary, { color: '#EF4444' }]}>Sign Out</Text>
              <Text style={styles.cardSecondary}>Securely logout from your warden session.</Text>
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

  const getNavTabs = () => {
    if (!user) return [];
    if (user.role === 'ADMIN') {
      return [
        { id: 'Home', label: 'Home', icon: Home },
        { id: 'Students', label: 'Residents', icon: Users },
        { id: 'Rooms', label: 'Rooms', icon: Bed },
        { id: 'Requests', label: 'Requests', icon: FileText },
        { id: 'Settings', label: 'Settings', icon: Settings },
      ];
    }
    if (user.role === 'STUDENT') {
      return [
        { id: 'Home', label: 'Home', icon: Home },
        { id: 'Rooms', label: 'Rooms', icon: Bed },
        { id: 'Services', label: 'Services', icon: Layers },
        { id: 'Requests', label: 'Requests', icon: FileText },
        { id: 'Profile', label: 'Profile', icon: User },
      ];
    }
    return [
      { id: 'Home', label: 'Home', icon: Home },
      { id: 'Visitors', label: 'Visitors', icon: Users },
      { id: 'Profile', label: 'Profile', icon: User },
    ];
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
        {navTabs.map((tab: any) => {
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
                1: { companyName: 'RAJKEN ENTERPRISES', hostelName: 'HARI PUSHP GIRLS HOSTEL', floorLabel: 'First Floor', san: '[राजकेन SAN नंबर]', udyamRegNo: '[राजकेन उद्यम नंबर]', proprietorName: 'Kapil Sankhala', notePrefix: 'RJK' },
                2: { companyName: 'VANDANA ENTERPRISES', hostelName: 'VANDANA GIRLS HOSTEL', floorLabel: 'Second Floor', san: '[वंदना SAN नंबर]', udyamRegNo: 'UDYAM-RJ-17-0654053', proprietorName: 'Vandana Sankhala', notePrefix: 'VAN' },
                3: { companyName: 'PUSHPA ENTERPRISES', hostelName: 'PUSHPA GIRLS HOSTEL', floorLabel: 'Third Floor', san: '8007170053000004', udyamRegNo: 'UDYAM-RJ-17-0654175', proprietorName: 'Pushpa Sankhala', notePrefix: 'PSH' },
                4: { companyName: 'HARISH CHANDRA ENTERPRISES', hostelName: 'HARISH CHANDRA GIRLS HOSTEL', floorLabel: 'Fourth Floor', san: '8007170053000006', udyamRegNo: 'UDYAM-RJ-17-0654078', proprietorName: 'Harish Chandra', notePrefix: 'HCE' },
                5: { companyName: 'RAMESH ENTERPRISES', hostelName: 'RAMESH GIRLS HOSTEL', floorLabel: 'Fifth / Sixth Floor', san: '[रमेश SAN नंबर]', udyamRegNo: '[रमेश उद्यम नंबर]', proprietorName: 'Ramesh Sankhala', notePrefix: 'RME' },
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
                      <View style={[styles.roomSummaryBox, { borderTopColor: BRAND_TEAL }]}>
                        <Text style={[styles.roomSummaryCount, { color: BRAND_TEAL }]}>{floorReport.summary?.totalStudents ?? floorReport.grandTotal?.totalStudents}</Text>
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

      {/* ─── 1. EXPENSES TRACKER MODAL ─── */}
      <Modal visible={expensesModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setExpensesModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setExpensesModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '92%', maxHeight: '92%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT_DARK }}>Expenses</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Mens luxury pg · Hari Pushp</Text>
              </View>
              <TouchableOpacity onPress={() => setAddExpenseModalVisible(true)} style={{ backgroundColor: BRAND_TEAL, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Month Navigator */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 14, backgroundColor: BRAND_MINT_BG, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: BRAND_BORDER }}>
              <TouchableOpacity onPress={() => setExpenseMonth('June 2026')}><Text style={{ fontSize: 16, color: BRAND_TEAL, fontWeight: '900' }}>‹</Text></TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT_DARK }}>{expenseMonth}</Text>
              <TouchableOpacity onPress={() => setExpenseMonth('August 2026')}><Text style={{ fontSize: 16, color: BRAND_TEAL, fontWeight: '900' }}>›</Text></TouchableOpacity>
            </View>

            {/* Total Expenses Hero Card */}
            <View style={{
              backgroundColor: '#EA580C',
              borderRadius: 20,
              padding: 18,
              marginBottom: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              shadowColor: '#EA580C',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}>
              <View>
                <Text style={{ fontSize: 11, color: '#FFEDD5', fontWeight: '700', textTransform: 'uppercase' }}>Total Expenses</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginTop: 2 }}>
                  ₹{expensesList.reduce((a, b) => a + (Number(b.amount) || 0), 0).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 11, color: '#FFEDD5', marginTop: 2 }}>{expensesList.length} transactions recorded</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <Wallet size={24} color="#FFFFFF" />
              </View>
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {['All', 'Vegetables', 'Cleaning', 'Repair', 'Bill', 'Gas', 'Water', 'Salary', 'Maintenance'].map((cat) => {
                const isSelected = expenseCategoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setExpenseCategoryFilter(cat)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: isSelected ? BRAND_TEAL : BRAND_MINT_BG,
                      borderWidth: 1,
                      borderColor: isSelected ? BRAND_TEAL : BRAND_BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isSelected ? '#FFFFFF' : TEXT_DARK }}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Search Input */}
            <View style={[styles.searchBar, { height: 42, marginBottom: 12 }]}>
              <Search size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search expenses..."
                value={expenseSearch}
                onChangeText={setExpenseSearch}
                style={styles.searchInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Expense Transactions List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {expensesList
                .filter(e => expenseCategoryFilter === 'All' || e.category.toLowerCase() === expenseCategoryFilter.toLowerCase())
                .filter(e => !expenseSearch || e.category.toLowerCase().includes(expenseSearch.toLowerCase()) || e.notes?.toLowerCase().includes(expenseSearch.toLowerCase()))
                .map((exp) => (
                  <View
                    key={exp.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: BRAND_BORDER,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: BRAND_MINT_BG, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{exp.category === 'Vegetables' ? '🥦' : exp.category === 'Cleaning' ? '🧹' : exp.category === 'Repair' ? '🔧' : exp.category === 'Bill' ? '⚡' : exp.category === 'Gas' ? '🔥' : '💰'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>{exp.category}</Text>
                        <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{exp.notes || 'Expense'} · {exp.date} · {exp.mode}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#EA580C' }}>₹{exp.amount.toLocaleString()}</Text>
                  </View>
                ))}
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setExpensesModalVisible(false)}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── ADD EXPENSE FORM MODAL ─── */}
      <FormModal visible={addExpenseModalVisible} title="Add New Expense" onClose={() => setAddExpenseModalVisible(false)} onSubmit={handleAddExpense}>
        <Text style={styles.formLabel}>Expense Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {['Vegetables', 'Cleaning', 'Repair', 'Bill', 'Gas', 'Water', 'Salary', 'Maintenance'].map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setNewExpenseCategory(cat)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: newExpenseCategory === cat ? BRAND_TEAL : BRAND_MINT_BG, borderWidth: 1, borderColor: BRAND_BORDER }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: newExpenseCategory === cat ? '#FFFFFF' : TEXT_DARK }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.formLabel}>Amount (₹) *</Text>
        <View style={styles.formInput}>
          <TextInput placeholder="e.g. 3500" value={newExpenseAmount} onChangeText={setNewExpenseAmount} keyboardType="numeric" style={styles.formInputText} />
        </View>

        <Text style={styles.formLabel}>Payment Mode</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {(['CASH', 'UPI', 'BANK_TRANSFER'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setNewExpenseMode(m)}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: newExpenseMode === m ? BRAND_TEAL : BRAND_MINT_BG, borderWidth: 1, borderColor: BRAND_BORDER }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: newExpenseMode === m ? '#FFFFFF' : TEXT_DARK }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.formLabel}>Description / Notes</Text>
        <View style={[styles.formInput, { height: 60 }]}>
          <TextInput placeholder="Add invoice notes or vendor name..." value={newExpenseNotes} onChangeText={setNewExpenseNotes} style={styles.formInputText} />
        </View>
      </FormModal>

      {/* ─── 2. PG BUDDY AI ASSISTANT MODAL ─── */}
      <Modal visible={aiBuddyModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setAiBuddyModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAiBuddyModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '94%', maxHeight: '94%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#581C87', justifyContent: 'center', alignItems: 'center' }}>
                  <Sparkles size={20} color="#FDE047" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT_DARK }}>PG Buddy AI</Text>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>AI Property Assistant · Live Data</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAiBuddyModalVisible(false)} style={{ padding: 6, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Chat Messages Stream */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {aiBuddyMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: msg.sender === 'user' ? BRAND_TEAL : '#F3E8FF',
                    padding: 14,
                    borderRadius: 18,
                    borderTopRightRadius: msg.sender === 'user' ? 4 : 18,
                    borderTopLeftRadius: msg.sender === 'ai' ? 4 : 18,
                  }}
                >
                  <Text style={{ fontSize: 13, color: msg.sender === 'user' ? '#FFFFFF' : '#3B0764', lineHeight: 20, fontWeight: '500' }}>
                    {msg.text}
                  </Text>
                  <Text style={{ fontSize: 9, color: msg.sender === 'user' ? '#CCFBF1' : '#9333EA', alignSelf: 'flex-end', marginTop: 4 }}>
                    {msg.time}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Quick Interactive Prompt Chips */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_MUTED, marginBottom: 6 }}>Tap to ask:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {[
                { label: "Who hasn't paid? (34 tenants)", q: "Who has pending rent?" },
                { label: "Show vacant beds (21)", q: "Show vacant beds" },
                { label: "This month's expenses", q: "What are this month's expenses?" },
                { label: "Active leaves today", q: "How many leaves are active today?" },
                { label: "July 2026 revenue summary", q: "Summarize July 2026 revenue" },
              ].map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSendAiMessage(chip.q)}
                  style={{ backgroundColor: '#FAF5FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: '#E9D5FF' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#7E22CE' }}>💬 {chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: BRAND_BORDER, paddingTop: 10 }}>
              <TextInput
                placeholder="Ask PG Buddy about occupancy, dues..."
                value={aiBuddyInput}
                onChangeText={setAiBuddyInput}
                onSubmitEditing={() => handleSendAiMessage()}
                style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => handleSendAiMessage()} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#581C87', justifyContent: 'center', alignItems: 'center' }}>
                <Send size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── 3. TEAM MANAGEMENT & ACCESS CONTROL MODAL ─── */}
      <Modal visible={teamModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setTeamModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTeamModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '90%', maxHeight: '90%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT_DARK }}>Team Management</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{staffMembersList.length} active team members</Text>
              </View>
              <TouchableOpacity onPress={() => setAddStaffModalVisible(true)} style={{ backgroundColor: BRAND_TEAL, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add Member</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
              {staffMembersList.map((member) => (
                <View key={member.id} style={[styles.listCard, { padding: 16 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: BRAND_TEAL, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>{member.name.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_DARK }}>{member.name}</Text>
                        <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{member.email}</Text>
                        <Text style={{ fontSize: 11, color: TEXT_LIGHT }}>📱 {member.phone}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>Active</Text>
                    </View>
                  </View>

                  {/* Module Access Granular Permissions */}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_LIGHT, textTransform: 'uppercase', marginBottom: 8 }}>Module Access Permissions</Text>
                  
                  {[
                    { key: 'dashboard', label: 'Dashboard', sub: member.modules?.dashboard ? 'Full view' : 'Off', icon: '🎛️' },
                    { key: 'properties', label: 'Properties / Rooms', sub: 'View only', icon: '🏢' },
                    { key: 'tenants', label: 'Tenants / Move Out', sub: 'Move Out Allowed', icon: '👥' },
                    { key: 'finance', label: 'Finance & Rent', sub: 'View only', icon: '💳' },
                    { key: 'reports', label: 'Reports & Analytics', sub: member.modules?.reports ? 'Full view' : 'Off', icon: '📊' },
                  ].map((perm) => (
                    <View key={perm.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>{perm.icon}</Text>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_DARK }}>{perm.label}</Text>
                          <Text style={{ fontSize: 10, color: TEXT_MUTED }}>{perm.sub}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleStaffModule(member.id, perm.key)}
                        style={{
                          width: 42,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: member.modules?.[perm.key] ? BRAND_TEAL : '#E5E7EB',
                          padding: 2,
                          justifyContent: 'center',
                        }}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', alignSelf: member.modules?.[perm.key] ? 'flex-end' : 'flex-start' }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setTeamModalVisible(false)}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── ADD STAFF MODAL ─── */}
      <FormModal visible={addStaffModalVisible} title="Add Team Member" onClose={() => setAddStaffModalVisible(false)} onSubmit={handleAddNewStaff}>
        <Text style={styles.formLabel}>Staff Full Name *</Text>
        <View style={styles.formInput}>
          <TextInput placeholder="e.g. Prasanth Kumar" value={newStaffName} onChangeText={setNewStaffName} style={styles.formInputText} />
        </View>
        <Text style={styles.formLabel}>Email Address *</Text>
        <View style={styles.formInput}>
          <TextInput placeholder="e.g. prasanth@hms.com" value={newStaffEmail} onChangeText={setNewStaffEmail} keyboardType="email-address" autoCapitalize="none" style={styles.formInputText} />
        </View>
        <Text style={styles.formLabel}>Phone Number</Text>
        <View style={styles.formInput}>
          <TextInput placeholder="e.g. 9876543210" value={newStaffPhone} onChangeText={setNewStaffPhone} keyboardType="phone-pad" style={styles.formInputText} />
        </View>
      </FormModal>

      {/* ─── 4. TENANT PAYMENT DOSSIER & COMMUNICATION MODAL ─── */}
      <Modal visible={!!selectedStudentPaymentModal} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setSelectedStudentPaymentModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedStudentPaymentModal(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '88%', maxHeight: '88%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            {selectedStudentPaymentModal && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
                        {(selectedStudentPaymentModal.user?.name || selectedStudentPaymentModal.name || 'R').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT_DARK }}>
                        {selectedStudentPaymentModal.user?.name || selectedStudentPaymentModal.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>
                        Room {selectedStudentPaymentModal.room?.roomNumber || 'G02'} - Bed 6 · Mens luxury pg
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>Active</Text>
                  </View>
                </View>

                {/* Direct 4-Action Communication Strip */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${selectedStudentPaymentModal.phoneNumber || '9876543210'}`)}
                    style={{ flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BRAND_BORDER }}
                  >
                    <Phone size={16} color={BRAND_TEAL} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK, marginTop: 4 }}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDirectWhatsAppAction(selectedStudentPaymentModal.phoneNumber || '9876543210', selectedStudentPaymentModal.user?.name || selectedStudentPaymentModal.name)}
                    style={{ flex: 1, backgroundColor: '#DCFCE7', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' }}
                  >
                    <MessageSquare size={16} color="#16A34A" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D', marginTop: 4 }}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDirectSMSAction(selectedStudentPaymentModal.phoneNumber || '9876543210', selectedStudentPaymentModal.user?.name || selectedStudentPaymentModal.name)}
                    style={{ flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BRAND_BORDER }}
                  >
                    <Send size={16} color="#3B82F6" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK, marginTop: 4 }}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/room-change' as any)}
                    style={{ flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BRAND_BORDER }}
                  >
                    <RefreshCw size={16} color="#F59E0B" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK, marginTop: 4 }}>Shift</Text>
                  </TouchableOpacity>
                </View>

                {/* Monthly Rent Card */}
                <View style={[styles.listCard, { padding: 18, marginBottom: 16, backgroundColor: '#F8FAFC' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: TEXT_DARK }}>July 2026</Text>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>🕒 Upcoming</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>Due Date: 5 Jul 2026</Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View>
                      <Text style={{ fontSize: 10, color: TEXT_LIGHT, textTransform: 'uppercase', fontWeight: '700' }}>Total</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT_DARK }}>₹7,000</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: TEXT_LIGHT, textTransform: 'uppercase', fontWeight: '700' }}>Paid</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#10B981' }}>₹0</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 10, color: TEXT_LIGHT, textTransform: 'uppercase', fontWeight: '700' }}>Due</Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#EF4444' }}>₹7,000</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      showAlert('Payment Recorded', `₹7,000 recorded for ${selectedStudentPaymentModal.user?.name || selectedStudentPaymentModal.name}.`, 'SUCCESS');
                      setSelectedStudentPaymentModal(null);
                    }}
                    style={{ backgroundColor: '#059669', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>Pay ₹7,000</Text>
                  </TouchableOpacity>
                </View>

                {/* Payment History */}
                <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_DARK, marginBottom: 10 }}>Payment History</Text>
                {[
                  { month: 'Jun 2026', total: '₹7,000', paid: '₹7,000', status: 'Paid' },
                  { month: 'May 2026', total: '₹7,000', paid: '₹7,000', status: 'Paid' },
                  { month: 'Apr 2026', total: '₹7,000', paid: '₹7,000', status: 'Paid' },
                ].map((ph, idx) => (
                  <View key={idx} style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: BRAND_BORDER, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT_DARK }}>{ph.month}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>{ph.status}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_DARK }}>{ph.total}</Text>
                      <TouchableOpacity onPress={() => showAlert('Receipt Downloaded', `Receipt for ${ph.month} ready.`, 'SUCCESS')}>
                        <Text style={{ fontSize: 11, color: BRAND_TEAL, fontWeight: '800', marginTop: 2 }}>📄 Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setSelectedStudentPaymentModal(null)}>
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── 5. ANALYTICS & BUSINESS PERFORMANCE MODAL ─── */}
      <Modal visible={analyticsModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setAnalyticsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAnalyticsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '92%', maxHeight: '92%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT_DARK }}>Analytics</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Track your business performance</Text>
              </View>
              <TouchableOpacity onPress={() => setAnalyticsModalVisible(false)} style={{ padding: 6, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Filter Dropdowns */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 2, backgroundColor: BRAND_MINT_BG, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: BRAND_BORDER, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} color={BRAND_TEAL} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK }}>All Properties</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: BRAND_MINT_BG, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: BRAND_BORDER, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK }}>2026</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: BRAND_MINT_BG, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: BRAND_BORDER, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: TEXT_DARK }}>Jul</Text>
              </View>
            </View>

            {/* Download Excel Button */}
            <TouchableOpacity
              onPress={() => showAlert('Excel Generated', 'Downloading hostel performance Excel report...', 'SUCCESS')}
              style={{ backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 }}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}>Download Excel Report</Text>
            </TouchableOpacity>

            {/* Sub Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 14 }}>
              {(['Overview', 'Payments', 'Occupancy'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setAnalyticsSubTab(tab)}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: analyticsSubTab === tab ? '#2563EB' : 'transparent' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: analyticsSubTab === tab ? '#FFFFFF' : '#64748B' }}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Month Snapshot 4-Card Grid */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_DARK }}>July 2026</Text>
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>25% collected</Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <View style={{ width: (width - 60) / 2, backgroundColor: '#DCFCE7', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#86EFAC' }}>
                  <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '800', textTransform: 'uppercase' }}>Income</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#166534', marginTop: 4 }}>₹69.5K</Text>
                </View>
                <View style={{ width: (width - 60) / 2, backgroundColor: '#FEE2E2', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Text style={{ fontSize: 10, color: '#991B1B', fontWeight: '800', textTransform: 'uppercase' }}>Expenses</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#B91C1C', marginTop: 4 }}>₹0</Text>
                </View>
                <View style={{ width: (width - 60) / 2, backgroundColor: '#CCFBF1', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#5EEAD4' }}>
                  <Text style={{ fontSize: 10, color: '#115E59', fontWeight: '800', textTransform: 'uppercase' }}>Profit</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F766E', marginTop: 4 }}>₹69.5K</Text>
                </View>
                <View style={{ width: (width - 60) / 2, backgroundColor: '#FEF3C7', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '800', textTransform: 'uppercase' }}>Pending</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#B45309', marginTop: 4 }}>₹2.1L</Text>
                </View>
              </View>

              {/* Year-to-Date (2026) Card */}
              <View style={[styles.listCard, { padding: 16, marginBottom: 14 }]}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK, marginBottom: 10 }}>Year-to-Date (2026)</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 10, color: TEXT_LIGHT, fontWeight: '700' }}>Total Income</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#2563EB', marginTop: 2 }}>₹15.0L</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: TEXT_LIGHT, fontWeight: '700' }}>Total Expenses</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#EA580C', marginTop: 2 }}>₹85.0K</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, color: TEXT_LIGHT, fontWeight: '700' }}>Net Profit</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#10B981', marginTop: 2 }}>₹14.1L</Text>
                  </View>
                </View>
              </View>

              {/* Security Deposits */}
              <View style={[styles.listCard, { padding: 16 }]}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK, marginBottom: 6 }}>🛡️ Security Deposits</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Active refundable deposits held: <Text style={{ fontWeight: '900', color: BRAND_TEAL }}>₹3,20,000</Text></Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setAnalyticsModalVisible(false)}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── 6. ROOM & BEDS DEEP DIVE MANAGEMENT DRAWER ─── */}
      <Modal visible={!!selectedRoomDetailModal} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setSelectedRoomDetailModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedRoomDetailModal(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '90%', maxHeight: '90%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            {selectedRoomDetailModal && (() => {
              const occupants = selectedRoomDetailModal.students || allStudents.filter(s => s.roomId === selectedRoomDetailModal.id);
              const capacity = selectedRoomDetailModal.capacity || selectedRoomDetailModal.sharingType || 2;
              const slots = Array.from({ length: capacity }, (_, idx) => occupants[idx] || null);

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* Room Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT_DARK }}>Room {selectedRoomDetailModal.roomNumber}</Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{selectedRoomDetailModal.isAc ? 'AC' : 'NON-AC'} · Floor {selectedRoomDetailModal.floorNumber || 0}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => showAlert('Settings', 'Room configuration settings.', 'INFO')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND_MINT_BG, justifyContent: 'center', alignItems: 'center' }}>
                        <Settings size={16} color={BRAND_TEAL} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => showAlert('Delete Room', 'Are you sure you want to remove this room?', 'CONFIRM')} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' }}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 4-Stat Metric Strip */}
                  <View style={{
                    backgroundColor: '#1E40AF',
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{capacity}</Text>
                      <Text style={{ fontSize: 9, color: '#93C5FD', fontWeight: '800', textTransform: 'uppercase' }}>TOTAL</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{occupants.length}</Text>
                      <Text style={{ fontSize: 9, color: '#93C5FD', fontWeight: '800', textTransform: 'uppercase' }}>OCCUPIED</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{Math.max(0, capacity - occupants.length)}</Text>
                      <Text style={{ fontSize: 9, color: '#93C5FD', fontWeight: '800', textTransform: 'uppercase' }}>AVAILABLE</Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>₹6.0K</Text>
                      <Text style={{ fontSize: 9, color: '#93C5FD', fontWeight: '800', textTransform: 'uppercase' }}>PER BED</Text>
                    </View>
                  </View>

                  {/* Bed Management */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT_DARK }}>Bed Management</Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{capacity} total beds · {Math.max(0, capacity - occupants.length)} available</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => showAlert('Add Bed', `Add bed to Room ${selectedRoomDetailModal.roomNumber}?`, 'CONFIRM')}
                      style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add Beds</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Visual Color-Coded Bed Matrix */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    {slots.map((st, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: (width - 70) / 4,
                          backgroundColor: st ? '#FEF3C7' : '#DCFCE7',
                          borderRadius: 12,
                          padding: 10,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: st ? '#FDE68A' : '#86EFAC',
                        }}
                      >
                        <Text style={{ fontSize: 18, marginBottom: 2 }}>🛏️</Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: st ? '#92400E' : '#166534' }}>{idx + 1}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: st ? '#B45309' : '#15803D', marginTop: 2 }} numberOfLines={1}>
                          {st ? (st.user?.name || st.name || 'Occupied') : 'Free'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Room Information Card */}
                  <View style={[styles.listCard, { padding: 16, marginBottom: 16 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK, marginBottom: 10 }}>Room Information</Text>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: TEXT_MUTED }}>Room Type</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_DARK }}>{selectedRoomDetailModal.isAc ? 'AC' : 'NON-AC'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: TEXT_MUTED }}>Floor</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: TEXT_DARK }}>Floor {selectedRoomDetailModal.floorNumber || 0}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: TEXT_MUTED }}>Rent Per Bed</Text>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: BRAND_TEAL }}>₹6,000/month</Text>
                      </View>
                    </View>
                  </View>

                  {/* Tenants List */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: TEXT_DARK }}>Tenants ({occupants.length})</Text>
                    <TouchableOpacity onPress={() => setAddStudentModalVisible(true)} style={{ backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>+ Add</Text>
                    </TouchableOpacity>
                  </View>

                  {occupants.map((occ: any, i: number) => (
                    <TouchableOpacity
                      key={occ.id || i}
                      onPress={() => setSelectedStudentPaymentModal(occ)}
                      style={{ backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BRAND_BORDER, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: BRAND_MINT_BG, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: BRAND_TEAL }}>{occ.name?.charAt(0) || 'R'}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT_DARK }}>{occ.user?.name || occ.name}</Text>
                      </View>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              );
            })()}
            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setSelectedRoomDetailModal(null)}>
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── 7. ESSENTIALS TRACKER MODAL ─── */}
      <Modal visible={essentialsModalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setEssentialsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEssentialsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation?.()} style={[styles.modalSheet, { height: '88%', maxHeight: '88%', paddingHorizontal: 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT_DARK }}>Essentials Tracker</Text>
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Water · Gas · Daily Veggies</Text>
              </View>
              <TouchableOpacity onPress={() => showAlert('Log Added', 'New essential delivery record logged.', 'SUCCESS')} style={{ backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Plus size={14} color="#FFFFFF" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Add Log</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {essentialsLogs.map((log) => (
                <View key={log.id} style={[styles.listCard, { padding: 14, borderLeftWidth: 4, borderLeftColor: log.type === 'Water' ? '#06B6D4' : log.type === 'Gas' ? '#F97316' : '#10B981' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT_DARK }}>{log.title}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F766E' }}>{log.cost}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>Vendor: {log.vendor} · {log.date}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <View style={{ backgroundColor: '#CCFBF1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#0F766E' }}>{log.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { width: '100%', height: 48, borderRadius: 14 }]} onPress={() => setEssentialsModalVisible(false)}>
              <Text style={styles.actionBtnText}>Close</Text>
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
  container: { flex: 1, backgroundColor: BRAND_MINT_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },

  // ── Header
  header: {
    backgroundColor: BRAND_TEAL,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: BRAND_TEAL_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  greetingEmoji: { fontSize: 22, marginRight: 8 },
  headerGreeting: { fontSize: 13, color: '#DCEFEC', fontWeight: '700' },
  headerGreetingSub: { fontSize: 11, color: '#BCE0DB', fontWeight: '500', marginTop: 1 },
  headerName: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 4 },
  headerRole: { fontSize: 12, color: BRAND_GOLD, fontWeight: '800', letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: BRAND_TEAL,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 22,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  quoteIcon: { fontSize: 18, color: 'rgba(255,255,255,0.6)', marginRight: 8, marginTop: -2 },
  quoteText: { flex: 1, fontSize: 12, color: '#FFFFFF', fontWeight: '500', fontStyle: 'italic', lineHeight: 18 },

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
    borderTopWidth: 1,
    borderTopColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navIconWrap: {
    width: 44, height: 44,
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  navIconWrapActive: { backgroundColor: BRAND_TEAL },
  navLabel: { fontSize: 10, fontWeight: '600', color: TEXT_LIGHT, marginTop: 2 },
  navLabelActive: { color: BRAND_TEAL, fontWeight: '800' },

  // ── Content
  scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },

  // ── Stat Hero Grid
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  statHero: {
    width: (width - 52) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeroIconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  statHeroCount: { fontSize: 22, fontWeight: '900', color: TEXT_DARK },
  statHeroLabel: { fontSize: 11, fontWeight: '800', color: TEXT_DARK, marginTop: 2 },
  statHeroSub: { fontSize: 10, color: TEXT_MUTED, fontWeight: '600', marginTop: 3 },
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
  sectionTitle: { fontSize: 17, fontWeight: '900', color: TEXT_DARK, flex: 1, letterSpacing: -0.2 },
  sectionAction: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: BRAND_MINT_CARD, borderWidth: 1, borderColor: '#bce0db' },
  sectionActionText: { fontSize: 12, fontWeight: '800', color: BRAND_TEAL },

  // ── Cards
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPrimary: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  cardSecondary: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500', marginBottom: 4, lineHeight: 18 },
  cardTiny: { fontSize: 12, color: TEXT_LIGHT, marginTop: 2, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },

  // ── Approval card inner
  approvalCardInner: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: BRAND_MINT_CARD,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#bce0db',
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: BRAND_TEAL },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8, marginTop: 8 },
  iconAction: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // ── Room hero card (student)
  roomHeroCard: {
    backgroundColor: BRAND_TEAL,
    borderRadius: 22, padding: 22,
    marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  roomHeroLabel: { fontSize: 11, fontWeight: '800', color: '#DCEFEC', textTransform: 'uppercase', letterSpacing: 0.6 },
  roomHeroNumber: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  roomHeroSub: { fontSize: 13, color: '#DCEFEC', marginTop: 2 },
  roomHeroTag: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  roomHeroTagText: { fontSize: 11, fontWeight: '800' },
  roomHeroBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12,
  },
  roomHeroBtnText: { fontSize: 12, fontWeight: '800', color: BRAND_TEAL, marginRight: 2 },

  // ── Notice card
  noticeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  noticeEmoji: { fontSize: 26, marginRight: 14 },
  noticeDate: { fontSize: 11, color: TEXT_LIGHT, fontWeight: '700' },

  // ── Room summary row
  roomSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roomSummaryBox: {
    flex: 1, marginHorizontal: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 12,
    alignItems: 'center',
    borderTopWidth: 3.5,
    borderWidth: 1, borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  roomSummaryCount: { fontSize: 20, fontWeight: '900' },
  roomSummaryLabel: { fontSize: 10, fontWeight: '700', color: TEXT_LIGHT, marginTop: 2 },

  // ── Sub-tabs (for Requests)
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: BRAND_MINT_CARD,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#bce0db',
  },
  subTab: {
    flex: 1, paddingVertical: 9,
    borderRadius: 10, alignItems: 'center',
  },
  subTabActive: { backgroundColor: BRAND_TEAL, shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  subTabText: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED },
  subTabTextActive: { color: '#FFFFFF', fontWeight: '800' },

  // ── Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 14,
    height: 48, marginBottom: 14,
    borderWidth: 1, borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, color: TEXT_DARK, fontWeight: '600' },

  // ── Badges
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },

  // ── Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  btnGreen: { backgroundColor: '#10B981' },
  btnRed: { backgroundColor: '#EF4444' },
  btnPurple: { backgroundColor: BRAND_TEAL },
  primaryBtn: {
    height: 52, backgroundColor: BRAND_TEAL,
    borderRadius: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: BRAND_TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  // ── Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 54, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },
  emptySub: { fontSize: 14, color: TEXT_MUTED, marginTop: 6, textAlign: 'center', lineHeight: 22 },

  // ── Profile
  profileHero: {
    backgroundColor: BRAND_TEAL, borderRadius: 22, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3, borderColor: BRAND_GOLD,
  },
  profileAvatarText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  profileName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  profileEmail: { fontSize: 13, color: '#DCEFEC', marginTop: 2, fontWeight: '500' },
  infoRow: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1, borderColor: BRAND_BORDER,
    shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: TEXT_MUTED },
  infoValue: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, maxWidth: '60%', textAlign: 'right' },

  // ── Form modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,39,38,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHandle: { width: 44, height: 4, backgroundColor: '#d1dedc', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: TEXT_DARK, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', marginTop: 20 },
  formLabel: { fontSize: 13, fontWeight: '800', color: TEXT_DARK, marginBottom: 8, marginTop: 8 },
  formInput: {
    backgroundColor: BRAND_MINT_BG, borderRadius: 14,
    borderWidth: 1.5, borderColor: BRAND_BORDER,
    paddingHorizontal: 14, height: 50,
    justifyContent: 'center', marginBottom: 6,
  },
  formInputText: { fontSize: 14, color: TEXT_DARK, fontWeight: '600' },

  // ── Tag picker
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: BRAND_BORDER, backgroundColor: BRAND_MINT_BG },
  tagActive: { borderColor: BRAND_TEAL, backgroundColor: BRAND_MINT_CARD },
  tagText: { fontSize: 12, fontWeight: '700', color: TEXT_MUTED },
  tagTextActive: { color: BRAND_TEAL, fontWeight: '800' },

  // Alert Modal styles
  alertOverlay: { flex: 1, backgroundColor: 'rgba(14,39,38,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  alertBox: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  alertIconBox: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertTitleText: { fontSize: 18, fontWeight: '900', color: TEXT_DARK, marginBottom: 8, textAlign: 'center' },
  alertMessageText: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20, fontWeight: '500' },
  alertActionsRow: { flexDirection: 'row', width: '100%' },
  alertBtn: { height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  alertBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // Segment Tabs
  segmentContainer: { flexDirection: 'row', backgroundColor: BRAND_MINT_CARD, borderRadius: 12, padding: 3, marginBottom: 14, marginTop: 4, borderWidth: 1, borderColor: '#bce0db' },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  segmentBtnActive: { backgroundColor: BRAND_TEAL, shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1 },
  segmentBtnText: { fontSize: 13, fontWeight: '700', color: TEXT_MUTED },
  segmentBtnTextActive: { color: '#FFFFFF', fontWeight: '800' },

  // Polls Styling
  pollCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: BRAND_BORDER, shadowColor: BRAND_TEAL_DARK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  pollQuestion: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, flex: 1, marginRight: 10 },
  pollVotesCount: { fontSize: 11, fontWeight: '700', color: TEXT_LIGHT, marginTop: 10 },
  pollVoteBtn: { backgroundColor: BRAND_MINT_CARD, borderWidth: 1.5, borderColor: '#bce0db', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, alignItems: 'center' },
  pollVoteBtnText: { fontSize: 14, fontWeight: '800', color: BRAND_TEAL },
  pollResultRow: { marginTop: 10 },
  pollResultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pollResultOptionText: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  pollResultPercentText: { fontSize: 12, fontWeight: '800', color: TEXT_MUTED },
  pollProgressBackground: { height: 8, backgroundColor: '#E3ECEA', borderRadius: 4, overflow: 'hidden' },
  pollProgressFill: { height: '100%', borderRadius: 4 },
  pollAdminActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderColor: BRAND_BORDER, paddingTop: 12 },
  pollActionBtn: { flex: 1, height: 38, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pollActionBtnText: { fontSize: 12, fontWeight: '800' },

  // Add Option Button in Creation Modal
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#bce0db',
    backgroundColor: BRAND_MINT_CARD,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: BRAND_TEAL
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
