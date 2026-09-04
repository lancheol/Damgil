import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listBlockedUsers, unblockUser } from '../../api/moderation';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, BlockedUserDto } from '../../api/types';
import { BackButton } from '../../components/common/BackButton';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

export function BlockedUsersScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<BlockedUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setItems([]);
        return;
      }
      const list = await listBlockedUsers(tokens.access);
      setItems(list);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : '차단 목록을 불러오지 못했어요.';
      Alert.alert('차단한 사용자', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmUnblock = (item: BlockedUserDto) => {
    Alert.alert(
      '차단을 해제할까요?',
      '다시 서로의 다이어리를 볼 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          onPress: () => {
            void (async () => {
              const tokens = await loadTokens();
              if (!tokens?.access) return;
              setBusyId(item.userId);
              try {
                await unblockUser(tokens.access, item.userId);
                setItems((prev) => prev.filter((row) => row.userId !== item.userId));
                Alert.alert('차단', '차단을 해제했어요.');
              } catch (error) {
                const message =
                  error instanceof ApiError ? error.message : '차단을 해제하지 못했어요.';
                Alert.alert('차단', message);
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton color={colors.ink} style={styles.backBtn} />
        <Text style={styles.headerTitle}>차단한 사용자</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[
            styles.list,
            items.length === 0 && styles.emptyList,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyText}>차단한 사용자가 없어요.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowCopy}>
                <Ionicons name="person-outline" size={18} color={colors.inkMuted} />
                <Text style={styles.nickname} numberOfLines={1}>
                  {item.nickname?.trim() || `사용자 ${item.userId}`}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="차단 해제"
                disabled={busyId === item.userId}
                onPress={() => confirmUnblock(item)}
                style={({ pressed }) => [
                  styles.unblockBtn,
                  pressed && styles.pressed,
                  busyId === item.userId && styles.busy,
                ]}
              >
                {busyId === item.userId ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <Text style={styles.unblockText}>해제</Text>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    marginRight: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginRight: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  rowCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nickname: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  unblockBtn: {
    minWidth: 64,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  busy: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
