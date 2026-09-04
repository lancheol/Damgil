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
  Easing,
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
import { getMapPlaceDetail, getMapPlaces, getPlaceDiaries, getSavedMarkers } from '../../api/map';
import { savePlace, unsavePlace } from '../../api/saves';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, PlaceDiaryItemDto, SavedMarkerItemDto } from '../../api/types';
import { useDiaries } from '../../context/DiaryContext';
import {
  formatStraightDistanceKm,
  mapPlaceFromMapDetail,
  MapPlaceDetailView,
} from '../../utils/mapPlaceDetail';
import {
  mapPlaceFromSavedMarker,
  markerCategoriesFromMapCategories,
  markerCategoryFromMapCategory,
  placeMatchesMapCategories,
} from '../../utils/savedMapPlaces';
import { isPartialMapCoverage, isValidBbox, regionToBbox } from '../../utils/mapViewport';
import {
  loadMapLocationPrefs,
  saveMapLocationPrefs,
  flushMapLocationPrefs,
} from '../../utils/mapLocationPrefs';
import {
  MapLocation,
  mapPlaceFromSearch,
  searchMapTravelPlaces,
} from '../../utils/placeSearch';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

const SEARCH_DEBOUNCE_MS = 280;
const VIEWPORT_FETCH_DEBOUNCE_MS = 400;
const MAP_PLACES_LIMIT = 200;
const PLACE_DIARIES_PAGE_SIZE = 20;

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

type PlaceRelatedDiary = {
  id: string;
  authorNickname: string;
  title: string;
  dateLabel: string;
  likeCount: number;
  coverThumbUrl: string | null;
};

function formatPublishedAt(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) {
    return '';
  }
  const datePart = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart.replace(/-/g, '.');
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  const y = parsed.getFullYear();
  const m = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const d = `${parsed.getDate()}`.padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function mapPlaceDiaryItem(item: PlaceDiaryItemDto): PlaceRelatedDiary {
  return {
    id: item.tripId,
    authorNickname: item.authorNickname?.trim() || '여행자',
    title: item.title?.trim() || '제목 없음',
    dateLabel: formatPublishedAt(item.publishedAt),
    likeCount: item.likeCount ?? 0,
    coverThumbUrl: item.thumbnailUrl1?.trim() || null,
  };
}

/** 카드가 마커를 가리지 않도록 지도를 살짝 위로 밀어주는 값 */
const FOCUS_LAT_OFFSET = 0.006;
const WINDOW_HEIGHT = Dimensions.get('window').height;
/** 접힌 시트 높이 (기존 떠 있는 카드와 비슷한 비율) */
const SHEET_COLLAPSED_HEIGHT = Math.round(WINDOW_HEIGHT * 0.48);
/** 접힌 상태의 sheet top 값 (화면 아래에서 접힌 높이만큼 보이게) */
const SHEET_COLLAPSED_Y = WINDOW_HEIGHT - SHEET_COLLAPSED_HEIGHT;
const SHEET_HIDDEN_Y = WINDOW_HEIGHT;

/** 세션 중 빠른 복원용 (앱 재시작 시 AsyncStorage에서 다시 채움) */
let memoryShowsUserLocation = false;
let memoryMapRegion: Region | null = null;
let didFitSavedPinsOnce = false;
let prefsHydrated = false;

