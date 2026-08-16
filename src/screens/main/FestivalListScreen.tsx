import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { RegionFilterModal } from '../../components/festival/RegionFilterModal';
import { RootStackParamList } from '../../navigation/types';
import { Festival, RegionSelection, regionSelectionKey } from '../../types/festival';
import { colors } from '../../theme';
import { loadFestivals, matchesFestivalRegion } from '../../utils/festivals';

type Props = NativeStackScreenProps<RootStackParamList, 'FestivalList'>;

const H_PADDING = 20;

const formatPeriod = (start: string, end: string) => {
  const toDots = (value: string) => value.replace(/-/g, '.');
  return start === end ? toDots(start) : `${toDots(start)} ~ ${toDots(end)}`;
};

export function FestivalListScreen({ navigation }: Props) {
  const [selection, setSelection] = useState<RegionSelection[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [allFestivals, setAllFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchFestivals = useCallback(async (force = false) => {
    setLoadError(false);
    try {
      setAllFestivals(await loadFestivals(force));
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void fetchFestivals().finally(() => setLoading(false));
  }, [fetchFestivals]);

  const festivals = useMemo(() => {
    if (selection.length === 0) {
      return allFestivals;
    }
    return allFestivals.filter((festival) =>
      selection.some((item) => matchesFestivalRegion(festival, item)),
    );
  }, [allFestivals, selection]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchFestivals(true).finally(() => setRefreshing(false));
  }, [fetchFestivals]);

  const removeSelection = (target: RegionSelection) => {
    const key = regionSelectionKey(target);
    setSelection((prev) => prev.filter((entry) => regionSelectionKey(entry) !== key));
  };

  const regionLabel =
    selection.length === 0
      ? '전국'
      : `${selection[0].region} ${selection[0].district}${
          selection.length > 1 ? ` 외 ${selection.length - 1}곳` : ''
        }`;

  const renderItem = ({ item, index }: { item: Festival; index: number }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} 상세`}
      style={({ pressed }) => [
        styles.row,
        index === festivals.length - 1 && styles.rowLast,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.thumb}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowRegion} numberOfLines={1}>
          {item.region} {item.district}
        </Text>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowPeriod}>{formatPeriod(item.startDate, item.endDate)}</Text>

        <View style={styles.tagRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
          <Text style={styles.headerTitle}>축제 및 행사</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="필터"
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        >
          <Ionicons name="funnel-outline" size={14} color="#364153" />
          <Text style={styles.filterButtonText}>필터</Text>
          {selection.length > 0 ? (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{selection.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {selection.length === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지역 선택"
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Text style={styles.chipText}>전체 지역</Text>
            </Pressable>
          ) : (
            <>
              {selection.map((item) => (
                <Pressable
                  key={regionSelectionKey(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.region} ${item.district} 선택 해제`}
                  onPress={() => removeSelection(item)}
                  style={({ pressed }) => [
                    styles.chip,
                    styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, styles.chipTextActive]}>
                    {item.region} {item.district}
                  </Text>
                  <Ionicons name="close" size={12} color={colors.white} />
                </Pressable>
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="지역 선택 초기화"
                onPress={() => setSelection([])}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text style={styles.chipText}>전체 지역</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      <FlatList
        data={festivals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{`'${regionLabel}' 관련 행사 정보`}</Text>
            <Text style={styles.summaryCount}>총 {festivals.length}건</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={styles.emptyText}>
                  {loadError
                    ? '축제 정보를 불러오지 못했어요.'
                    : '해당 지역의 행사 정보가 아직 없어요.'}
                </Text>
                {loadError ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setLoading(true);
                      void fetchFestivals(true).finally(() => setLoading(false));
                    }}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.retryText}>다시 시도</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        }
      />

      <RegionFilterModal
        visible={filterOpen}
        selection={selection}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setSelection(next);
          setFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#364153',
  },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#1E2939',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  chipBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: H_PADDING,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#1E2939',
    borderColor: '#1E2939',
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6A7282',
  },
  chipTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
    paddingBottom: 120,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6A7282',
  },
  summaryCount: {
    fontSize: 12,
    lineHeight: 16,
    color: '#99A1AF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  rowBody: {
    flex: 1,
    paddingVertical: 4,
  },
  rowRegion: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    color: '#99A1AF',
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
    marginBottom: 4,
  },
  rowPeriod: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6A7282',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  tagText: {
    fontSize: 10,
    lineHeight: 15,
    color: '#4A5565',
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#99A1AF',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  retryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
