import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { DamgilLogo } from './DamgilLogo';

type HomeHeaderProps = {
  onPressSettings: () => void;
};

export function HomeHeader({ onPressSettings }: HomeHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <DamgilLogo />
        <View style={styles.copy}>
          <Text style={styles.title}>나의 다이어리</Text>
          <Text style={styles.greeting}>안녕하세요</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="설정"
        onPress={onPressSettings}
        style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
      >
        <Ionicons name="settings-outline" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  copy: {
    gap: 2,
    flexShrink: 1,
  },
  title: {
    ...typography.brandTitle,
    color: colors.ink,
  },
  greeting: {
    ...typography.greeting,
    color: colors.inkSoft,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  settingsPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