export function MapScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { openPublicDiary } = useDiaries();
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<MapPlaceCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedMarkers, setSavedMarkers] = useState<SavedMarkerItemDto[]>([]);
  const [viewportMarkers, setViewportMarkers] = useState<SavedMarkerItemDto[]>([]);
  const [viewportTruncated, setViewportTruncated] = useState(false);
  const [viewportBBoxError, setViewportBBoxError] = useState(false);
  const [viewportCoveragePartial, setViewportCoveragePartial] = useState(false);
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);
  /** 상세가 열린 동안 찜 해제만 해 두고, 닫을 때 핀에서 제거 */
  const pendingUnsaveIdsRef = useRef(new Set<string>());
  const [pendingUnsaveVersion, setPendingUnsaveVersion] = useState(0);
  const prevSelectedIdRef = useRef<string | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(memoryShowsUserLocation);
  const [mapReady, setMapReady] = useState(prefsHydrated);
  const [initialRegion, setInitialRegion] = useState<Region>(
    memoryMapRegion ?? MAP_INITIAL_REGION,
  );
  const [relatedDiaries, setRelatedDiaries] = useState<PlaceRelatedDiary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedTotal, setRelatedTotal] = useState(0);
  const [openingDiaryId, setOpeningDiaryId] = useState<string | null>(null);
  const [placeDetail, setPlaceDetail] = useState<MapPlaceDetailView | null>(null);
  const [placeDetailLoading, setPlaceDetailLoading] = useState(false);
  const [placeUnavailable, setPlaceUnavailable] = useState(false);
  const placeDiariesRequestRef = useRef(0);
  const placeDetailRequestRef = useRef(0);
  const openingDiaryIdRef = useRef<string | null>(null);
  const [externalPlace, setExternalPlace] = useState<MapPlace | null>(null);
  const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const searchSeqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRequestRef = useRef(0);
  const lastViewportRegionRef = useRef<Region | null>(
    memoryMapRegion ?? MAP_INITIAL_REGION,
  );
  /** 상세 열기 직전 배율 — 시트 닫을 때 복원 */
  const preFocusRegionRef = useRef<Region | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  /** top: sheetExpandedY=검색바 걸침, SHEET_COLLAPSED_Y=접힘, SHEET_HIDDEN_Y=숨김 */
  const sheetTop = useRef(new Animated.Value(SHEET_COLLAPSED_Y)).current;
  const sheetDragStart = useRef(SHEET_COLLAPSED_Y);
  const sheetSlideAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const sheetMountedRef = useRef(false);
  const [sheetPlace, setSheetPlace] = useState<MapPlace | null>(null);
  /** iOS에서 핀 탭 직후 MapView.onPress가 선택을 지우는 것 방지 */
  const ignoreMapPressUntilRef = useRef(0);
  /** 영역 재조회로 places에서 빠져도 시트/선택 유지 */
  const [focusedPlace, setFocusedPlace] = useState<MapPlace | null>(null);
  const placesRef = useRef<MapPlace[]>([]);

  const tabClearance = insets.bottom + 88;

  /**
   * 펼침 상한 — 시트 상단이 검색바를 걸쳐 가리는 위치.
   * (safe area + 여백 위는 지도가 보이고, 검색바부터 아래로 시트가 덮음)
   */
  const sheetExpandedY = insets.top + spacing.sm;

  const snapSheetTo = useCallback(
    (expanded: boolean) => {
      const next = expanded ? sheetExpandedY : SHEET_COLLAPSED_Y;
      if (expanded) {
        Keyboard.dismiss();
        setDropdownOpen(false);
      }
      sheetSlideAnimRef.current?.stop();
      sheetSlideAnimRef.current = Animated.spring(sheetTop, {
        toValue: next,
        useNativeDriver: false,
        friction: 8,
        tension: 65,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
      });
      sheetSlideAnimRef.current.start(({ finished }) => {
        if (!finished) {
          return;
        }
        setSheetExpanded(expanded);
      });
    },
    [sheetTop, sheetExpandedY],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          sheetSlideAnimRef.current?.stop();
          sheetTop.stopAnimation((value) => {
            sheetDragStart.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(
            SHEET_COLLAPSED_Y,
            Math.max(sheetExpandedY, sheetDragStart.current + gesture.dy),
          );
          sheetTop.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const mid = (SHEET_COLLAPSED_Y + sheetExpandedY) / 2;
          sheetTop.stopAnimation((value) => {
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
            snapSheetTo(value <= mid);
          });
        },
      }),
    [sheetTop, snapSheetTo, sheetExpandedY],
  );

  useEffect(() => {
    if (!selectedId || !sheetMountedRef.current) {
      return;
    }
    // 이미 열린 상태에서 다른 장소로 바꿀 때만 접힌 위치로 맞춤
    setSheetExpanded(false);
    sheetTop.setValue(SHEET_COLLAPSED_Y);
  }, [selectedId, sheetTop]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        flushMapLocationPrefs();
      };
    }, []),
  );

  const apiCategories = useMemo(
    () => markerCategoriesFromMapCategories(selectedCategories),
    [selectedCategories],
  );

  const savedPins = useMemo(
    () =>
      savedMarkers
        .map(mapPlaceFromSavedMarker)
        .filter((place): place is MapPlace => place != null),
    [savedMarkers],
  );

  const viewportPins = useMemo(
    () =>
      viewportMarkers
        .map(mapPlaceFromSavedMarker)
        .filter((place): place is MapPlace => place != null),
    [viewportMarkers],
  );

  /** 지도 핀: 영역 장소 + 찜 + 검색으로 고른 장소 */
  const places = useMemo(() => {
    const byId = new Map<string, MapPlace>();
    const matches = (place: MapPlace) =>
      placeMatchesMapCategories(place.category, selectedCategories);

    for (const place of viewportPins) {
      if (matches(place)) {
        byId.set(place.id, place);
      }
    }
    for (const place of savedPins) {
      if (matches(place)) {
        byId.set(place.id, place);
      }
    }
    if (externalPlace && !byId.has(externalPlace.id) && matches(externalPlace)) {
      byId.set(externalPlace.id, externalPlace);
    }
    return [...byId.values()];
  }, [externalPlace, savedPins, selectedCategories, viewportPins]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }
    };
  }, []);

  const runSearch = useCallback(
    async (text: string, categories: MapPlaceCategory[]) => {
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
        const results = await searchMapTravelPlaces(trimmed, {
          categories,
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
    (text: string, categories: MapPlaceCategory[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void runSearch(text, categories);
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
    scheduleSearch(text, selectedCategories);
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
        if (!selectedIdRef.current) {
          const current = lastViewportRegionRef.current;
          if (
            current &&
            Number.isFinite(current.latitudeDelta) &&
            Number.isFinite(current.longitudeDelta) &&
            current.latitudeDelta > 0 &&
            current.longitudeDelta > 0
          ) {
            preFocusRegionRef.current = {
              latitude: current.latitude,
              longitude: current.longitude,
              latitudeDelta: current.latitudeDelta,
              longitudeDelta: current.longitudeDelta,
            };
          }
        }
        setExternalPlace(mapped);
        setFocusedPlace(mapped);
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
          if (!selectedIdRef.current) {
            const current = lastViewportRegionRef.current;
            if (
              current &&
              Number.isFinite(current.latitudeDelta) &&
              Number.isFinite(current.longitudeDelta) &&
              current.latitudeDelta > 0 &&
              current.longitudeDelta > 0
            ) {
              preFocusRegionRef.current = {
                latitude: current.latitude,
                longitude: current.longitude,
                latitudeDelta: current.latitudeDelta,
                longitudeDelta: current.longitudeDelta,
              };
            }
          }
          setExternalPlace(null);
          setFocusedPlace(local);
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
  const selectedPlace =
    (selectedId
      ? places.find((place) => place.id === selectedId) ??
        (externalPlace?.id === selectedId ? externalPlace : null) ??
        (focusedPlace?.id === selectedId ? focusedPlace : null) ??
        (sheetPlace?.id === selectedId ? sheetPlace : null)
      : null);
  const savedIds = useMemo(
    () => savedMarkers.map((item) => item.placeId),
    [savedMarkers],
  );
  const viewportSavedIds = useMemo(
    () =>
      new Set(
        viewportMarkers.filter((item) => item.saved).map((item) => item.placeId),
      ),
    [viewportMarkers],
  );
  const searchSavedIds = useMemo(
    () =>
      new Set(
        suggestions
          .filter((item) => item.saved && item.contentId)
          .map((item) => item.contentId as string),
      ),
    [suggestions],
  );
  const isPlaceSaved = useCallback(
    (contentId: string) =>
      (savedIds.includes(contentId) ||
        viewportSavedIds.has(contentId) ||
        searchSavedIds.has(contentId)) &&
      !pendingUnsaveIdsRef.current.has(contentId),
    // pendingUnsaveVersion: 해제 예약 Set 변경 시 하트/핀 색 갱신
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedIds, searchSavedIds, viewportSavedIds, pendingUnsaveVersion],
  );
  const isSaved = sheetPlace
    ? pendingUnsaveIdsRef.current.has(sheetPlace.id)
      ? false
      : placeDetail?.placeId === sheetPlace.id
        ? placeDetail.saved || isPlaceSaved(sheetPlace.id)
        : isPlaceSaved(sheetPlace.id)
    : false;

  const displayPlace =
    sheetPlace && placeDetail?.placeId === sheetPlace.id
      ? placeDetail.place
      : sheetPlace;
  const distanceLabel =
    sheetPlace && placeDetail?.placeId === sheetPlace.id
      ? formatStraightDistanceKm(placeDetail.distanceKm)
      : null;
  const sheetImages =
    sheetPlace && placeDetail?.placeId === sheetPlace.id ? placeDetail.images : [];
  const sheetDiaryCount =
    sheetPlace && placeDetail?.placeId === sheetPlace.id
      ? placeDetail.diaryCount
      : relatedTotal;

  useEffect(() => {
    if (selectedPlace) {
      sheetSlideAnimRef.current?.stop();
      const opening = !sheetMountedRef.current;
      sheetMountedRef.current = true;
      setSheetPlace(selectedPlace);
      if (opening) {
        sheetTop.setValue(SHEET_HIDDEN_Y);
        sheetSlideAnimRef.current = Animated.spring(sheetTop, {
          toValue: SHEET_COLLAPSED_Y,
          useNativeDriver: false,
          friction: 8,
          tension: 65,
          restDisplacementThreshold: 0.5,
          restSpeedThreshold: 0.5,
        });
        sheetSlideAnimRef.current.start(({ finished }) => {
          if (finished) {
            setSheetExpanded(false);
          }
        });
      }
      return;
    }

    if (!sheetMountedRef.current) {
      return;
    }

    sheetSlideAnimRef.current?.stop();
    setSheetExpanded(false);
    sheetSlideAnimRef.current = Animated.timing(sheetTop, {
      toValue: SHEET_HIDDEN_Y,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    sheetSlideAnimRef.current.start(({ finished }) => {
      if (!finished) {
        return;
      }
      sheetMountedRef.current = false;
      setSheetPlace(null);
    });
  }, [selectedPlace, sheetTop]);

  const bumpPendingUnsave = useCallback(() => {
    setPendingUnsaveVersion((value) => value + 1);
  }, []);

  const flushPendingUnsaveFor = useCallback(
    (contentId: string | null | undefined) => {
      if (!contentId || !pendingUnsaveIdsRef.current.has(contentId)) {
        return;
      }
      pendingUnsaveIdsRef.current.delete(contentId);
      setSavedMarkers((prev) => prev.filter((item) => item.placeId !== contentId));
      setViewportMarkers((prev) =>
        prev.map((item) =>
          item.placeId === contentId ? { ...item, saved: false } : item,
        ),
      );
      bumpPendingUnsave();
    },
    [bumpPendingUnsave],
  );

  useEffect(() => {
    const prev = prevSelectedIdRef.current;
    if (prev && prev !== selectedId) {
      flushPendingUnsaveFor(prev);
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId, flushPendingUnsaveFor]);

  const refreshSavedMarkers = useCallback(async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setSavedMarkers([]);
        return;
      }
      const markerCategory = apiCategories;
      const response = await getSavedMarkers(tokens.access, {
        ...(markerCategory ? { category: markerCategory } : {}),
      });
      const items = response.items ?? [];
      setSavedMarkers((prev) => {
        const pending = pendingUnsaveIdsRef.current;
        if (pending.size === 0) {
          return items;
        }
        // 상세 열려 있는 동안 해제한 핀은 닫을 때까지 유지
        const sticky = prev.filter((item) => pending.has(item.placeId));
        const merged = [...items];
        for (const item of sticky) {
          if (!merged.some((row) => row.placeId === item.placeId)) {
            merged.push(item);
          }
        }
        return merged;
      });
    } catch {
      // 목록 실패 시 기존 핀 유지 — 토글 시 서버가 최종 상태
    }
  }, [apiCategories]);

  const fetchViewportPlaces = useCallback(async (region: Region) => {
    const requestId = viewportRequestRef.current + 1;
    viewportRequestRef.current = requestId;
    lastViewportRegionRef.current = region;

    const bbox = regionToBbox(region);
    if (!isValidBbox(bbox)) {
      return;
    }

    try {
      const tokens = await loadTokens();
      const markerCategory = apiCategories;
      const response = await getMapPlaces(tokens?.access, {
        ...bbox,
        limit: MAP_PLACES_LIMIT,
        ...(markerCategory ? { category: markerCategory } : {}),
      });
      if (viewportRequestRef.current !== requestId) {
        return;
      }
      setViewportMarkers(response.items ?? []);
      setViewportTruncated(Boolean(response.truncated));
      setViewportCoveragePartial(isPartialMapCoverage(response.coverage));
      setViewportBBoxError(false);
    } catch (error) {
      if (viewportRequestRef.current !== requestId) {
        return;
      }
      if (error instanceof ApiError && error.code === 'BBOX_TOO_LARGE') {
        setViewportMarkers([]);
        setViewportTruncated(false);
        setViewportCoveragePartial(false);
        setViewportBBoxError(true);
        return;
      }
      // 그 외 오류는 기존 영역 핀 유지
    }
  }, [apiCategories]);

  const scheduleViewportFetch = useCallback(
    (region: Region) => {
      lastViewportRegionRef.current = region;
      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }
      viewportDebounceRef.current = setTimeout(() => {
        void fetchViewportPlaces(region);
      }, VIEWPORT_FETCH_DEBOUNCE_MS);
    },
    [fetchViewportPlaces],
  );

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
      void refreshSavedMarkers();
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
    }, [refreshSavedMarkers]),
  );

  useEffect(() => {
    void refreshSavedMarkers();
  }, [refreshSavedMarkers]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    scheduleViewportFetch(initialRegion);
  }, [initialRegion, mapReady, scheduleViewportFetch]);

  useEffect(() => {
    const region = lastViewportRegionRef.current;
    if (!region) {
      return;
    }
    void fetchViewportPlaces(region);
  }, [apiCategories, fetchViewportPlaces]);

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
      placeDetailRequestRef.current += 1;
      setPlaceDetail(null);
      setPlaceDetailLoading(false);
      setPlaceUnavailable(false);
      return;
    }

    const requestId = placeDetailRequestRef.current + 1;
    placeDetailRequestRef.current = requestId;
    setPlaceDetailLoading(true);
    setPlaceUnavailable(false);
    setPlaceDetail(null);

    void (async () => {
      try {
        const tokens = await loadTokens();
        let lat: number | undefined;
        let lng: number | undefined;
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (permission.granted) {
            const last = await Location.getLastKnownPositionAsync();
            if (
              last &&
              Number.isFinite(last.coords.latitude) &&
              Number.isFinite(last.coords.longitude)
            ) {
              lat = last.coords.latitude;
              lng = last.coords.longitude;
            }
          }
        } catch {
          // 위치 없으면 거리 없이 상세만 조회
        }

        const response = await getMapPlaceDetail(tokens?.access, selectedId, {
          lat,
          lng,
        });
        if (placeDetailRequestRef.current !== requestId) {
          return;
        }

        const fallback =
          places.find((place) => place.id === selectedId) ??
          (externalPlace?.id === selectedId ? externalPlace : null);
        const view = mapPlaceFromMapDetail(response, fallback);
        setPlaceDetail(view);
        setPlaceUnavailable(false);

        // 상세의 찜 상태를 마커 목록에 동기화 (해제 예약 중이면 유지)
        if (!pendingUnsaveIdsRef.current.has(view.placeId)) {
          if (view.saved) {
            setViewportMarkers((prev) =>
              prev.map((item) =>
                item.placeId === view.placeId ? { ...item, saved: true } : item,
              ),
            );
            setSavedMarkers((prev) => {
              if (prev.some((item) => item.placeId === view.placeId)) {
                return prev;
              }
              if (
                view.lat == null ||
                view.lng == null ||
                !Number.isFinite(view.lat) ||
                !Number.isFinite(view.lng)
              ) {
                return prev;
              }
              return [
                ...prev,
                {
                  placeId: view.placeId,
                  title: view.place.name,
                  addr1: view.place.address,
                  lat: view.lat,
                  lng: view.lng,
                  categoryCode:
                    markerCategoryFromMapCategory(view.place.category) ?? 'OTHER',
                  saved: true,
                },
              ];
            });
          }
        }
      } catch (error) {
        if (placeDetailRequestRef.current !== requestId) {
          return;
        }
        // 비활성·삭제 등 — 일반 탐색에서 제외된 장소 (MAP-BE-015)
        if (
          error instanceof ApiError &&
          (error.status === 404 ||
            error.code === 'PLACE_NOT_FOUND' ||
            error.code === 'PLACE_INACTIVE')
        ) {
          setPlaceUnavailable(true);
          setPlaceDetail(null);
          return;
        }
        setPlaceDetail(null);
      } finally {
        if (placeDetailRequestRef.current === requestId) {
          setPlaceDetailLoading(false);
        }
      }
    })();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      placeDiariesRequestRef.current += 1;
      setRelatedDiaries([]);
      setRelatedTotal(0);
      setRelatedLoading(false);
      return;
    }

    const requestId = placeDiariesRequestRef.current + 1;
    placeDiariesRequestRef.current = requestId;
    setRelatedLoading(true);
    setRelatedDiaries([]);
    setRelatedTotal(0);

    void (async () => {
      try {
        const tokens = await loadTokens();
        const response = await getPlaceDiaries(tokens?.access, selectedId, {
          page: 1,
          pageSize: PLACE_DIARIES_PAGE_SIZE,
        });
        if (placeDiariesRequestRef.current !== requestId) {
          return;
        }
        setRelatedDiaries((response.items ?? []).map(mapPlaceDiaryItem));
        setRelatedTotal(response.total ?? response.items?.length ?? 0);
      } catch {
        if (placeDiariesRequestRef.current !== requestId) {
          return;
        }
        setRelatedDiaries([]);
        setRelatedTotal(0);
      } finally {
        if (placeDiariesRequestRef.current === requestId) {
          setRelatedLoading(false);
        }
      }
    })();
  }, [selectedId]);

  const openRelatedDiary = useCallback(
    async (diary: PlaceRelatedDiary) => {
      if (openingDiaryIdRef.current) {
        return;
      }
      openingDiaryIdRef.current = diary.id;
      setOpeningDiaryId(diary.id);
      try {
        const result = await openPublicDiary(diary.id);
        if (result.status === 'gone') {
          setRelatedDiaries((prev) => prev.filter((item) => item.id !== diary.id));
          setRelatedTotal((prev) => Math.max(0, prev - 1));
          return;
        }
        if (result.status !== 'ok') {
          return;
        }
        navigation.navigate('DiaryEdit', {
          diaryId: result.diary.id,
          mode: 'view',
          likeCount: diary.likeCount,
        });
      } finally {
        openingDiaryIdRef.current = null;
        setOpeningDiaryId(null);
      }
    },
    [navigation, openPublicDiary],
  );

  placesRef.current = places;
  selectedIdRef.current = selectedId;

  const moveTo = (region: Region) => {
    mapRef.current?.animateToRegion(region, 400);
  };

  /** 상세를 처음 열 때만 현재 배율 저장 (핀 간 전환 시에는 유지) */
  const rememberRegionBeforeFocus = useCallback(() => {
    if (selectedIdRef.current) {
      return;
    }
    const current = lastViewportRegionRef.current;
    if (
      !current ||
      !Number.isFinite(current.latitude) ||
      !Number.isFinite(current.longitude) ||
      !Number.isFinite(current.latitudeDelta) ||
      !Number.isFinite(current.longitudeDelta) ||
      current.latitudeDelta <= 0 ||
      current.longitudeDelta <= 0
    ) {
      return;
    }
    preFocusRegionRef.current = {
      latitude: current.latitude,
      longitude: current.longitude,
      latitudeDelta: current.latitudeDelta,
      longitudeDelta: current.longitudeDelta,
    };
  }, []);

  const focusPlace = useCallback(
    (place: MapPlace) => {
      // Marker.onPress 직후 MapView.onPress가 따라와 selectedId를 지우는 iOS 이슈 방어
      ignoreMapPressUntilRef.current = Date.now() + 750;
      rememberRegionBeforeFocus();
      setFocusedPlace(place);
      setSelectedId(place.id);
      setDropdownOpen(false);
      Keyboard.dismiss();
      moveTo({
        latitude: place.latitude - FOCUS_LAT_OFFSET,
        longitude: place.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    },
    [rememberRegionBeforeFocus],
  );

  const clearPlaceSelection = useCallback(() => {
    const restore = preFocusRegionRef.current;
    preFocusRegionRef.current = null;
    setSelectedId(null);
    setFocusedPlace(null);
    setDropdownOpen(false);
    Keyboard.dismiss();
    if (
      restore &&
      Number.isFinite(restore.latitude) &&
      Number.isFinite(restore.longitude) &&
      Number.isFinite(restore.latitudeDelta) &&
      Number.isFinite(restore.longitudeDelta) &&
      restore.latitudeDelta > 0 &&
      restore.longitudeDelta > 0
    ) {
      ignoreMapPressUntilRef.current = Date.now() + 500;
      mapRef.current?.animateToRegion(restore, 400);
    }
  }, []);

  const handleMapPress = useCallback(
    (event: { nativeEvent?: { action?: string } }) => {
      if (event.nativeEvent?.action === 'marker-press') {
        return;
      }
      if (Date.now() < ignoreMapPressUntilRef.current) {
        return;
      }
      clearPlaceSelection();
    },
    [clearPlaceSelection],
  );

  const handleMarkerPress = useCallback(
    (event: { nativeEvent?: { id?: string } }) => {
      const id = event.nativeEvent?.id?.trim();
      if (!id) {
        return;
      }
      const place =
        placesRef.current.find((item) => item.id === id) ??
        (externalPlace?.id === id ? externalPlace : null) ??
        (focusedPlace?.id === id ? focusedPlace : null);
      if (!place) {
        return;
      }
      focusPlace(place);
    },
    [externalPlace, focusedPlace, focusPlace],
  );

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
    setFocusedPlace(mapped);
    ignoreMapPressUntilRef.current = Date.now() + 750;
    rememberRegionBeforeFocus();
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
      const results = await searchMapTravelPlaces(trimmed, {
        categories: selectedCategories,
        rows: 10,
      });
      if (results.length > 0) {
        selectSearchResult(results[0]);
        return;
      }
      Alert.alert('검색 결과 없음', '해당 키워드로 찾은 장소가 없어요.');
    })();
  };

  const handleSelectAllCategories = () => {
    Keyboard.dismiss();
    setSelectedCategories([]);
    setDropdownOpen(false);
    if (query.trim()) {
      scheduleSearch(query, []);
    }
  };

  const handleCategoryToggle = (item: MapPlaceCategory) => {
    Keyboard.dismiss();
    setSelectedCategories((prev) => {
      const next = prev.includes(item)
        ? prev.filter((entry) => entry !== item)
        : [...prev, item];
      if (query.trim()) {
        scheduleSearch(query, next);
      }
      return next;
    });
    setDropdownOpen(false);
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
    const wasSaved =
      contentId === sheetPlace?.id ? isSaved : isPlaceSaved(contentId);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('찜하기 실패', '로그인이 필요합니다.');
        return;
      }

      if (wasSaved) {
        await unsavePlace(tokens.access, contentId);
        // 서버에서는 해제하되, 상세를 닫을 때까지 핀·시트는 유지
        pendingUnsaveIdsRef.current.add(contentId);
        bumpPendingUnsave();
        setPlaceDetail((prev) =>
          prev?.placeId === contentId ? { ...prev, saved: false } : prev,
        );
      } else {
        const result = await savePlace(tokens.access, { contentId });
        if (result.saved) {
          pendingUnsaveIdsRef.current.delete(contentId);
          bumpPendingUnsave();
          setPlaceDetail((prev) =>
            prev?.placeId === contentId ? { ...prev, saved: true } : prev,
          );
          setViewportMarkers((prev) =>
            prev.map((item) =>
              item.placeId === result.contentId ? { ...item, saved: true } : item,
            ),
          );
          setSavedMarkers((prev) => {
            if (prev.some((item) => item.placeId === result.contentId)) {
              return prev;
            }
            const selected =
              displayPlace?.id === result.contentId
                ? displayPlace
                : selectedPlace?.id === result.contentId
                  ? selectedPlace
                  : null;
            if (!selected) {
              return prev;
            }
            return [
              {
                placeId: result.contentId,
                title: selected.name,
                addr1: selected.address,
                lat: selected.latitude,
                lng: selected.longitude,
                categoryCode:
                  markerCategoryFromMapCategory(selected.category) ?? 'OTHER',
                saved: true,
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
      void refreshSavedMarkers();
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
          scheduleViewportFetch(region);
        }}
        onPress={handleMapPress}
        onMarkerPress={handleMarkerPress}
      >
        {places.map((place) => {
          const active = place.id === selectedId;
          const saved = isPlaceSaved(place.id);
          // 네이티브 기본 핀: 선택 > 찜 > 일반
          const pinColor = active ? '#2F6BFF' : saved ? '#E11D48' : '#101828';
          return (
            <Marker
              key={place.id}
              identifier={place.id}
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
                    ? item.saved || isPlaceSaved(item.contentId)
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
            active={selectedCategories.length === 0}
            onPress={handleSelectAllCategories}
          />
          {MAP_CATEGORIES.map((item) => (
            <CategoryChip
              key={item}
              label={item}
              active={selectedCategories.includes(item)}
              onPress={() => handleCategoryToggle(item)}
            />
          ))}
        </ScrollView>

        {viewportBBoxError ? (
          <Text style={styles.mapHint}>지도를 조금 더 확대해 주세요.</Text>
        ) : viewportTruncated || viewportCoveragePartial ? (
          <Text style={styles.mapHint}>
            {viewportTruncated
              ? '장소가 많아 일부만 표시돼요. 지도를 확대해 보세요.'
              : '이 배율에서는 일부 장소만 보여요. 지도를 확대해 보세요.'}
          </Text>
        ) : null}
      </View>

      <View
        style={[styles.locateArea, { paddingBottom: tabClearance }]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.locateRow,
            sheetPlace ? { marginBottom: spacing.sm } : null,
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
      </View>

      {sheetPlace ? (
        <Animated.View
          pointerEvents={selectedPlace ? 'auto' : 'none'}
          style={[
            styles.sheet,
            {
              top: sheetTop,
              paddingBottom: tabClearance,
            },
          ]}
        >
            <View
              accessibilityRole="adjustable"
              accessibilityLabel={
                sheetExpanded ? '시트 줄이기' : '시트 더 펼치기'
              }
              accessibilityHint="위로 올리면 더 펼쳐지고, 아래로 내리면 접힙니다"
              style={styles.sheetHandleHit}
              {...sheetPanResponder.panHandlers}
            >
              <View style={styles.sheetHandle} />
            </View>

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderText}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {displayPlace?.name ?? sheetPlace.name}
                    </Text>
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>
                        {displayPlace?.category ?? sheetPlace.category}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={isSaved ? '찜 해제' : '찜하기'}
                      disabled={saveBusyId === sheetPlace.id || placeUnavailable}
                      hitSlop={8}
                      style={[
                        styles.heartButton,
                        saveBusyId === sheetPlace.id && styles.heartButtonBusy,
                      ]}
                      onPress={() => {
                        void toggleSaved(sheetPlace.id);
                      }}
                    >
                      <Ionicons
                        name={isSaved ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isSaved ? '#E11D48' : '#6A7282'}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.cardAddress} numberOfLines={2}>
                    {(displayPlace?.address || sheetPlace.address)
                      ? displayPlace?.address || sheetPlace.address
                      : '주소 정보가 없어요'}
                  </Text>
                  {distanceLabel ? (
                    <Text style={styles.cardDistance}>현재 위치에서 {distanceLabel}</Text>
                  ) : null}
                  {placeUnavailable ? (
                    <Text style={styles.cardUnavailable}>
                      지금은 이용할 수 없는 장소예요.
                    </Text>
                  ) : placeDetailLoading ? (
                    <Text style={styles.cardDistance}>상세 정보 불러오는 중…</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                  hitSlop={8}
                  style={styles.cardClose}
                  onPress={clearPlaceSelection}
                >
                  <Ionicons name="close" size={18} color="#6A7282" />
                </Pressable>
              </View>

              {sheetImages.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoRow}
                >
                  {sheetImages.slice(0, 6).map((uri, index) => {
                    const overflow =
                      index === 5 && sheetImages.length > 6
                        ? sheetImages.length - 5
                        : 0;
                    return (
                      <View key={`${uri}-${index}`} style={styles.photoBox}>
                        <Image source={{ uri }} style={styles.photoImage} />
                        {overflow > 0 ? (
                          <View style={styles.photoOverflow}>
                            <Text style={styles.photoOverflowText}>+{overflow}장</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : null}

              <View style={styles.diarySectionHeader}>
                <Text style={styles.diarySectionTitle}>관련 다이어리</Text>
                <Text style={styles.diarySectionCount}>{sheetDiaryCount}개</Text>
              </View>

              {relatedLoading ? (
                <Text style={styles.diaryEmptyText}>불러오는 중…</Text>
              ) : relatedDiaries.length === 0 ? (
                <Text style={styles.diaryEmptyText}>이 장소의 공개 다이어리가 아직 없어요.</Text>
              ) : (
                relatedDiaries.map((diary) => (
                  <RelatedDiaryRow
                    key={diary.id}
                    diary={diary}
                    busy={openingDiaryId === diary.id}
                    onPress={() => {
                      void openRelatedDiary(diary);
                    }}
                  />
                ))
              )}
            </ScrollView>
          </Animated.View>
        ) : null}
    </View>
  );
}

function RelatedDiaryRow({
  diary,
  busy,
  onPress,
}: {
  diary: PlaceRelatedDiary;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      style={[styles.diaryRow, busy && styles.diaryRowBusy]}
      onPress={onPress}
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
            <Text style={styles.diarySaveCountText}>{diary.likeCount}</Text>
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  topArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 4,
  },
  searchBlock: {
    marginHorizontal: spacing.lg,
    zIndex: 1,
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
  mapHint: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    fontSize: 11,
    lineHeight: 15,
    color: '#99A1AF',
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
  locateArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    elevation: 6,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    elevation: 16,
    zIndex: 20,
    overflow: 'hidden',
  },
  sheetHandleHit: {
    alignItems: 'center',
    justifyContent: 'center',
    // iOS HIG 최소 터치 목표 44pt — 회색 바는 얇게, 터치만 확보
    minHeight: 44,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  sheetBody: {
    flex: 1,
    minHeight: 0,
  },
  sheetBodyContent: {
    paddingBottom: spacing.sm,
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
  cardDistance: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#99A1AF',
  },
  cardUnavailable: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#DC2626',
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
    width: 72,
    height: 72,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverflow: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  photoOverflowText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
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
  diaryRowBusy: {
    opacity: 0.55,
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
