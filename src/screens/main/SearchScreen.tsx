import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MyPageHeartIcon } from '../../components/mypage/MyPageIcons';
import { SEARCH_USERS } from '../../constants/users';
import { useAuth } from '../../context/AuthContext';
import { useDiaries } from '../../context/DiaryContext';
import { getPublicFeed } from '../../api/feed';
import { getMediaDisplayUri } from '../../api/media';
import { getPublicTrip } from '../../api/publicTrips';
import { loadTokens } from '../../api/tokenStorage';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { Diary } from '../../types/diary';
import { CoverThumb } from '../../components/diary/CoverThumb';
import { getCoverBackgroundColor, getEffectiveCover } from '../../utils/diaryCover';
import { colors } from '../../theme';
import type { Festival } from '../../types/festival';
import { loadFestivals } from '../../utils/festivals';
import {
  coverFromStickerLayout,
  feedCardToDiaryStub,
  feedItemToCard,
  type FeedDiaryCard,
} from '../../utils/feedMapper';
import { isDiaryPublished } from '../../utils/tripStatus';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

const H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - H_PADDING * 2 - GRID_GAP) / 2;

const MIN_GRID_CELLS = 6;
const PLACEHOLDER_TONES = ['#D1D5DC', '#E5E7EB', '#F3F4F6'];

type ShortcutConfig = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  emoji: string;
};

const SHORTCUTS: ShortcutConfig[] = [
  {
    id: 'festival',
    icon: 'flag-outline',
    title: '축제 및 행사',
    description: '이번 달 가볼만한 곳',
    emoji: '🎉',
  },
  {
    id: 'fund',
    icon: 'cash-outline',
    title: '여행지원금',
    description: '알뜰하게 떠나기',
    emoji: '💰',
  },
];

type GridCell =
  | { kind: 'feed'; key: string; card: FeedDiaryCard }
  | { kind: 'placeholder'; key: string; tone: string };

