import { useEffect, useState } from 'react';
import { Keyboard, Platform, TextInput } from 'react-native';

// Keyboard handling that works the same whether or not Android shrinks the window
// for the keyboard: we measure where the keyboard actually starts and only make room
// for the part of the screen it really covers.

// Top edge of the keyboard in screen coordinates, or null while it is hidden
export const useKeyboardTop = () => {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setTop(e.endCoordinates.screenY));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTop(null));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return top;
};

// Inputs tell scroll containers when focus moves, so the next box can be scrolled into view
type Listener = () => void;
const listeners = new Set<Listener>();
export const notifyInputFocus = () => listeners.forEach((l) => l());
export const useInputFocus = (cb: Listener) => {
  useEffect(() => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [cb]);
};

type Scrollable = { scrollTo: (o: { y: number; animated?: boolean }) => void } | null | undefined;

// Scroll so the focused input (plus a little air) sits above the keyboard
export const revealFocusedInput = (scroll: Scrollable, scrollY: number, keyboardTop: number | null, margin = 28) => {
  if (!scroll || keyboardTop == null) return;
  const input = TextInput.State.currentlyFocusedInput?.() as any;
  if (!input?.measureInWindow) return;
  input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
    const bottom = y + h + margin;
    if (bottom > keyboardTop) scroll.scrollTo({ y: Math.max(0, scrollY + (bottom - keyboardTop)), animated: true });
    else if (y < 80) scroll.scrollTo({ y: Math.max(0, scrollY - (80 - y)), animated: true });
  });
};
