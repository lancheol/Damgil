import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  PanResponder,
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
import { ApiError, SavedPlaceItemDto } from '../../api/types';
import { mapPlaceFromSaved } from '../../utils/savedMapPlaces';
import {
  loadMapLocationPrefs,
  saveMapLocationPrefs,
  flushMapLocationPrefs,
} from '../../utils/mapLocationPrefs';
import {
  MapLocation,
  mapPlaceFromSearch,
  searchTravelPlaces,
  tourTypeFromMapCategory,
} from '../../utils/placeSearch';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

const SEARCH_DEBOUNCE_MS = 280;

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

/** 카드가 마커를 가리지 않도록 지도를 살짝 위로 밀어주는 값 */
const FOCUS_LAT_OFFSET = 0.006;
const WINDOW_HEIGHT = Dimensions.get('window').height;
/** 접힌 시트 높이 (기존 떠 있는 카드와 비슷한 비율) */
const SHEET_COLLAPSED_HEIGHT = Math.round(WINDOW_HEIGHT * 0.48);

/** 세션 중 빠른 복원용 (앱 재시작 시 AsyncStorage에서 다시 채움) */
let memoryShowsUserLocation = false;
let memoryMapRegion: Region | null = null;
let didFitSavedPinsOnce = false;
let prefsHydrated = false;

/** TODO: 장소 contentId 기준 관련 공개 다이어리 API로 교체 */
const MOCK_RELATED_DIARIES: PlaceRelatedDiary[] = [
  {
    id: 'mock-diary-01',
    authorNickname: 'travel_mina',
    title: '주말 산책 기록',
    dateLabel: '2026.03.12',
    saveCount: 24,
    coverThumbUrl: 'https://picsum.photos/seed/damgil-map-1/240/320',
  },
  {
    id: 'mock-diary-02',
    authorNickname: 'slow.trip',
    title: '비 오는 날의 카페 투어',
    dateLabel: '2026.02.28',
    saveCount: 11,
    coverThumbUrl: 'https://picsum.photos/seed/damgil-map-2/240/320',
  },
  {
    id: 'mock-diary-03',
    authorNickname: 'notebook.kim',
    title: '혼자 떠난 반나절 코스',
    dateLabel: '2026.01.19',
    saveCount: 7,
    coverThumbUrl: 'https://picsum.photos/seed/damgil-map-3/240/320',
  },
];

