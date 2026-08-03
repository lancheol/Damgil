import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { DamgilLogo } from './DamgilLogo';

export function HomeHeader() {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <DamgilLogo />
        <View style={styles.copy}>
          <Text style={styles.title}>나의 다이어리</Text>
          <Text style={styles.greeting}>안녕하세요</Text>
        </View>
      </View>
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
});
