import { Platform, TextStyle } from 'react-native';

const monoFont = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export const typography = {
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  } satisfies TextStyle,
  greeting: {
    fontSize: 15,
    fontWeight: '400',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    fontWeight: '600',
  } satisfies TextStyle,
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  } satisfies TextStyle,
  monoTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: monoFont,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  monoBody: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: monoFont,
    lineHeight: 18,
  } satisfies TextStyle,
  button: {
    fontSize: 16,
    fontWeight: '700',
  } satisfies TextStyle,
} as const;
