import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextInput } from '../../components/auth/AuthTextInput';
import { DamgilLogo } from '../../components/home/DamgilLogo';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import { validateSignUpForm } from '../../utils/authValidation';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextErrors = validateSignUpForm({ email, password, confirmPassword });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await signUp(email.trim(), password);
    } catch {
      setFormError('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <DamgilLogo size={64} />
            <Text style={styles.title}>여행 기록을 시작해 보세요</Text>
            <Text style={styles.subtitle}>이메일로 간단히 가입할 수 있어요.</Text>
          </View>

          <View style={styles.form}>
            <AuthTextInput
              label="이메일"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <AuthTextInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="6자 이상"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <AuthTextInput
              label="비밀번호 확인"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="비밀번호를 한 번 더 입력"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleSubmit();
              }}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handleSubmit();
              }}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && styles.primaryButtonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>회원가입</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>이미 계정이 있나요? </Text>
            <Text style={styles.switchLink}>로그인</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    ...typography.body,
    color: colors.inkSoft,
  },
  switchLink: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '700',
  },
});
