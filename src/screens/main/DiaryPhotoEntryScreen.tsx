import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
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
import { LocationConfirmModal } from '../../components/diary/LocationConfirmModal';
import { MediaPreview } from '../../components/diary/MediaPreview';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import { MapLocation, searchTravelPlace } from '../../utils/placeSearch';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryPhotoEntry'>;

const PREVIEW_WIDTH = Dimensions.get('window').width - spacing.xl * 2;
const PREVIEW_HEIGHT = Math.round(PREVIEW_WIDTH * (9 / 16));

export function DiaryPhotoEntryScreen({ navigation, route }: Props) {
  const { diaryId, photoUri, mediaType = 'photo' } = route.params;
  const { addPhotoToDiary } = useDiaries();
  const [placeQuery, setPlaceQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidate, setCandidate] = useState<MapLocation | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState<MapLocation | null>(null);

  const canConfirm = confirmedLocation !== null;

  const handleSearch = async () => {
    if (!placeQuery.trim() || searching) {
      return;
    }

    try {
      setSearching(true);
      // TODO: 실제 장소 검색 API 연동
      const result = await searchTravelPlace(placeQuery);
      setCandidate(result);
      setConfirmVisible(true);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmLocation = () => {
    if (!candidate) {
      return;
    }
    setConfirmedLocation(candidate);
    setConfirmVisible(false);
  };

  const handleRejectLocation = () => {
    setConfirmVisible(false);
    setCandidate(null);
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
            <View style={styles.placeRow}>
              <TextInput
                value={placeQuery}
                onChangeText={(text) => {
                  setPlaceQuery(text);
                  setConfirmedLocation(null);
                }}
                placeholder="장소를 입력해 주세요"
                placeholderTextColor={colors.placeholder}
                style={styles.placeInput}
                returnKeyType="search"
                onSubmitEditing={() => {
                  void handleSearch();
                }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleSearch();
                }}
                disabled={searching || !placeQuery.trim()}
                style={({ pressed }) => [
                  styles.searchButton,
                  (!placeQuery.trim() || searching) && styles.searchButtonDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {searching ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.searchButtonText}>찾기</Text>
                )}
              </Pressable>
            </View>
          </View>

          {confirmedLocation ? (
            <View style={styles.confirmedMapWrap}>
              <MapView
                style={styles.confirmedMap}
                initialRegion={{
                  latitude: confirmedLocation.latitude,
                  longitude: confirmedLocation.longitude,
                  latitudeDelta: 0.012,
                  longitudeDelta: 0.012,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: confirmedLocation.latitude,
                    longitude: confirmedLocation.longitude,
                  }}
                  title={confirmedLocation.name}
                />
              </MapView>
              <Text style={styles.confirmedName}>{confirmedLocation.name}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm }}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.confirmButton,
              canConfirm ? styles.confirmButtonReady : styles.confirmButtonDisabled,
              pressed && canConfirm && styles.pressed,
            ]}
          >
            <Text style={styles.confirmButtonText}>확인</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LocationConfirmModal
        visible={confirmVisible}
        location={candidate}
        onConfirm={handleConfirmLocation}
        onCancel={handleRejectLocation}
      />
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
  },
  placeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeInput: {
    flex: 1,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    fontSize: 12,
    color: colors.ink,
    shadowColor: '#0D0A2C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchButton: {
    width: 83,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0C79FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F7F7F6',
  },
  confirmedMapWrap: {
    gap: spacing.sm,
  },
  confirmedMap: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  confirmedName: {
    ...typography.body,
    color: colors.inkSoft,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  confirmButton: {
    height: 62,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#D9D9D9',
  },
  confirmButtonReady: {
    backgroundColor: colors.black,
  },
  confirmButtonText: {
    fontSize: 16,
    color: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
});
