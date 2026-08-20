import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { submitFeedback } from '../../api/settings';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, FeedbackType } from '../../api/types';
import { BackButton } from '../../components/common/BackButton';
import { DismissKeyboardView } from '../../components/common/DismissKeyboardView';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

const CONTENT_MAX_LENGTH = 2000;

const FEEDBACK_TYPES: { id: FeedbackType; label: string }[] = [
  { id: 'service_opinion', label: '서비스 의견' },
  { id: 'feature_request', label: '기능 요청' },
  { id: 'bug_report', label: '오류 제보' },
  { id: 'other', label: '기타' },
];

const TITLE = '#1E2939';
const MUTED = '#6A7282';
const BORDER = '#F3F4F6';

function formatRateLimitMessage(detail: unknown): string {
  if (detail && typeof detail === 'object' && 'retryAfterSec' in detail) {
    const sec = Number((detail as { retryAfterSec: unknown }).retryAfterSec);
    if (Number.isFinite(sec) && sec > 0) {
      const minutes = Math.max(1, Math.ceil(sec / 60));
      return `${minutes}분 후에 다시 시도해 주세요.`;
    }
  }
  return '잠시 후 다시 시도해 주세요.';
}

export function FeedbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<FeedbackType>('service_opinion');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !submitting;
  const contentLength = content.length;

  const placeholder = useMemo(() => {
    switch (type) {
      case 'bug_report':
        return '어떤 화면에서 어떤 문제가 생겼는지 알려주세요.';
      case 'feature_request':
        return '원하는 기능과 이유를 알려주세요.';
      case 'other':
        return '전하고 싶은 내용을 자유롭게 적어주세요.';
      default:
        return '서비스 이용 중 느낀 점을 알려주세요.';
    }
  }, [type]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('전송 실패', '로그인이 필요합니다.');
        return;
      }

      await submitFeedback(tokens.access, {
        type,
        content: trimmedContent,
      });

      Alert.alert('전송 완료', '피드백이 접수됐어요.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        Alert.alert('전송 제한', formatRateLimitMessage(error.detail));
        return;
      }
      const message =
        error instanceof ApiError ? error.message : '피드백을 보내지 못했어요.';
      Alert.alert('전송 실패', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DismissKeyboardView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <BackButton color={TITLE} style={styles.backBtn} />
            <Text style={styles.headerTitle}>피드백 보내기</Text>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing.xxxl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>유형</Text>
            <View style={styles.typeRow}>
              {FEEDBACK_TYPES.map((item) => {
                const active = type === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={active ? { selected: true } : {}}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setType(item.id)}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>내용</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={content}
                onChangeText={(text) => setContent(text.slice(0, CONTENT_MAX_LENGTH))}
                placeholder={placeholder}
                placeholderTextColor="#99A1AF"
                multiline
                textAlignVertical="top"
                maxLength={CONTENT_MAX_LENGTH}
              />
              <Text style={styles.counter}>
                {contentLength} / {CONTENT_MAX_LENGTH}
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={() => {
                void handleSubmit();
              }}
            >
              <Text style={styles.submitText}>{submitting ? '보내는 중…' : '보내기'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: spacing.sm,
  },
  backBtn: {
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TITLE,
    lineHeight: 28,
  },
  content: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TITLE,
    marginBottom: spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
  },
  typeChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#364153',
  },
  typeChipTextActive: {
    color: colors.white,
  },
  inputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    minHeight: 220,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 180,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: MUTED,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    backgroundColor: colors.white,
  },
  submitButton: {
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
  },
  submitButtonDisabled: {
    opacity: 0.35,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
