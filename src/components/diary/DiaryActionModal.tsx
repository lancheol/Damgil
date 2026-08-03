import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type DiaryActionModalProps = {
  visible: boolean;
  diaryName: string;
  onViewPhotos: () => void;
  onTakePhoto: () => void;
  onEndTrip: () => void;
  onClose: () => void;
};

export function DiaryActionModal({
  visible,
  diaryName,
  onViewPhotos,
  onTakePhoto,
  onEndTrip,
  onClose,
}: DiaryActionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>{diaryName}</Text>
          <Text style={styles.subtitle}>다음에 할 일을 선택해 주세요</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onViewPhotos}
            style={({ pressed }) => [styles.optionButton, pressed && styles.pressed]}
          >
            <Text style={styles.optionText}>저장된 사진 보기</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onTakePhoto}
            style={({ pressed }) => [
              styles.optionButton,
              styles.optionPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.optionText, styles.optionPrimaryText]}>사진 찍기</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onEndTrip}
            style={({ pressed }) => [
              styles.optionButton,
              styles.optionDanger,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.optionText, styles.optionDangerText]}>여행 종료</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>닫기</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.brandTitle,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  optionButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPrimary: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  optionDanger: {
    backgroundColor: colors.white,
    borderColor: colors.danger,
  },
  optionText: {
    ...typography.button,
    color: colors.ink,
  },
  optionPrimaryText: {
    color: colors.white,
  },
  optionDangerText: {
    color: colors.danger,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.body,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
