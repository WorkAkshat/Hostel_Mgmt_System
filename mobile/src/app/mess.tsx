import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { mess as messApi } from '../../utils/api';
import {
  ArrowLeft, Coffee, Sun, Sunset, Moon, Star,
  CheckCircle, Clock, BarChart2, BookOpen
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const PURPLE = '#7F56D9';
const PURPLE_LIGHT = '#F4F3FF';
const PURPLE_DARK = '#6941C6';

const WEEKLY_MENU = {
  Monday:    { breakfast: 'Poha + Chai', lunch: 'Dal Tadka + Roti + Rice', snacks: 'Samosa + Tea', dinner: 'Paneer Butter Masala + Naan' },
  Tuesday:   { breakfast: 'Idli + Sambar', lunch: 'Rajma Chawal + Salad', snacks: 'Biscuits + Chai', dinner: 'Aloo Gobi + Roti + Dal' },
  Wednesday: { breakfast: 'Paratha + Curd', lunch: 'Chana Masala + Rice + Roti', snacks: 'Pakoda + Tea', dinner: 'Mix Veg + Phulka + Rice' },
  Thursday:  { breakfast: 'Upma + Chutney', lunch: 'Dal Makhani + Jeera Rice', snacks: 'Bread Pakoda + Tea', dinner: 'Shahi Paneer + Laccha Paratha' },
  Friday:    { breakfast: 'Puri + Bhaji', lunch: 'Chole + Rice + Roti', snacks: 'Chakli + Tea', dinner: 'Dal Tadka + Roti + Rice' },
  Saturday:  { breakfast: 'Aloo Paratha + Pickle', lunch: 'Veg Biryani + Raita', snacks: 'Popcorn + Chai', dinner: 'Kadhi Pakoda + Rice + Roti' },
  Sunday:    { breakfast: 'Dosa + Chutney + Sambar', lunch: 'Special Thali (Puri, Dal, Sabzi, Sweet)', snacks: 'French Fries + Sauce', dinner: 'Veg Pulao + Butter Naan + Raita' },
};

const DAYS = Object.keys(WEEKLY_MENU);
const MEAL_TYPES = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_META: Record<string, { icon: any; color: string; time: string; label: string }> = {
  breakfast: { icon: Sun,     color: '#F59E0B', time: '7:00–9:00 AM',    label: 'Breakfast' },
  lunch:     { icon: Coffee,  color: '#10B981', time: '12:30–2:30 PM',   label: 'Lunch'     },
  snacks:    { icon: Star,    color: '#3B82F6', time: '4:30–5:30 PM',    label: 'Snacks'    },
  dinner:    { icon: Moon,    color: '#8B5CF6', time: '7:30–9:30 PM',    label: 'Dinner'    },
};

export default function MessScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState<any[]>([]);
  const [selectedView, setSelectedView] = useState<'today' | 'weekly' | 'history'>('today');
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });

  const [weeklyMenu, setWeeklyMenu] = useState<any>(WEEKLY_MENU);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScales = useRef(MEAL_TYPES.map(() => new Animated.Value(1))).current;
  const headerHeight = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
    loadAttendance();
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await messApi.getMenu();
      if (data && typeof data === 'object') {
        setWeeklyMenu(data);
      }
    } catch (e) {
      console.log('Error fetching weekly menu:', e);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await messApi.getMyAttendance();
      setMyAttendance(Array.isArray(data) ? data : []);
    } catch {
      setMyAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMeal = async (mealType: string, index: number) => {
    // Press animation
    Animated.sequence([
      Animated.spring(cardScales[index], { toValue: 0.95, useNativeDriver: true, speed: 30 }),
      Animated.spring(cardScales[index], { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();

    try {
      const todayString = new Date().toISOString().split('T')[0];
      await messApi.biometricVerify({
        mealType: mealType.toUpperCase(),
        date: todayString,
        verifiedBy: 'BIOMETRIC_FACE',
      });
      Alert.alert('✅ Attendance Marked', `${MEAL_META[mealType].label} attendance logged for today.`);
      loadAttendance();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log attendance');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttended = myAttendance.filter((a) => a.date === todayStr).map((a) => a.mealType.toLowerCase());

  const renderTodayMenu = () => {
    const todayMenu = weeklyMenu[selectedDay] || weeklyMenu['Monday'];
    return (
      <View>
        {MEAL_TYPES.map((meal, i) => {
          const meta = MEAL_META[meal];
          const Icon = meta.icon;
          const attended = todayAttended.includes(meal);
          return (
            <Animated.View
              key={meal}
              style={[
                styles.mealCard,
                { transform: [{ scale: cardScales[i] }] },
              ]}
            >
              <View style={[styles.mealIconContainer, { backgroundColor: meta.color + '18' }]}>
                <Icon size={24} color={meta.color} />
              </View>
              <View style={styles.mealInfo}>
                <View style={styles.mealTitleRow}>
                  <Text style={styles.mealLabel}>{meta.label}</Text>
                  {attended && (
                    <View style={styles.attendedBadge}>
                      <CheckCircle size={12} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.attendedText}>Attended</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.mealMenuItem}>{todayMenu[meal as keyof typeof todayMenu]}</Text>
                <View style={styles.mealTimeRow}>
                  <Clock size={11} color="#9CA3AF" style={{ marginRight: 4 }} />
                  <Text style={styles.mealTime}>{meta.time}</Text>
                </View>
              </View>
              {user?.role === 'STUDENT' && !attended && (
                <TouchableOpacity
                  style={[styles.markBtn, { backgroundColor: meta.color }]}
                  onPress={() => handleMarkMeal(meal, i)}
                >
                  <Text style={styles.markBtnText}>Mark</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderWeeklyMenu = () => (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll}>
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>
              {day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.detailsCard, { marginTop: 16 }]}>
        <Text style={styles.selectedDayLabel}>{selectedDay}'s Full Menu</Text>
        {MEAL_TYPES.map((meal) => {
          const meta = MEAL_META[meal];
          const Icon = meta.icon;
          const menu = weeklyMenu[selectedDay] || weeklyMenu['Monday'];
          return (
            <View key={meal} style={styles.weeklyMealRow}>
              <View style={[styles.weeklyMealIconBox, { backgroundColor: meta.color + '15' }]}>
                <Icon size={14} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weeklyMealLabel}>{meta.label} · {meta.time}</Text>
                <Text style={styles.weeklyMealItem}>{menu[meal as keyof typeof menu]}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderHistory = () => {
    if (loading) {
      return (
        <View style={styles.centerSpinner}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      );
    }
    if (myAttendance.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>No attendance logged yet</Text>
          <Text style={styles.emptySubtitle}>Your mess attendance history will appear here</Text>
        </View>
      );
    }

    // Group by date
    const grouped: Record<string, any[]> = {};
    myAttendance.forEach((entry) => {
      if (!grouped[entry.date]) grouped[entry.date] = [];
      grouped[entry.date].push(entry);
    });

    return (
      <View>
        {Object.entries(grouped).reverse().map(([date, entries]) => (
          <View key={date} style={styles.historyGroup}>
            <Text style={styles.historyDateLabel}>{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
            <View style={styles.historyMealRow}>
              {MEAL_TYPES.map((meal) => {
                const attended = entries.some((e) => e.mealType.toLowerCase() === meal);
                const meta = MEAL_META[meal];
                return (
                  <View key={meal} style={[styles.historyMealPill, attended && { backgroundColor: meta.color + '20', borderColor: meta.color }]}>
                    <Text style={[styles.historyMealPillText, attended && { color: meta.color }]}>
                      {meal.slice(0, 1).toUpperCase() + meal.slice(1, 3)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mess & Dining</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{myAttendance.length}</Text>
            <Text style={styles.statPillLabel}>Total Meals</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{todayAttended.length}/4</Text>
            <Text style={styles.statPillLabel}>Today</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>
              {new Set(myAttendance.map((a) => a.date)).size}
            </Text>
            <Text style={styles.statPillLabel}>Active Days</Text>
          </View>
        </View>
      </Animated.View>

      {/* View Tabs */}
      <View style={styles.viewTabsRow}>
        {(['today', 'weekly', 'history'] as const).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewTab, selectedView === v && styles.viewTabActive]}
            onPress={() => setSelectedView(v)}
          >
            <Text style={[styles.viewTabText, selectedView === v && styles.viewTabTextActive]}>
              {v === 'today' ? "Today's Menu" : v === 'weekly' ? 'Weekly Menu' : 'My History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedView === 'today' && renderTodayMenu()}
        {selectedView === 'weekly' && renderWeeklyMenu()}
        {selectedView === 'history' && renderHistory()}
      </Animated.ScrollView>
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
    justifyContent: 'space-between',
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statPillNum: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statPillLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  viewTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 4,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewTabActive: { backgroundColor: PURPLE },
  viewTabText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  viewTabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mealIconContainer: {
    width: 46, height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealInfo: { flex: 1 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  mealLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginRight: 8 },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8,
  },
  attendedText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  mealMenuItem: { fontSize: 12, color: '#4B5563', fontWeight: '500', marginBottom: 4 },
  mealTimeRow: { flexDirection: 'row', alignItems: 'center' },
  mealTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  markBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  markBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  dayTabsScroll: { marginBottom: 4 },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  dayTabActive: { backgroundColor: PURPLE },
  dayTabText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dayTabTextActive: { color: '#FFFFFF' },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  selectedDayLabel: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 16 },
  weeklyMealRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 14,
  },
  weeklyMealIconBox: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  weeklyMealLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 2 },
  weeklyMealItem: { fontSize: 13, fontWeight: '600', color: '#111827' },
  historyGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyDateLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  historyMealRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyMealPill: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  historyMealPillText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  centerSpinner: { paddingVertical: 50, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
});
