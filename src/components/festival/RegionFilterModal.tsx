import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RegionFilterSidoDto } from '../../api/types';
import { RegionSelection, regionSelectionKey } from '../../types/festival';
import { colors } from '../../theme';
import { loadRegionFilterTree } from '../../utils/regionFilters';

const REGION_COLUMN_WIDTH = 84;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const GRID_COLUMNS = 3;

type Props = {
  visible: boolean;
  selection: RegionSelection[];
  onClose: () => void;
  onApply: (selection: RegionSelection[]) => void;
};

export function RegionFilterModal({ visible, selection, onClose, onApply }: Props) {
  const insets = useSafeAreaInsets();
  const [gridWidth, setGridWidth] = useState(0);
  const [areas, setAreas] = useState<RegionFilterSidoDto[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState(false);
  const [activeSidoId, setActiveSidoId] = useState('');
  const [draft, setDraft] = useState<RegionSelection[]>(selection);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setAreasLoading(true);
    setAreasError(false);
    void loadRegionFilterTree()
      .then((items) => {
        if (cancelled) return;
        setAreas(items);
      })
      .catch(() => {
        if (cancelled) return;
        setAreas([]);
        setAreasError(true);
      })
      .finally(() => {
        if (!cancelled) setAreasLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setDraft(selection);
    if (selection[0]?.sidoId) {
      setActiveSidoId(selection[0].sidoId);
      return;
    }
    if (areas[0]?.id) {
      setActiveSidoId(areas[0].id);
    }
  }, [areas, selection, visible]);

  const activeSido = areas.find((area) => area.id === activeSidoId) ?? areas[0] ?? null;
  const districts = activeSido?.children ?? [];

  const toggle = (item: RegionSelection) => {
    const key = regionSelectionKey(item);
    setDraft((prev) =>
      prev.some((entry) => regionSelectionKey(entry) === key)
        ? prev.filter((entry) => regionSelectionKey(entry) !== key)
        : [...prev, item],
    );
  };

  const countBySido = (sidoId: string) =>
    draft.filter((entry) => entry.sidoId === sidoId).length;

  const districtWidth =
    (gridWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View
          style={[
            styles.header,
            { paddingTop: (Platform.OS === 'ios' ? insets.top : 0) + 12 },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color="#1E2939" />
          </Pressable>

          <Text style={styles.headerTitle}>지역 상세 검색</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 초기화"
            hitSlop={12}
            onPress={() => setDraft([])}
            style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
          >
            <Text style={styles.resetText}>초기화</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {areasLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : areasError ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>지역 목록을 불러오지 못했어요.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setAreasLoading(true);
                  setAreasError(false);
                  void loadRegionFilterTree(true)
                    .then((items) => setAreas(items))
                    .catch(() => {
                      setAreas([]);
                      setAreasError(true);
                    })
                    .finally(() => setAreasLoading(false));
                }}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView style={styles.regionColumn} showsVerticalScrollIndicator={false}>
                {areas.map((area) => {
                  const active = area.id === activeSido?.id;
                  const count = countBySido(area.id);
                  return (
                    <Pressable
                      key={area.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setActiveSidoId(area.id)}
                      style={({ pressed }) => [
                        styles.regionItem,
                        active && styles.regionItemActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.regionText, active && styles.regionTextActive]}>
                        {area.name}
                      </Text>
                      {count > 0 ? (
                        <View style={styles.regionCount}>
                          <Text style={styles.regionCountText}>{count}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ScrollView
                style={styles.districtColumn}
                contentContainerStyle={styles.districtGrid}
                showsVerticalScrollIndicator={false}
                onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
              >
                {(gridWidth > 0 ? districts : []).map((district) => {
                  if (!activeSido) return null;
                  const item: RegionSelection = {
                    sidoId: activeSido.id,
                    regionId: district.id,
                    region: activeSido.name,
                    district: district.name,
                  };
                  const selected = draft.some(
                    (entry) => regionSelectionKey(entry) === regionSelectionKey(item),
                  );
                  return (
                    <Pressable
                      key={district.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => toggle(item)}
                      style={({ pressed }) => [
                        styles.districtChip,
                        { width: districtWidth },
                        selected && styles.districtChipSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        numberOfLines={2}
                        style={[styles.districtText, selected && styles.districtTextSelected]}
                      >
                        {district.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.footer}>
          {draft.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedRow}
            >
              {draft.map((item) => (
                <Pressable
                  key={regionSelectionKey(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.region} ${item.district} 선택 해제`}
                  onPress={() => toggle(item)}
                  style={({ pressed }) => [styles.selectedChip, pressed && styles.pressed]}
                >
                  <Text style={styles.selectedChipText}>
                    {item.region} {item.district}
                  </Text>
                  <Ionicons name="close" size={12} color="#6A7282" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => onApply(draft)}
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
          >
            <Text style={styles.submitText}>
              {draft.length === 0 ? '전체 결과 보기' : `선택한 ${draft.length}곳 결과 보기`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
  },
  resetButton: {
    width: 54,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#6A7282',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#99A1AF',
    textAlign: 'center',
  },
  retryButton: {
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
  regionColumn: {
    width: REGION_COLUMN_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#F9FAFB',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#F3F4F6',
  },
  regionItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  regionItemActive: {
    backgroundColor: colors.white,
    borderLeftColor: '#101828',
  },
  regionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6A7282',
  },
  regionTextActive: {
    fontWeight: '600',
    color: '#101828',
  },
  regionCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#1E2939',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  districtColumn: {
    flex: 1,
    backgroundColor: colors.white,
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    padding: GRID_PADDING,
  },
  districtChip: {
    minHeight: 38,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  districtChipSelected: {
    backgroundColor: '#1E2939',
    borderColor: '#1E2939',
  },
  districtText: {
    fontSize: 11,
    lineHeight: 15,
    color: '#364153',
    textAlign: 'center',
  },
  districtTextSelected: {
    fontWeight: '600',
    color: colors.white,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    backgroundColor: colors.white,
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  selectedChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#364153',
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E2939',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
