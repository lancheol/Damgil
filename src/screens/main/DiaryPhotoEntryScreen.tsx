import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { MediaPreview } from '../../components/diary/MediaPreview';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import { MapLocation, searchTravelPlaces } from '../../utils/placeSearch';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryPhotoEntry'>;

const PREVIEW_WIDTH = Dimensions.get('window').width - spacing.xl * 2;
const PREVIEW_HEIGHT = Math.round(PREVIEW_WIDTH * (9 / 16));
const SEARCH_DEBOUNCE_MS = 280;

export function DiaryPhotoEntryScreen({ navigation, route }: Props) {
  const { diaryId, photoUri, mediaType = 'photo' } = route.params;
  const { addPhotoToDiary } = useDiaries();
  const [placeQuery, setPlaceQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<MapLocation[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [candidate, setCandidate] = useState<MapLocation | null>(null);
  const [confirmedLocation, setConfirmedLocation] = useState<MapLocation | null>(null);
  const [rejectHint, setRejectHint] = useState(false);
  const searchSeqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = confirmedLocation !== null;
  const showInlineConfirm = candidate !== null && confirmedLocation === null;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
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
      const results = await searchTravelPlaces(trimmed);
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
  };

  const scheduleSearch = (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleQueryChange = (text: string) => {
    setPlaceQuery(text);
    setConfirmedLocation(null);
    setCandidate(null);
    setRejectHint(false);
    if (!text.trim()) {
      setSuggestions([]);
      setDropdownOpen(false);
      setSearching(false);
      return;
    }
    scheduleSearch(text);
  };

  const ensureLocationPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const result = await Location.requestForegroundPermissionsAsync();
    if (result.granted) {
      return true;
    }

    Alert.alert(
      '위치 권한 필요',
      '장소를 선택·확인하려면 위치 접근을 허용해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '설정 열기',
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ],
    );
    return false;
  };

  const handleSelectSuggestion = async (location: MapLocation) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    Keyboard.dismiss();

    const allowed = await ensureLocationPermission();
    if (!allowed) {
      return;
    }

    setPlaceQuery(location.name);
    setSuggestions([]);
    setDropdownOpen(false);
    setConfirmedLocation(null);
    setRejectHint(false);
    setCandidate(location);
  };

  const handleConfirmLocation = () => {
    if (!candidate) {
      return;
    }
    setRejectHint(false);
    setConfirmedLocation(candidate);
  };

  const handleRejectLocation = () => {
    setCandidate(null);
    setConfirmedLocation(null);
    setPlaceQuery('');
    setSuggestions([]);
    setDropdownOpen(false);
    setSearching(false);
    setRejectHint(true);
  };

  const handleSubmit = () => {
    if (!confirmedLocation) {
      return;
    }

    const saved = addPhotoToDiary({
      diaryId,
      uri: photoUri,
      mediaType,
      placeName: confirmedLocation.name,
      latitude: confirmedLocation.latitude,
      longitude: confirmedLocation.longitude,
    });

    if (!saved) {
      return;
    }

    navigation.popToTop();
  };

  const mapLocation = confirmedLocation ?? candidate;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <MediaPreview
            uri={photoUri}
            mediaType={mediaType}
            style={styles.photoFrame}
            landscape
          />

          <View style={styles.placeSection}>
            <Text style={styles.placeLabel}>Travel place</Text>
            <View style={styles.placeInputWrap}>
              <TextInput
                value={placeQuery}
                onChangeText={handleQueryChange}
                onFocus={() => {
                  if (suggestions.length > 0 && !candidate && !confirmedLocation) {
                    setDropdownOpen(true);
                  }
                }}
                placeholder="장소를 입력해 주세요"
                placeholderTextColor={colors.placeholder}
                style={styles.placeInput}
                returnKeyType="search"
                onSubmitEditing={() => {
                  void runSearch(placeQuery);
                }}
                editable={!confirmedLocation}
              />
              {searching ? (
                <View style={styles.searchSpinner}>
                  <ActivityIndicator size="small" color={colors.inkMuted} />
                </View>
              ) : null}
            </View>

            {dropdownOpen && suggestions.length > 0 ? (
              <View style={styles.dropdown}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={styles.dropdownScroll}
                >
                  {suggestions.map((item) => (
                    <Pressable
                      key={`${item.name}-${item.latitude}-${item.longitude}`}
                      onPress={() => {
                        void handleSelectSuggestion(item);
                      }}
                      style={({ pressed }) => [styles.dropdownItem, pressed && styles.pressed]}
                    >
                      <Text style={styles.dropdownItemText} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {rejectHint ? (
              <Text style={styles.rejectHint}>다시 검색해서 장소를 찾아보세요.</Text>
            ) : null}
          </View>

          {mapLocation ? (
            <View style={styles.mapBlock}>
              <MapView
                key={`${mapLocation.name}-${mapLocation.latitude}-${mapLocation.longitude}`}
                style={styles.map}
                initialRegion={{
                  latitude: mapLocation.latitude,
                  longitude: mapLocation.longitude,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: mapLocation.latitude,
                    longitude: mapLocation.longitude,
                  }}
                  title={mapLocation.name}
                />
              </MapView>
              <Text style={styles.mapName}>{mapLocation.name}</Text>

              {showInlineConfirm ? (
                <View style={styles.confirmInline}>
                  <Text style={styles.confirmQuestion}>이 위치가 맞나요?</Text>
                  <View style={styles.confirmActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleRejectLocation}
                      style={({ pressed }) => [
                        styles.choiceButton,
                        styles.noButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.choiceButtonText}>아니오</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleConfirmLocation}
                      style={({ pressed }) => [
                        styles.choiceButton,
                        styles.yesButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.choiceButtonText}>예</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {confirmedLocation ? (
                <Text style={styles.fixedHint}>위치가 확정되었어요.</Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              canSubmit ? styles.submitButtonReady : styles.submitButtonDisabled,
              pressed && canSubmit && styles.pressed,
            ]}
          >
            <Text style={styles.submitButtonText}>확인</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  photoFrame: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: 10,
  },
  placeSection: {
    gap: spacing.sm,
    zIndex: 2,
  },
  placeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  placeInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  placeInput: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingRight: spacing.xxxl,
    fontSize: 12,
    color: colors.ink,
    shadowColor: '#0D0A2C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchSpinner: {
    position: 'absolute',
    right: spacing.lg,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.ink,
  },
  rejectHint: {
    fontSize: 12,
    color: '#D64545',
    marginTop: 2,
  },
  mapBlock: {
    gap: spacing.sm,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  mapName: {
    ...typography.body,
    color: colors.inkSoft,
  },
  confirmInline: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  confirmQuestion: {
    ...typography.brandTitle,
    fontSize: 18,
    textAlign: 'center',
    color: colors.ink,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noButton: {
    backgroundColor: '#9A9A9A',
  },
  yesButton: {
    backgroundColor: colors.black,
  },
  choiceButtonText: {
    ...typography.button,
    color: colors.white,
  },
  fixedHint: {
    ...typography.label,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  submitButton: {
    height: 62,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D9D9D9',
  },
  submitButtonReady: {
    backgroundColor: colors.black,
  },
  submitButtonText: {
    fontSize: 16,
    color: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
});
