import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, radius } from './theme';
import { IconButton, T } from './primitives';
import { revealFocusedInput, useInputFocus, useKeyboardTop } from './keyboard';

// Bottom sheet built on Modal: slides up, closes on backdrop tap or the X.
// With the keyboard open it sits right on top of the keyboard, never runs under the
// status bar, and scrolls the box you are typing in into view.
export const Sheet = ({
  open, onClose, title, subtitle, children, footer, maxHeight = 0.88,
}: { open: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode; maxHeight?: number }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(open);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  // Where the sheet area ends on screen, and where the keyboard starts
  const root = useRef<View>(null);
  const [bottom, setBottom] = useState(height);
  const kbTop = useKeyboardTop();
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const kbRef = useRef<number | null>(null);
  kbRef.current = kbTop;
  const measure = () => root.current?.measureInWindow((_x, top, _w, h) => { if (h) setBottom(top + h); });
  const reveal = useCallback(() => { setTimeout(() => revealFocusedInput(scroll.current, scrollY.current, kbRef.current), 120); }, []);
  useInputFocus(reveal);
  useEffect(() => { if (kbTop != null) { measure(); reveal(); } }, [kbTop, reveal]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      y.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      fade.value = withTiming(1, { duration: 220 });
    } else if (visible) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setVisible)(false);
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  // Only the part of the screen the keyboard really covers needs room
  const covered = kbTop != null ? Math.max(0, bottom - kbTop) : 0;
  const roomAbove = (kbTop != null ? Math.min(kbTop, bottom) : bottom) - insets.top - 12;
  const sheetMax = Math.max(220, Math.min(height * maxHeight, roomAbove));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* White status-bar icons over the dark backdrop, so the time / battery stay visible */}
      {visible && <StatusBar style="light" />}
      <View ref={root} onLayout={measure} style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: covered }} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { maxHeight: sheetMax, paddingBottom: kbTop != null ? 10 : Math.max(insets.bottom, 12) }, sheetStyle]}>
            <View style={styles.grip} />
            {(title || subtitle) && (
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  {title && <T v="h2">{title}</T>}
                  {subtitle && <T v="small" c={colors.text2} style={{ marginTop: 2 }}>{subtitle}</T>}
                </View>
                <IconButton icon={X} label="Close" onPress={onClose} size={36} />
              </View>
            )}
            <ScrollView
              ref={scroll}
              onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={32}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}
            >
              {children}
            </ScrollView>
            {footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(27,42,41,0.42)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, width: '100%', maxWidth: 640, alignSelf: 'center', overflow: 'hidden' },
  grip: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
});
