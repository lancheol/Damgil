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
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList, TermsType } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';
import {
  isValidPhone,
  normalizePhone,
  validateSignUpForm,
  VisibilityRange,
} from '../../utils/authValidation';
import {
  getSignupTermsState,
  resetSignupTermsState,
  setTermsAgreed,
} from '../../utils/signupTermsState';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

type FormErrors = ReturnType<typeof validateSignUpForm>;

const MOCK_VERIFICATION_CODE = '1234';

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const initialTerms = getSignupTermsState();
  const [hasReadService, setHasReadService] = useState(initialTerms.hasReadService);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(initialTerms.hasReadPrivacy);
  const [agreedService, setAgreedService] = useState(initialTerms.agreedService);
  const [agreedPrivacy, setAgreedPrivacy] = useState(initialTerms.agreedPrivacy);

  const [visibility, setVisibility] = useState<VisibilityRange | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const terms = getSignupTermsState();
      setHasReadService(terms.hasReadService);
      setHasReadPrivacy(terms.hasReadPrivacy);
      setAgreedService(terms.agreedService);
      setAgreedPrivacy(terms.agreedPrivacy);
    }, []),
  );

  const openTerms = (type: TermsType) => {
    navigation.navigate('TermsDetail', { type });
  };

  const toggleAgreement = (type: TermsType) => {
    const hasRead = type === 'service' ? hasReadService : hasReadPrivacy;
    if (!hasRead) {
      Alert.alert('약관 확인', '먼저 ‘읽기’를 눌러 약관을 확인해 주세요.');
      return;
    }

    if (type === 'service') {
      setAgreedService((prev) => {
        const next = !prev;
        setTermsAgreed('service', next);
        return next;
      });
      return;
    }

    setAgreedPrivacy((prev) => {
      const next = !prev;
      setTermsAgreed('privacy', next);
      return next;
    });
  };

  const handleSendCode = () => {
    if (!isValidPhone(phone)) {
      setErrors((prev) => ({
        ...prev,
        phone: '올바른 휴대폰 번호 형식이 아닙니다.',
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, phone: undefined, phoneVerified: undefined }));
    setPhoneVerified(false);
    setCodeSent(true);
    setVerificationCode('');
    Alert.alert('인증번호 발송', `테스트용 인증번호는 ${MOCK_VERIFICATION_CODE} 입니다.`);
  };

  const handleVerifyCode = () => {
    if (verificationCode.trim() !== MOCK_VERIFICATION_CODE) {
      setErrors((prev) => ({
        ...prev,
        phoneVerified: '인증번호가 올바르지 않습니다.',
      }));
      setPhoneVerified(false);
      return;
    }

    setPhoneVerified(true);
    setErrors((prev) => ({ ...prev, phoneVerified: undefined }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateSignUpForm({
      username,
      password,
      confirmPassword,
      phone,
      phoneVerified,
      agreedService,
      agreedPrivacy,
      visibility,
    });
    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0 || !visibility) {
      return;
    }

    try {
      setSubmitting(true);
      await signUp({
        username: username.trim(),
        password,
        phone: normalizePhone(phone),
        visibility,
      });
      resetSignupTermsState();
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
        <View style={styles.topBar}>
          <BackButton target="Login" />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <DamgilLogo size={56} />
            <Text style={styles.title}>여행 기록을 시작해 보세요</Text>
            <Text style={styles.subtitle}>사용자 이름이 로그인 아이디로 사용됩니다.</Text>
          </View>

          <View style={styles.form}>
            <AuthTextInput
              label="사용자 이름"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              placeholder="이름"
              textContentType="username"
              autoComplete="username"
              autoCorrect={false}
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
              label="비밀번호 재입력"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="비밀번호를 한 번 더 입력"
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />

            <View style={styles.phoneBlock}>
              <Text style={styles.fieldLabel}>전화번호</Text>
              <View style={styles.phoneRow}>
                <AuthTextInput
                  label="전화번호"
                  hideLabel
                  containerStyle={styles.phoneInput}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setPhoneVerified(false);
                    setCodeSent(false);
                  }}
                  error={errors.phone}
                  placeholder="01012345678"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSendCode}
                  style={({ pressed }) => [
                    styles.phoneSendButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                >
                  <Text
                    style={styles.phoneSendButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {codeSent ? '재발송' : '인증번호 받기'}
                  </Text>
                </Pressable>
              </View>

              {codeSent ? (
                <View style={styles.verifyRow}>
                  <View style={styles.verifyInput}>
                    <AuthTextInput
                      label="인증번호"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      error={errors.phoneVerified}
                      placeholder="1234"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleVerifyCode}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      phoneVerified && styles.verifyButtonDone,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        phoneVerified && styles.verifyButtonDoneText,
                      ]}
                    >
                      {phoneVerified ? '인증완료' : '확인'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {!codeSent && errors.phoneVerified ? (
                <Text style={styles.inlineError}>{errors.phoneVerified}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>약관 동의</Text>
              <TermsRow
                title="서비스 이용약관"
                agreed={agreedService}
                hasRead={hasReadService}
                onPressRead={() => openTerms('service')}
                onToggleAgree={() => toggleAgreement('service')}
              />
              <TermsRow
                title="개인정보 처리방침"
                agreed={agreedPrivacy}
                hasRead={hasReadPrivacy}
                onPressRead={() => openTerms('privacy')}
                onToggleAgree={() => toggleAgreement('privacy')}
              />
              {errors.terms ? <Text style={styles.inlineError}>{errors.terms}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>공개 범위 설정</Text>
              <View style={styles.visibilityRow}>
                <VisibilityChip
                  label="공개"
                  selected={visibility === 'public'}
                  onPress={() => setVisibility('public')}
                />
                <VisibilityChip
                  label="비공개"
                  selected={visibility === 'private'}
                  onPress={() => setVisibility('private')}
                />
              </View>
              {errors.visibility ? (
                <Text style={styles.inlineError}>{errors.visibility}</Text>
              ) : null}
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

type VisibilityChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function VisibilityChip({ label, selected, onPress }: VisibilityChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.visibilityChip, selected && styles.visibilityChipSelected]}
    >
      <Text style={[styles.visibilityChipText, selected && styles.visibilityChipTextSelected]}>
        {label}
      </Text>
    </Pressable>
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
  phoneBlock: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.ink,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  phoneInput: {
    flex: 7,
    minWidth: 0,
  },
  phoneSendButton: {
    flex: 3,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  phoneSendButtonText: {
    ...typography.label,
    color: colors.ink,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.ink,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  verifyInput: {
    flex: 1,
  },
  verifyButton: {
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  verifyButtonDone: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  verifyButtonDoneText: {
    color: colors.white,
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
  visibilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityChipSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  visibilityChipText: {
    ...typography.label,
    color: colors.inkSoft,
  },
  visibilityChipTextSelected: {
    color: colors.white,
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
