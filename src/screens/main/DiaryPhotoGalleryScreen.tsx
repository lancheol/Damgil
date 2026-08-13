import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { MediaPreview } from '../../components/diary/MediaPreview';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { DiaryPhoto } from '../../types/diary';
import { getPlaceLabel } from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryPhotoGallery'>;

const EMPTY_PHOTOS: DiaryPhoto[] = [];

export function DiaryPhotoGalleryScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const { getDiaryById, removePhotosFromDiary } = useDiaries();
  const diary = getDiaryById(diaryId);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const photos = diary?.photos ?? EMPTY_PHOTOS;
  const selectedCount = selectedIds.length;

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds([]);
    }
  }, [selectMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => photos.some((photo) => photo.id === id)));
  }, [photos]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds([]);
  }, []);

  const toggleSelect = useCallback((photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId],
    );
  }, []);

  const handleDelete = useCallback(() => {
    if (selectedCount === 0) {
      return;
    }

    Alert.alert(
      '사진 삭제',
      `선택한 사진 ${selectedCount}장을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const ok = await removePhotosFromDiary(diaryId, selectedIds);
              if (!ok) {
                return;
              }
              exitSelectMode();
            })();
          },
        },
      ],
    );
  }, [diaryId, exitSelectMode, removePhotosFromDiary, selectedCount, selectedIds]);

  const headerActionLabel = useMemo(() => {
    if (!selectMode) {
      return '선택';
    }
    return selectedCount > 0 ? `${selectedCount}장 선택` : '취소';
  }, [selectMode, selectedCount]);

  if (!diary) {
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

  const renderItem = ({ item }: { item: DiaryPhoto }) => {
    const selected = selectedIds.includes(item.id);

    return (
      <Pressable
        accessibilityRole={selectMode ? 'checkbox' : 'none'}
        accessibilityState={selectMode ? { checked: selected } : undefined}
        disabled={!selectMode}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          }
        }}
        style={({ pressed }) => [
          styles.card,
          selectMode && selected && styles.cardSelected,
          selectMode && pressed && styles.pressed,
        ]}
      >
        <View>
          <MediaPreview
            uri={item.uri}
            mediaType={item.mediaType ?? 'photo'}
            style={styles.photo}
            autoPlay={false}
            nativeControls={(item.mediaType ?? 'photo') === 'video'}
          />
          {selectMode ? (
            <View style={[styles.check, selected && styles.checkSelected]}>
              {selected ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.place} numberOfLines={1}>
            {getPlaceLabel(item)}
            {(item.mediaType ?? 'photo') === 'video' ? ' · 영상' : ''}
          </Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            if (selectMode) {
              exitSelectMode();
              return;
            }
            navigation.goBack();
          }}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>
            {diary.name}
          </Text>
          <Text style={styles.subtitle}>
            {selectMode
              ? selectedCount > 0
                ? `${selectedCount}장 선택됨`
                : '삭제할 사진을 선택하세요'
              : `저장된 사진 ${photos.length}장`}
          </Text>
        </View>
        {photos.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (selectMode) {
                exitSelectMode();
                return;
              }
              setSelectMode(true);
            }}
            style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
          >
            <Text style={styles.headerActionText}>{headerActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 저장된 사진이 없어요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('DiaryCamera', { diaryId })}
            style={({ pressed }) => [styles.takeButton, pressed && styles.pressed]}
          >
            <Text style={styles.takeButtonText}>사진 찍기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            extraData={{ selectMode, selectedIds }}
          />
          <View style={styles.footer}>
            {selectMode ? (
              <Pressable
                accessibilityRole="button"
                disabled={selectedCount === 0}
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  selectedCount === 0 && styles.deleteButtonDisabled,
                  pressed && selectedCount > 0 && styles.pressed,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {selectedCount > 0 ? `${selectedCount}장 삭제` : '삭제'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('DiaryCamera', { diaryId })}
                style={({ pressed }) => [styles.takeButton, pressed && styles.pressed]}
              >
                <Text style={styles.takeButtonText}>사진 찍기</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerActionText: {
    ...typography.label,
    color: colors.ink,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#0D0A2C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardSelected: {
    borderColor: colors.black,
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: colors.black,
  },
  check: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.black,
    borderColor: colors.white,
  },
  checkMark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },
  meta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  place: {
    ...typography.label,
    color: colors.ink,
  },
  date: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  takeButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  takeButtonText: {
    ...typography.button,
    color: colors.white,
  },
  deleteButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  deleteButtonDisabled: {
    opacity: 0.4,
  },
  deleteButtonText: {
    ...typography.button,
    color: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
});
