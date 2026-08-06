import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
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
import { CoverCanvas } from '../../components/diary/CoverCanvas';
import { useDiaries } from '../../context/DiaryContext';
import { RootStackParamList } from '../../navigation/types';
import { CoverFontId, DiaryCover } from '../../types/diary';
import {
  COVER_COLORS,
  COVER_FONTS,
  DEFAULT_COVER_COLOR,
  createEmptyCover,
  getCoverBackgroundColor,
  getEffectiveCover,
} from '../../utils/diaryCover';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryCoverEdit'>;

export function DiaryCoverEditScreen({ navigation, route }: Props) {
  const { diaryId, fromTripEnd } = route.params;
  const { getDiaryById, saveDiaryCover, discardCoverDraft } = useDiaries();
  const diary = getDiaryById(diaryId);

  const initial = useMemo(() => {
    if (!diary) {
      return createEmptyCover('');
    }
    return getEffectiveCover(diary);
  }, [diary]);

  const [title, setTitle] = useState(initial.title || diary?.name || '');
  const [fontId, setFontId] = useState<CoverFontId>(initial.fontId);
  const [backgroundColor, setBackgroundColor] = useState(
    getCoverBackgroundColor(initial) || DEFAULT_COVER_COLOR,
  );
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const buildCover = useCallback((): DiaryCover => {
    return {
      coverPhotoId: null,
      title: title.trim() || diary?.name || '나의 여행',
      fontId,
      stickers: [],
      backgroundColor,
      updatedAt: new Date().toISOString(),
    };
  }, [title, fontId, backgroundColor, diary?.name]);

  const leaveToMyPage = () => {
    navigation.navigate('Main', { screen: 'MyPage' });
  };

  const handleNext = () => {
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
    if (fromTripEnd) {
      navigation.replace('DiaryEdit', { diaryId });
      return;
    }
    navigation.goBack();
  };

  const handleLeave = () => {
    Alert.alert(
      '임시 저장',
      '표지 편집을 임시 저장할까요?\n임시 저장한 다이어리는 비공개로 마이페이지에 등록됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장 안 함',
          style: 'destructive',
          onPress: () => {
            discardCoverDraft(diaryId);
            setDirty(false);
            leaveToMyPage();
          },
        },
        {
          text: '임시 저장',
          onPress: () => {
            const ok = saveDiaryCover({
              diaryId,
              cover: buildCover(),
              mode: 'draft',
            });
            if (!ok) {
              Alert.alert('저장 실패', '임시 저장하지 못했어요.');
              return;
            }
            setDirty(false);
            leaveToMyPage();
          },
        },
      ],
    );
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
          <Text style={styles.headerSubtitle}>여행 다이어리 표지를 꾸며 보세요</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleNext}
          style={({ pressed }) => [styles.nextChip, pressed && styles.pressed]}
        >
          <Text style={styles.nextChipText}>다음</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CoverCanvas
          backgroundColor={backgroundColor}
          title={title.trim() || diary.name}
          fontId={fontId}
          stickers={[]}
          selectedStickerId={null}
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
          <Text style={styles.blockLabel}>표지 색상</Text>
          <View style={styles.colorRow}>
            {COVER_COLORS.map((swatch) => {
              const active = backgroundColor === swatch;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => {
                    setBackgroundColor(swatch);
                    markDirty();
                  }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: swatch },
                    active && styles.colorSwatchActive,
                    swatch === '#F5F5F5' && styles.colorSwatchBorder,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`표지 색상 ${swatch}`}
                />
              );
            })}
          </View>
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
  nextChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextChipText: {
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fontChip: {
    minWidth: 64,
    minHeight: 44,
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
    fontSize: 15,
    color: colors.ink,
  },
  fontChipTextActive: {
    color: colors.white,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },
  colorSwatchActive: {
    borderColor: colors.black,
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