export function SearchScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { diaries, openPublicDiary } = useDiaries();
  const [query, setQuery] = useState('');
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [feedCards, setFeedCards] = useState<FeedDiaryCard[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const feedRequestRef = useRef(0);
  const feedLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadFestivals()
      .then((items) => {
        if (!cancelled) setFestivals(items);
      })
      .catch(() => {
        if (!cancelled) setFestivals([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFeed = useCallback(async (silent: boolean) => {
    const requestId = feedRequestRef.current + 1;
    feedRequestRef.current = requestId;
    if (!silent) setFeedLoading(true);
    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        if (feedRequestRef.current === requestId) setFeedCards([]);
        return;
      }
      const feed = await getPublicFeed(tokens.access, {
        page: 1,
        limit: 12,
        sort: 'recent',
      });
      const cards = await Promise.all(
        feed.items.map(async (item) => {
          let coverThumbUrl: string | null = null;
          let cover = coverFromStickerLayout(
            item.title?.trim() || '여행 다이어리',
            null,
            null,
          );
          let photos: Diary['photos'] = [];

          try {
            const detail = await getPublicTrip(item.id);
            cover = coverFromStickerLayout(
              detail.title?.trim() || item.title?.trim() || '여행 다이어리',
              detail.coverTitleFont,
              detail.coverStickerLayout,
            );
            coverThumbUrl = detail.coverUrl?.trim() || null;

            const mediaEntries = await Promise.all(
              (detail.items ?? []).map(async (tripItem) => {
                if (!tripItem.mediaId || !tokens.access) {
                  return [tripItem.id, null] as const;
                }
                try {
                  return [
                    tripItem.id,
                    await getMediaDisplayUri(tokens.access, tripItem.mediaId),
                  ] as const;
                } catch {
                  return [tripItem.id, null] as const;
                }
              }),
            );
            const uriByItemId = Object.fromEntries(mediaEntries);
            photos = (detail.items ?? []).map((tripItem) => ({
              id: tripItem.id,
              uri: uriByItemId[tripItem.id] ?? '',
              mediaType: tripItem.kind === 'video' ? 'video' : 'photo',
              mediaId: tripItem.mediaId ?? null,
              placeName: null,
              note: tripItem.note?.trim() || '',
              latitude: tripItem.lat ?? 0,
              longitude: tripItem.lng ?? 0,
              placeContentId:
                tripItem.confirmedPlaceContentId || tripItem.placeContentId || null,
              createdAt: tripItem.capturedAt,
            }));
          } catch {
            // 공개 상세 실패 시 피드 썸네일만으로 폴백
          }

          if (!coverThumbUrl && item.coverMediaId) {
            try {
              coverThumbUrl = await getMediaDisplayUri(tokens.access, item.coverMediaId);
            } catch {
              coverThumbUrl = null;
            }
          }

          return feedItemToCard(item, coverThumbUrl, { cover, photos });
        }),
      );
      if (feedRequestRef.current === requestId) setFeedCards(cards);
    } catch {
      if (feedRequestRef.current === requestId) setFeedCards([]);
    } finally {
      if (feedRequestRef.current === requestId) setFeedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const silent = feedLoadedRef.current;
      feedLoadedRef.current = true;
      void loadFeed(silent);
    }, [loadFeed]),
  );

  const cells = useMemo<GridCell[]>(() => {
    const feed = feedCards.map<GridCell>((card) => ({
      kind: 'feed',
      key: card.id,
      card,
    }));
    const fillCount = Math.max(0, MIN_GRID_CELLS - feed.length);
    const fillers = Array.from({ length: fillCount }, (_, index) => ({
      kind: 'placeholder' as const,
      key: `placeholder-${index}`,
      tone: PLACEHOLDER_TONES[(feed.length + index) % PLACEHOLDER_TONES.length],
    }));
    return [...feed, ...fillers];
  }, [feedCards]);

  const openFeedDiary = async (card: FeedDiaryCard) => {
    if (openingId) return;
    setOpeningId(card.id);
    try {
      const result = await openPublicDiary(card.id);
      if (result.status === 'gone') {
        setFeedCards((prev) => prev.filter((item) => item.id !== card.id));
        return;
      }
      if (result.status !== 'ok') return;
      const isMine = user?.id != null && card.userId === user.id;
      navigation.navigate('DiaryEdit', {
        diaryId: result.diary.id,
        mode: isMine && !isDiaryPublished(result.diary) ? 'edit' : 'view',
        liked: card.liked,
        likeCount: card.likeCount,
        commentCount: card.commentCount,
      });
    } finally {
      setOpeningId(null);
    }
  };

  const keyword = query.trim();
  const isSearching = keyword.length > 0;

  const userResults = useMemo(() => {
    if (!isSearching) {
      return [];
    }
    const needle = keyword.toLowerCase();
    return SEARCH_USERS.filter((user) => user.username.toLowerCase().includes(needle));
  }, [isSearching, keyword]);

  const placeResults = useMemo(() => {
    if (!isSearching) {
      return [];
    }
    const needle = keyword.toLowerCase();
    return festivals.filter((festival) =>
      `${festival.region} ${festival.district} ${festival.address ?? ''} ${festival.title}`
        .toLowerCase()
        .includes(needle),
    ).slice(0, 5);
  }, [festivals, isSearching, keyword]);

  const diaryResults = useMemo(() => {
    if (!isSearching) {
      return [];
    }
    const needle = keyword.toLowerCase();
    return [...diaries]
      .filter((diary) => Boolean(diary.endedAt))
      .filter((diary) => {
        const title = getEffectiveCover(diary).title ?? '';
        return `${diary.name} ${diary.place} ${title}`.toLowerCase().includes(needle);
      })
      .sort(
        (a, b) =>
          new Date(b.endedAt ?? b.createdAt).getTime() - new Date(a.endedAt ?? a.createdAt).getTime(),
      );
  }, [diaries, isSearching, keyword]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>통합 검색</Text>

        <View style={styles.searchField}>
          <Ionicons name="search" size={16} color="#6A7282" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="사용자 이름 또는 지역 검색 (엔터)"
            placeholderTextColor="#99A1AF"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {isSearching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
              hitSlop={8}
              onPress={() => setQuery('')}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={12} color="#4A5565" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isSearching ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {userResults.length > 0 ? (
            <>
              <Text style={styles.resultTitle}>사용자 검색 결과</Text>

              <View style={styles.userList}>
                {userResults.map((user) => (
                  <Pressable
                    key={user.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${user.username} 프로필`}
                    onPress={() => Alert.alert(user.username, '사용자 프로필은 준비 중이에요.')}
                    style={({ pressed }) => [styles.userCard, pressed && styles.pressed]}
                  >
                    <View style={styles.userAvatar}>
                      {user.avatarUri ? (
                        <Image
                          source={{ uri: user.avatarUri }}
                          style={styles.userAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                      )}
                    </View>

                    <View style={styles.userBody}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {user.username}
                      </Text>
                      <Text style={styles.userMeta}>여행 다이어리 {user.diaryCount}개</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="#99A1AF" />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {placeResults.length > 0 ? (
            <>
              <Text style={userResults.length > 0 ? styles.resultTitleSpaced : styles.resultTitle}>
                {`'${keyword}' 여행 정보`}
              </Text>

              <View style={styles.placeList}>
                {placeResults.map((festival) => (
                  <Pressable
                    key={festival.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${festival.title} 상세`}
                    onPress={() => navigation.navigate('FestivalList')}
                    style={({ pressed }) => [styles.placeCard, pressed && styles.pressed]}
                  >
                    <View style={styles.placeThumb}>
                      {festival.imageUri ? (
                        <Image
                          source={{ uri: festival.imageUri }}
                          style={styles.placeThumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                      )}
                    </View>

                    <View style={styles.placeBody}>
                      <Text style={styles.placeLabel}>지역 명소 및 축제</Text>
                      <Text style={styles.placeTitle} numberOfLines={1}>
                        {festival.title}
                      </Text>
                      <Text style={styles.placeDescription} numberOfLines={1}>
                        {festival.address || `${festival.region} ${festival.district}`}
                        {festival.startDate
                          ? ` · ${festival.startDate.replace(/-/g, '.')} 시작`
                          : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {diaryResults.length > 0 ? (
            <>
              <Text
                style={
                  userResults.length > 0 || placeResults.length > 0
                    ? styles.resultTitleSpaced
                    : styles.resultTitle
                }
              >
                관련 다이어리
              </Text>

              <View style={styles.grid}>
                {diaryResults.map((diary) => (
                  <DiaryCell
                    key={diary.id}
                    diary={diary}
                    onPress={() =>
                      navigation.navigate('DiaryEdit', {
                        diaryId: diary.id,
                        mode: isDiaryPublished(diary) ? 'view' : 'edit',
                      })
                    }
                  />
                ))}
              </View>
            </>
          ) : null}

          {userResults.length === 0 && placeResults.length === 0 && diaryResults.length === 0 ? (
            <Text style={styles.emptyText}>{`'${keyword}'에 대한 검색 결과가 없어요.`}</Text>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.shortcutRow}>
            {SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.id}
                accessibilityRole="button"
                accessibilityLabel={shortcut.title}
                onPress={() => {
                  if (shortcut.id === 'festival') {
                    navigation.navigate('FestivalList');
                  } else if (shortcut.id === 'fund') {
                    navigation.navigate('TravelSubsidy');
                  }
                }}
                style={({ pressed }) => [styles.shortcutCard, pressed && styles.pressed]}
              >
                <Text style={styles.shortcutEmoji}>{shortcut.emoji}</Text>
                <View style={styles.shortcutIcon}>
                  <Ionicons name={shortcut.icon} size={16} color="#374151" />
                </View>
                <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                <Text style={styles.shortcutDescription}>{shortcut.description}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>요즘 뜨는 여행 다이어리</Text>

          <View style={styles.grid}>
            {cells.map((cell) =>
              cell.kind === 'placeholder' ? (
                <View key={cell.key} style={[styles.thumb, { backgroundColor: cell.tone }]} />
              ) : (
                <FeedDiaryCell
                  key={cell.key}
                  card={cell.card}
                  busy={openingId === cell.card.id}
                  onPress={() => void openFeedDiary(cell.card)}
                />
              ),
            )}
          </View>
          {!feedLoading && feedCards.length === 0 ? (
            <Text style={styles.feedEmptyText}>아직 공개된 여행 다이어리가 없어요.</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type DiaryCellProps = {
  diary: Diary;
  onPress: () => void;
};

function DiaryCell({ diary, onPress }: DiaryCellProps) {
  const cover = getEffectiveCover(diary);
  const title = cover.title?.trim() || diary.name;
  const likeCount = diary.likeCount ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 다이어리`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumb,
        { backgroundColor: getCoverBackgroundColor(cover) },
        pressed && styles.pressed,
      ]}
    >
      <CoverThumb diary={diary} />

      <View style={styles.photoBadge}>
        <MyPageHeartIcon size={10} />
        <Text style={styles.photoCount}>{likeCount}</Text>
      </View>
    </Pressable>
  );
}

type FeedDiaryCellProps = {
  card: FeedDiaryCard;
  busy?: boolean;
  onPress: () => void;
};

function FeedDiaryCell({ card, busy, onPress }: FeedDiaryCellProps) {
  const stubDiary = feedCardToDiaryStub(card);
  const cover = getEffectiveCover(stubDiary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title} 다이어리`}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumb,
        { backgroundColor: getCoverBackgroundColor(cover) },
        (pressed || busy) && styles.pressed,
      ]}
    >
      <CoverThumb diary={stubDiary} />
      <View style={styles.photoBadge}>
        <MyPageHeartIcon size={10} />
        <Text style={styles.photoCount}>{card.likeCount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: '#1E2939',
  },
  searchField: {
    marginTop: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E2939',
    padding: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeThumbImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 120,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  shortcutCard: {
    flex: 1,
    height: 133,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  shortcutEmoji: {
    position: 'absolute',
    right: -8,
    bottom: -14,
    fontSize: 60,
    lineHeight: 60,
    opacity: 0.1,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  shortcutTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
    marginBottom: 4,
  },
  shortcutDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6A7282',
  },
  sectionTitle: {
    marginTop: 32,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
  },
  feedEmptyText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: '#99A1AF',
  },
  resultTitle: {
    marginTop: 16,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
  },
  resultTitleSpaced: {
    marginTop: 24,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
  },
  userList: {
    marginTop: 16,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userBody: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
  },
  userMeta: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: '#6A7282',
  },
  placeList: {
    marginTop: 12,
    gap: 12,
  },
  placeCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  placeThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBody: {
    flex: 1,
    justifyContent: 'center',
  },
  placeLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    color: '#99A1AF',
    marginBottom: 4,
  },
  placeTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
  },
  placeDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#6A7282',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: '#99A1AF',
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  thumb: {
    width: CARD_WIDTH,
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
  photoBadge: {
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
  photoCount: {
    fontSize: 10,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
