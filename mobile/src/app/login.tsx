import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Dimensions, Alert, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import * as SecureStore from 'expo-secure-store';
import {
  Eye, EyeOff, ShieldCheck, User, ShieldAlert,
  Globe, Fingerprint, Phone, MessageSquare,
} from 'lucide-react-native';
import { TermsAcceptanceModal, hasAcceptedTerms } from '../../components/TermsAcceptanceModal';

const { width } = Dimensions.get('window');
const PURPLE = '#7F56D9';
const PURPLE_DARK = '#6941C6';

const InputField = ({
  id, label, value, onChange, placeholder, keyboard = 'default', secure = false, icon,
  focusedField, setFocusedField, secureText, setSecureText, loading
}: any) => {
  const isFocused = focusedField === id;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  }, [isFocused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#7F56D9'],
  });

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Animated.View style={[styles.inputWrapper, { borderColor }]}>
        {icon && <View style={styles.inputIconLeft}>{icon}</View>}
        <TextInput
          style={[styles.textInput, icon && { paddingLeft: 36 }]}
          placeholder={placeholder}
          placeholderTextColor="#C4C9D4"
          secureTextEntry={secure && secureText}
          keyboardType={keyboard}
          autoCapitalize="none"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocusedField(id)}
          onBlur={() => setFocusedField(null)}
          editable={!loading}
        />
        {secure && setSecureText && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setSecureText(!secureText)}>
            {secureText
              ? <EyeOff size={18} color="#9CA3AF" />
              : <Eye size={18} color="#7F56D9" />}
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, error, setError } = useAuth();
  const { t, locale, changeLanguage } = useLanguage();

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  // Staggered entrance animations
  const headerAnim = useRef(new Animated.Value(-80)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const quickBtnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(headerAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(formSlide, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      ]),
      Animated.timing(quickBtnOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Lazy-load biometrics check to avoid crash
    const checkBiometrics = async () => {
      try {
        const LocalAuth = await import('expo-local-authentication');
        const hasHw = await LocalAuth.hasHardwareAsync();
        const enrolled = await LocalAuth.isEnrolledAsync();
        setBiometricsAvailable(hasHw && enrolled);
      } catch {
        setBiometricsAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  const handleLogin = async (overrideEmail = '', overridePass = '') => {
    const loginEmail = overrideEmail || email;
    const loginPassword = overridePass || password;
    if (!loginEmail || !loginPassword) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(loginEmail, loginPassword);
      // Check if user has already accepted terms
      const alreadyAccepted = await hasAcceptedTerms();
      if (alreadyAccepted) {
        router.replace('/dashboard');
      } else {
        // First time — show formal terms acceptance
        setShowTerms(true);
      }
    } catch {
      // error is set by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAccepted = () => {
    setShowTerms(false);
    router.replace('/dashboard');
  };

  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setMockOtp(code);
      setOtpSent(true);
      setLoading(false);
      Alert.alert('OTP Sent (Dev)', `Your code: ${code}`, [{ text: 'Copy & Continue' }]);
    }, 1000);
  };

  const handleVerifyOtp = async () => {
    if (otpCode !== mockOtp) {
      setError('Invalid OTP code. Please try again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login('ananya@haripushppg.com', 'password123');
      router.replace('/dashboard');
    } catch {
      setError('OTP authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        Alert.alert('Setup Required', 'Log in with email/password first to enable biometric login.');
        return;
      }
      const LocalAuth = await import('expo-local-authentication');
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Authenticate to access HP PG',
        cancelLabel: 'Cancel',
      });
      if (result.success) router.replace('/dashboard');
    } catch {
      Alert.alert('Error', 'Biometric authentication failed.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <Animated.View
          style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerAnim }] }]}
        >
          {/* Decorative circles */}
          <View style={[styles.decCircle, { width: 280, height: 280, top: -120, right: -60 }]} />
          <View style={[styles.decCircle, { width: 160, height: 160, top: -40, left: -60 }]} />

          <View style={styles.headerTopRow}>
            <View />
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => changeLanguage(locale === 'en' ? 'hi' : 'en')}
            >
              <Globe size={12} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.langPillText}>{locale === 'en' ? 'EN' : 'HI'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logoMark}>
            <Text style={styles.logoMarkFlower}>✿</Text>
            <Text style={styles.logoMarkText}>HP</Text>
          </View>
          <Text style={styles.headerTitle}>{t('welcome')}</Text>
          <Text style={styles.headerSub}>{t('loginSubtitle')}</Text>
        </Animated.View>

        {/* ── Form ── */}
        <Animated.View
          style={[styles.form, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}
        >
          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <ShieldAlert size={16} color="#D92D20" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Password Mode ── */}
          {loginMode === 'password' && (
            <>
              <InputField
                id="email" label={t('email')}
                value={email} onChange={setEmail}
                placeholder="you@haripushppg.com"
                keyboard="email-address"
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                loading={loading}
              />
              <InputField
                id="password" label={t('password')}
                value={password} onChange={setPassword}
                placeholder="••••••••" secure
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                secureText={secureText}
                setSecureText={setSecureText}
                loading={loading}
              />

              <View style={styles.optRow}>
                <TouchableOpacity style={styles.checkRow} onPress={() => setRememberMe(!rememberMe)}>
                  <View style={[styles.checkBox, rememberMe && styles.checkBoxOn]}>
                    {rememberMe && <View style={styles.checkMark} />}
                  </View>
                  <Text style={styles.optText}>{t('rememberMe')}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={[styles.optText, { color: PURPLE, fontWeight: '700' }]}>
                    {t('forgotPassword')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.primaryRow}>
                <TouchableOpacity
                  style={[styles.signInBtn, { flex: biometricsAvailable ? 0.78 : 1 }, loading && styles.disabledBtn]}
                  onPress={() => handleLogin()}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.signInBtnText}>{t('signInBtn')}</Text>
                  }
                </TouchableOpacity>

                {biometricsAvailable && (
                  <TouchableOpacity style={styles.bioBtn} onPress={handleBiometricLogin} activeOpacity={0.8}>
                    <Fingerprint size={22} color={PURPLE} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* ── OTP Mode ── */}
          {loginMode === 'otp' && (
            <>
              <InputField
                id="phone" label="Mobile Number"
                value={phoneNumber} onChange={setPhoneNumber}
                placeholder="10-digit mobile number"
                keyboard="number-pad"
                icon={<Phone size={15} color="#9CA3AF" />}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                loading={loading}
              />
              {otpSent && (
                <InputField
                  id="otp" label="OTP Code"
                  value={otpCode} onChange={setOtpCode}
                  placeholder="6-digit OTP"
                  keyboard="number-pad"
                  icon={<MessageSquare size={15} color="#9CA3AF" />}
                  focusedField={focusedField}
                  setFocusedField={setFocusedField}
                  loading={loading}
                />
              )}
              <TouchableOpacity
                style={[styles.signInBtn, loading && styles.disabledBtn]}
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.signInBtnText}>{otpSent ? t('verifyOtpBtn') : t('getOtpBtn')}</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* Toggle mode */}
          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => { setLoginMode(loginMode === 'password' ? 'otp' : 'password'); setError(null); setOtpSent(false); }}
          >
            <Text style={styles.toggleModeText}>
              {loginMode === 'password' ? '📱  ' + t('otpLoginLink') : '🔑  ' + t('pwdLoginLink')}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>quick access</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick login buttons */}
          <Animated.View style={{ opacity: quickBtnOpacity }}>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: '#F4F3FF', borderColor: '#DDD6FE' }]}
                onPress={() => handleLogin('warden@haripushppg.com', 'password123')}
                activeOpacity={0.8}
              >
                <ShieldCheck size={16} color={PURPLE} style={{ marginRight: 6 }} />
                <Text style={[styles.quickBtnText, { color: PURPLE }]}>Warden</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: PURPLE, borderColor: PURPLE }]}
                onPress={() => handleLogin('ananya@haripushppg.com', 'password123')}
                activeOpacity={0.8}
              >
                <User size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.quickBtnText, { color: '#FFFFFF' }]}>Student</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', width: '100%', marginBottom: 8 }]}
              onPress={() => handleLogin('guard@haripushppg.com', 'password123')}
              activeOpacity={0.8}
            >
              <User size={16} color="#4B5563" style={{ marginRight: 6 }} />
              <Text style={[styles.quickBtnText, { color: '#4B5563' }]}>Security Guard</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* ── Terms & Privacy Policy Modal (first login only) ── */}
      <TermsAcceptanceModal
        visible={showTerms}
        onAccept={handleTermsAccepted}
        privacyPolicyUrl="https://haripushppg.com/privacy"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    height: 260,
    backgroundColor: PURPLE,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    overflow: 'hidden',
    position: 'relative',
  },
  decCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    elevation: 3,
  },
  langPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  langPillText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  logoMark: {
    width: 52, height: 58, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  logoMarkFlower: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: -2 },
  logoMarkText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Form
  form: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF3F2',
    borderWidth: 1, borderColor: '#FECDCA',
    borderRadius: 12, padding: 12,
    marginBottom: 20,
  },
  errorText: { fontSize: 13, color: '#B42318', fontWeight: '600', flex: 1 },

  // Input
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 7 },
  inputWrapper: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  inputIconLeft: { position: 'absolute', left: 14, zIndex: 1 },
  textInput: {
    flex: 1, fontSize: 14, color: '#1F2937', fontWeight: '500', height: '100%',
  },
  eyeBtn: { position: 'absolute', right: 14 },

  // Options row
  optRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkBox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  checkBoxOn: { borderColor: PURPLE, backgroundColor: PURPLE },
  checkMark: { width: 8, height: 8, borderRadius: 2, backgroundColor: '#FFFFFF' },
  optText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },

  // Buttons
  primaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 20 },
  signInBtn: {
    height: 50,
    backgroundColor: PURPLE,
    borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  signInBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  bioBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  disabledBtn: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },

  toggleMode: { alignSelf: 'center', marginBottom: 24 },
  toggleModeText: { fontSize: 13, fontWeight: '700', color: PURPLE },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0F0F0' },
  dividerText: {
    fontSize: 10, fontWeight: '700', color: '#C4C9D4',
    textTransform: 'uppercase', letterSpacing: 1.5,
    paddingHorizontal: 12,
  },

  // Quick access
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  quickBtn: {
    flex: 1, height: 46, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  quickBtnText: { fontSize: 13, fontWeight: '700' },
});
