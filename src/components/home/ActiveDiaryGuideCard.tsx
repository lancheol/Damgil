import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HomeBookShell } from './HomeBookShell';
import { colors, radii, spacing, typography } from '../../theme';

const ACTIVE_GUIDE_LINES = [
  '(a) 다이어리를 눌러 촬영해주세요.',
  '(b) 촬영된 장소를 확인해주세요.',
  '(c) 여행 일자별 사진과 위치를 확인해주세요.',
  '(d) 여행 종료하기를 누르면 촬영물 수정이 불가능해요.',
] as const;

type ActiveDiaryGuideCardProps = {
  diaryName: string;
  onPress: () => void;
  onPressDelete: () => void;
};

export function ActiveDiaryGuideCard({
  diaryName,
  onPress,
  onPressDelete,
}: ActiveDiaryGuideCardProps) {
  const title = diaryName.trim() || '나의 여행';

  return (
    <HomeBookShell contentStyle={styles.coverContent}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="다이어리 삭제"
        hitSlop={8}
        onPress={onPressDelete}
        style={({ pressed }) => [styles.trashBtn, pressed && styles.trashPressed]}
      >
        <Ionicons name="trash-outline" size={22} color={colors.white} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} 다이어리`}
        onPress={onPress}
        style={({ pressed }) => [styles.cardHit, pressed && styles.cardPressed]}
      >
        <View style={styles.paper}>
          <View style={styles.tape} />
          <Text style={styles.paperTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.list}>
            {ACTIVE_GUIDE_LINES.map((line) => (
              <Text key={line} style={styles.paperLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </Pressable>
    </HomeBookShell>
  );
}

const styles = StyleSheet.create({
  coverContent: {
    position: 'relative',
  },
  trashBtn: {
    position: 'absolute',
    top: -spacing.sm + 15,
    right: spacing.sm + 15,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashPressed: {
    opacity: 0.7,
  },
  cardHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  paper: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 22,
    backgroundColor: colors.tape,
    borderRadius: 2,
    opacity: 0.92,
    transform: [{ rotate: '-2deg' }],
  },
  paperTitle: {
    ...typography.monoTitle,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  list: {
    gap: 6,
  },
  paperLine: {
    ...typography.monoBody,
    color: colors.inkSoft,
  },
});
