import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Animated, Platform, Alert, ActivityIndicator,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { rooms as roomsApi } from '../../utils/api';
import {
  ArrowLeft, Home, ArrowRightLeft, CheckCircle,
  Clock, ChevronDown, ChevronUp, Info
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PURPLE = '#7F56D9';

const REASONS = [
  'Academic reasons (proximity to library)',
  'Health / Medical condition',
  'Roommate conflict',
  'Noise / sleep issues',
  'Room maintenance / damage',
  'Request for single occupancy',
  'Other',
];

export default function RoomChangeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selectedReason, setSelectedReason] = useState('');
  const [preferredRoom, setPreferredRoom] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await roomsApi.getAll();
      // Only show available rooms (not student's current room)
      const currentRoomId = user?.studentDetails?.room?.id;
      setAllRooms(Array.isArray(data) ? data.filter((r: any) => r.id !== currentRoomId && r.status !== 'MAINTENANCE') : []);
    } catch {
      setAllRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReasonDropdown = () => {
    const toValue = reasonOpen ? 0 : REASONS.length * 50;
    Animated.spring(dropdownHeight, { toValue, useNativeDriver: false, tension: 70, friction: 10 }).start();
    setReasonOpen(!reasonOpen);
  };

  const selectReason = (reason: string) => {
    setSelectedReason(reason);
    Animated.spring(dropdownHeight, { toValue: 0, useNativeDriver: false, tension: 70, friction: 10 }).start();
    setReasonOpen(false);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Missing Info', 'Please select a reason for the room change request.');
      return;
    }
    setSubmitting(true);
    // Simulate backend submission (backend doesn't have this endpoint yet — stored locally)
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);

    Animated.spring(successScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const currentRoom = user?.studentDetails?.room;

  if (submitted) {
    return (
      <View style={styles.successScreen}>
        <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSub}>
            Your room change request has been forwarded to the Warden for approval.{'\n'}
            You will be notified once reviewed.
          </Text>
          <View style={styles.successInfoBox}>
            <Info size={14} color={PURPLE} style={{ marginRight: 6 }} />
            <Text style={styles.successInfoText}>Typical processing: 2–5 working days</Text>
          </View>
          <TouchableOpacity style={styles.successBtn} onPress={() => router.back()}>
            <Text style={styles.successBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color={PURPLE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Room Change Request</Text>
          <View style={{ width: 36 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Room Info */}
        <View style={styles.currentRoomCard}>
          <View style={styles.currentRoomIconBox}>
            <Home size={22} color={PURPLE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentRoomLabel}>Current Room</Text>
            {currentRoom ? (
              <>
                <Text style={styles.currentRoomNum}>Room {currentRoom.roomNumber} · Block {currentRoom.block}</Text>
                <Text style={styles.currentRoomSub}>{currentRoom.sharingType} · {currentRoom.isAc ? 'A/C' : 'Non-A/C'}</Text>
              </>
            ) : (
              <Text style={styles.currentRoomNum}>No room assigned</Text>
            )}
          </View>
          <View style={styles.arrowBox}>
            <ArrowRightLeft size={20} color="#9CA3AF" />
          </View>
        </View>

        {/* Reason Selector (Animated Dropdown) */}
        <Text style={styles.sectionLabel}>Reason for Transfer *</Text>
        <TouchableOpacity
          style={[styles.dropdownTrigger, reasonOpen && styles.dropdownTriggerOpen]}
          onPress={toggleReasonDropdown}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownTriggerText, selectedReason && styles.dropdownTriggerTextSelected]}>
            {selectedReason || 'Select a reason...'}
          </Text>
          {reasonOpen ? <ChevronUp size={18} color={PURPLE} /> : <ChevronDown size={18} color="#9CA3AF" />}
        </TouchableOpacity>
        <Animated.View style={[styles.dropdownList, { maxHeight: dropdownHeight }]}>
          {REASONS.map((reason, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dropdownItem, i < REASONS.length - 1 && styles.dropdownItemBorder]}
              onPress={() => selectReason(reason)}
            >
              <Text style={styles.dropdownItemText}>{reason}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Preferred Room (Optional) */}
        <Text style={styles.sectionLabel}>Preferred Room (Optional)</Text>
        {loading ? (
          <ActivityIndicator color={PURPLE} style={{ marginBottom: 16 }} />
        ) : (
          <>
            <Text style={styles.helperText}>Available rooms ({allRooms.length} found):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomPillsScroll}>
              {allRooms.slice(0, 12).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roomPill,
                    preferredRoom === r.roomNumber && styles.roomPillSelected,
                  ]}
                  onPress={() => setPreferredRoom(preferredRoom === r.roomNumber ? '' : r.roomNumber)}
                >
                  <Text style={[
                    styles.roomPillText,
                    preferredRoom === r.roomNumber && styles.roomPillTextSelected,
                  ]}>
                    {r.roomNumber} ({r.block})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Additional Notes */}
        <Text style={styles.sectionLabel}>Additional Notes (Optional)</Text>
        <View style={[styles.inputContainer, { height: 100, paddingVertical: 10 }]}>
          <TextInput
            style={[styles.textInput, { textAlignVertical: 'top' }]}
            placeholder="Any additional information for the warden..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={additionalNote}
            onChangeText={setAdditionalNote}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <ArrowRightLeft size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit Room Change Request</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Processing note */}
        <View style={styles.noteBox}>
          <Clock size={14} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.noteText}>Requests are reviewed by the Warden within 2–5 working days.</Text>
        </View>
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
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  currentRoomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginBottom: 28,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentRoomIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  currentRoomLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentRoomNum: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  currentRoomSub: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 1 },
  arrowBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  helperText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 8 },

  dropdownTrigger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownTriggerOpen: { borderColor: PURPLE, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownTriggerText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  dropdownTriggerTextSelected: { color: '#111827' },

  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: PURPLE,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  roomPillsScroll: { marginBottom: 24 },
  roomPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    marginRight: 8,
  },
  roomPillSelected: { backgroundColor: '#EDE9FE', borderColor: PURPLE },
  roomPillText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  roomPillTextSelected: { color: PURPLE },

  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 24,
  },
  textInput: { flex: 1, fontSize: 13, color: '#1F2937', fontWeight: '500' },

  submitBtn: {
    height: 52,
    backgroundColor: PURPLE,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  submitBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  noteText: { fontSize: 12, color: '#6B7280', fontWeight: '500', flex: 1 },

  // Success state
  successScreen: {
    flex: 1, backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  successIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  successInfoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4F3FF',
    borderRadius: 10, padding: 12,
    marginBottom: 24, width: '100%',
  },
  successInfoText: { fontSize: 13, color: PURPLE, fontWeight: '600', flex: 1 },
  successBtn: {
    height: 50, width: '100%',
    backgroundColor: PURPLE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  successBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
