import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';

export function SearchScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>여행지와 기록을 검색하는 화면입니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 110,
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    color: colors.inkSoft,
  },
});
