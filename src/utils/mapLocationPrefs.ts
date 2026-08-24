import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Region } from 'react-native-maps';

const STORAGE_KEY = 'damgil.map.locationPrefs.v1';

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

export async function saveMapLocationPrefs(prefs: MapLocationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // 로컬 저장 실패는 무시
  }
}
