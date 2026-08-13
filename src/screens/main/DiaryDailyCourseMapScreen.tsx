import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTripDailyCourse } from '../../api/trips';
import { loadTokens } from '../../api/tokenStorage';
import { BackButton } from '../../components/common/BackButton';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import {
  buildLocalDailyCourse,
  DailyCourseDay,
  mergeDailyCourseWithLocal,
  normalizeTripDailyCourse,
  resolveDailyCourseCoordinates,
} from '../../utils/tripDailyCourse';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryDailyCourseMap'>;

const H_PADDING = 16;
const ACCENT = '#2F6BFF';

function regionForStops(stops: { latitude: number; longitude: number }[]) {
  if (stops.length === 0) {
    return {
      latitude: 37.5665,
      longitude: 126.978,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }
  let minLat = stops[0].latitude;
  let maxLat = stops[0].latitude;
  let minLng = stops[0].longitude;
  let maxLng = stops[0].longitude;
  for (const stop of stops) {
    minLat = Math.min(minLat, stop.latitude);
    maxLat = Math.max(maxLat, stop.latitude);
    minLng = Math.min(minLng, stop.longitude);
    maxLng = Math.max(maxLng, stop.longitude);
  }
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.02, (maxLat - minLat) * 1.8 || 0.04);
  const longitudeDelta = Math.max(0.02, (maxLng - minLng) * 1.8 || 0.04);
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function DiaryDailyCourseMapScreen({ navigation, route }: Props) {
  const { diaryId, dayNumber } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const mapReadyRef = useRef(false);
  const { getDiaryById } = useDiaries();
  const diary = getDiaryById(diaryId);

  const [days, setDays] = useState<DailyCourseDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(dayNumber ?? 1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      mapReadyRef.current = false;
      const localFallback = diary ? buildLocalDailyCourse(diary) : [];
      let next = localFallback;

      try {
        const tokens = await loadTokens();
        if (tokens?.access) {
          const raw = await getTripDailyCourse(tokens.access, diaryId);
          const fromApi = normalizeTripDailyCourse(raw);
          next = mergeDailyCourseWithLocal(fromApi, localFallback);
        }
      } catch {
        // 로컬 폴백 유지
      }

      // TourAPI 좌표로 교정 (예전 거제 stub 저장값 포함)
      next = await resolveDailyCourseCoordinates(next);

      if (cancelled) {
        return;
      }

      setDays(next);
      const preferred =
        next.find((item) => item.day === dayNumber)?.day ?? next[0]?.day ?? 1;
      setSelectedDay(preferred);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [diaryId, diary, dayNumber]);

  const day = useMemo(
    () => days.find((item) => item.day === selectedDay) ?? days[0] ?? null,
    [days, selectedDay],
  );
  const stops = day?.stops ?? [];
  const mapRegion = useMemo(() => regionForStops(stops), [stops]);

  const fitMap = () => {
    if (stops.length === 0 || !mapRef.current) {
      return;
    }
    mapRef.current.fitToCoordinates(
      stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
      {
        edgePadding: { top: 120, right: 80, bottom: 320, left: 80 },
        animated: true,
      },
    );
  };

  useEffect(() => {
    if (!mapReadyRef.current || stops.length === 0) {
      return;
    }
    const timer = setTimeout(fitMap, 80);
    return () => clearTimeout(timer);
  }, [stops]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle}>일자별 경로</Text>
      </View>

      {days.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabs}
          style={styles.dayTabsScroll}
        >
          {days.map((item) => {
            const active = item.day === selectedDay;
            return (
              <Pressable
                key={item.day}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : {}}
                style={[styles.dayTab, active && styles.dayTabActive]}
                onPress={() => setSelectedDay(item.day)}
              >
                <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                  {item.day}일차
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.stateText}>경로를 불러오는 중…</Text>
          </View>
        ) : stops.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>이 날의 경로가 아직 없어요.</Text>
          </View>
        ) : (
          <>
            <MapView
              key={`day-${day?.day ?? selectedDay}-${stops.map((s) => s.id).join('-')}`}
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              onMapReady={() => {
                mapReadyRef.current = true;
                requestAnimationFrame(fitMap);
              }}
              showsMyLocationButton={false}
              showsCompass={false}
              toolbarEnabled={false}
            >
              {stops.length > 1 ? (
                <Polyline
                  coordinates={stops.map((stop) => ({
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                  }))}
                  strokeColor={ACCENT}
                  strokeWidth={2}
                  lineDashPattern={[1, 4]}
                  lineCap="round"
                />
              ) : null}

              {stops.map((stop, index) => (
                <Marker
                  key={`${stop.id}-${stop.latitude}-${stop.longitude}`}
                  coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                  anchor={{ x: 0.5, y: 0.35 }}
                >
                  <View style={styles.markerWrap}>
                    <View style={styles.markerCircle}>
                      <Text style={styles.markerNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.markerStem} />
                    <View style={styles.markerLabel}>
                      <Text style={styles.markerLabelText} numberOfLines={1}>
                        {stop.name}
                      </Text>
                    </View>
                  </View>
                </Marker>
              ))}
            </MapView>

            <View style={[styles.routeCardWrap, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.routeCard}>
                <Text style={styles.routeTitle}>{day?.day ?? selectedDay}일차 경로</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.routeList}
                >
                  {stops.map((stop, index) => (
                    <View key={stop.id} style={styles.routeItem}>
                      <View style={styles.routeItemHeader}>
                        <View style={styles.routeBadge}>
                          <Text style={styles.routeBadgeText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.routeName} numberOfLines={1}>
                          {stop.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
  },
  dayTabsScroll: {
    flexGrow: 0,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 1,
  },
  dayTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: H_PADDING,
    paddingVertical: 12,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  dayTabActive: {
    backgroundColor: '#101828',
  },
  dayTabText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#6A7282',
  },
  dayTabTextActive: {
    color: colors.white,
  },
  mapWrap: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 14,
    color: '#6A7282',
    textAlign: 'center',
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: colors.white,
  },
  markerNumber: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.white,
  },
  markerStem: {
    width: 4,
    height: 8,
    marginTop: 2,
    backgroundColor: ACCENT,
  },
  markerLabel: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  markerLabelText: {
    maxWidth: 96,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#1E2939',
  },
  routeCardWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_PADDING,
  },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  routeTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1E2939',
    marginBottom: 10,
  },
  routeList: {
    flexDirection: 'row',
    gap: 10,
  },
  routeItem: {
    width: 132,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  routeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  routeName: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#1E2939',
  },
});
