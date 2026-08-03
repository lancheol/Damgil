import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DiaryPhoto } from '../../types/diary';
import { getPlaceLabel } from '../../utils/diaryTimeline';
import { colors, radii, spacing, typography } from '../../theme';

type DiaryRecordCardProps = {
  photo: DiaryPhoto;
  onPress: () => void;
};

export function DiaryRecordCard({ photo, onPress }: DiaryRecordCardProps) {
  const placeLabel = getPlaceLabel(photo);
  const note = (photo.decoration?.note ?? photo.note)?.trim();
  const isVideo = (photo.mediaType ?? 'photo') === 'video';
  const hasDecor =
    (photo.decoration?.stickers?.length ?? 0) > 0 || Boolean(photo.decoration?.note?.trim());

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumbWrap}>
        {photo.uri ? (
          <Image source={{ uri: photo.uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
        {isVideo ? (
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>VIDEO</Text>
          </View>
        ) : null}
        {hasDecor ? (
          <View style={styles.decorBadge}>
            <Text style={styles.decorBadgeText}>꾸밈</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text style={styles.place} numberOfLines={1}>
          {placeLabel}
        </Text>
        {note ? (
          <Text style={styles.note} numberOfLines={2}>
            {note}
          </Text>
        ) : (
          <Text style={styles.notePlaceholder}>탭해서 꾸미기</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoBadgeText: {
    fontSize: 8,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  decorBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(47,107,255,0.9)',
  },
  decorBadgeText: {
    fontSize: 8,
    color: colors.white,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  place: {
    ...typography.label,
    color: colors.ink,
  },
  note: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  notePlaceholder: {
    ...typography.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
