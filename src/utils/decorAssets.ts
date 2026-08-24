import { Platform, TextStyle } from 'react-native';

import { DecorFontId } from '../types/diary';

/** expo-font 로드 키와 Text style.fontFamily에 동일하게 사용 */
export const KERIS_KEDU_FONT_FAMILY = {
  regular: 'KerisKedu',
  bold: 'KerisKeduBold',
  line: 'KerisKeduLine',
} as const;

export const DECOR_FONT_IDS: DecorFontId[] = [
  'sans',
  'serif',
  'mono',
  'rounded',
  'hand',
  'display',
  'kedu',
  'keduBold',
  'keduLine',
];

export function isDecorFontId(value: unknown): value is DecorFontId {
  return typeof value === 'string' && DECOR_FONT_IDS.includes(value as DecorFontId);
}

export const DECOR_FONTS: {
  id: DecorFontId;
  label: string;
  style: TextStyle;
}[] = [
  {
    id: 'sans',
    label: '고딕',
    style: {
      fontWeight: '700',
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: undefined }),
    },
  },
  {
    id: 'serif',
    label: '명조',
    style: {
      fontWeight: '600',
      fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    },
  },
  {
    id: 'mono',
    label: '타자',
    style: {
      fontWeight: '700',
      fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    },
  },
  {
    id: 'rounded',
    label: '둥근고딕',
    style: {
      fontWeight: '700',
      fontFamily: Platform.select({
        ios: 'Avenir Next',
        android: 'sans-serif-medium',
        default: undefined,
      }),
    },
  },
  {
    id: 'hand',
    label: '손글씨',
    style: {
      fontWeight: '400',
      fontFamily: Platform.select({
        ios: 'Noteworthy',
        android: 'casual',
        default: undefined,
      }),
      fontStyle: 'italic',
    },
  },
  {
    id: 'display',
    label: '디스플레이',
    style: {
      fontWeight: '800',
      fontFamily: Platform.select({
        ios: 'Helvetica Neue',
        android: 'sans-serif-black',
        default: undefined,
      }),
      letterSpacing: 1.2,
    },
  },
  {
    id: 'kedu',
    label: '케듀',
    style: {
      fontFamily: KERIS_KEDU_FONT_FAMILY.regular,
    },
  },
  {
    id: 'keduBold',
    label: '케듀 Bold',
    style: {
      fontFamily: KERIS_KEDU_FONT_FAMILY.bold,
    },
  },
  {
    id: 'keduLine',
    label: '케듀 Line',
    style: {
      fontFamily: KERIS_KEDU_FONT_FAMILY.line,
    },
  },
];

export const DECOR_STICKER_EMOJIS = [
  '✈️',
  '📷',
  '⭐',
  '❤️',
  '🌴',
  '🗺️',
  '☀️',
  '🌙',
  '🌊',
  '🏔️',
  '☕',
  '🍜',
  '🌸',
  '🍀',
  '📍',
  '🚗',
  '🚂',
  '🎒',
  '✨',
  '💫',
  '🎵',
  '📝',
  '🌈',
  '🔥',
] as const;

export function getDecorFontStyle(fontId: DecorFontId): TextStyle {
  return DECOR_FONTS.find((font) => font.id === fontId)?.style ?? DECOR_FONTS[0].style;
}

export function createStickerId(prefix = 'sticker'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const DECOR_TEXT_COLORS = [
  '#FFFFFF',
  '#111111',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#5AC8FA',
  '#007AFF',
  '#AF52DE',
  '#FF2D55',
] as const;

export const DEFAULT_DECOR_TEXT_COLOR = DECOR_TEXT_COLORS[0];
