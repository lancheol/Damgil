import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { DamgilLogo } from './DamgilLogo';

export function HomeHeader() {
  return (
    <View style={styles.row}>
      <DamgilLogo />
      <Text style={styles.brand} accessibilityRole="header">
        담길
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  brand: {
    ...typography.brandTitle,
    color: colors.ink,
  },
});
