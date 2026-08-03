import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>환경설정</Text>
        <Text style={styles.subtitle}>앱 환경 설정은 이후 단계에서 확장됩니다.</Text>

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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
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
