import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingsItem = {
  id: string;
  label: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  { id: 'saved', label: '나의 저장 목록' },
  { id: 'visits', label: '방문 기록' },
  { id: 'reviews', label: '리뷰 관리' },
  { id: 'notifications', label: '알림 설정' },
  { id: 'privacy', label: '개인정보 설정' },
  { id: 'support', label: '고객센터' },
];

const LOGOUT_RED = '#FB2C36';
const ROW_LABEL = '#364153';
const TITLE = '#1E2939';
const BORDER = '#F3F4F6';

export function SettingsScreen({}: Props) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleItemPress = (item: SettingsItem) => {
    Alert.alert(item.label, '준비 중인 기능입니다.');
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton color={TITLE} style={styles.backBtn} />
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
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
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="로그아웃"
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
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
    marginBottom: spacing.xl,
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
  logoutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: LOGOUT_RED,
    lineHeight: 20,
  },
});
