import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { colors, shadow, Tone, tones } from './theme';
import { Button, IconTile, Skeleton, T } from './primitives';
import { Sheet } from './Sheet';

// ── Toasts ──
type ToastItem = { id: number; kind: 'success' | 'error' | 'info'; title: string; message?: string };
const ToastCtx = createContext<{ success: (t: string, m?: string) => void; error: (t: string, m?: string) => void; info: (t: string, m?: string) => void } | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const id = useRef(0);
  const insets = useSafeAreaInsets();
  const push = useCallback((kind: ToastItem['kind'], title: string, message?: string) => {
    const next = { id: ++id.current, kind, title, message };
    setItems((list) => [...list.slice(-2), next]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== next.id)), kind === 'error' ? 4500 : 3000);
  }, []);
  const api = useRef({
    success: (t: string, m?: string) => push('success', t, m),
    error: (t: string, m?: string) => push('error', t, m),
    info: (t: string, m?: string) => push('info', t, m),
  }).current;

  const look = { success: { icon: CircleCheck, color: colors.success }, error: { icon: CircleAlert, color: colors.danger }, info: { icon: Info, color: colors.brand600 } };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <View pointerEvents="none" style={[styles.toastWrap, { top: Math.max(insets.top, Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0) + 8 }]}>
        {items.map((t) => {
          const L = look[t.kind];
          return (
            <Animated.View key={t.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={styles.toast}>
              <L.icon size={20} color={L.color} />
              <View style={{ flex: 1 }}>
                <T v="title">{t.title}</T>
                {t.message ? <T v="small" c={colors.text2}>{t.message}</T> : null}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </ToastCtx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
};

// ── Confirmation sheet (works the same on phone and web) ──
export const Confirm = ({
  open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose,
}: { open: boolean; title: string; message?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<unknown> | void; onClose: () => void }) => {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      /* caller shows the error */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={busy ? () => {} : onClose} title={title} subtitle={message}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Cancel" kind="secondary" onPress={onClose} disabled={busy} style={{ flex: 1 }} />
          <Button title={confirmLabel} kind={danger ? 'danger' : 'primary'} onPress={run} loading={busy} style={{ flex: 1 }} />
        </View>
      }
    >
      <View />
    </Sheet>
  );
};

// ── Empty / error / loading ──
export const Empty = ({ icon, title, text, tone = 'mint', action }: { icon: LucideIcon; title: string; text?: string; tone?: Tone; action?: ReactNode }) => (
  <View style={styles.empty}>
    <View style={[styles.halo, { backgroundColor: tones[tone].bg }]}>
      <View style={[styles.haloInner, { borderColor: tones[tone].border }]}><IconTile icon={icon} tone={tone} size={52} /></View>
    </View>
    <T v="h2" center style={{ marginTop: 8, fontSize: 17 }}>{title}</T>
    {text ? <T v="small" c={colors.text2} center style={{ maxWidth: 280 }}>{text}</T> : null}
    {action}
  </View>
);

export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <View style={styles.error}>
    <CircleAlert size={18} color={colors.danger} />
    <T v="small" c={colors.danger} style={{ flex: 1 }}>{message}</T>
    {onRetry && <Button title="Retry" icon={RefreshCw} kind="ghost" small onPress={onRetry} />}
  </View>
);

export const Loading = ({ rows = 3, h = 84 }: { rows?: number; h?: number }) => (
  <View style={{ gap: 10 }} accessibilityLabel="Loading">
    {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} h={h} />)}
  </View>
);

export const toneOf = (t: Tone) => tones[t];

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'center', zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 480, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, ...shadow.lift },
  halo: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
  haloInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 30, paddingHorizontal: 20, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.dangerBg },
});
