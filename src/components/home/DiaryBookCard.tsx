import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Diary } from '../../types/diary';
import {
  getCoverBackgroundColor,
  getCoverFontStyle,
  getCoverTitleColor,
  getEffectiveCover,
  resolveCoverImageUri,
} from '../../utils/diaryCover';
import { colors, radii, spacing, typography } from '../../theme';

type DiaryBookCardProps = {
  diary: Diary;
  onPress?: () => void;
};

export function DiaryBookCard({ diary, onPress }: DiaryBookCardProps) {
  const cover = getEffectiveCover(diary);
  const coverUri = resolveCoverImageUri(diary, cover);
  const title = cover.title?.trim() || diary.name;
  const coverBg = getCoverBackgroundColor(cover);
  const titleColor = getCoverTitleColor(coverBg);
  const muted = titleColor === '#FFFFFF' ? '#9A9A9A' : '#6B6B6B';
  const soft = titleColor === '#FFFFFF' ? '#B5B5B5' : '#666666';
  const line = titleColor === '#FFFFFF' ? '#2E2E2E' : '#D4D4D4';
  const divider = titleColor === '#FFFFFF' ? '#3A3A3A' : '#C4C4C4';

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
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
        ) : null}
        {coverUri ? <View style={styles.coverDim} /> : null}

        <View style={[styles.cornerMark, { borderColor: muted }]} />
        <Text style={[styles.brand, { color: muted }]}>담길 DIARY</Text>
        <View style={[styles.divider, { backgroundColor: divider }]} />
        <Text
          style={[styles.title, getCoverFontStyle(cover.fontId), { color: titleColor }]}
          numberOfLines={3}
        >
          {title}
        </Text>
        <Text style={[styles.place, { color: soft }]} numberOfLines={2}>
          {diary.place}
        </Text>

        {cover.stickers.slice(0, 6).map((sticker) => (
          <Text
            key={sticker.id}
            style={[
              styles.coverSticker,
              {
                left: `${sticker.x * 100}%` as unknown as number,
                top: `${sticker.y * 100}%` as unknown as number,
                transform: [
                  { translateX: -10 },
                  { translateY: -10 },
                  { scale: Math.min(sticker.scale, 1.2) },
                  { rotate: `${sticker.rotation}deg` },
                ],
              },
            ]}
          >
            {sticker.emoji}
          </Text>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerLabel, { color: muted }]}>TRAVEL LOG</Text>
          <Text style={[styles.photoCount, { color: soft }]}>
            기록 {diary.photos?.length ?? 0}장
          </Text>
          <View style={[styles.footerLine, { backgroundColor: line }]} />
        </View>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingRight: spacing.xxxl,
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  coverDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  coverSticker: {
    position: 'absolute',
    fontSize: 20,
    zIndex: 2,
  },
  cornerMark: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.xxl,
    width: 18,
    height: 18,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#5A5A5A',
    zIndex: 1,
  },
  brand: {
    ...typography.monoBody,
    color: '#9A9A9A',
    letterSpacing: 1.2,
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#3A3A3A',
    marginBottom: spacing.xl,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.6,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  place: {
    ...typography.body,
    color: '#B5B5B5',
    zIndex: 1,
  },
  footer: {
    marginTop: 'auto',
    gap: spacing.sm,
    zIndex: 1,
  },
  footerLabel: {
    ...typography.monoBody,
    color: '#7A7A7A',
    letterSpacing: 1.4,
  },
  photoCount: {
    ...typography.body,
    color: '#B5B5B5',
    marginTop: 4,
  },
  footerLine: {
    height: 1,
    backgroundColor: '#2E2E2E',
    marginTop: spacing.sm,
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
