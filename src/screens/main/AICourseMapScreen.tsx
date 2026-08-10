import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AICourseMap'>;

const H_PADDING = 16;
const ACCENT = '#155DFC';

export function AICourseMapScreen({ navigation, route }: Props) {
  const { course } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [dayIndex, setDayIndex] = useState(0);

  const day = course.days[dayIndex] ?? course.days[0];
  const stops = day?.stops ?? [];

  useEffect(() => {
    if (stops.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(
      stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
      {
        edgePadding: { top: 120, right: 80, bottom: 320, left: 80 },
        animated: true,
      },
    );
  }, [stops]);

  const initialStop = stops[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle}>코스 지도</Text>
      </View>

      <View style={styles.dayTabs}>
        {course.days.map((item, index) => {
          const active = index === dayIndex;
          return (
            <Pressable
              key={item.day}
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
              style={[styles.dayTab, active && styles.dayTabActive]}
              onPress={() => setDayIndex(index)}
            >
              <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                {item.day}일차
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: initialStop?.latitude ?? 37.5665,
            longitude: initialStop?.longitude ?? 126.978,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
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
              key={stop.id}
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
            <Text style={styles.routeTitle}>{day?.day ?? 1}일차 경로</Text>
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
                  <Text style={styles.routeTime}>{stop.time}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
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
  dayTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: H_PADDING,
    paddingVertical: 12,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 1,
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
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
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
    padding: 16,
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
  routeTitle: {
    paddingLeft: 4,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1E2939',
  },
  routeList: {
    gap: 12,
    paddingTop: 12,
    paddingRight: 4,
  },
  routeItem: {
    minWidth: 140,
    paddingLeft: 12,
    paddingRight: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  routeItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    color: colors.white,
  },
  routeName: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#1E2939',
  },
  routeTime: {
    paddingLeft: 28,
    paddingTop: 4,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    color: '#6A7282',
  },
});
