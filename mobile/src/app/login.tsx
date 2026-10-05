import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Building2, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../lib/auth';
import { authApi } from '../api';
import { storage, KEYS } from '../lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadow } from '../ui/theme';
import { Button, Row, T } from '../ui/primitives';
import { Field, Input } from '../ui/form';
import { ErrorBox, useToast } from '../ui/feedback';
import { Sheet } from '../ui/Sheet';
import { API_URL } from '../../config';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  // While the keyboard is open the big welcome block shrinks to one line,
  // so the email and password boxes stay above the keyboard.
  const [kb, setKb] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const { height: winH } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKb(true);
      // Room only for the part of the screen the keyboard really covers
      setKbHeight(Math.max(0, winH - e.endCoordinates.screenY));
      scroll.current?.scrollTo({ y: 0, animated: true });
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => { setKb(false); setKbHeight(0); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsOk, setTermsOk] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    storage.get(KEYS.terms).then((v) => setTermsOk(Boolean(v)));
  }, []);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter the email you registered with.');
    if (!password) return setError('Enter your password.');
    if (!termsOk) return setTermsOpen(true);
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome, ${u.name.split(' ')[0]}`);
    } catch (err: any) {
      // Network failure: show which server address the app tried, to help fix the setup
      setError(err.status === 0 ? `${err.message}
Server: ${API_URL.replace('/api/v1', '')}` : err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const acceptTerms = async () => {
    await storage.set(KEYS.terms, JSON.stringify({ acceptedAt: new Date().toISOString(), version: '1.0' }));
    setTermsOk(true);
    setTermsOpen(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.mint200 }}>
      <LinearGradient colors={gradients.login} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.blob, { top: -80, right: -60, width: 240, height: 240 }]} />
      <View pointerEvents="none" style={[styles.blob, { bottom: -100, left: -80, width: 280, height: 280 }]} />
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + (kb ? 12 : 24), paddingBottom: (kb ? kbHeight : insets.bottom) + 24 }} keyboardShouldPersistTaps="handled">
        {kb ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.mini}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniLogo}><Building2 size={18} color={colors.white} /></LinearGradient>
            <T v="h2" c={colors.brand900}>Hari Pushp Tower</T>
          </Animated.View>
        ) : (
        <Animated.View entering={FadeInUp.duration(450)} exiting={FadeOut.duration(120)} style={styles.hero}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}><Building2 size={32} color={colors.white} /></LinearGradient>
          <T v="display" c={colors.brand900} center>Hari Pushp Tower</T>
          <T c={colors.brand800} center style={{ maxWidth: 280 }}>Leaves, mess, bills and your room — all in one place.</T>
          <Row gap={6} style={{ marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Students', 'Wardens', 'Gate staff'].map((p) => (
              <View key={p} style={styles.pill}><T v="caption" w="semibold" c={colors.brand700}>{p}</T></View>
            ))}
          </Row>
        </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(450).delay(120)} layout={LinearTransition.duration(220)} style={styles.card}>
          <T v="h1">Sign in</T>
          <T v="small" c={colors.text2} style={{ marginTop: -8 }}>Use the email and password from the hostel office.</T>
          <Field label="Email">
            <Input value={email} onChangeText={(v) => { setEmail(v); setError(null); }} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} />
          </Field>
          <Field label="Password">
            <View style={{ justifyContent: 'center' }}>
              <Input ref={passwordRef} value={password} onChangeText={(v) => { setPassword(v); setError(null); }} placeholder="Your password" secureTextEntry={!show} autoCapitalize="none" autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
              <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} style={styles.eye} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={18} color={colors.text3} /> : <Eye size={18} color={colors.text3} />}
              </Pressable>
            </View>
          </Field>
          {error && <ErrorBox message={error} />}
          <Button title="Sign in" icon={Lock} onPress={submit} loading={busy} full />
          <Pressable onPress={() => setForgotOpen(true)} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 4 }}>
            <T v="small" w="semibold" c={colors.brand700}>Forgot password?</T>
          </Pressable>
        </Animated.View>

        <T v="caption" c={colors.brand800} center style={{ marginTop: 18, paddingHorizontal: 24 }}>
          New resident? Register on the website — the warden approves your account.
        </T>
      </ScrollView>

      <Sheet open={termsOpen} onClose={() => setTermsOpen(false)} title="Before you continue" subtitle="Please read and accept the hostel app terms."
        footer={<Button title="I accept" icon={ShieldCheck} onPress={acceptTerms} full />}
      >
        {[
          'Your name, room, phone and parent contacts are used only by the hostel office to run the hostel.',
          'Leave requests, gate entries and mess check-ins are recorded with time stamps.',
          'Parents may be informed about leaves and night roll-call results.',
          'Keep your password private. You are responsible for actions taken from your account.',
        ].map((line) => (
          <Row key={line} align="flex-start"><T c={colors.brand600}>•</T><T v="small" c={colors.text2} style={{ flex: 1 }}>{line}</T></Row>
        ))}
      </Sheet>

      <ForgotSheet open={forgotOpen} onClose={() => setForgotOpen(false)} defaultEmail={email} />
    </View>
  );
}

const ForgotSheet = ({ open, onClose, defaultEmail }: { open: boolean; onClose: () => void; defaultEmail: string }) => {
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setStep('email'); setEmail(defaultEmail); setCode(''); setPw(''); setError(null); }
  }, [open, defaultEmail]);

  const send = async () => {
    setBusy(true); setError(null);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setStep('reset');
      toast.info('Code sent', 'Check your email for the 6-digit code.');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const reset = async () => {
    if (pw.length < 6) return setError('New password must be at least 6 characters.');
    setBusy(true); setError(null);
    try {
      await authApi.resetPassword(email.trim().toLowerCase(), code.trim(), pw);
      toast.success('Password changed', 'Sign in with your new password.');
      onClose();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Reset password" subtitle={step === 'email' ? 'We will email you a verification code.' : `Enter the code sent to ${email}.`}
      footer={<Button title={step === 'email' ? 'Send code' : 'Set new password'} icon={KeyRound} onPress={step === 'email' ? send : reset} loading={busy} full />}
    >
      {step === 'email' ? (
        <Field label="Email"><Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" /></Field>
      ) : (
        <>
          <Field label="Verification code"><Input value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6 digits" /></Field>
          <Field label="New password" hint="At least 6 characters"><Input value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" /></Field>
        </>
      )}
      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 22 },
  mini: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  miniLogo: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8, ...shadow.lift, shadowColor: colors.brand900, shadowOpacity: 0.25 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.65)' },
  card: { marginHorizontal: 16, padding: 22, gap: 16, borderRadius: 28, backgroundColor: colors.white, width: 'auto', maxWidth: 480, alignSelf: 'stretch', ...shadow.lift },
  eye: { position: 'absolute', right: 14 },
});
