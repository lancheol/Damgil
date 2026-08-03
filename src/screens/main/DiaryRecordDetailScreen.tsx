import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { MediaPreview } from '../../components/diary/MediaPreview';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import {
  formatRecordTime,
  getDayNumberForPhoto,
  getPlaceLabel,
} from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryRecordDetail'>;

export function DiaryRecordDetailScreen({ navigation, route }: Props) {
  const { diaryId, photoId } = route.params;
  const { getDiaryById } = useDiaries();
  const diary = getDiaryById(diaryId);
  const photo = diary?.photos?.find((item) => item.id === photoId);

  if (!diary || !photo) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>기록을 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dayNumber = getDayNumberForPhoto(diary, photo);
  const note = photo.note?.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MediaPreview
          uri={photo.uri}
          mediaType={photo.mediaType ?? 'photo'}
          style={styles.media}
          autoPlay
          nativeControls={(photo.mediaType ?? 'photo') === 'video'}
        />

        <View style={styles.meta}>
          <Text style={styles.place}>{getPlaceLabel(photo)}</Text>
          <Text style={styles.dayLine}>
            {dayNumber}일차 · {formatRecordTime(photo.createdAt)}
          </Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  media: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
  },
  meta: {
    gap: spacing.sm,
  },
  place: {
    ...typography.brandTitle,
    fontSize: 22,
    color: colors.ink,
  },
  dayLine: {
    ...typography.body,
    color: colors.inkSoft,
  },
  note: {
    ...typography.body,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
