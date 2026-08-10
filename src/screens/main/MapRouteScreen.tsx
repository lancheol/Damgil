import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { LatLng, Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAP_PLACES } from '../../constants/mapPlaces';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MapRoute'>;

type TravelMode = 'car' | 'transit' | 'walk' | 'bike';

type ModeConfig = {
  id: TravelMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** 경로 API 연동 전 예상 시간 계산용 평균 속도 */
  speedKmh: number;
  appleDirFlag: string;
  googleTravelMode: string;
};

const MODES: ModeConfig[] = [
  { id: 'car', label: '승용차', icon: 'car', speedKmh: 24, appleDirFlag: 'd', googleTravelMode: 'driving' },
  { id: 'transit', label: '대중교통', icon: 'bus', speedKmh: 17, appleDirFlag: 'r', googleTravelMode: 'transit' },
  { id: 'walk', label: '도보', icon: 'walk', speedKmh: 4.5, appleDirFlag: 'w', googleTravelMode: 'walking' },
  { id: 'bike', label: '자전거', icon: 'bicycle', speedKmh: 13, appleDirFlag: 'w', googleTravelMode: 'bicycling' },
];

/** 위치 권한이 없을 때 사용하는 기본 출발지 (성수역) */
const DEFAULT_ORIGIN: LatLng = { latitude: 37.5446, longitude: 127.0559 };
const CURRENT_LOCATION_LABEL = '현재 위치';

