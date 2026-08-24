import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPublicFeed } from '../../api/feed';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, FeedItemDto } from '../../api/types';
import { MyPageHeartIcon, MyPageSettingsIcon } from '../../components/mypage/MyPageIcons';
import { ProfileAvatar } from '../../components/mypage/ProfileAvatar';
import { CoverThumb } from '../../components/diary/CoverThumb';
import { useAuth } from '../../context/AuthContext';
import { useDiaries } from '../../context/DiaryContext';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { Diary } from '../../types/diary';
import { getEffectiveCover } from '../../utils/diaryCover';
import {
  coverFromStickerLayout,
  feedCardToDiaryStub,
  feedItemToCard,
  mergeFeedCardMedia,
  type FeedDiaryCard,
} from '../../utils/feedMapper';
import { enrichFeedCardsFromPublicTrips } from '../../utils/feedEnrichment';
import { isDiaryPublished } from '../../utils/tripStatus';
import { colors, radii, spacing, typography } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyPage'>,
  NativeStackScreenProps<RootStackParamList>
>;

type LibrarySegment = 'mine' | 'liked';

const H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - H_PADDING * 2 - GRID_GAP) / 2;

const SEGMENTS: { id: LibrarySegment; label: string }[] = [
  { id: 'mine', label: '내 다이어리' },
  { id: 'liked', label: '좋아요' },
];

