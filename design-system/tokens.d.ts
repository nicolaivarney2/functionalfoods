/**
 * Type declarations for design-system/tokens.js
 *
 * Tokens live in plain JS so they can be consumed by Tailwind config (CJS),
 * by Next.js (ESM interop), and later by React Native. This .d.ts gives
 * TypeScript code full type safety when importing from the JS module.
 */

declare const tokens: {
  colors: {
    neutral: Record<
      '0' | '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
      string
    >;
    brand: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
      string
    >;
    accent: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
      string
    >;
    success: Record<'50' | '100' | '500' | '600' | '700' | '900', string>;
    warning: Record<'50' | '100' | '500' | '600' | '700' | '900', string>;
    danger: Record<'50' | '100' | '500' | '600' | '700' | '900', string>;
    info: Record<'50' | '100' | '500' | '600' | '700' | '900', string>;
    dietary: {
      keto: string;
      paleo: string;
      antiInflammatory: string;
      flexitarian: string;
      proteinRich: string;
      fiveTwo: string;
      glp1: string;
      sense: string;
      weightLoss: string;
      calorieCounting: string;
    };
  };

  spacing: Record<string, string>;

  radii: {
    none: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
  };

  typography: {
    fonts: { body: string; display: string; mono: string };
    weights: { regular: 400; medium: 500; semibold: 600; bold: 700 };
    scale: Record<
      | 'display'
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'bodyLg'
      | 'body'
      | 'bodySm'
      | 'label'
      | 'caption'
      | 'micro',
      { size: number; lineHeight: number; weight: number; tracking: string }
    >;
    fontSize: Record<
      string,
      [string, { lineHeight: string; letterSpacing: string; fontWeight: number }]
    >;
  };

  shadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', string>;

  shadowsNative: Record<
    'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl',
    {
      shadowColor: string;
      shadowOpacity: number;
      shadowOffset?: { width: number; height: number };
      shadowRadius: number;
      elevation: number;
    }
  >;

  breakpoints: Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', string>;

  motion: {
    durations: Record<'instant' | 'fast' | 'base' | 'slow' | 'slower', number>;
    easings: Record<'standard' | 'emphasized' | 'decelerate' | 'accelerate', string>;
  };

  zIndex: Record<
    'base' | 'dropdown' | 'sticky' | 'banner' | 'overlay' | 'modal' | 'popover' | 'toast' | 'tooltip',
    number
  >;

  mobile: {
    touchTarget: { min: number; comfortable: number };
    safeArea: { top: number; bottom: number };
    frames: {
      iphone15Pro: { width: number; height: number };
      iphoneSe: { width: number; height: number };
      androidStandard: { width: number; height: number };
    };
    tabBar: { height: number };
    appBar: { height: number };
  };
};

export = tokens;
