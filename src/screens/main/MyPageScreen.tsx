import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MyPageAvatarIcon,
  MyPageHeartIcon,
  MyPageSettingsIcon,
} from '../../components/mypage/MyPageIcons';
import { useAuth } from '../../context/AuthContext';
import { useDiaries } from '../../context/DiaryContext';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { Diary } from '../../types/diary';
import { getCoverBackgroundColor, getEffectiveCover, resolveCoverImageUri } from '../../utils/diaryCover';
import { colors, radii, spacing, typography } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyPage'>,
  NativeStackScreenProps<RootStackParamList>
>;

const H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - H_PADDING * 2 - GRID_GAP) / 2;

export function MyPageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { diaries, deleteDiary } = useDiaries();

  const username = user?.username ?? 'traveler';
  const bio = user?.bio ?? '매주 새로운 곳을 기록하는 다이어리 ✈️';

  const [menuDiary, setMenuDiary] = useState<Diary | null>(null);

  const coverDiaries = useMemo(
    () =>
      [...diaries]
        .filter((diary) => Boolean(diary.endedAt))
        .sort(
          (a, b) => new Date(b.endedAt ?? b.createdAt).getTime() - new Date(a.endedAt ?? a.createdAt).getTime(),
        ),
    [diaries],
  );

  const openDiary = (diary: Diary) => {
    const isDraft = Boolean(diary.coverDraft) && !diary.cover;
    if (isDraft) {
      navigation.navigate('DiaryCoverEdit', { diaryId: diary.id });
      return;
    }
    navigation.navigate('DiaryEdit', { diaryId: diary.id });
  };

  const confirmDelete = (diary: Diary) => {
    const title = getEffectiveCover(diary).title?.trim() || diary.name;
    Alert.alert('다이어리 삭제', `'${title}'을(를) 삭제할까요?\n기록한 사진과 꾸미기가 모두 사라집니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          if (!deleteDiary(diary.id)) {
            Alert.alert('삭제 실패', '다이어리를 삭제하지 못했어요.');
          }
        },
      },
    ]);
  };

  const renderDiaryCard = ({ item }: { item: Diary }) => {
    const cover = getEffectiveCover(item);
    const coverUri = resolveCoverImageUri(item, cover);
    const coverColor = getCoverBackgroundColor(cover);
    const likeCount = item.photos?.length ?? 0;
    const title = cover.title?.trim() || item.name;
    const isDraft = Boolean(item.coverDraft) && !item.cover;
    const isPrivate = (item.visibility ?? 'private') === 'private';

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openDiary(item)}
        style={styles.card}
      >
        <View style={[styles.thumb, { backgroundColor: coverColor }]}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbTitleWrap}>
              <Text style={styles.thumbTitle} numberOfLines={3}>
                {title}
              </Text>
            </View>
          )}
          <View style={styles.badgeRow}>
            {isPrivate ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>비공개</Text>
              </View>
            ) : null}
            {isDraft ? (
              <View style={[styles.badge, styles.badgeDraft]}>
                <Text style={styles.badgeText}>임시 저장</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.likeBadge}>
            <MyPageHeartIcon size={10} />
            <Text style={styles.likeCount}>{likeCount}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} 더보기`}
            hitSlop={8}
            onPress={() => setMenuDiary(item)}
            style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.white} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="환경설정"
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
        >
          <MyPageSettingsIcon size={24} />
        </Pressable>
      </View>

      <FlatList
        data={coverDiaries}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <MyPageAvatarIcon size={32} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.username}>{username}</Text>
                <Text style={styles.bio} numberOfLines={2}>
                  {bio}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="프로필 편집하기"
              onPress={() => navigation.navigate('ProfileEdit')}
              style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
            >
              <Text style={styles.editProfileText}>프로필 편집하기</Text>
            </Pressable>

            <View style={styles.profileDivider} />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 등록된 여행 다이어리가 없어요.</Text>
          </View>
        }
        renderItem={renderDiaryCard}
      />

      <Modal
        visible={Boolean(menuDiary)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuDiary(null)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuDiary(null)}>
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuDiary ? getEffectiveCover(menuDiary).title?.trim() || menuDiary.name : ''}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const target = menuDiary;
                setMenuDiary(null);
                if (target) {
                  openDiary(target);
                }
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={18} color={colors.ink} />
              <Text style={styles.menuItemText}>수정</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const target = menuDiary;
                setMenuDiary(null);
                if (target) {
                  confirmDelete(target);
                }
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>삭제</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E2939',
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 120,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E2939',
  },
  bio: {
    fontSize: 12,
    color: '#6A7282',
  },
  editProfileBtn: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 40,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DC',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E2939',
  },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: spacing.sm,
  },
  gridRow: {
    gap: GRID_GAP,
    marginTop: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    gap: 8,
  },
  thumb: {
    width: '100%',
    height: CARD_WIDTH * 1.25,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  thumbTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 38,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeDraft: {
    backgroundColor: 'rgba(55,55,55,0.75)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  likeBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  likeCount: {
    fontSize: 10,
    color: colors.white,
  },
  moreButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  menuCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  menuTitle: {
    ...typography.label,
    color: colors.inkMuted,
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  menuItemText: {
    ...typography.button,
    fontSize: 15,
    color: colors.ink,
  },
  menuItemDanger: {
    color: colors.danger,
  },
  empty: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
