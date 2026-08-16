import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { TermsBody } from '../../components/common/TermsBody';
import { TERMS_CONTENT } from '../../constants/terms';
import { getAccountDeletionPreview } from '../../api/account';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList, TermsType } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingsItem = {
  id: string;
  label: string;
  terms?: TermsType;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { id: 'feedback', label: '피드백 보내기' },
  { id: 'guide', label: '사용 가이드' },
  { id: 'terms', label: '서비스 이용약관', terms: 'service' },
  { id: 'privacy', label: '개인정보 처리방침', terms: 'privacy' },
  { id: 'location', label: '위치기반 서비스 이용약관', terms: 'location' },
  { id: 'marketing', label: '마케팅 정보 수신 동의', terms: 'marketing' },
];

const DANGER_RED = '#FB2C36';
const ROW_LABEL = '#364153';
const MUTED = '#6A7282';
const TITLE = '#1E2939';
const BORDER = '#F3F4F6';

function formatDeletionPreviewMessage(willDelete: Record<string, number>): string {
  const parts = Object.entries(willDelete)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .map(([key, count]) => `${key} ${count}건`);

  if (parts.length === 0) {
    return '탈퇴하면 계정과 관련 데이터가 삭제되며 되돌릴 수 없습니다.';
  }
  return `삭제 예정: ${parts.join(', ')}\n탈퇴하면 되돌릴 수 없습니다.`;
}

export function SettingsScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { signOut, deleteAccount } = useAuth();
  const [terms, setTerms] = useState<TermsType | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  const handleItemPress = (item: SettingsItem) => {
    if (item.terms) {
      setTerms(item.terms);
      return;
    }
    Alert.alert(item.label, '준비 중인 기능입니다.');
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  const confirmWithdraw = () => {
    if (withdrawBusy) {
      return;
    }
    Alert.alert('회원탈퇴 확정', '정말 탈퇴할까요? 이 작업은 취소할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setWithdrawBusy(true);
            try {
              await deleteAccount();
              Alert.alert('탈퇴 완료', '계정이 삭제되었습니다.');
            } catch (error) {
              const message =
                error instanceof ApiError
                  ? error.message
                  : '회원탈퇴를 완료하지 못했어요.';
              Alert.alert('탈퇴 실패', message);
            } finally {
              setWithdrawBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    if (withdrawBusy) {
      return;
    }

    void (async () => {
      setWithdrawBusy(true);
      try {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          Alert.alert('탈퇴 실패', '로그인이 필요합니다.');
          return;
        }

        const preview = await getAccountDeletionPreview(tokens.access);
        Alert.alert('회원탈퇴', formatDeletionPreviewMessage(preview.willDelete), [
          { text: '취소', style: 'cancel' },
          {
            text: '계속',
            style: 'destructive',
            onPress: confirmWithdraw,
          },
        ]);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : '탈퇴 안내를 불러오지 못했어요.';
        Alert.alert('탈퇴 실패', message);
      } finally {
        setWithdrawBusy(false);
      }
    })();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton color={TITLE} style={styles.backBtn} />
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {SETTINGS_ITEMS.map((item, index) => {
            const isLast = index === SETTINGS_ITEMS.length - 1;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  styles.row,
                  !isLast && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#99A1AF" />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.accountActions}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.accountButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="로그아웃"
          >
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>

          <Pressable
            onPress={handleWithdraw}
            disabled={withdrawBusy}
            style={({ pressed }) => [
              styles.accountButton,
              (pressed || withdrawBusy) && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="회원탈퇴"
            accessibilityState={{ disabled: withdrawBusy }}
          >
            <Text style={styles.withdrawText}>
              {withdrawBusy ? '처리 중…' : '회원탈퇴'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={terms !== null}
        animationType="slide"
        onRequestClose={() => setTerms(null)}
      >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={12}
              onPress={() => setTerms(null)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={24} color={TITLE} />
            </Pressable>
            <Text style={styles.headerTitle}>{terms ? TERMS_CONTENT[terms].title : ''}</Text>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.termsContent,
              { paddingBottom: insets.bottom + spacing.xxl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {terms ? <TermsBody body={TERMS_CONTENT[terms].body} /> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
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
  closeButton: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowPressed: {
    backgroundColor: colors.background,
  },
  rowLabel: {
    fontSize: 14,
    color: ROW_LABEL,
    lineHeight: 20,
  },
  accountActions: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  accountButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
    lineHeight: 20,
  },
  withdrawText: {
    fontSize: 14,
    fontWeight: '500',
    color: DANGER_RED,
    lineHeight: 20,
  },
  termsContent: {
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
});
