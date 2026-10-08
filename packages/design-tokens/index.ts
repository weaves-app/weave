export const tokens = {
  colors: {
    background: '#f6f4ef',
    surface: '#ffffff',
    text: '#252b28',
    muted: '#5b665f',
    primary: '#245b46',
    onPrimary: '#ffffff',
  },
  spacing: {small: 8, medium: 16, large: 24},
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
  motion: {entranceMs: 1350, feedbackMs: 160, easing: 'cubic-bezier(.22, 1, .36, 1)'},
} as const;
