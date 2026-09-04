import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Diary } from '../../types/diary';
import { colors, radii, spacing } from '../../theme';

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

  return (
    <View style={styles.stage}>
      <View style={styles.shadowWrap}>
        <View style={styles.polaroid}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다이어리 삭제"
            hitSlop={8}
            onPress={onPressDelete}
            style={({ pressed }) => [styles.trashBtn, pressed && styles.trashPressed]}
          >
            <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} 다이어리`}
            onPress={onPress}
            style={({ pressed }) => [styles.photoInset, pressed && styles.pressed]}
          >
            <View style={styles.photoWell}>
              <Ionicons name="camera-outline" size={40} color="#9CA3AF" />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={styles.captionArea}
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 8,
  },
  shadowWrap: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.72,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  polaroid: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
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
  photoInset: {
    flex: 1,
  },
  photoWell: {
    flex: 1,
    backgroundColor: '#D8DADF',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  captionArea: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
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
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
});
