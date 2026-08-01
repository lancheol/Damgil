import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme';

export function MyPageScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>My Page</Text>
        <Text style={styles.subtitle}>프로필과 계정 설정을 관리합니다.</Text>

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>로그아웃</Text>
        </Pressable>
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
    marginBottom: spacing.xl,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});
