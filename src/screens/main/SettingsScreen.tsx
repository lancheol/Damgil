import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getAccountDeletionPreview } from '../../api/account';
import { getSettings, getSettingsDocument } from '../../api/settings';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, SettingsMenuItemDto } from '../../api/types';
import { BackButton } from '../../components/common/BackButton';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const DANGER_RED = '#FB2C36';
const ROW_LABEL = '#364153';
const MUTED = '#6A7282';
const TITLE = '#1E2939';
const BORDER = '#F3F4F6';

const MENU_LABELS: Record<string, string> = {
  feedback: '피드백 보내기',
  guide: '사용 가이드',
  terms: '서비스 이용약관',
  privacy_policy: '개인정보 처리방침',
  logout: '로그아웃',
  withdrawal: '회원탈퇴',
};

const FALLBACK_MENU: SettingsMenuItemDto[] = [{ key: 'feedback' }];

const ACCOUNT_MENU_KEYS = new Set(['logout', 'withdrawal']);
const DOCUMENT_MENU_KEYS = new Set(['guide', 'terms', 'privacy_policy']);

function formatDeletionPreviewMessage(willDelete: Record<string, number>): string {
  const parts = Object.entries(willDelete)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .map(([key, count]) => `${key} ${count}건`);

  if (parts.length === 0) {
    return '탈퇴하면 계정과 관련 데이터가 삭제되며 되돌릴 수 없습니다.';
  }
  return `삭제 예정: ${parts.join(', ')}\n탈퇴하면 되돌릴 수 없습니다.`;
}

function getMenuLabel(item: SettingsMenuItemDto): string {
  return MENU_LABELS[item.key] ?? item.key;
}

async function openDocumentUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) {
    Alert.alert('문서 열기 실패', '유효하지 않은 문서 주소예요.');
    return;
  }
  const canOpen = await Linking.canOpenURL(trimmed);
  if (!canOpen) {
    Alert.alert('문서 열기 실패', '문서를 열 수 없어요.');
    return;
  }
  await Linking.openURL(trimmed);
}

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signOut, deleteAccount } = useAuth();
  const [menuItems, setMenuItems] = useState<SettingsMenuItemDto[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [documentBusyKey, setDocumentBusyKey] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  const loadMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const response = await getSettings();
      const items = (response.menu ?? []).filter((item) => !ACCOUNT_MENU_KEYS.has(item.key));
      setMenuItems(items.length > 0 ? items : FALLBACK_MENU);
    } catch {
      setMenuItems(FALLBACK_MENU);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMenu();
    }, [loadMenu]),
  );

  const handleDocumentPress = async (item: SettingsMenuItemDto) => {
    if (documentBusyKey) return;
    const label = getMenuLabel(item);
    setDocumentBusyKey(item.key);
    try {
      let url = item.url?.trim() || null;
      const documentType =
        item.documentType?.trim() ||
        (DOCUMENT_MENU_KEYS.has(item.key) ? item.key : null);

      if (!url && documentType) {
        try {
          const document = await getSettingsDocument(documentType);
          url = document.url?.trim() || null;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            Alert.alert(label, '아직 게시되지 않은 문서예요.');
            return;
          }
          throw error;
        }
      }

      if (!url) {
        Alert.alert(label, '아직 게시되지 않은 문서예요.');
        return;
      }

      await openDocumentUrl(url);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : '문서를 열지 못했어요.';
      Alert.alert('문서 열기 실패', message);
    } finally {
      setDocumentBusyKey(null);
    }
  };

  const handleItemPress = (item: SettingsMenuItemDto) => {
    if (item.key === 'feedback') {
      navigation.navigate('Feedback');
      return;
    }
    if (item.documentType || item.url || DOCUMENT_MENU_KEYS.has(item.key)) {
      void handleDocumentPress(item);
      return;
    }
    Alert.alert(getMenuLabel(item), '준비 중인 기능입니다.');
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
          {menuLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={MUTED} />
            </View>
          ) : (
            menuItems.map((item, index) => {
              const isLast = index === menuItems.length - 1;
              const busy = documentBusyKey === item.key;
              return (
                <Pressable
                  key={item.key}
                  disabled={busy}
                  onPress={() => handleItemPress(item)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowBorder,
                    (pressed || busy) && styles.rowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={getMenuLabel(item)}
                  accessibilityState={{ disabled: busy }}
                >
                  <Text style={styles.rowLabel}>{getMenuLabel(item)}</Text>
                  {busy ? (
                    <ActivityIndicator size="small" color={MUTED} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#99A1AF" />
                  )}
                </Pressable>
              );
            })
          )}
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
  loadingRow: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
