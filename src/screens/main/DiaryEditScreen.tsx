import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { CoverCanvas } from '../../components/diary/CoverCanvas';
import { DiaryTimelineSection } from '../../components/diary/DiaryTimelineSection';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { buildDiaryTimeline } from '../../utils/diaryTimeline';
import { getEffectiveCover, resolveCoverImageUri } from '../../utils/diaryCover';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryEdit'>;

export function DiaryEditScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const { getDiaryById } = useDiaries();
  const diary = getDiaryById(diaryId);

  const timeline = useMemo(() => (diary ? buildDiaryTimeline(diary) : []), [diary]);
  const cover = diary ? getEffectiveCover(diary) : null;
  const coverUri = diary ? resolveCoverImageUri(diary, cover) : null;
  const hasDraft = Boolean(diary?.coverDraft);

  if (!diary || !cover) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>다이어리를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>
            {diary.name}
          </Text>
          <Text style={styles.subtitle}>편집</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverBlock}>
          <View style={styles.coverHeader}>
            <Text style={styles.sectionLabel}>표지</Text>
            {hasDraft ? <Text style={styles.draftBadge}>임시 저장됨</Text> : null}
          </View>
          <CoverCanvas
            imageUri={coverUri}
            title={cover.title}
            fontId={cover.fontId}
            stickers={cover.stickers}
            selectedStickerId={null}
            style={styles.coverPreview}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('DiaryCoverEdit', { diaryId })}
            style={({ pressed }) => [styles.coverButton, pressed && styles.pressed]}
          >
            <Text style={styles.coverButtonText}>표지 꾸미기</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>일차별 기록</Text>

        {timeline.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text style={styles.emptyText}>아직 저장된 기록이 없어요.</Text>
          </View>
        ) : (
          timeline.map((group) => (
            <DiaryTimelineSection
              key={group.dateKey}
              group={group}
              onPressRecord={(photo) => {
                navigation.navigate('DiaryRecordDecorate', {
                  diaryId,
                  photoId: photo.id,
                });
              }}
            />
          ))
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.brandTitle,
    fontSize: 20,
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    color: colors.inkSoft,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  coverBlock: {
    gap: spacing.md,
  },
  coverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...typography.label,
    color: colors.ink,
  },
  draftBadge: {
    ...typography.body,
    fontSize: 12,
    color: colors.accent,
  },
  coverPreview: {
    maxWidth: 260,
    alignSelf: 'center',
  },
  coverButton: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverButtonText: {
    ...typography.button,
    color: colors.white,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyInline: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
