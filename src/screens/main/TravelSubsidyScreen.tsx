import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { TRAVEL_SUBSIDIES } from '../../constants/subsidies';
import { RootStackParamList } from '../../navigation/types';
import { TravelSubsidy } from '../../types/subsidy';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TravelSubsidy'>;

const H_PADDING = 20;

export function TravelSubsidyScreen({ navigation }: Props) {
  const renderItem = ({ item, index }: { item: TravelSubsidy; index: number }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} 상세`}
      style={({ pressed }) => [
        styles.row,
        index === TRAVEL_SUBSIDIES.length - 1 && styles.rowLast,
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
        <Text style={styles.rowArea} numberOfLines={1}>
          {item.area}
        </Text>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {item.detail}
        </Text>

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
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle}>여행지원금</Text>
      </View>

      <FlatList
        data={TRAVEL_SUBSIDIES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>진행 중인 여행지원금 정보</Text>
            <Text style={styles.summaryCount}>총 {TRAVEL_SUBSIDIES.length}건</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>진행 중인 여행지원금이 없어요.</Text>
          </View>
        }
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
    gap: 4,
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1E2939',
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
  rowArea: {
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
  rowDetail: {
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
  pressed: {
    opacity: 0.85,
  },
});
