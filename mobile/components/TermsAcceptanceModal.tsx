import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  Animated, Modal, Linking, Platform, Dimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const PURPLE = '#7F56D9';
const STORAGE_KEY = 'hms_terms_accepted_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TermsAcceptanceModalProps {
  visible: boolean;
  onAccept: () => void;
  privacyPolicyUrl?: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function TermsAcceptanceModal({
  visible,
  onAccept,
  privacyPolicyUrl,
}: TermsAcceptanceModalProps) {
  const [accepting, setAccepting] = useState(false);
  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1,    duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEY,
        JSON.stringify({ acceptedAt: new Date().toISOString(), version: '1.0' })
      );
      Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setAccepting(false);
        onAccept();
      });
    } catch {
      setAccepting(false);
    }
  };

  const handleViewPolicy = () => {
    if (privacyPolicyUrl) Linking.openURL(privacyPolicyUrl);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        {/* Card */}
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>

          {/* Title */}
          <Text style={styles.title}>Your Privacy Matters</Text>

          {/* Body */}
          <Text style={styles.body}>
            By using Hari Pushp PG, you agree to our{' '}
            <Text
              style={styles.link}
              onPress={handleViewPolicy}
            >
              Privacy Policy
            </Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={handleViewPolicy}>
              Terms of Service
            </Text>
            . We collect your name, email, and hostel activity data solely to
            manage your hostel account and send you important notifications.
          </Text>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleViewPolicy}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryBtnText}>View Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAccept}
              disabled={accepting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {accepting ? 'Saving…' : 'Accept All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <Text style={styles.footerNote}>
            Hari Pushp PG · Effective August 2026
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export async function hasAcceptedTerms(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!val) return false;
    const parsed = JSON.parse(val);
    return parsed?.version === '1.0';
  } catch {
    return false;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.3,
  },

  body: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  link: {
    color: PURPLE,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    backgroundColor: PURPLE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  footerNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '400',
  },
});
