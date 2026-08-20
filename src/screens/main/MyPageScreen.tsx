import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { getPublicFeed } from '../../api/feed';
import { getMediaDisplayUri } from '../../api/media';
import { getPublicTrip } from '../../api/publicTrips';
import { listSavedPlaces, unsavePlace } from '../../api/saves';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, SavedPlaceItemDto } from '../../api/types';
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
  type FeedDiaryCard,
} from '../../utils/feedMapper';
import { isDiaryPublished } from '../../utils/tripStatus';
import { colors, radii, spacing, typography } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyPage'>,
  NativeStackScreenProps<RootStackParamList>
>;

type LibrarySegment = 'mine' | 'liked' | 'saved';

const H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - H_PADDING * 2 - GRID_GAP) / 2;

const SEGMENTS: { id: LibrarySegment; label: string }[] = [
  { id: 'mine', label: '내 다이어리' },
  { id: 'liked', label: '좋아요' },
  { id: 'saved', label: '찜한 장소' },
];

export function MyPageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { diaries, deleteDiary, updateDiaryVisibility, openPublicDiary } = useDiaries();

  const username = user?.username ?? 'traveler';
  const bio = user?.bio ?? '매주 새로운 곳을 기록하는 다이어리 ✈️';

  const [segment, setSegment] = useState<LibrarySegment>('mine');
  const [menuDiary, setMenuDiary] = useState<Diary | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [likedCards, setLikedCards] = useState<FeedDiaryCard[]>([]);
  const [likedLoading, setLikedLoading] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItemDto[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedBusyId, setSavedBusyId] = useState<string | null>(null);
  const [openingLikedId, setOpeningLikedId] = useState<string | null>(null);

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
    setLikedLoading(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setLikedCards([]);
        return;
      }

      const liked: FeedDiaryCard[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && liked.length < 40 && page <= 4) {
        const feed = await getPublicFeed(tokens.access, {
          page,
          limit: 50,
          sort: 'recent',
        });
        const likedItems = (feed.items ?? []).filter((item) => item.liked);

        const cards = await Promise.all(
          likedItems.map(async (item) => {
            let coverThumbUrl: string | null = null;
            let cover = coverFromStickerLayout(
              item.title?.trim() || '여행 다이어리',
              null,
              null,
            );

            try {
              const detail = await getPublicTrip(item.id);
              cover = coverFromStickerLayout(
                detail.title?.trim() || item.title?.trim() || '여행 다이어리',
                detail.coverTitleFont,
                detail.coverStickerLayout,
              );
              coverThumbUrl = detail.coverUrl?.trim() || null;
            } catch {
              // 공개 상세 실패 시 썸네일만
            }

            if (!coverThumbUrl && item.coverMediaId) {
              try {
                coverThumbUrl = await getMediaDisplayUri(tokens.access, item.coverMediaId);
              } catch {
                coverThumbUrl = null;
              }
            }

            return feedItemToCard(item, coverThumbUrl, { cover, photos: [] });
          }),
        );

        liked.push(...cards);
        hasMore = Boolean(feed.hasMore);
        page += 1;
      }

      setLikedCards(liked);
    } catch {
      setLikedCards([]);
    } finally {
      setLikedLoading(false);
    }
  }, []);

  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        setSavedPlaces([]);
        return;
      }
      const items = await listSavedPlaces(tokens.access);
      setSavedPlaces(items);
    } catch {
      setSavedPlaces([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (segment === 'liked') {
        void loadLiked();
      } else if (segment === 'saved') {
        void loadSaved();
      }
    }, [segment, loadLiked, loadSaved]),
  );

  const openDiary = (diary: Diary) => {
    if (isDiaryPublished(diary)) {
      navigation.navigate('DiaryEdit', { diaryId: diary.id, mode: 'view' });
      return;
    }
    const isDraft = Boolean(diary.coverDraft) && !diary.cover;
    if (isDraft) {
      navigation.navigate('DiaryCoverEdit', { diaryId: diary.id });
      return;
    }
    navigation.navigate('DiaryEdit', { diaryId: diary.id, mode: 'edit' });
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

  const openSavedPlace = (item: SavedPlaceItemDto) => {
    navigation.navigate('Main', {
      screen: 'Map',
      params: {
        focusPlace: {
          contentId: item.contentId,
          title: item.place?.title ?? null,
          address: item.place?.addr1 ?? null,
          latitude: item.place?.lat ?? null,
          longitude: item.place?.lng ?? null,
        },
      },
    });
  };

  const confirmUnsave = (item: SavedPlaceItemDto) => {
    const title = item.place?.title?.trim() || '이 장소';
    Alert.alert('찜 해제', `'${title}' 찜을 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const tokens = await loadTokens();
            if (!tokens?.access) return;
            setSavedBusyId(item.contentId);
            try {
              await unsavePlace(tokens.access, item.contentId);
              setSavedPlaces((prev) => prev.filter((row) => row.contentId !== item.contentId));
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : '찜을 해제하지 못했어요.';
              Alert.alert('찜 해제 실패', message);
            } finally {
              setSavedBusyId(null);
            }
          })();
        },
      },
    ]);
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

  const renderSavedPlace = ({ item }: { item: SavedPlaceItemDto }) => {
    const title = item.place?.title?.trim() || '장소 정보 없음';
    const address = item.place?.addr1?.trim() || '';
    const thumb = item.place?.firstImage?.trim() || null;
    const busy = savedBusyId === item.contentId;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openSavedPlace(item)}
        style={({ pressed }) => [styles.savedRow, pressed && styles.pressed]}
      >
        <View style={styles.savedThumb}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.savedThumbImage} />
          ) : (
            <Ionicons name="location-outline" size={22} color={colors.inkMuted} />
          )}
        </View>
        <View style={styles.savedCopy}>
          <Text style={styles.savedTitle} numberOfLines={1}>
            {title}
          </Text>
          {address ? (
            <Text style={styles.savedAddress} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="찜 해제"
          disabled={busy}
          hitSlop={8}
          onPress={() => confirmUnsave(item)}
          style={({ pressed }) => [styles.savedHeart, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="heart" size={20} color={colors.danger} />
          )}
        </Pressable>
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
      : segment === 'liked'
        ? '좋아요한 다이어리가 없어요.'
        : '찜한 장소가 없어요.';

  const showLoading =
    (segment === 'liked' && likedLoading) || (segment === 'saved' && savedLoading);

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

      {segment === 'saved' ? (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.contentId}
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
          renderItem={renderSavedPlace}
          ItemSeparatorComponent={() => <View style={styles.savedSeparator} />}
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
    height: CARD_WIDTH * 1.25,
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
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  savedThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: '#EEF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  savedThumbImage: {
    width: '100%',
    height: '100%',
  },
  savedCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2939',
  },
  savedAddress: {
    fontSize: 12,
    color: '#6A7282',
  },
  savedHeart: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
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
