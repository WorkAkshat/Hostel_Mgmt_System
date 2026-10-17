/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1b2a29',
    textSecondary: '#52625f',
    textTertiary: '#8a9895',
    background: '#f6faf9',
    backgroundElement: '#e6f4f2',
    backgroundSelected: '#d5ecea',
    primary: '#246460',
    primaryDark: '#1b4240',
    primaryLight: '#dcefec',
    accent: '#f9d77e',
    accentText: '#3d2f06',
    border: '#e3ecea',
    card: '#ffffff',
  },
  dark: {
    text: '#f6faf9',
    textSecondary: '#bce0db',
    textTertiary: '#8a9895',
    background: '#0e2726',
    backgroundElement: '#1b4240',
    backgroundSelected: '#1f504d',
    primary: '#3a918a',
    primaryDark: '#246460',
    primaryLight: '#1b4240',
    accent: '#f9d77e',
    accentText: '#3d2f06',
    border: '#1f504d',
    card: '#163836',
  },
} as const;

export const BrandColors = {
  teal: '#246460',
  tealDark: '#1b4240',
  tealDeep: '#1f504d',
  tealMed: '#2b7a74',
  tealLight: '#e6f4f2',
  tealSubtle: '#f0f8f7',
  mintBg: '#f6faf9',
  mintCard: '#e6f4f2',
  mintPill: '#d5ecea',
  gold: '#f9d77e',
  goldDark: '#3d2f06',
  goldBg: '#fefae9',
  border: '#e3ecea',
  textDark: '#1b2a29',
  textMuted: '#52625f',
  textLight: '#8a9895',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
