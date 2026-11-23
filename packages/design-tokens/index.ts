export const tokens = {
  colors: {
    background: '#F8F6EE',
    surface: '#ffffff',
    text: '#2E3A2F',
    muted: '#5b665f',
    primary: '#2E3A2F',
    onPrimary: '#F8F6EE',
    accent: '#C96F4F',
    border: '#D9C9B2',
    support: '#6B7F58',
    inputSurface: '#FCFBF7',
    subtleSurface: '#EEEADD',
    brandSurface: '#D9C9B2',
    focus: '#6B7F58',
  },
  fonts: {regular: 'Figtree-Regular', semibold: 'Figtree-SemiBold', bold: 'Figtree-Bold'},
  spacing: {tiny: 4, small: 8, compact: 12, medium: 16, large: 24, extraLarge: 32},
  radii: {control: 6, slot: 8, panel: 16, round: 999},
  typeSizes: {heading: 32, supporting: 15, label: 13, caption: 12, code: 26},
  motion: {formTransitionMs: 220},
  radius: 12,
} as const;

// Web authentication branding; existing native tokens remain independently owned.
export const authTokens = {
  colors: {
    primary: '#2E3A2F',
    secondary: '#6B7F58',
    hero: '#D9C9B2',
    accent: '#C96F4F',
    background: '#F8F6EE',
  },
  motion: {feedbackMs: 160, easing: 'cubic-bezier(.22, 1, .36, 1)'},
} as const;
