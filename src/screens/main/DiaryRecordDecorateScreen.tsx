import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { RecordDecorCanvas } from '../../components/diary/RecordDecorCanvas';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { DecorFontId, DecorSticker, PhotoDecoration } from '../../types/diary';
import {
  createStickerId,
  DECOR_FONTS,
  DECOR_STICKER_EMOJIS,
} from '../../utils/decorAssets';
import {
  formatRecordTime,
  getDayNumberForPhoto,
  getPlaceLabel,
  buildDiaryTimeline,
} from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryRecordDecorate'>;

function emptyDecoration(note = ''): PhotoDecoration {
  return {
    stickers: [],
    note,
    fontId: 'sans',
    updatedAt: new Date().toISOString(),
  };
}

export function DiaryRecordDecorateScreen({ navigation, route }: Props) {
  const { diaryId, photoId } = route.params;
  const { getDiaryById, savePhotoDecoration, removePhotosFromDiary } = useDiaries();
  const diary = getDiaryById(diaryId);

  const orderedIds = useMemo(() => {
    if (!diary) {
      return [] as string[];
    }
    return buildDiaryTimeline(diary).flatMap((group) => group.records.map((item) => item.id));
  }, [diary]);

  const currentIndex = orderedIds.indexOf(photoId);
  const photo = diary?.photos?.find((item) => item.id === photoId);

  const initial = photo?.decoration ?? emptyDecoration(photo?.note ?? '');

  const [note, setNote] = useState(initial.note);
  const [fontId, setFontId] = useState<DecorFontId>(initial.fontId);
  const [stickers, setStickers] = useState<DecorSticker[]>(initial.stickers);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggingSticker, setDraggingSticker] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!photo) {
      return;
    }
    const next = photo.decoration ?? emptyDecoration(photo.note ?? '');
    setNote(next.note);
    setFontId(next.fontId);
    setStickers(next.stickers);
    setSelectedStickerId(null);
    setDraggingSticker(false);
    setDirty(false);
  }, [photoId, photo?.decoration?.updatedAt, photo?.id]);

  const markDirty = useCallback(() => setDirty(true), []);

  const persist = useCallback(() => {
    if (!diary || !photo) {
      return false;
    }
    return savePhotoDecoration({
      diaryId,
      photoId: photo.id,
      decoration: {
        stickers,
        note,
        fontId,
      },
    });
  }, [diary, photo, diaryId, stickers, note, fontId, savePhotoDecoration]);

  const goToPhoto = (nextId: string) => {
    if (dirty) {
      const ok = persist();
      if (!ok) {
        Alert.alert('저장 실패', '편집 내용을 저장하지 못했습니다.');
        return;
      }
      setDirty(false);
    }
    navigation.replace('DiaryRecordDecorate', { diaryId, photoId: nextId });
  };

  const handleSave = () => {
    const ok = persist();
    if (!ok) {
      Alert.alert('저장 실패', '편집 내용을 저장하지 못했습니다.');
      return;
    }
    setDirty(false);
    Alert.alert('저장됨', '장소 기록 꾸미기가 저장됐어요.');
  };

  const handleBack = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('편집 내용', '저장하고 나갈까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '저장 안 함',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
      {
        text: '저장',
        onPress: () => {
          if (persist()) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!photo) {
      return;
    }
    Alert.alert(
      '기록 삭제',
      '이 장소 기록을 삭제할까요? 원본 미디어와 꾸미기 레이어가 함께 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const ok = removePhotosFromDiary(diaryId, [photo.id]);
            if (!ok) {
              Alert.alert('삭제 실패', '기록을 삭제하지 못했습니다.');
              return;
            }
            navigation.goBack();
          },
        },
      ],
    );
  };

  const selectedSticker = stickers.find((item) => item.id === selectedStickerId) ?? null;

  if (!diary || !photo) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>기록을 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dayNumber = getDayNumberForPhoto(diary, photo);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < orderedIds.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getPlaceLabel(photo)}
          </Text>
          <Text style={styles.headerSubtitle}>
            {dayNumber}일차 · {formatRecordTime(photo.createdAt)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          style={({ pressed }) => [styles.saveChip, pressed && styles.pressed]}
        >
          <Text style={styles.saveChipText}>저장</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!draggingSticker}
      >
        <RecordDecorCanvas
          uri={photo.uri}
          mediaType={photo.mediaType}
          note={note}
          fontId={fontId}
          stickers={stickers}
          selectedStickerId={selectedStickerId}
          onSelectSticker={setSelectedStickerId}
          onStickerDragChange={setDraggingSticker}
          onMoveSticker={(id, x, y) => {
            setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
            markDirty();
          }}
          onScaleSticker={(id, scale) => {
            setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, scale } : item)));
            markDirty();
          }}
          onRotateSticker={(id, rotation) => {
            setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, rotation } : item)));
            markDirty();
          }}
        />

        <Text style={styles.lockHint}>편집 단계에서는 사진·영상 원본을 바꾸거나 재촬영할 수 없어요.</Text>

        <View style={styles.navRow}>
          <Pressable
            disabled={!hasPrev}
            onPress={() => hasPrev && goToPhoto(orderedIds[currentIndex - 1])}
            style={[styles.navButton, !hasPrev && styles.navDisabled]}
          >
            <Text style={styles.navButtonText}>이전 장소</Text>
          </Pressable>
          <Text style={styles.navIndex}>
            {currentIndex + 1} / {orderedIds.length}
          </Text>
          <Pressable
            disabled={!hasNext}
            onPress={() => hasNext && goToPhoto(orderedIds[currentIndex + 1])}
            style={[styles.navButton, !hasNext && styles.navDisabled]}
          >
            <Text style={styles.navButtonText}>다음 장소</Text>
          </Pressable>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>기록 문구</Text>
          <TextInput
            value={note}
            onChangeText={(text) => {
              setNote(text);
              markDirty();
            }}
            placeholder="짧은 기록을 남겨 보세요"
            placeholderTextColor={colors.placeholder}
            style={styles.noteInput}
            multiline
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>글꼴</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontRow}>
            {DECOR_FONTS.map((font) => {
              const active = font.id === fontId;
              return (
                <Pressable
                  key={font.id}
                  onPress={() => {
                    setFontId(font.id);
                    markDirty();
                  }}
                  style={[styles.fontChip, active && styles.fontChipActive]}
                >
                  <Text style={[styles.fontChipText, font.style, active && styles.fontChipTextActive]}>
                    {font.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>스티커</Text>
          <View style={styles.stickerRow}>
            {DECOR_STICKER_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  const sticker: DecorSticker = {
                    id: createStickerId('record'),
                    emoji,
                    x: 0.5,
                    y: 0.45,
                    scale: 1,
                    rotation: 0,
                  };
                  setStickers((prev) => [...prev, sticker]);
                  setSelectedStickerId(sticker.id);
                  markDirty();
                }}
                style={({ pressed }) => [styles.stickerAdd, pressed && styles.pressed]}
              >
                <Text style={styles.stickerAddText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {selectedSticker ? (
            <View style={styles.toolRow}>
              <Pressable
                style={styles.toolButton}
                onPress={() => {
                  setStickers((prev) =>
                    prev.map((item) =>
                      item.id === selectedSticker.id
                        ? { ...item, rotation: item.rotation - 15 }
                        : item,
                    ),
                  );
                  markDirty();
                }}
              >
                <Text style={styles.toolButtonText}>↺</Text>
              </Pressable>
              <Pressable
                style={styles.toolButton}
                onPress={() => {
                  setStickers((prev) =>
                    prev.map((item) =>
                      item.id === selectedSticker.id
                        ? { ...item, rotation: item.rotation + 15 }
                        : item,
                    ),
                  );
                  markDirty();
                }}
              >
                <Text style={styles.toolButtonText}>↻</Text>
              </Pressable>
              <Pressable
                style={[styles.toolButton, styles.toolDanger]}
                onPress={() => {
                  setStickers((prev) => prev.filter((item) => item.id !== selectedSticker.id));
                  setSelectedStickerId(null);
                  markDirty();
                }}
              >
                <Text style={[styles.toolButtonText, styles.toolDangerText]}>삭제</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.hint}>스티커를 추가한 뒤 드래그·핀치·회전으로 배치하세요</Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Text style={styles.deleteButtonText}>이 기록 삭제</Text>
        </Pressable>
      </ScrollView>
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
  headerTitle: {
    ...typography.brandTitle,
    fontSize: 18,
    color: colors.ink,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  saveChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveChipText: {
    ...typography.label,
    color: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  lockHint: {
    ...typography.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  navButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    ...typography.label,
    color: colors.ink,
  },
  navIndex: {
    ...typography.monoBody,
    color: colors.inkSoft,
  },
  block: {
    gap: spacing.sm,
  },
  blockLabel: {
    ...typography.label,
    color: colors.ink,
  },
  noteInput: {
    minHeight: 72,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.ink,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  fontRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  fontChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontChipActive: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  fontChipText: {
    fontSize: 14,
    color: colors.ink,
  },
  fontChipTextActive: {
    color: colors.white,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stickerAdd: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stickerAddText: {
    fontSize: 22,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  toolButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonText: {
    ...typography.label,
    color: colors.ink,
  },
  toolDanger: {
    borderColor: colors.danger,
  },
  toolDangerText: {
    color: colors.danger,
  },
  hint: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  deleteButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    ...typography.button,
    color: colors.danger,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
