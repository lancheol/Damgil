import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTextInput } from '../../components/auth/AuthTextInput';
import { BackButton } from '../../components/common/BackButton';
import { DamgilLogo } from '../../components/home/DamgilLogo';
import { TERMS_ITEMS } from '../../constants/terms';
import { mapSignupError, useAuth } from '../../context/AuthContext';
import { AuthStackParamList, TermsType } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_RULE_HINT,
  normalizeNickname,
  validateSignUpForm,
} from '../../utils/authValidation';
import {
  SignupTermsState,
  getSignupTermsState,
  resetSignupTermsState,
  setTermsAgreed,
} from '../../utils/signupTermsState';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

type FormErrors = ReturnType<typeof validateSignUpForm>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [consents, setConsents] = useState<SignupTermsState>(getSignupTermsState);
  const [agreedAge14, setAgreedAge14] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setConsents(getSignupTermsState());
    }, []),
  );

  const openTerms = (type: TermsType) => {
    navigation.navigate('TermsDetail', { type });
  };

  const toggleAgreement = (type: TermsType) => {
    if (!consents[type].hasRead) {
      Alert.alert('약관 확인', '먼저 ‘읽기’를 눌러 약관을 확인해 주세요.');
      return;
    }

    const next = !consents[type].agreed;
    setTermsAgreed(type, next);
    setConsents(getSignupTermsState());
  };

  const handleSubmit = async () => {
    const nextErrors = validateSignUpForm({
      email,
      nickname,
      password,
      confirmPassword,
      agreedPrivacy: consents.privacy.agreed,
      agreedService: consents.service.agreed,
      agreedLocation: consents.location.agreed,
      agreedAge14,
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await signUp({
        email: email.trim(),
        password,
        nickname: normalizeNickname(nickname),
        agreements: {
          terms: consents.service.agreed,
          privacy: consents.privacy.agreed,
          age14: agreedAge14,
          location: consents.location.agreed,
          marketing: consents.marketing.agreed,
        },
      });
      resetSignupTermsState();
      Alert.alert('가입 완료', '로그인해 주세요.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
        },
      ]);
    } catch (error) {
      setFormError(mapSignupError(error));
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
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.popToTop()} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <DamgilLogo size={56} />
            <Text style={styles.title}>여행 기록을 시작해 보세요</Text>
            <Text style={styles.subtitle}>이메일로 가입한 뒤 로그인하면 여행을 기록할 수 있어요.</Text>
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
            />
            <AuthTextInput
              label="닉네임"
              value={nickname}
              onChangeText={setNickname}
              error={errors.nickname}
              hint={NICKNAME_RULE_HINT}
              placeholder="예) damgil.user"
              maxLength={NICKNAME_MAX_LENGTH}
              textContentType="nickname"
              autoComplete="username"
              autoCorrect={false}
            />
            <AuthTextInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="8자 이상"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />
            <AuthTextInput
              label="비밀번호 재입력"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="비밀번호를 한 번 더 입력"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>약관 동의</Text>
              {TERMS_ITEMS.map((item) => (
                <TermsRow
                  key={item.type}
                  title={`${item.title} (${item.required ? '필수' : '선택'})`}
                  agreed={consents[item.type].agreed}
                  hasRead={consents[item.type].hasRead}
                  onPressRead={() => openTerms(item.type)}
                  onToggleAgree={() => toggleAgreement(item.type)}
                />
              ))}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedAge14 }}
                onPress={() => setAgreedAge14((prev) => !prev)}
                style={styles.termsRow}
              >
                <View style={styles.termsCheckArea}>
                  <View style={[styles.checkbox, agreedAge14 && styles.checkboxChecked]}>
                    {agreedAge14 ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.termsTitle}>만 14세 이상입니다 (필수)</Text>
                </View>
              </Pressable>
              {errors.terms ? <Text style={styles.inlineError}>{errors.terms}</Text> : null}
            </View>

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

type TermsRowProps = {
  title: string;
  agreed: boolean;
  hasRead: boolean;
  onPressRead: () => void;
  onToggleAgree: () => void;
};

function TermsRow({ title, agreed, hasRead, onPressRead, onToggleAgree }: TermsRowProps) {
  return (
    <View style={styles.termsRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed, disabled: !hasRead }}
        onPress={onToggleAgree}
        style={styles.termsCheckArea}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.termsTitle}>{title}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onPressRead}
        style={({ pressed }) => [styles.readButton, pressed && styles.secondaryButtonPressed]}
      >
        <Text style={styles.readButtonText}>읽기</Text>
      </Pressable>
    </View>
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 22,
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
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.ink,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  termsCheckArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsTitle: {
    ...typography.label,
    color: colors.ink,
    flex: 1,
  },
  readButton: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  readButtonText: {
    ...typography.label,
    color: colors.ink,
  },
  inlineError: {
    fontSize: 12,
    color: colors.danger,
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
    paddingBottom: spacing.lg,
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
