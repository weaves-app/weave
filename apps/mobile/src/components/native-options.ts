export const ACCESSIBILITY_ROLE = {
  BUTTON: 'button',
  IMAGE: 'image',
  ALERT: 'alert',
  HEADER: 'header',
} as const;

export const ACCESSIBILITY_IMPORTANCE = {
  AUTO: 'auto',
  NO: 'no',
  HIDE_DESCENDANTS: 'no-hide-descendants',
} as const;

export const ACCESSIBILITY_LIVE_REGION = {
  POLITE: 'polite',
} as const;

export const POINTER_EVENTS = {
  AUTO: 'auto',
  NONE: 'none',
} as const;

export const FLEX_ALIGNMENT = {
  START: 'flex-start',
  CENTER: 'center',
  SPACE_BETWEEN: 'space-between',
} as const;

export const FLEX_DIRECTION = {
  ROW: 'row',
} as const;

export const FLEX_WRAP = {
  WRAP: 'wrap',
} as const;

export const POSITION = {
  ABSOLUTE: 'absolute',
} as const;

export const OVERFLOW = {
  HIDDEN: 'hidden',
} as const;

export const IMAGE_RESIZE_MODE = {
  CONTAIN: 'contain',
} as const;

export const SIZE = {
  FULL: '100%',
} as const;

export const SAFE_AREA_EDGE = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export const KEYBOARD_AVOIDANCE = {
  PADDING: 'padding',
} as const;

export const KEYBOARD_DISMISS_MODE = {
  ON_DRAG: 'on-drag',
} as const;

export const KEYBOARD_TAPS = {
  HANDLED: 'handled',
} as const;

export const STATUS_BAR_STYLE = {
  DARK_CONTENT: 'dark-content',
} as const;

export const PLATFORM = {
  IOS: 'ios',
} as const;

export const APP_STATE = {
  ACTIVE: 'active',
} as const;

export const NATIVE_EVENT = {
  APP_STATE_CHANGE: 'change',
  REDUCE_MOTION_CHANGED: 'reduceMotionChanged',
} as const;

export const DIMENSION = {
  WINDOW: 'window',
} as const;
