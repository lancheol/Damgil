import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { CoverCanvas } from '../../components/diary/CoverCanvas';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { CoverFontId, CoverSticker, DiaryCover } from '../../types/diary';
import {
  COVER_FONTS,
  COVER_STICKER_EMOJIS,
  createEmptyCover,
  getEffectiveCover,
  resolveCoverImageUri,
} from '../../utils/diaryCover';
import { createStickerId } from '../../utils/decorAssets';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryCoverEdit'>;

export function DiaryCoverEditScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const { getDiaryById, saveDiaryCover, discardCoverDraft } = useDiaries();
  const diary = getDiaryById(diaryId);

  const initial = useMemo(() => {
    if (!diary) {
      return createEmptyCover('');
    }
    return getEffectiveCover(diary);
  }, [diary]);

  const [title, setTitle] = useState(initial.title);
  const [fontId, setFontId] = useState<CoverFontId>(initial.fontId);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(initial.coverPhotoId);
  const [stickers, setStickers] = useState<CoverSticker[]>(initial.stickers);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const buildCover = useCallback((): DiaryCover => {
    return {
      coverPhotoId,
      title: title.trim() || diary?.name || '나의 여행',
      fontId,
      stickers,
      updatedAt: new Date().toISOString(),
    };
  }, [coverPhotoId, title, fontId, stickers, diary?.name]);

  const previewUri = diary
    ? resolveCoverImageUri(diary, {
        coverPhotoId,
        title,
        fontId,
        stickers,
        updatedAt: '',
      })
    : null;

  const selectedSticker = stickers.find((item) => item.id === selectedStickerId) ?? null;

  const handleSave = () => {
    if (!diary) {
      return;
    }
    const ok = saveDiaryCover({
      diaryId,
      cover: buildCover(),
      mode: 'save',
    });
    if (!ok) {
      Alert.alert('저장 실패', '표지를 저장하지 못했습니다.');
      return;
    }
    setDirty(false);
    navigation.goBack();
  };

  const handleLeave = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }

    Alert.alert('표지 편집', '편집 내용을 임시 저장할까요?', [
      {
        text: '저장 안 함',
        style: 'destructive',
        onPress: () => {
          discardCoverDraft(diaryId);
          setDirty(false);
          navigation.goBack();
        },
      },
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '임시 저장',
        onPress: () => {
          saveDiaryCover({
            diaryId,
            cover: buildCover(),
            mode: 'draft',
          });
          setDirty(false);
          navigation.goBack();
        },
      },
    ]);
  };

  const addSticker = (emoji: string) => {
    const sticker: CoverSticker = {
      id: createStickerId(),
      emoji,
      x: 0.5,
      y: 0.4,
      scale: 1,
      rotation: 0,
    };
    setStickers((prev) => [...prev, sticker]);
    setSelectedStickerId(sticker.id);
    markDirty();
  };

  const updateSelected = (patch: Partial<CoverSticker>) => {
    if (!selectedStickerId) {
      return;
    }
    setStickers((prev) =>
      prev.map((item) => (item.id === selectedStickerId ? { ...item, ...patch } : item)),
    );
    markDirty();
  };

  if (!diary) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>다이어리를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton onPress={handleLeave} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>표지 편집</Text>
          <Text style={styles.headerSubtitle}>홈·피드 썸네일로 사용돼요</Text>
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
      >
        <CoverCanvas
          imageUri={previewUri}
          title={title}
          fontId={fontId}
          stickers={stickers}
          selectedStickerId={selectedStickerId}
          editable
          onSelectSticker={setSelectedStickerId}
          onMoveSticker={(id, x, y) => {
            setStickers((prev) => prev.map((item) => (item.id === id ? { ...item, x, y } : item)));
            markDirty();
          }}
        />

        <View style={styles.block}>
          <Text style={styles.blockLabel}>제목</Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              markDirty();
            }}
            placeholder="다이어리 제목"
            placeholderTextColor={colors.placeholder}
            style={styles.titleInput}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>글꼴</Text>
          <View style={styles.fontRow}>
            {COVER_FONTS.map((font) => {
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
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>대표 이미지</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            <Pressable
              onPress={() => {
                setCoverPhotoId(null);
                markDirty();
              }}
              style={[styles.thumbItem, coverPhotoId === null && styles.thumbItemActive]}
            >
              <View style={styles.defaultThumb}>
                <Text style={styles.defaultThumbText}>기본</Text>
              </View>
            </Pressable>
            {(diary.photos ?? []).map((photo) => {
              const active = coverPhotoId === photo.id;
              return (
                <Pressable
                  key={photo.id}
                  onPress={() => {
                    setCoverPhotoId(photo.id);
                    markDirty();
                  }}
                  style={[styles.thumbItem, active && styles.thumbItemActive]}
                >
                  <Image source={{ uri: photo.uri }} style={styles.thumbImage} resizeMode="cover" />
                  {(photo.mediaType ?? 'photo') === 'video' ? (
                    <View style={styles.videoTag}>
                      <Text style={styles.videoTagText}>V</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>스티커</Text>
          <View style={styles.stickerRow}>
            {COVER_STICKER_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => addSticker(emoji)}
                style={({ pressed }) => [styles.stickerAdd, pressed && styles.pressed]}
              >
                <Text style={styles.stickerAddText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>

          {selectedSticker ? (
            <View style={styles.stickerTools}>
              <Text style={styles.toolHint}>선택 스티커</Text>
              <View style={styles.toolRow}>
                <Pressable
                  style={styles.toolButton}
                  onPress={() => updateSelected({ scale: Math.max(0.6, selectedSticker.scale - 0.15) })}
                >
                  <Text style={styles.toolButtonText}>축소</Text>
                </Pressable>
                <Pressable
                  style={styles.toolButton}
                  onPress={() => updateSelected({ scale: Math.min(2.2, selectedSticker.scale + 0.15) })}
                >
                  <Text style={styles.toolButtonText}>확대</Text>
                </Pressable>
                <Pressable
                  style={styles.toolButton}
                  onPress={() => updateSelected({ rotation: selectedSticker.rotation - 15 })}
                >
                  <Text style={styles.toolButtonText}>↺</Text>
                </Pressable>
                <Pressable
                  style={styles.toolButton}
                  onPress={() => updateSelected({ rotation: selectedSticker.rotation + 15 })}
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
            </View>
          ) : (
            <Text style={styles.toolHint}>스티커를 추가한 뒤 드래그해 배치하세요</Text>
          )}
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
    fontSize: 20,
    color: colors.ink,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 13,
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
    gap: spacing.xl,
  },
  block: {
    gap: spacing.sm,
  },
  blockLabel: {
    ...typography.label,
    color: colors.ink,
  },
  titleInput: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fontRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fontChip: {
    flex: 1,
    minHeight: 44,
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
    fontSize: 15,
    color: colors.ink,
  },
  fontChipTextActive: {
    color: colors.white,
  },
  thumbRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  thumbItem: {
    width: 72,
    height: 96,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#E5E7EB',
  },
  thumbItemActive: {
    borderColor: colors.black,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  defaultThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  defaultThumbText: {
    ...typography.monoBody,
    color: '#9A9A9A',
  },
  videoTag: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
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
  stickerTools: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  toolHint: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
