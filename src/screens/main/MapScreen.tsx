import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MAP_CATEGORIES,
  MAP_INITIAL_REGION,
  MAP_PLACES,
  MapPlace,
  MapPlaceCategory,
} from '../../constants/mapPlaces';
import { listSavedPlaces, savePlace, unsavePlace } from '../../api/saves';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError } from '../../api/types';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** 장소별 관련 공개 다이어리 — API 연동 전까지 UI 골격용 */
type PlaceRelatedDiary = {
  id: string;
  authorNickname: string;
  title: string;
  dateLabel: string;
  saveCount: number;
  coverThumbUrl: string | null;
};

const MARKER_TRACK_MS = 500;
/** 카드가 마커를 가리지 않도록 지도를 살짝 위로 밀어주는 값 */
const FOCUS_LAT_OFFSET = 0.006;
const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.48);

export function MapScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MapPlaceCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);
  const [trackMarkers, setTrackMarkers] = useState(true);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  /** TODO: 장소 contentId 기준 관련 다이어리 API로 교체 */
  const [relatedDiaries, setRelatedDiaries] = useState<PlaceRelatedDiary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const places = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return MAP_PLACES.filter((place) => {
      const matchesCategory = category === null || place.category === category;
      const matchesKeyword =
        !keyword ||
        place.name.toLowerCase().includes(keyword) ||
        place.address.toLowerCase().includes(keyword);
      return matchesCategory && matchesKeyword;
    });
  }, [category, query]);

  const selectedPlace = places.find((place) => place.id === selectedId) ?? null;
  const isSaved = selectedPlace ? savedIds.includes(selectedPlace.id) : false;

  const refreshSavedIds = useCallback(async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setSavedIds([]);
        return;
      }
      const items = await listSavedPlaces(tokens.access);
      setSavedIds(items.map((item) => item.contentId));
    } catch {
      // 목록 실패 시 기존 UI 유지 — 토글 시 서버가 최종 상태
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedIds();
    }, [refreshSavedIds]),
  );

  useEffect(() => {
    setTrackMarkers(true);
    const timer = setTimeout(() => setTrackMarkers(false), MARKER_TRACK_MS);
    return () => clearTimeout(timer);
  }, [places, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setRelatedDiaries([]);
      setRelatedLoading(false);
      return;
    }
    // TODO: 장소 contentId 기준 관련 다이어리 API 연결
    setRelatedLoading(false);
    setRelatedDiaries([]);
  }, [selectedId]);

  const moveTo = (region: Region) => {
    mapRef.current?.animateToRegion(region, 400);
  };

  const focusPlace = (place: MapPlace) => {
    setSelectedId(place.id);
    moveTo({
      latitude: place.latitude - FOCUS_LAT_OFFSET,
      longitude: place.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const handleSubmitSearch = () => {
    const first = places[0];
    if (!first) {
      return;
    }
    focusPlace(first);
  };

  const handleMoveToUser = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    const granted = current.granted
      ? true
      : (await Location.requestForegroundPermissionsAsync()).granted;

    if (!granted) {
      Alert.alert('위치 권한 필요', '설정에서 위치 접근을 허용하면 현재 위치를 볼 수 있어요.');
      return;
    }

    setShowsUserLocation(true);
    const position = await Location.getCurrentPositionAsync({});
    moveTo({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const toggleSaved = async (contentId: string) => {
    if (saveBusyId) return;
    setSaveBusyId(contentId);
    const wasSaved = savedIds.includes(contentId);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('찜하기 실패', '로그인이 필요합니다.');
        return;
      }

      if (wasSaved) {
        await unsavePlace(tokens.access, contentId);
        setSavedIds((prev) => prev.filter((id) => id !== contentId));
      } else {
        const result = await savePlace(tokens.access, { contentId });
        if (result.saved) {
          setSavedIds((prev) =>
            prev.includes(result.contentId) ? prev : [...prev, result.contentId],
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : wasSaved
            ? '찜을 해제하지 못했어요.'
            : '찜하지 못했어요.';
      Alert.alert(wasSaved ? '찜 해제 실패' : '찜하기 실패', message);
      void refreshSavedIds();
    } finally {
      setSaveBusyId(null);
    }
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={MAP_INITIAL_REGION}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => {
          Keyboard.dismiss();
          setSelectedId(null);
        }}
      >
        {places.map((place) => {
          const active = place.id === selectedId;
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={trackMarkers}
              onPress={(event) => {
                event.stopPropagation();
                focusPlace(place);
              }}
            >
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, active && styles.markerBubbleActive]}>
                  <Ionicons
                    name="heart"
                    size={16}
                    color={active ? colors.white : '#101828'}
                  />
                </View>
                <View style={styles.markerStem} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.topArea, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#99A1AF" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
            placeholder="장소, 주소 검색"
            placeholderTextColor="#99A1AF"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={18} color="#99A1AF" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryChip
            label="전체"
            active={category === null}
            onPress={() => {
              Keyboard.dismiss();
              setCategory(null);
            }}
          />
          {MAP_CATEGORIES.map((item) => (
            <CategoryChip
              key={item}
              label={item}
              active={category === item}
              onPress={() => {
                Keyboard.dismiss();
                setCategory(category === item ? null : item);
              }}
            />
          ))}
        </ScrollView>
      </View>

      <View
        style={[styles.bottomArea, { paddingBottom: insets.bottom + 88 }]}
        pointerEvents="box-none"
      >
        <View style={styles.locateRow} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="현재 위치로 이동"
            style={styles.locateButton}
            onPress={() => {
              void handleMoveToUser();
            }}
          >
            <Ionicons name="locate" size={18} color="#1E2939" />
          </Pressable>
        </View>

        {selectedPlace ? (
          <View style={[styles.sheet, { maxHeight: SHEET_MAX_HEIGHT }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {selectedPlace.name}
                  </Text>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{selectedPlace.category}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isSaved ? '찜 해제' : '찜하기'}
                    disabled={saveBusyId === selectedPlace.id}
                    hitSlop={8}
                    style={[
                      styles.heartButton,
                      saveBusyId === selectedPlace.id && styles.heartButtonBusy,
                    ]}
                    onPress={() => {
                      void toggleSaved(selectedPlace.id);
                    }}
                  >
                    <Ionicons
                      name={isSaved ? 'heart' : 'heart-outline'}
                      size={20}
                      color={isSaved ? '#E11D48' : '#6A7282'}
                    />
                  </Pressable>
                </View>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {selectedPlace.address} · 현재 위치에서 {selectedPlace.distanceKm}km
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={8}
                style={styles.cardClose}
                onPress={() => setSelectedId(null)}
              >
                <Ionicons name="close" size={18} color="#6A7282" />
              </Pressable>
            </View>

            <View style={styles.photoRow}>
              {Array.from({ length: Math.min(selectedPlace.photoCount, 3) }).map((_, index) => {
                const isOverflow = index === 2 && selectedPlace.photoCount > 3;
                return (
                  <View key={index} style={styles.photoBox}>
                    {isOverflow ? (
                      <Text style={styles.photoOverflowText}>
                        +{selectedPlace.photoCount - 2}장
                      </Text>
                    ) : (
                      <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.diarySectionHeader}>
              <Text style={styles.diarySectionTitle}>관련 다이어리</Text>
              <Text style={styles.diarySectionCount}>{relatedDiaries.length}개</Text>
            </View>

            <ScrollView
              style={styles.diaryList}
              contentContainerStyle={styles.diaryListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {relatedLoading ? (
                <Text style={styles.diaryEmptyText}>불러오는 중…</Text>
              ) : relatedDiaries.length === 0 ? (
                <Text style={styles.diaryEmptyText}>이 장소의 공개 다이어리가 아직 없어요.</Text>
              ) : (
                relatedDiaries.map((diary) => (
                  <RelatedDiaryRow key={diary.id} diary={diary} />
                ))
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RelatedDiaryRow({ diary }: { diary: PlaceRelatedDiary }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.diaryRow}
      onPress={() => {
        // TODO: 공개 다이어리 보기 연동
      }}
    >
      <View style={styles.diaryCover}>
        {diary.coverThumbUrl ? (
          <Image source={{ uri: diary.coverThumbUrl }} style={styles.diaryCoverImage} />
        ) : (
          <View style={styles.diaryCoverFallback}>
            <Ionicons name="book-outline" size={22} color="#9CA3AF" />
          </View>
        )}
      </View>

      <View style={styles.diaryMeta}>
        <Text style={styles.diaryTitle} numberOfLines={1}>
          {diary.title}
        </Text>
        <Text style={styles.diaryAuthor} numberOfLines={1}>
          {diary.authorNickname}
        </Text>
        <View style={styles.diaryFooter}>
          <Text style={styles.diaryDate} numberOfLines={1}>
            {diary.dateLabel}
          </Text>
          <View style={styles.diarySaveCount}>
            <Ionicons name="heart" size={12} color="#99A1AF" />
            <Text style={styles.diarySaveCountText}>{diary.saveCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
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
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#101828',
  },
  markerBubbleActive: {
    backgroundColor: '#101828',
  },
  markerStem: {
    width: 4,
    height: 8,
    marginTop: 2,
    backgroundColor: '#1E2939',
  },
  topArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    height: 30,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  chipActive: {
    backgroundColor: '#101828',
    borderColor: '#101828',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5565',
  },
  chipTextActive: {
    color: colors.white,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  locateRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  locateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sheet: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E2939',
  },
  cardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6A7282',
  },
  heartButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButtonBusy: {
    opacity: 0.45,
  },
  cardAddress: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 16,
    color: '#6A7282',
  },
  cardClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  photoBox: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  photoOverflowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5565',
  },
  diarySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  diarySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2939',
  },
  diarySectionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6A7282',
  },
  diaryList: {
    flexGrow: 0,
  },
  diaryListContent: {
    paddingBottom: spacing.xs,
  },
  diaryEmptyText: {
    paddingVertical: spacing.lg,
    fontSize: 13,
    lineHeight: 18,
    color: '#99A1AF',
    textAlign: 'center',
  },
  diaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  diaryCover: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  diaryCoverImage: {
    width: '100%',
    height: '100%',
  },
  diaryCoverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaryMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  diaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E2939',
  },
  diaryAuthor: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2F6BFF',
  },
  diaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
  },
  diaryDate: {
    flexShrink: 1,
    fontSize: 12,
    color: '#6A7282',
  },
  diarySaveCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diarySaveCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6A7282',
  },
});
