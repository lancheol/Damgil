import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
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
import { getEffectiveCover, resolveCoverImageUri } from '../../utils/diaryCover';
import { colors, radii, spacing, typography } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MyPage'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TabKey = 'diaries' | 'saved';

const H_PADDING = 20;
const GRID_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - H_PADDING * 2 - GRID_GAP) / 2;

function formatCount(value: number): string {
  if (value >= 1000) {
    const shortened = value / 1000;
    return `${shortened % 1 === 0 ? shortened.toFixed(0) : shortened.toFixed(1)}k`;
  }
  return String(value);
}

function formatDiaryDate(iso: string): string {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export function MyPageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { diaries } = useDiaries();
  const [tab, setTab] = useState<TabKey>('diaries');

  const username = user?.username ?? 'traveler';
  const bio = user?.bio ?? '매주 새로운 곳을 기록하는 다이어리 ✈️';
  const followerCount = user?.followerCount ?? 0;
  const followingCount = user?.followingCount ?? 0;

  const coverDiaries = useMemo(
    () =>
      [...diaries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [diaries],
  );

  const renderDiaryCard = ({ item }: { item: Diary }) => {
    const cover = getEffectiveCover(item);
    const coverUri = resolveCoverImageUri(item, cover);
    const likeCount = item.photos?.length ?? 0;
    const title = cover.title?.trim() || item.name;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (item.endedAt) {
            navigation.navigate('DiaryEdit', { diaryId: item.id });
            return;
          }
          if ((item.photos?.length ?? 0) > 0) {
            navigation.navigate('DiaryPhotoGallery', { diaryId: item.id });
          }
        }}
        style={styles.card}
      >
        <View style={styles.thumb}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder} />
          )}
          <View style={styles.likeBadge}>
            <MyPageHeartIcon size={10} />
            <Text style={styles.likeCount}>{likeCount}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardDate}>{formatDiaryDate(item.createdAt)}</Text>
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
        data={tab === 'diaries' ? coverDiaries : []}
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
                <Text style={styles.bio} numberOfLines={1}>
                  {bio}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{diaries.length}</Text>
                <Text style={styles.statLabel}>다이어리</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(followerCount)}</Text>
                <Text style={styles.statLabel}>팔로워</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCount(followingCount)}</Text>
                <Text style={styles.statLabel}>팔로잉</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('diaries')}
                style={[styles.tab, tab === 'diaries' && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === 'diaries' && styles.tabTextActive]}>
                  내 다이어리
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('saved')}
                style={[styles.tab, tab === 'saved' && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>
                  찜한 장소
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tab === 'diaries'
                ? '아직 만든 다이어리가 없어요.'
                : '찜한 장소가 아직 없어요.'}
            </Text>
          </View>
        }
        renderItem={renderDiaryCard}
      />
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
    paddingVertical: spacing.md,
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
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
    paddingVertical: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2939',
  },
  statLabel: {
    fontSize: 12,
    color: '#99A1AF',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1E2939',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#99A1AF',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#1E2939',
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
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: '#E5E7EB',
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
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E2939',
  },
  cardDate: {
    fontSize: 10,
    color: '#99A1AF',
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
