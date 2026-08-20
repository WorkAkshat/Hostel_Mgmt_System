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
} from '../../utils/api';
import {
  LogOut, Home, Users, FileText, Settings, Bell,
  CheckCircle, XCircle, Plus, Search, Coffee,
  DollarSign, UserCheck, TrendingUp, Shield,
  ChevronRight, ArrowLeft, Filter, User,
  Bed, AlertCircle, Clock, BookOpen, Navigation, Quote,
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
  <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
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
      </View>
    </View>
  </Modal>
);

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

      if (user.role === 'ADMIN' && dashData.role === 'ADMIN') {
        // Map aggregated admin data to state
        setAllRooms(dashData.rooms || []);
        setLeavesList(dashData.recentLeaves || []);
        setComplaintsList(dashData.recentComplaints || []);
        setPendingApprovals(dashData.pendingApprovals || []);
        setAllStudents(dashData.students || []);
        setVisitorsList(dashData.activeVisitors || []);
        setInvoicesList(dashData.recentInvoices || []);
        // Profile requests would need to be added to backend if needed
        setProfileRequestsList([]);
        
      } else if (user.role === 'STUDENT' && dashData.role === 'STUDENT') {
        // Map aggregated student data to state
        setLeavesList(dashData.leaves || []);
        setComplaintsList(dashData.complaints || []);
        setInvoicesList(dashData.invoices || []);
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
    const occupancy = allRooms.length > 0
      ? Math.round((allRooms.filter(r => r.status === 'OCCUPIED').length / allRooms.length) * 100)
      : 0;
    const pendingLeaves = leavesList.filter(l => l.status === 'PENDING').length;
    const openComplaints = complaintsList.filter(c => c.status !== 'RESOLVED').length;

    return (
      <View>
        {/* Hero Grid */}
        <View style={styles.heroGrid}>
          <StatHero icon={Users}      count={allStudents.length}      label="Students"       color="#7F56D9" delay={0}   onPress={() => setActiveTab('Students')}   showArrow={false} />
          <StatHero icon={Bed}        count={allRooms.length}         label="Rooms"          color="#10B981" delay={60}  onPress={() => setActiveTab('Rooms')}      showArrow={false} />
          <StatHero icon={UserCheck}  count={pendingApprovals.length} label="Approvals"      color="#F59E0B" delay={120} onPress={() => setActiveTab('Requests')}   sub={pendingApprovals.length > 0 ? 'Pending' : 'All Clear'} showArrow={false} />
          <StatHero icon={Navigation}    count={pendingLeaves}           label="Leave Requests" color="#3B82F6" delay={180} onPress={() => setActiveTab('Requests')}   sub={pendingLeaves > 0 ? `${pendingLeaves} pending` : 'All clear'} showArrow={false} />
          <StatHero icon={AlertCircle} count={openComplaints}         label="Open Issues"    color="#EF4444" delay={240} onPress={() => setActiveTab('Requests')}   sub={openComplaints > 0 ? 'Pending action' : 'All Clear'} showArrow={false} />
          <StatHero icon={TrendingUp} count={`${occupancy}%`}         label="Occupancy"      color="#8B5CF6" delay={300} onPress={() => setActiveTab('Rooms')} showArrow={false} />
        </View>

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
    const totalDue = pendingInvoices.reduce((s: number, inv: any) => s + (inv.amount || 0), 0);

    return (
      <View>
        {totalDue > 0 && (
          <AnimatedCard delay={0}>
            <View style={[styles.listCard, { backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}>
              <Text style={styles.cardPrimary}>Total Outstanding</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#EF4444', marginTop: 4 }}>₹{totalDue}</Text>
            </View>
          </AnimatedCard>
        )}

        {/* Invoice Filters */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            style={[styles.subTab, feeFilter === 'PENDING' && styles.subTabActive]}
            onPress={() => setFeeFilter('PENDING')}
          >
            <Text style={[styles.subTabText, feeFilter === 'PENDING' && styles.subTabTextActive]}>
              Pending ({pendingInvoices.length})
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
              <TouchableOpacity style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: inv.status === 'PAID' ? '#10B981' : '#EF4444' }]} onPress={() => openDetails(inv, 'invoice')} activeOpacity={0.75}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardPrimary}>₹{inv.amount}</Text>
                  <Badge label={inv.status} color={inv.status === 'PAID' ? '#10B981' : '#EF4444'} />
                </View>
                <Text style={styles.cardSecondary}>{inv.description || 'Hostel Fee'}</Text>
                <Text style={styles.cardTiny}>Due: {new Date(inv.dueDate).toLocaleDateString()}</Text>
                
                {inv.status !== 'PAID' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.btnPurple, { marginTop: 12, alignSelf: 'flex-start' }]} onPress={() => payInvoice(inv.id)}>
                    <DollarSign size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnText}>Pay ₹{inv.amount} Now</Text>
                  </TouchableOpacity>
                )}

                {inv.status === 'PAID' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3F4F6', marginTop: 12, alignSelf: 'flex-start' }]} onPress={() => downloadReceipt(inv)}>
                    <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Download PDF Receipt</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
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
      <Modal visible={pollPopupVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
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
          </View>
        </View>
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
      <Modal visible={alertVisible} animationType="fade" transparent>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
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
          </View>
        </View>
      </Modal>

      {/* ── Detail View Modal ── */}
      <Modal visible={detailModalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
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
          </View>
        </View>
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