export function MapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MapPlaceCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItemDto[]>([]);
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(memoryShowsUserLocation);
  const [mapReady, setMapReady] = useState(prefsHydrated);
  const [initialRegion, setInitialRegion] = useState<Region>(
    memoryMapRegion ?? MAP_INITIAL_REGION,
  );
  /** TODO: 장소 contentId 기준 관련 다이어리 API로 교체 */
  const [relatedDiaries, setRelatedDiaries] = useState<PlaceRelatedDiary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [externalPlace, setExternalPlace] = useState<MapPlace | null>(null);
  const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const searchSeqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;
  const sheetDragStart = useRef(SHEET_COLLAPSED_HEIGHT);

  const tabClearance = insets.bottom + 88;
  /** 펼침 = 화면 전체 높이 */
  const sheetExpandedHeight = WINDOW_HEIGHT;

  const snapSheetTo = useCallback(
    (expanded: boolean) => {
      const next = expanded ? sheetExpandedHeight : SHEET_COLLAPSED_HEIGHT;
      setSheetExpanded(expanded);
      if (expanded) {
        Keyboard.dismiss();
        setDropdownOpen(false);
      }
      Animated.spring(sheetHeight, {
        toValue: next,
        useNativeDriver: false,
        friction: 9,
        tension: 70,
      }).start();
    },
    [sheetExpandedHeight, sheetHeight],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          sheetHeight.stopAnimation((value) => {
            sheetDragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(
            sheetExpandedHeight,
            Math.max(SHEET_COLLAPSED_HEIGHT, sheetDragStart.current - gesture.dy),
          );
          sheetHeight.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const mid = (SHEET_COLLAPSED_HEIGHT + sheetExpandedHeight) / 2;
          sheetHeight.stopAnimation((value) => {
            const flingUp = gesture.vy < -0.55;
            const flingDown = gesture.vy > 0.55;
            if (flingUp) {
              snapSheetTo(true);
              return;
            }
            if (flingDown) {
              snapSheetTo(false);
              return;
            }
            snapSheetTo(value >= mid);
          });
        },
      }),
    [sheetExpandedHeight, sheetHeight, snapSheetTo],
  );

  useEffect(() => {
    setSheetExpanded(false);
    sheetHeight.setValue(SHEET_COLLAPSED_HEIGHT);
  }, [selectedId, sheetHeight]);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: sheetExpanded ? { display: 'none' } : undefined,
    });
  }, [navigation, sheetExpanded]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        flushMapLocationPrefs();
        navigation.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation]),
  );

  const savedPins = useMemo(
    () =>
      savedPlaces
        .map(mapPlaceFromSaved)
        .filter((place): place is MapPlace => place != null),
    [savedPlaces],
  );

  /** 지도 핀: 찜한 장소 + 검색으로 고른 장소 */
  const places = useMemo(() => {
    const byId = new Map<string, MapPlace>();
    for (const place of savedPins) {
      if (category === null || place.category === category) {
        byId.set(place.id, place);
      }
    }
    if (
      externalPlace &&
      !byId.has(externalPlace.id) &&
      (category === null || externalPlace.category === category)
    ) {
      byId.set(externalPlace.id, externalPlace);
    }
    return [...byId.values()];
  }, [category, savedPins, externalPlace]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const runSearch = useCallback(
    async (text: string, categoryFilter: MapPlaceCategory | null) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setSuggestions([]);
        setSearching(false);
        setDropdownOpen(false);
        return;
      }

      const seq = searchSeqRef.current + 1;
      searchSeqRef.current = seq;
      setSearching(true);

      try {
        const results = await searchTravelPlaces(trimmed, {
          type: tourTypeFromMapCategory(categoryFilter),
          rows: 10,
        });
        if (searchSeqRef.current !== seq) {
          return;
        }
        setSuggestions(results);
        setDropdownOpen(results.length > 0);
      } finally {
        if (searchSeqRef.current === seq) {
          setSearching(false);
        }
      }
    },
    [],
  );

  const scheduleSearch = useCallback(
    (text: string, categoryFilter: MapPlaceCategory | null) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void runSearch(text, categoryFilter);
      }, SEARCH_DEBOUNCE_MS);
    },
    [runSearch],
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }
    scheduleSearch(text, category);
  };

  useFocusEffect(
    useCallback(() => {
      const focus = route.params?.focusPlace;
      if (!focus?.contentId) {
        return;
      }
      const lat = focus.latitude;
      const lng = focus.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') {
        const mapped: MapPlace = {
          id: focus.contentId,
          name: focus.title?.trim() || '찜한 장소',
          category: '관광지',
          address: focus.address?.trim() || '',
          distanceKm: 0,
          photoCount: 0,
          latitude: lat,
          longitude: lng,
        };
        setExternalPlace(mapped);
        setSelectedId(mapped.id);
        mapRef.current?.animateToRegion(
          {
            latitude: lat - FOCUS_LAT_OFFSET,
            longitude: lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          400,
        );
      } else {
        const local = MAP_PLACES.find((place) => place.id === focus.contentId);
        if (local) {
          setExternalPlace(null);
          setSelectedId(local.id);
          mapRef.current?.animateToRegion(
            {
              latitude: local.latitude - FOCUS_LAT_OFFSET,
              longitude: local.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            400,
          );
        }
      }
    }, [route.params?.focusPlace]),
  );
  const selectedPlace = places.find((place) => place.id === selectedId) ?? null;
  const savedIds = useMemo(
    () => savedPlaces.map((item) => item.contentId),
    [savedPlaces],
  );
  const isSaved = selectedPlace ? savedIds.includes(selectedPlace.id) : false;

  const refreshSavedPlaces = useCallback(async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setSavedPlaces([]);
        return;
      }
      const items = await listSavedPlaces(tokens.access);
      setSavedPlaces(items);
    } catch {
      // 목록 실패 시 기존 핀 유지 — 토글 시 서버가 최종 상태
    }
  }, []);

  const persistPrefs = useCallback(
    (next: { showsUserLocation?: boolean; region?: Region | null }) => {
      if (typeof next.showsUserLocation === 'boolean') {
        memoryShowsUserLocation = next.showsUserLocation;
      }
      if (next.region !== undefined) {
        memoryMapRegion = next.region;
      }
      void saveMapLocationPrefs({
        showsUserLocation: memoryShowsUserLocation,
        region: memoryMapRegion,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prefs = await loadMapLocationPrefs();
      if (cancelled) {
        return;
      }

      // 권한은 OS가 정본. AsyncStorage의 showsUserLocation은 UI 선호일 뿐.
      const permission = await Location.getForegroundPermissionsAsync();
      const shows = Boolean(prefs.showsUserLocation && permission.granted);

      memoryShowsUserLocation = shows;
      memoryMapRegion = prefs.region;
      prefsHydrated = true;
      setShowsUserLocation(shows);
      if (prefs.region) {
        setInitialRegion(prefs.region);
      }
      setMapReady(true);

      if (shows !== prefs.showsUserLocation) {
        void saveMapLocationPrefs({
          showsUserLocation: shows,
          region: prefs.region,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSavedPlaces();
      void (async () => {
        // 이미 허용된 경우만 내 위치 점 복원. request()는 절대 자동 호출하지 않음.
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || !memoryShowsUserLocation) {
          if (!permission.granted && memoryShowsUserLocation) {
            memoryShowsUserLocation = false;
            setShowsUserLocation(false);
            void saveMapLocationPrefs({
              showsUserLocation: false,
              region: memoryMapRegion,
            });
          }
          return;
        }
        setShowsUserLocation(true);
      })();
    }, [refreshSavedPlaces]),
  );

  useEffect(() => {
    if (
      didFitSavedPinsOnce ||
      route.params?.focusPlace ||
      memoryShowsUserLocation ||
      memoryMapRegion
    ) {
      return;
    }
    if (savedPins.length === 0) {
      return;
    }
    didFitSavedPinsOnce = true;
    mapRef.current?.fitToCoordinates(
      savedPins.map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
      })),
      {
        edgePadding: { top: 140, right: 48, bottom: 180, left: 48 },
        animated: true,
      },
    );
  }, [savedPins, route.params?.focusPlace]);

  useEffect(() => {
    if (!selectedId) {
      setRelatedDiaries([]);
      setRelatedLoading(false);
      return;
    }
    // TODO: 장소 contentId 기준 관련 다이어리 API 연결
    setRelatedLoading(false);
    setRelatedDiaries(MOCK_RELATED_DIARIES);
  }, [selectedId]);

  const moveTo = (region: Region) => {
    mapRef.current?.animateToRegion(region, 400);
  };

  const focusPlace = (place: MapPlace) => {
    setSelectedId(place.id);
    setDropdownOpen(false);
    Keyboard.dismiss();
    moveTo({
      latitude: place.latitude - FOCUS_LAT_OFFSET,
      longitude: place.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const selectSearchResult = (location: MapLocation) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const mapped = mapPlaceFromSearch(location);
    if (!mapped) {
      return;
    }
    setQuery(mapped.name);
    setSuggestions([]);
    setDropdownOpen(false);
    setExternalPlace(mapped);
    setSelectedId(mapped.id);
    Keyboard.dismiss();
    moveTo({
      latitude: mapped.latitude - FOCUS_LAT_OFFSET,
      longitude: mapped.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  const handleSubmitSearch = () => {
    if (suggestions.length > 0) {
      selectSearchResult(suggestions[0]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    void (async () => {
      const results = await searchTravelPlaces(trimmed, {
        type: tourTypeFromMapCategory(category),
        rows: 10,
      });
      if (results.length > 0) {
        selectSearchResult(results[0]);
        return;
      }
      Alert.alert('검색 결과 없음', '해당 키워드로 찾은 장소가 없어요.');
    })();
  };

  const handleCategoryChange = (next: MapPlaceCategory | null) => {
    Keyboard.dismiss();
    setCategory(next);
    setDropdownOpen(false);
    if (query.trim()) {
      scheduleSearch(query, next);
    }
  };

  const handleMoveToUser = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    // 이미 허용됐으면 시스템 팝업 없이 바로 사용 (카메라와 동일)
    const granted = current.granted
      ? true
      : (await Location.requestForegroundPermissionsAsync()).granted;

    if (!granted) {
      Alert.alert(
        '위치 권한 필요',
        '설정 > Damgil(또는 Expo Go) > 위치에서 "앱을 사용하는 동안"으로 허용해 주세요.\n"한 번 허용"을 고르면 앱을 다시 켤 때마다 물어볼 수 있어요.',
      );
      return;
    }

    setShowsUserLocation(true);
    const position = await Location.getCurrentPositionAsync({});
    const nextRegion: Region = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    persistPrefs({ showsUserLocation: true, region: nextRegion });
    moveTo(nextRegion);
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
        setSavedPlaces((prev) => prev.filter((item) => item.contentId !== contentId));
        if (selectedId === contentId) {
          setSelectedId(null);
        }
      } else {
        const result = await savePlace(tokens.access, { contentId });
        if (result.saved) {
          setSavedPlaces((prev) => {
            if (prev.some((item) => item.contentId === result.contentId)) {
              return prev;
            }
            const selected = selectedPlace?.id === result.contentId ? selectedPlace : null;
            return [
              {
                userId: '',
                contentId: result.contentId,
                createdAt: new Date().toISOString(),
                place: selected
                  ? {
                      contentId: selected.id,
                      title: selected.name,
                      addr1: selected.address,
                      firstImage: null,
                      lat: selected.latitude,
                      lng: selected.longitude,
                      contentTypeId: null,
                    }
                  : null,
              },
              ...prev,
            ];
          });
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
      void refreshSavedPlaces();
    } finally {
      setSaveBusyId(null);
    }
  };

  return (
    <View style={styles.root}>
      {mapReady ? (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(region) => {
          persistPrefs({ region });
        }}
        onPress={() => {
          Keyboard.dismiss();
          setSelectedId(null);
          setDropdownOpen(false);
        }}
      >
        {places.map((place) => {
          const active = place.id === selectedId;
          const saved = savedIds.includes(place.id);
          // 네이티브 기본 핀: 선택 > 찜 > 일반
          const pinColor = active ? '#2F6BFF' : saved ? '#E11D48' : '#101828';
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              pinColor={pinColor}
              onPress={(event) => {
                event.stopPropagation();
                focusPlace(place);
              }}
            />
          );
        })}
      </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator color={colors.ink} />
        </View>
      )}

      {!sheetExpanded ? (
      <View style={[styles.topArea, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.searchBlock}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#99A1AF" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={handleQueryChange}
              onSubmitEditing={handleSubmitSearch}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setDropdownOpen(true);
                }
              }}
              returnKeyType="search"
              placeholder="장소, 주소 검색"
              placeholderTextColor="#99A1AF"
            />
            {searching ? (
              <ActivityIndicator size="small" color="#99A1AF" />
            ) : query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
                hitSlop={8}
                onPress={() => {
                  setQuery('');
                  setSuggestions([]);
                  setDropdownOpen(false);
                  setSearching(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#99A1AF" />
              </Pressable>
            ) : null}
          </View>

          {dropdownOpen && suggestions.length > 0 ? (
            <View style={styles.dropdown}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={styles.dropdownScroll}
              >
                {suggestions.map((item) => {
                  const id = item.contentId ?? item.name;
                  const alreadySaved = item.contentId
                    ? savedIds.includes(item.contentId)
                    : false;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => selectSearchResult(item)}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name={alreadySaved ? 'heart' : 'location-outline'}
                        size={16}
                        color={alreadySaved ? '#E11D48' : '#6A7282'}
                      />
                      <View style={styles.dropdownCopy}>
                        <Text style={styles.dropdownTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.address ? (
                          <Text style={styles.dropdownAddress} numberOfLines={1}>
                            {item.address}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
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
            onPress={() => handleCategoryChange(null)}
          />
          {MAP_CATEGORIES.map((item) => (
            <CategoryChip
              key={item}
              label={item}
              active={category === item}
              onPress={() => handleCategoryChange(category === item ? null : item)}
            />
          ))}
        </ScrollView>
      </View>
      ) : null}

      <View
        style={[
          styles.bottomArea,
          { paddingBottom: selectedPlace ? 0 : tabClearance },
        ]}
        pointerEvents="box-none"
      >
        {!sheetExpanded ? (
          <View
            style={[
              styles.locateRow,
              selectedPlace ? { marginBottom: spacing.sm } : null,
            ]}
            pointerEvents="box-none"
          >
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
        ) : null}

        {selectedPlace ? (
          <Animated.View
            style={[
              styles.sheet,
              sheetExpanded ? styles.sheetFullscreen : null,
              {
                height: sheetHeight,
                paddingTop: sheetExpanded ? insets.top : 0,
                paddingBottom: sheetExpanded ? insets.bottom + spacing.md : tabClearance,
              },
            ]}
          >
            <View
              accessibilityRole="adjustable"
              accessibilityLabel={
                sheetExpanded ? '시트 줄이기' : '시트 전체 화면으로 펼치기'
              }
              accessibilityHint="위로 올리면 전체 화면, 아래로 내리면 접힙니다"
              style={styles.sheetHandleHit}
              {...sheetPanResponder.panHandlers}
            >
              <View style={styles.sheetHandle} />
            </View>

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
                  {selectedPlace.address
                    ? selectedPlace.address
                    : '주소 정보가 없어요'}
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

            {selectedPlace.photoCount > 0 ? (
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
            ) : null}

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
          </Animated.View>
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
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  topArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  searchBlock: {
    marginHorizontal: spacing.lg,
    zIndex: 20,
  },
  searchBar: {
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
  dropdown: {
    marginTop: 6,
    maxHeight: 240,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  dropdownCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2939',
  },
  dropdownAddress: {
    fontSize: 12,
    color: '#6A7282',
  },
  pressed: {
    opacity: 0.7,
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
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
    overflow: 'hidden',
  },
  sheetFullscreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    elevation: 24,
    zIndex: 30,
  },
  sheetHandleHit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
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
    flex: 1,
    minHeight: 0,
  },
  diaryListContent: {
    paddingBottom: spacing.sm,
    flexGrow: 1,
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
