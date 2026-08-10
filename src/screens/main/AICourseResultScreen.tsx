import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '../../components/common/BackButton';
import { useAiCourses } from '../../context/AiCourseContext';
import { RootStackParamList } from '../../navigation/types';
import { AiCourseDay, countCourseStops } from '../../types/aiCourse';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AICourseResult'>;

const H_PADDING = 20;
const STOP_DOT_COLORS = ['#101828', '#2B7FFF', '#00C950'];

export function AICourseResultScreen({ navigation, route }: Props) {
  const { course } = route.params;
  const { courses, saveCourse } = useAiCourses();

  const alreadySaved = courses.some((item) => item.id === course.id);

  const handleSave = () => {
    saveCourse(course);
    navigation.navigate('Main', { screen: 'AI' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle}>생성된 코스</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="코스 저장"
          hitSlop={8}
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>{alreadySaved ? '저장됨' : '저장'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{course.title}</Text>
          <View style={styles.metaBar}>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={14} color="#6A7282" />
              <Text style={styles.metaText}>{course.transport}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#6A7282" />
              <Text style={styles.metaText}>장소 {countCourseStops(course)}곳</Text>
            </View>
          </View>
        </View>

        {course.days.map((day) => (
          <DaySection key={day.day} day={day} />
        ))}

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('AICourseMap', { course })}
          >
            <Ionicons name="map-outline" size={20} color={colors.white} />
            <Text style={styles.mapButtonText}>지도로 확인하기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DaySection({ day }: { day: AiCourseDay }) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{day.day}일차</Text>
        </View>
        <Text style={styles.dayTitle} numberOfLines={1}>
          {day.title}
        </Text>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineLine} />
        {day.stops.map((stop, index) => (
          <View
            key={stop.id}
            style={[styles.stopRow, index === day.stops.length - 1 && styles.stopRowLast]}
          >
            <View
              style={[
                styles.stopDot,
                { backgroundColor: STOP_DOT_COLORS[index % STOP_DOT_COLORS.length] },
              ]}
            />
            <Text style={styles.stopTime}>{stop.time}</Text>
            <View style={styles.stopCard}>
              <View style={styles.stopThumb} />
              <View style={styles.stopBody}>
                <Text style={styles.stopName} numberOfLines={1}>
                  {stop.name}
                </Text>
                <Text style={styles.stopDescription} numberOfLines={1}>
                  {stop.description}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
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
    fontWeight: '700',
    color: '#1E2939',
  },
  saveButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  saveText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
  },
  body: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bodyContent: {
    paddingBottom: 24,
  },
  summary: {
    paddingHorizontal: H_PADDING,
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  summaryTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: '#1E2939',
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6A7282',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DC',
  },
  daySection: {
    marginTop: 8,
    padding: H_PADDING,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#101828',
  },
  dayBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.white,
  },
  dayTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
  },
  timeline: {
    marginTop: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  stopRowLast: {
    marginBottom: 0,
  },
  stopDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: colors.white,
  },
  stopTime: {
    width: 40,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#99A1AF',
  },
  stopCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3F4F6',
  },
  stopThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  stopBody: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1E2939',
  },
  stopDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: '#6A7282',
  },
  footer: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 40,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#101828',
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mapButtonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
