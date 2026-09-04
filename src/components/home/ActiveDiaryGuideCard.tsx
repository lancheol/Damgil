import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Diary } from '../../types/diary';
import { colors, radii, spacing } from '../../theme';
import { HomePolaroidFrame, homePolaroidStyles } from './HomePolaroidFrame';

type ActiveDiaryGuideCardProps = {
  diary: Diary;
  onPress: () => void;
  onPressDelete: () => void;
};

export function ActiveDiaryGuideCard({
  diary,
  onPress,
  onPressDelete,
}: ActiveDiaryGuideCardProps) {
  const title = diary?.name?.trim() || '나의 여행';
  const place = diary?.place?.trim() || '';
  const photos = diary?.photos ?? [];
  const previewUri = photos.length > 0 ? photos[photos.length - 1]?.uri : null;
  const actionHint =
    photos.length === 0 ? '눌러서 사진을 촬영합니다' : '눌러서 촬영·종료 메뉴를 엽니다';

  return (
    <HomePolaroidFrame
      overlay={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다이어리 삭제"
          accessibilityHint="이 여행 다이어리를 삭제합니다"
          hitSlop={8}
          onPress={onPressDelete}
          style={({ pressed }) => [styles.trashBtn, pressed && styles.trashPressed]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.inkMuted} />
        </Pressable>
      }
      photo={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} 다이어리`}
          accessibilityHint={actionHint}
          onPress={onPress}
          style={({ pressed }) => [
            homePolaroidStyles.photoWell,
            pressed && homePolaroidStyles.pressed,
          ]}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons name="camera-outline" size={40} color={colors.inkMuted} />
          )}
        </Pressable>
      }
      caption={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}${place ? `, ${place}` : ''}`}
          accessibilityHint={actionHint}
          onPress={onPress}
          style={styles.captionHit}
        >
          <View style={styles.titlePill}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {place ? (
            <Text style={styles.placeText} numberOfLines={1}>
              {place}
            </Text>
          ) : null}
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  trashBtn: {
    position: 'absolute',
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashPressed: {
    opacity: 0.6,
  },
  previewImage: {
    ...StyleSheet.absoluteFill,
  },
  captionHit: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
    alignSelf: 'stretch',
  },
  titlePill: {
    backgroundColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  titleText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  placeText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
});
