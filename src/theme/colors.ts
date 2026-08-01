export const colors = {
  background: '#F2F2F2',
  surface: '#FFFFFF',
  ink: '#111111',
  inkMuted: '#8A8A8A',
  inkSoft: '#555555',
  backArrow: '#8B9BB0',
  border: '#E5E5E5',
  black: '#000000',
  white: '#FFFFFF',
  accent: '#2F6BFF',
  danger: '#D64545',
  tape: '#D8D0BC',
  paperShadow: 'rgba(0, 0, 0, 0.08)',
  tabShadow: 'rgba(0, 0, 0, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.35)',
} as const;

export type ColorToken = keyof typeof colors;
