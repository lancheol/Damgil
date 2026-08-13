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
import { mapLoginError, useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import { validateLoginForm } from '../../utils/authValidation';
import { resetSignupTermsState } from '../../utils/signupTermsState';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type FormErrors = {
  email?: string;
  password?: string;
};

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await signIn(email.trim(), password);
    } catch (error) {
      setFormError(mapLoginError(error));
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
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <DamgilLogo size={64} />
            <Text style={styles.title}>담길에 오신 걸 환영해요</Text>
            <Text style={styles.subtitle}>이메일로 로그인해 주세요.</Text>
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
              autoCorrect={false}
              returnKeyType="next"
            />
            <AuthTextInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="비밀번호"
              secureTextEntry
              textContentType="password"
              autoComplete="password"
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
                <Text style={styles.primaryButtonText}>로그인</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              resetSignupTermsState();
              navigation.navigate('SignUp');
            }}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>아직 계정이 없나요? </Text>
            <Text style={styles.switchLink}>회원가입</Text>
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
