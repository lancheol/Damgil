import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAiCourses } from '../../context/AiCourseContext';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { AiCourse, countCourseStops } from '../../types/aiCourse';
import { colors } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'AI'>,
  NativeStackScreenProps<RootStackParamList>
>;

const H_PADDING = 20;

export function AIScreen({ navigation }: Props) {
  const { courses, deleteCourse } = useAiCourses();

  const confirmDelete = (course: AiCourse) => {
    Alert.alert(course.title, '이 코스를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteCourse(course.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 추천 코스</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI 여행 코스 생성하기"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={() => navigation.navigate('AICourseCreate')}
        >
          <View>
            <Text style={styles.ctaLabel}>어디로 떠나시나요?</Text>
            <Text style={styles.ctaTitle}>AI 여행 코스 생성하기 ✨</Text>
          </View>
          <View style={styles.ctaIcon}>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </View>
        </Pressable>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>저장된 코스</Text>
          <Text style={styles.sectionCount}>총 {courses.length}개</Text>
        </View>

        {courses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 저장된 코스가 없어요.</Text>
            <Text style={styles.emptyText}>AI로 첫 여행 코스를 만들어 보세요.</Text>
          </View>
        ) : (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${course.title} 옵션`}
                    hitSlop={8}
                    onPress={() => confirmDelete(course)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color="#6A7282" />
                  </Pressable>
                </View>

                <View style={styles.tagRow}>
                  {course.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.courseFooter}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{course.startDate} 출발</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.metaText}>장소 {countCourseStops(course)}곳</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${course.title} 코스 보기`}
                    hitSlop={8}
                    style={styles.detailButton}
                    onPress={() => navigation.navigate('AICourseMap', { course })}
                  >
                    <Text style={styles.detailText}>코스 보기</Text>
                    <Ionicons name="chevron-forward" size={12} color="#1E2939" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#1E2939',
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 130,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#101828',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ctaLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#99A1AF',
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.white,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
  },
  sectionCount: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6A7282',
  },
  courseList: {
    paddingTop: 16,
    gap: 16,
  },
  courseCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
  },
  courseTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1E2939',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 16,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  tagText: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    color: '#4A5565',
  },
  courseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6A7282',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DC',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#1E2939',
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#99A1AF',
  },
  pressed: {
    opacity: 0.9,
  },
});
