import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

const GUIDE_LINES = [
  '(a) 여행의 추억을 기록하세요.',
  '(b) 여행마다 다이어리를 만들어 추억을 쌓아보세요.',
  '(c) 나만의 여행 다이어리를 만드세요.',
  '(d) 막막할 땐 AI 여행 코스 추천을 활용하세요.',
  '(e) 가고 싶은 장소와 목적지를 저장하세요.',
  '(f) 사진과 짧은 메모로 하루를 남겨보세요.',
  '(g) 다시 펼쳐볼수록 여행이 선명해집니다.',
] as const;

type EmptyDiaryCardProps = {
  onPressCreate: () => void;
};

export function EmptyDiaryCard({ onPressCreate }: EmptyDiaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.paper}>
        <View style={styles.tape} />
        <Text style={styles.paperTitle}>How to Remember a Trip</Text>
        <View style={styles.list}>
          {GUIDE_LINES.map((line) => (
            <Text key={line} style={styles.paperLine}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="새 다이어리 만들기"
        onPress={onPressCreate}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
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
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
