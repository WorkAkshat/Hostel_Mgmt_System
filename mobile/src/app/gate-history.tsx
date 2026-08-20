import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Animated, Platform, ActivityIndicator, Dimensions, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { leaves as leavesApi } from '../../utils/api';
import {
  ArrowLeft, LogOut, LogIn, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, Filter
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PURPLE = '#7F56D9';

const STATUS_META: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:     { color: '#D97706', bg: '#FFFBEB', icon: AlertCircle, label: 'Pending' },
  APPROVED:    { color: PURPLE,    bg: '#F4F3FF', icon: CheckCircle,  label: 'Approved' },
  REJECTED:    { color: '#EF4444', bg: '#FEF2F2', icon: XCircle,      label: 'Rejected' },
  CHECKED_OUT: { color: '#F59E0B', bg: '#FFFBEB', icon: LogOut,       label: 'Out of Hostel' },
  COMPLETED:   { color: '#10B981', bg: '#ECFDF5', icon: CheckCircle,  label: 'Returned' },
};

const TYPE_META: Record<string, { color: string; label: string }> = {
  NIGHT_OUT:        { color: '#8B5CF6', label: 'Night Out' },
  OUT_OF_STATION:   { color: '#3B82F6', label: 'Out of Station' },
  EMERGENCY:        { color: '#EF4444', label: 'Emergency' },
};

export default function GateHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROVED' | 'COMPLETED' | 'PENDING'>('ALL');

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
    loadHistory(1);
  }, []);

  const loadHistory = async (pageNumber = 1) => {
    if (pageNumber > 1) {
      setLoadingMore(true);
    }
    try {
      const limit = 3; // Using small limit size to demonstrate scroll pagination with 5+ records
      const data = await leavesApi.getMyLeaves();
      const allData = Array.isArray(data) ? data : [];
      
      // Simulate paginated slice response
      const sliced = allData.slice(0, pageNumber * limit);
      setLeaves(sliced);
      setHasMore(allData.length > sliced.length);
      setPage(pageNumber);
    } catch {
      setLeaves([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filtered = activeFilter === 'ALL'
    ? leaves
    : leaves.filter((l) => l.status === activeFilter);

  const stats = {
    total: leaves.length,
    approved: leaves.filter((l) => ['APPROVED', 'CHECKED_OUT', 'COMPLETED'].includes(l.status)).length,
    pending: leaves.filter((l) => l.status === 'PENDING').length,
    completed: leaves.filter((l) => l.status === 'COMPLETED').length,
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderLeaveCard = ({ item, index }: { item: any; index: number }) => {
    const meta = STATUS_META[item.status] || STATUS_META['PENDING'];
    const StatusIcon = meta.icon;
    const typeMeta = TYPE_META[item.type] || { color: '#6B7280', label: item.type };
    const duration = Math.ceil(
      (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <Animated.View style={[styles.leaveCard, { opacity: fadeAnim }]}>
        {/* Top row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typePill, { backgroundColor: typeMeta.color + '18' }]}>
            <Text style={[styles.typePillText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <StatusIcon size={12} color={meta.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Reason */}
        <Text style={styles.reasonText}>{item.reason}</Text>

        {/* Duration / Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateBlock}>
            <Calendar size={13} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.dateLabel}>From: </Text>
            <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
          </View>
          <Text style={styles.dateSeparator}>→</Text>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>To: </Text>
            <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
          </View>
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{duration}d</Text>
          </View>
        </View>

        {/* Gate timestamps */}
        {(item.checkoutTime || item.checkinTime) && (
          <View style={styles.gateTimestampsRow}>
            {item.checkoutTime && (
              <View style={styles.gateTimestamp}>
                <LogOut size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.gateTimestampLabel}>Departed: </Text>
                <Text style={styles.gateTimestampValue}>{formatTime(item.checkoutTime)}</Text>
              </View>
            )}
            {item.checkinTime && (
              <View style={styles.gateTimestamp}>
                <LogIn size={13} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.gateTimestampLabel}>Returned: </Text>
                <Text style={styles.gateTimestampValue}>{formatTime(item.checkinTime)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Warden comment */}
        {item.comments && (
          <View style={styles.wardenCommentBox}>
            <Text style={styles.wardenCommentLabel}>Warden's Note: </Text>
            <Text style={styles.wardenCommentText}>{item.comments}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadHistory(page + 1);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadHistory(1);
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={PURPLE} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gate Pass History</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Filter size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
        {(['ALL', 'PENDING', 'APPROVED', 'COMPLETED'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerSpinner}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🚪</Text>
          <Text style={styles.emptyTitle}>No records found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'ALL' ? 'You have no gate pass history yet.' : `No ${activeFilter.toLowerCase()} records.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderLeaveCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshing={loading}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: PURPLE,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 16,
    justifyContent: 'space-between', alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  filterTabActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterTabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  filterTabTextActive: { color: '#FFFFFF' },

  listContainer: { paddingHorizontal: 24, paddingBottom: 40 },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 16,
    marginBottom: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typePill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  typePillText: { fontSize: 11, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  reasonText: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 10 },

  datesRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10,
  },
  dateBlock: { flexDirection: 'row', alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  dateValue: { fontSize: 11, color: '#374151', fontWeight: '700' },
  dateSeparator: { fontSize: 12, color: '#D1D5DB', marginHorizontal: 8 },
  durationPill: {
    marginLeft: 'auto',
    backgroundColor: '#F4F3FF',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: { fontSize: 11, fontWeight: '700', color: PURPLE },

  gateTimestampsRow: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 10, marginBottom: 10,
  },
  gateTimestamp: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  gateTimestampLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  gateTimestampValue: { fontSize: 11, fontWeight: '700', color: '#111827' },

  wardenCommentBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8, padding: 8,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  wardenCommentLabel: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  wardenCommentText: { fontSize: 11, color: '#92400E', fontWeight: '500' },

  centerSpinner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