export function MapRouteScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const initialPlace = MAP_PLACES.find((place) => place.id === route.params.placeId) ?? MAP_PLACES[0];

  const [origin, setOrigin] = useState<LatLng>(DEFAULT_ORIGIN);
  const [originText, setOriginText] = useState(CURRENT_LOCATION_LABEL);
  const [destination, setDestination] = useState<LatLng>({
    latitude: initialPlace.latitude,
    longitude: initialPlace.longitude,
  });
  const [destinationText, setDestinationText] = useState(initialPlace.name);
  const [mode, setMode] = useState<TravelMode>('car');
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentLocation = async () => {
      const current = await Location.getForegroundPermissionsAsync();
      const granted = current.granted
        ? true
        : (await Location.requestForegroundPermissionsAsync()).granted;
      if (!granted || cancelled) {
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      if (cancelled) {
        return;
      }

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setOrigin((prev) => (usingCurrentLocation ? coords : prev));
    };

    void loadCurrentLocation();
    return () => {
      cancelled = true;
    };
    // 최초 진입 시 한 번만 현재 위치를 가져온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const path = useMemo(() => buildRoutePath(origin, destination), [origin, destination]);
  const distanceKm = useMemo(() => haversineKm(origin, destination), [origin, destination]);

  useEffect(() => {
    mapRef.current?.fitToCoordinates([origin, destination], {
      edgePadding: { top: 320, right: 80, bottom: 320, left: 80 },
      animated: true,
    });
  }, [origin, destination]);

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const minutes = Math.max(1, Math.round((distanceKm / activeMode.speedKmh) * 60));
  const distanceLabel = distanceKm.toFixed(1);

  const applyPlaceSearch = (text: string, target: 'origin' | 'destination') => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    if (target === 'origin' && trimmed === CURRENT_LOCATION_LABEL) {
      setUsingCurrentLocation(true);
      return;
    }

    const matched = MAP_PLACES.find((place) => place.name.includes(trimmed));
    if (!matched) {
      return;
    }

    const coords = { latitude: matched.latitude, longitude: matched.longitude };
    if (target === 'origin') {
      setUsingCurrentLocation(false);
      setOrigin(coords);
      setOriginText(matched.name);
      return;
    }

    setDestination(coords);
    setDestinationText(matched.name);
  };

  const swapEndpoints = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginText(destinationText);
    setDestinationText(originText);
    setUsingCurrentLocation(false);
  };

  const startNavigation = () => {
    const { latitude, longitude } = destination;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?saddr=${origin.latitude},${origin.longitude}&daddr=${latitude},${longitude}&dirflg=${activeMode.appleDirFlag}`
        : `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${latitude},${longitude}&travelmode=${activeMode.googleTravelMode}`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => Keyboard.dismiss()}
      >
        <Polyline
          coordinates={path}
          strokeColor="#2B7FFF"
          strokeWidth={2}
          lineDashPattern={[1, 4]}
          lineCap="round"
        />
        <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.originHalo}>
            <View style={styles.originRing}>
              <View style={styles.originDot} />
            </View>
          </View>
        </Marker>
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.markerWrap}>
            <View style={styles.markerBubble}>
              <Ionicons name="heart" size={16} color={colors.white} />
            </View>
            <View style={styles.markerStem} />
          </View>
        </Marker>
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#1E2939" />
          </Pressable>
          <Text style={styles.headerTitle}>길찾기</Text>
        </View>

        <View style={styles.endpointGroup}>
          <View style={styles.endpointRow}>
            <Text style={[styles.endpointLabel, styles.endpointLabelStart]}>출발</Text>
            <TextInput
              style={styles.endpointInput}
              value={originText}
              onChangeText={setOriginText}
              onSubmitEditing={(event) => applyPlaceSearch(event.nativeEvent.text, 'origin')}
              returnKeyType="search"
              placeholder="출발지 검색"
              placeholderTextColor="#99A1AF"
            />
          </View>

          <View style={styles.endpointRow}>
            <Text style={[styles.endpointLabel, styles.endpointLabelEnd]}>도착</Text>
            <TextInput
              style={styles.endpointInput}
              value={destinationText}
              onChangeText={setDestinationText}
              onSubmitEditing={(event) => applyPlaceSearch(event.nativeEvent.text, 'destination')}
              returnKeyType="search"
              placeholder="도착지 검색"
              placeholderTextColor="#99A1AF"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="출발지와 도착지 바꾸기"
            hitSlop={8}
            style={styles.swapButton}
            onPress={swapEndpoints}
          >
            <Ionicons name="swap-vertical" size={16} color="#1E2939" />
          </Pressable>
        </View>

        <View style={styles.modeRow}>
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : {}}
                style={[styles.modeItem, active && styles.modeItemActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setMode(item.id);
                }}
              >
                <Ionicons name={item.icon} size={20} color={active ? '#101828' : '#99A1AF'} />
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>최적 경로</Text>
            </View>
            <Text style={styles.cardCost}>{costLabel(activeMode.id, distanceKm)}</Text>
          </View>

          <View style={styles.durationRow}>
            {formatDuration(minutes).map((part) => (
              <View key={part.unit} style={styles.durationPart}>
                <Text style={styles.durationValue}>{part.value}</Text>
                <Text style={styles.durationUnit}>{part.unit}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.cardDetail}>
            {distanceLabel}km · {detailLabel(activeMode.id)}
          </Text>

          <Pressable accessibilityRole="button" style={styles.startButton} onPress={startNavigation}>
            <Text style={styles.startButtonText}>안내 시작</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** 60분이 넘으면 '1시간 13분'처럼 시간과 분을 나눠서 보여준다 */
function formatDuration(totalMinutes: number): { value: number; unit: string }[] {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return [{ value: minutes, unit: '분' }];
  }

  if (minutes === 0) {
    return [{ value: hours, unit: '시간' }];
  }

  return [
    { value: hours, unit: '시간' },
    { value: minutes, unit: '분' },
  ];
}

/** 경로 API 연동 전 임시 요금 안내 */
function costLabel(mode: TravelMode, distanceKm: number) {
  if (mode === 'car') {
    const fare = Math.round((4800 + distanceKm * 1000) / 100) * 100;
    return `택시 약 ${fare.toLocaleString('ko-KR')}원`;
  }
  if (mode === 'transit') {
    return '대중교통 1,400원';
  }
  return '요금 없음';
}

function detailLabel(mode: TravelMode) {
  switch (mode) {
    case 'car':
      return '통행료 0원';
    case 'transit':
      return '지하철·버스 환승';
    case 'walk':
      return '도보 이동';
    default:
      return '자전거 이동';
  }
}

function haversineKm(from: LatLng, to: LatLng) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 실제 경로 데이터가 없어 출발·도착을 잇는 완만한 곡선을 그린다 */
function buildRoutePath(from: LatLng, to: LatLng, segments = 32): LatLng[] {
  const dLat = to.latitude - from.latitude;
  const dLng = to.longitude - from.longitude;
  const control: LatLng = {
    latitude: (from.latitude + to.latitude) / 2 - dLng * 0.16,
    longitude: (from.longitude + to.longitude) / 2 + dLat * 0.16,
  };

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const inv = 1 - t;
    return {
      latitude: inv * inv * from.latitude + 2 * inv * t * control.latitude + t * t * to.latitude,
      longitude: inv * inv * from.longitude + 2 * inv * t * control.longitude + t * t * to.longitude,
    };
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101828',
  },
  markerStem: {
    width: 4,
    height: 8,
    marginTop: 2,
    backgroundColor: '#101828',
  },
  originHalo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43, 127, 255, 0.2)',
  },
  originRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2B7FFF',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2939',
  },
  endpointGroup: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  endpointLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  endpointLabelStart: {
    color: '#155DFC',
  },
  endpointLabelEnd: {
    color: '#FB2C36',
  },
  endpointInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1E2939',
    padding: 0,
  },
  swapButton: {
    position: 'absolute',
    right: spacing.xxl,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  modeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeItemActive: {
    borderBottomColor: '#101828',
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#99A1AF',
  },
  modeLabelActive: {
    color: '#101828',
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    marginHorizontal: spacing.lg,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
  },
  cardBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#155DFC',
  },
  cardCost: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6A7282',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  durationPart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  durationValue: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: '#101828',
  },
  durationUnit: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#101828',
  },
  cardDetail: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#6A7282',
  },
  startButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: '#155DFC',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
