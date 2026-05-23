const tokens = require('./design-system/tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: tokens.breakpoints,
    extend: {
      colors: {
        neutral: tokens.colors.neutral,
        brand: tokens.colors.brand,
        accent: tokens.colors.accent,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
        info: tokens.colors.info,
        dietary: tokens.colors.dietary,
        // Backwards-compat: legacy "primary" alias to brand
        primary: tokens.colors.brand,
      },
      spacing: tokens.spacing,
      borderRadius: tokens.radii,
      fontFamily: {
        sans: tokens.typography.fonts.body.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
        display: tokens.typography.fonts.display.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
        mono: tokens.typography.fonts.mono.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
      },
      fontSize: tokens.typography.fontSize,
      boxShadow: tokens.shadows,
      transitionDuration: Object.fromEntries(
        Object.entries(tokens.motion.durations).map(([k, v]) => [k, `${v}ms`])
      ),
      transitionTimingFunction: tokens.motion.easings,
      zIndex: Object.fromEntries(
        Object.entries(tokens.zIndex).map(([k, v]) => [k, String(v)])
      ),
    },
  },
  plugins: [],
}
