/**
 * Functional Foods Design Tokens
 *
 * Single source of truth for design values used by:
 *   - Web (Next.js + Tailwind)  -> consumed via tailwind.config.js
 *   - React Native (future)     -> imported directly
 *   - Figma                     -> via tokens.json (kept in sync)
 *
 * Authoring rules:
 *   - Keep this file plain CommonJS so Tailwind config can require() it
 *   - Update tokens.json in lockstep when changing values
 *   - Prefer adding new tokens over hard-coding values in components
 */

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const colors = {
  // Pure neutrals - the backbone of the minimal aesthetic
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Brand accent - warm sage green (functional / food / health)
  // Provisional; brand identity can swap these without touching components
  brand: {
    50: '#f3f7f3',
    100: '#e3eee5',
    200: '#c5dcc9',
    300: '#9cc1a2',
    400: '#6ea177',
    500: '#4c8556',
    600: '#3a6a43',
    700: '#305537',
    800: '#28452e',
    900: '#223a28',
    950: '#0f1f14',
  },

  // Secondary accent - terracotta / warmth for highlights, badges
  accent: {
    50: '#fdf6f3',
    100: '#fbe8e0',
    200: '#f7cdbd',
    300: '#f0a78c',
    400: '#e87b59',
    500: '#dc5a36',
    600: '#c64627',
    700: '#a53721',
    800: '#852f20',
    900: '#6d2a1f',
    950: '#3b130c',
  },

  // Semantic colors (status, feedback)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    900: '#78350f',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#7f1d1d',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },

  // Dietary tag colors - one hue per major diet category
  // Used for chips/badges on recipes and across filter UI
  dietary: {
    keto: '#7c3aed', // purple
    paleo: '#b45309', // amber/brown
    antiInflammatory: '#0d9488', // teal
    flexitarian: '#65a30d', // lime
    proteinRich: '#dc2626', // red
    fiveTwo: '#0284c7', // sky
    glp1: '#9333ea', // violet
    sense: '#0891b2', // cyan
    weightLoss: '#db2777', // pink
    calorieCounting: '#ea580c', // orange
  },
};

// ---------------------------------------------------------------------------
// Spacing - 4px baseline grid
// ---------------------------------------------------------------------------

const spacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
};

// ---------------------------------------------------------------------------
// Border radii - soft, app-native scale
// ---------------------------------------------------------------------------

const radii = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
};

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

const fontFamilies = {
  body: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(', '),
  display: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Menlo',
    'Consolas',
    'monospace',
  ].join(', '),
};

const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Type scale - each entry has size + lineHeight (both in pixels)
// Tailwind consumes via fontSize: { name: [size, { lineHeight, fontWeight }] }
const typeScale = {
  display: { size: 40, lineHeight: 48, weight: fontWeights.bold, tracking: '-0.02em' },
  h1: { size: 32, lineHeight: 40, weight: fontWeights.bold, tracking: '-0.02em' },
  h2: { size: 28, lineHeight: 36, weight: fontWeights.bold, tracking: '-0.01em' },
  h3: { size: 24, lineHeight: 32, weight: fontWeights.semibold, tracking: '-0.01em' },
  h4: { size: 20, lineHeight: 28, weight: fontWeights.semibold, tracking: '0em' },
  h5: { size: 18, lineHeight: 26, weight: fontWeights.semibold, tracking: '0em' },
  bodyLg: { size: 18, lineHeight: 28, weight: fontWeights.regular, tracking: '0em' },
  body: { size: 16, lineHeight: 24, weight: fontWeights.regular, tracking: '0em' },
  bodySm: { size: 14, lineHeight: 20, weight: fontWeights.regular, tracking: '0em' },
  label: { size: 14, lineHeight: 20, weight: fontWeights.medium, tracking: '0em' },
  caption: { size: 12, lineHeight: 16, weight: fontWeights.regular, tracking: '0.01em' },
  micro: { size: 11, lineHeight: 14, weight: fontWeights.medium, tracking: '0.04em' },
};

// Tailwind-shaped fontSize map (precomputed from typeScale)
const fontSize = Object.fromEntries(
  Object.entries(typeScale).map(([key, v]) => [
    key,
    [
      `${v.size}px`,
      { lineHeight: `${v.lineHeight}px`, letterSpacing: v.tracking, fontWeight: v.weight },
    ],
  ])
);

const typography = {
  fonts: fontFamilies,
  weights: fontWeights,
  scale: typeScale,
  fontSize, // tailwind-ready
};

// ---------------------------------------------------------------------------
// Shadows - web string + RN-shaped variant
// ---------------------------------------------------------------------------

const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  md: '0 2px 6px -1px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  lg: '0 8px 16px -4px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  xl: '0 16px 32px -8px rgb(0 0 0 / 0.12), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
  '2xl': '0 24px 48px -12px rgb(0 0 0 / 0.18)',
};

// React Native shadow shapes (iOS shadowOffset + Android elevation)
const shadowsNative = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 8,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 48,
    elevation: 12,
  },
};

// ---------------------------------------------------------------------------
// Breakpoints (web only - RN handles responsiveness via Dimensions)
// ---------------------------------------------------------------------------

const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ---------------------------------------------------------------------------
// Motion - durations + easing curves (web + RN compatible)
// ---------------------------------------------------------------------------

const motion = {
  durations: {
    instant: 0,
    fast: 150,
    base: 200,
    slow: 300,
    slower: 500,
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
};

// ---------------------------------------------------------------------------
// Z-index scale
// ---------------------------------------------------------------------------

const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  toast: 1600,
  tooltip: 1700,
};

// ---------------------------------------------------------------------------
// Mobile layout - safe areas + touch targets
// ---------------------------------------------------------------------------

const mobile = {
  touchTarget: {
    min: 44, // Apple HIG minimum
    comfortable: 48, // Material Design minimum
  },
  safeArea: {
    top: 47, // iPhone Dynamic Island / notch
    bottom: 34, // iPhone home indicator
  },
  frames: {
    iphone15Pro: { width: 393, height: 852 },
    iphoneSe: { width: 375, height: 667 },
    androidStandard: { width: 360, height: 800 },
  },
  tabBar: {
    height: 49,
  },
  appBar: {
    height: 44,
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  shadowsNative,
  breakpoints,
  motion,
  zIndex,
  mobile,
};