export function MyPageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { diaries, deleteDiary, updateDiaryVisibility, openPublicDiary, reopenDiaryForEdit } =
    useDiaries();

  const username = user?.username ?? 'traveler';
  const bio = user?.bio ?? '매주 새로운 곳을 기록하는 다이어리 ✈️';

  const [segment, setSegment] = useState<LibrarySegment>('mine');
  const [menuDiary, setMenuDiary] = useState<Diary | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [likedCards, setLikedCards] = useState<FeedDiaryCard[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [openingLikedId, setOpeningLikedId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const likedRequestRef = useRef(0);

  const coverDiaries = useMemo(
    () =>
      [...diaries]
        .filter((diary) => Boolean(diary.endedAt))
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.endedAt ?? b.createdAt).getTime() -
            new Date(a.updatedAt ?? a.endedAt ?? a.createdAt).getTime(),
        ),
    [diaries],
  );

  const loadLiked = useCallback(async () => {
    const requestId = likedRequestRef.current + 1;
    likedRequestRef.current = requestId;
    setLikedLoading(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setLikedCards([]);
        return;
      }

      const likedItems: FeedItemDto[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && likedItems.length < 40 && page <= 4) {
        const feed = await getPublicFeed(tokens.access, {
          page,
          limit: 50,
          sort: 'recent',
        });
        if (likedRequestRef.current !== requestId) return;

        likedItems.push(...(feed.items ?? []).filter((item) => item.liked));
        hasMore = Boolean(feed.hasMore);
        page += 1;
      }

      const stubs = likedItems.map((item) =>
        feedItemToCard(item, null, {
          cover: coverFromStickerLayout(item.title?.trim() || '여행 다이어리', null, null),
          photos: [],
        }),
      );

      setLikedCards((prev) => {
        const prevById = new Map(prev.map((card) => [card.id, card]));
        return stubs.map((card) => mergeFeedCardMedia(card, prevById.get(card.id)));
      });
      setLikedLoading(false);

      await enrichFeedCardsFromPublicTrips(likedItems, tokens.access, {
        concurrency: 3,
        priorityIds: likedItems.slice(0, 6).map((item) => item.id),
        isCancelled: () => likedRequestRef.current !== requestId,
        onCardEnriched: (enriched) => {
          setLikedCards((prev) =>
            prev.map((card) =>
              card.id === enriched.id ? mergeFeedCardMedia(enriched, card) : card,
            ),
          );
        },
      });
    } catch {
      if (likedRequestRef.current === requestId) {
        setLikedCards([]);
        setLikedLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (segment === 'liked') {
        void loadLiked();
      }
    }, [segment, loadLiked]),
  );

  const openDiary = (diary: Diary) => {
    // 표지만 임시저장인 경우 → 표지 편집으로
    const isDraftCover = Boolean(diary.coverDraft) && !diary.cover && !isDiaryPublished(diary);
    if (isDraftCover) {
      navigation.navigate('DiaryCoverEdit', { diaryId: diary.id });
      return;
    }
    // 라이브러리 카드 탭 = 게시물 보기. 꾸미기 재진입은 메뉴 「수정」만.
    navigation.navigate({
      name: 'DiaryEdit',
      params: {
        diaryId: diary.id,
        mode: 'view',
        republish: false,
      },
      merge: false,
    });
  };

  const editDiary = async (diary: Diary) => {
    if (editBusy) return;
    setEditBusy(true);
    try {
      const wasPublished = isDiaryPublished(diary);
      const ok = await reopenDiaryForEdit(diary.id);
      if (!ok) return;
      navigation.navigate({
        name: 'DiaryEdit',
        params: {
          diaryId: diary.id,
          mode: 'edit',
          republish: wasPublished,
        },
        merge: false,
      });
    } finally {
      setEditBusy(false);
    }
  };

  const openLikedCard = async (card: FeedDiaryCard) => {
    if (openingLikedId) return;
    setOpeningLikedId(card.id);
    try {
      const result = await openPublicDiary(card.id);
      if (result.status !== 'ok') return;
      navigation.navigate('DiaryEdit', {
        diaryId: result.diary.id,
        mode: 'view',
        liked: true,
        likeCount: card.likeCount,
        commentCount: card.commentCount,
      });
    } finally {
      setOpeningLikedId(null);
    }
  };

  const confirmDelete = (diary: Diary) => {
    const title = getEffectiveCover(diary).title?.trim() || diary.name;
    Alert.alert('다이어리 삭제', `'${title}'을(를) 삭제할까요?\n기록한 사진과 꾸미기가 모두 사라집니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteDiary(diary.id);
        },
      },
    ]);
  };

  const handleToggleVisibility = async (diary: Diary) => {
    if (visibilityBusy) {
      return;
    }
    const isPublic = (diary.visibility ?? 'private') === 'public';
    const next = isPublic ? 'private' : 'public';
    setVisibilityBusy(true);
    try {
      const ok = await updateDiaryVisibility(diary.id, next);
      if (ok) {
        setMenuDiary(null);
      }
    } finally {
      setVisibilityBusy(false);
    }
  };

  const renderDiaryCard = ({ item }: { item: Diary }) => {
    const cover = getEffectiveCover(item);
    const likeCount = item.likeCount ?? 0;
    const title = cover.title?.trim() || item.name;
    const isDraft =
      !isDiaryPublished(item) &&
      (item.editStatus === 'DRAFT' || (Boolean(item.coverDraft) && !item.cover));
    const isPrivate = (item.visibility ?? 'private') === 'private';

    return (
      <Pressable accessibilityRole="button" onPress={() => openDiary(item)} style={styles.card}>
        <View style={styles.thumb}>
          <CoverThumb diary={item} />
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

  const renderLikedCard = ({ item }: { item: FeedDiaryCard }) => {
    const stub = feedCardToDiaryStub(item);
    return (
      <Pressable
        accessibilityRole="button"
        disabled={openingLikedId === item.id}
        onPress={() => {
          void openLikedCard(item);
        }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.thumb}>
          <CoverThumb diary={stub} />
          <View style={styles.likeBadge}>
            <MyPageHeartIcon size={10} />
            <Text style={styles.likeCount}>{item.likeCount}</Text>
          </View>
        </View>
        <Text style={styles.cardCaption} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.profileRow}>
        <ProfileAvatar uri={user?.avatarUri} size={64} />
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

      <View style={styles.segmentRow}>
        {SEGMENTS.map((item) => {
          const active = segment === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(item.id)}
              style={[styles.segmentChip, active && styles.segmentChipActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const emptyText =
    segment === 'mine'
      ? '아직 등록된 여행 다이어리가 없어요.'
      : '좋아요한 다이어리가 없어요.';

  const showLoading = segment === 'liked' && likedLoading;

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

      {segment === 'mine' ? (
        <FlatList
          data={coverDiaries}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          }
          renderItem={renderDiaryCard}
        />
      ) : null}

      {segment === 'liked' ? (
        <FlatList
          data={likedCards}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              {showLoading ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.emptyText}>{emptyText}</Text>
              )}
            </View>
          }
          renderItem={renderLikedCard}
        />
      ) : null}

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
              disabled={visibilityBusy}
              onPress={() => {
                if (menuDiary) {
                  void handleToggleVisibility(menuDiary);
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                (pressed || visibilityBusy) && styles.pressed,
              ]}
            >
              <Ionicons
                name={
                  (menuDiary?.visibility ?? 'private') === 'public'
                    ? 'lock-closed-outline'
                    : 'globe-outline'
                }
                size={18}
                color={colors.ink}
              />
              <Text style={styles.menuItemText}>
                {(menuDiary?.visibility ?? 'private') === 'public'
                  ? '비공개로 바꾸기'
                  : '공개로 바꾸기'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={editBusy}
              onPress={() => {
                const target = menuDiary;
                setMenuDiary(null);
                if (target) {
                  void editDiary(target);
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                (pressed || editBusy) && styles.pressed,
              ]}
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
    marginBottom: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  segmentChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DC',
  },
  segmentChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5565',
  },
  segmentTextActive: {
    color: colors.white,
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
    height: CARD_WIDTH * (4 / 3),
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  cardCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E2939',
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
