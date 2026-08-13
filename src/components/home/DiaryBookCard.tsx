import { Pressable, StyleSheet, View } from 'react-native';

import { CoverThumb } from '../diary/CoverThumb';
import { Diary } from '../../types/diary';
import { getCoverBackgroundColor, getEffectiveCover } from '../../utils/diaryCover';
import { colors, radii, spacing } from '../../theme';

type DiaryBookCardProps = {
  diary: Diary;
  onPress?: () => void;
};

export function DiaryBookCard({ diary, onPress }: DiaryBookCardProps) {
  const cover = getEffectiveCover(diary);
  const title = cover.title?.trim() || diary.name;
  const coverBg = getCoverBackgroundColor(cover);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 다이어리`}
      onPress={onPress}
      style={({ pressed }) => [styles.book, pressed && styles.bookPressed]}
    >
      <View style={styles.spine}>
        <View style={styles.spineRidge} />
        <View style={styles.spineRidge} />
        <View style={styles.spineRidge} />
      </View>

      <View style={[styles.cover, { backgroundColor: coverBg }]}>
        <CoverThumb diary={diary} />
      </View>

      <View pointerEvents="none" style={styles.pageEdge}>
        <View style={[styles.pageSheet, styles.pageSheetBack]} />
        <View style={[styles.pageSheet, styles.pageSheetMid]} />
        <View style={[styles.pageSheet, styles.pageSheetFront]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  book: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bookPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  spine: {
    width: 28,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: spacing.xl,
  },
  spineRidge: {
    width: 3,
    flex: 1,
    maxHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: '#2E2E2E',
  },
  cover: {
    flex: 1,
    overflow: 'hidden',
  },
  pageEdge: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    right: 3,
    width: 14,
  },
  pageSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
  },
  pageSheetBack: {
    right: 0,
    width: 14,
    backgroundColor: '#E8E2D4',
    opacity: 0.55,
  },
  pageSheetMid: {
    right: 2,
    width: 12,
    backgroundColor: '#F0EBE0',
    opacity: 0.8,
  },
  pageSheetFront: {
    right: 4,
    width: 10,
    backgroundColor: '#F7F3EA',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.35)',
  },
});
