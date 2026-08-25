import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Region } from 'react-native-maps';

import { createDebounced } from './debounce';

const STORAGE_KEY = 'damgil.map.locationPrefs.v1';
const PERSIST_DEBOUNCE_MS = 900;

export type MapLocationPrefs = {
  showsUserLocation: boolean;
  region: Region | null;
};

const DEFAULT_PREFS: MapLocationPrefs = {
  showsUserLocation: false,
  region: null,
};

function isValidRegion(value: unknown): value is Region {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const region = value as Partial<Region>;
  return (
    typeof region.latitude === 'number' &&
    typeof region.longitude === 'number' &&
    typeof region.latitudeDelta === 'number' &&
    typeof region.longitudeDelta === 'number' &&
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta)
  );
}

async function writePrefs(prefs: MapLocationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 로컬 저장 실패는 무시
  }
}

const debouncedWrite = createDebounced((prefs: MapLocationPrefs) => {
  void writePrefs(prefs);
}, PERSIST_DEBOUNCE_MS);

export async function loadMapLocationPrefs(): Promise<MapLocationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw) as Partial<MapLocationPrefs>;
    return {
      showsUserLocation: Boolean(parsed.showsUserLocation),
      region: isValidRegion(parsed.region) ? parsed.region : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** 메모리 반영은 호출측에서 즉시, 디스크는 디바운스. */
export async function saveMapLocationPrefs(prefs: MapLocationPrefs): Promise<void> {
  debouncedWrite(prefs);
}

export function flushMapLocationPrefs(): void {
  debouncedWrite.flush();
}
