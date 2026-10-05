// Same palette as the web app (frontend/src/index.css): mint sidebar, yellow CTA, teal brand.
export const colors = {
  brand50: '#f0f8f7',
  brand100: '#dcefec',
  brand200: '#bce0db',
  brand300: '#8fcac3',
  brand400: '#5aada5',
  brand500: '#3a918a',
  brand600: '#2b7a74',
  brand700: '#246460',
  brand800: '#1f504d',
  brand900: '#1b4240',

  mint50: '#f3faf9',
  mint100: '#e6f4f2',
  mint200: '#d5ecea',
  mint300: '#bfe0dd',

  sun50: '#fefae9',
  sun100: '#fdf1c9',
  sun200: '#fbe39a',
  sun300: '#f9d77e',
  sun400: '#f6c955',
  sun500: '#edb52f',
  sun800: '#7d5410',
  sun900: '#3d2f06',

  cream100: '#fbf6e6',
  cream200: '#f5ebcb',

  peach50: '#fff6f0',
  peach100: '#fde7da',
  peach500: '#de7a4c',
  peach700: '#9c4623',

  lilac50: '#f6f4fc',
  lilac100: '#eae5f8',
  lilac500: '#8a78c9',
  lilac700: '#5b4a9a',

  bg: '#f6faf9',
  card: '#ffffff',
  bgTertiary: '#eef5f4',
  border: '#e3ecea',
  borderStrong: '#cfdcd9',

  text: '#1b2a29',
  text2: '#52625f',
  text3: '#8a9895',

  success: '#1f7a4d',
  successBg: '#e5f5ec',
  warning: '#a04d12',
  warningBg: '#fff1e2',
  danger: '#b4362f',
  dangerBg: '#fdeceb',
  white: '#ffffff',
};

export const fonts = {
  regular: 'PJS-400',
  medium: 'PJS-500',
  semibold: 'PJS-600',
  bold: 'PJS-700',
  extrabold: 'PJS-800',
};

export const radius = { sm: 8, input: 12, btn: 12, card: 18, sheet: 24, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const shadow = {
  card: {
    shadowColor: '#1b2a29',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  lift: {
    shadowColor: '#1b2a29',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

// Pastel tones used for tiles, chips and avatars
export type Tone = 'mint' | 'sun' | 'peach' | 'lilac' | 'white' | 'brand' | 'danger' | 'success' | 'warning';
export const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  mint: { bg: colors.mint100, fg: colors.brand700, border: colors.mint200 },
  sun: { bg: colors.cream100, fg: colors.sun800, border: colors.sun200 },
  peach: { bg: colors.peach50, fg: colors.peach700, border: colors.peach100 },
  lilac: { bg: colors.lilac50, fg: colors.lilac700, border: colors.lilac100 },
  white: { bg: colors.white, fg: colors.brand700, border: colors.border },
  brand: { bg: colors.brand600, fg: colors.white, border: colors.brand600 },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBg },
  success: { bg: colors.successBg, fg: colors.success, border: colors.successBg },
  warning: { bg: colors.warningBg, fg: colors.warning, border: colors.warningBg },
};

// Gradients for hero cards (top-left → bottom-right)
export const gradients = {
  brand: ['#3a918a', '#2b7a74', '#1b4240'] as const,
  sun: ['#fbe39a', '#f6c955', '#edb52f'] as const,
  lilac: ['#8a78c9', '#6c5bb0', '#4a3c86'] as const,
  peach: ['#f0a079', '#de7a4c', '#b65a30'] as const,
  login: ['#d5ecea', '#bfe0dd', '#8fcac3'] as const,
};
export type Gradient = keyof typeof gradients;
