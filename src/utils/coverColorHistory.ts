import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSameColor } from './color';

const STORAGE_KEY = '@damgil/cover-color-history';
const MAX_STORED = 24;

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const raw = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return null;
  }
  return `#${raw.toUpperCase()}`;
}

export function uniqueColors(values: Array<string | null | undefined>): string[] {
  const next: string[] = [];
  for (const value of values) {
    const hex = value ? normalizeHex(value) : null;
    if (!hex) {
      continue;
    }
    if (!next.some((item) => isSameColor(item, hex))) {
      next.push(hex);
    }
  }
  return next.slice(0, MAX_STORED);
}

export async function loadCoverColorHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return uniqueColors(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return [];
  }
}

export async function saveCoverColorHistory(colors: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueColors(colors)));
}

export function isLightCoverColor(hex: string): boolean {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) {
    return false;
  }
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
}
