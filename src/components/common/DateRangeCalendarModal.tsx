import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme';
import {
  COURSE_MAX_DAYS,
  clampDateRange,
  formatDateRangeLabel,
  formatNightDayLabel,
  inclusiveDayCount,
  monthGrid,
  todayISO,
} from '../../utils/dateRange';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  visible: boolean;
  startDate: string | null;
  endDate: string | null;
  onClose: () => void;
  onApply: (range: { startDate: string; endDate: string }) => void;
};

export function DateRangeCalendarModal({
  visible,
  startDate,
  endDate,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const today = todayISO();
  const initial = startDate ? parseYearMonth(startDate) : parseYearMonth(today);

  const [cursor, setCursor] = useState(initial);
  const [draftStart, setDraftStart] = useState<string | null>(startDate);
  const [draftEnd, setDraftEnd] = useState<string | null>(endDate);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setClamped(false);
    setCursor(startDate ? parseYearMonth(startDate) : parseYearMonth(today));
  }, [visible, startDate, endDate, today]);

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const resolvedEnd = draftEnd ?? draftStart;
  const preview =
    draftStart && resolvedEnd
      ? formatDateRangeLabel(draftStart, resolvedEnd)
      : '출발일과 도착일을 골라 주세요';

  const selectDay = (iso: string) => {
    if (iso < today) {
      return;
    }

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd(null);
      setClamped(false);
      return;
    }

    if (iso < draftStart) {
      setDraftStart(iso);
      setDraftEnd(null);
      setClamped(false);
      return;
    }

    const next = clampDateRange(draftStart, iso, COURSE_MAX_DAYS);
    setDraftEnd(next.endDate);
    setClamped(inclusiveDayCount(draftStart, iso) > COURSE_MAX_DAYS);
  };

  const apply = () => {
    if (!draftStart) {
      return;
    }
    onApply({ startDate: draftStart, endDate: draftEnd ?? draftStart });
  };

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

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
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color="#1E2939" />
          </Pressable>
          <Text style={styles.headerTitle}>여행 일정</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.body}>
          <View style={styles.monthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              hitSlop={8}
              onPress={() => shiftMonth(-1)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color="#1E2939" />
            </Pressable>
            <Text style={styles.monthTitle}>
              {cursor.year}년 {cursor.month + 1}월
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              hitSlop={8}
              onPress={() => shiftMonth(1)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={22} color="#1E2939" />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((iso, index) => {
              if (!iso) {
                return <View key={`empty-${index}`} style={styles.cell} />;
              }

              const isStart = iso === draftStart;
              const isEnd = Boolean(draftStart && resolvedEnd && iso === resolvedEnd);
              const inRange = Boolean(
                draftStart && resolvedEnd && iso > draftStart && iso < resolvedEnd,
              );
              const selected = isStart || isEnd;
              const disabled = iso < today;
              const isToday = iso === today && !selected;

              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={`${iso.replace(/-/g, '.')} ${selected ? '선택됨' : ''}`}
                  disabled={disabled}
                  onPress={() => selectDay(iso)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayFill,
                      inRange && styles.dayFillRange,
                      isStart && resolvedEnd !== draftStart && styles.dayFillStart,
                      isEnd && resolvedEnd !== draftStart && styles.dayFillEnd,
                    ]}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        selected && styles.dayInnerSelected,
                        isToday && styles.dayInnerToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.dayTextDisabled,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {Number(iso.slice(8))}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>출발일 다음 도착일을 누르면 됩니다. 최대 {COURSE_MAX_DAYS}일.</Text>
          {clamped ? (
            <Text style={styles.clampHint}>
              코스는 최대 {COURSE_MAX_DAYS}일까지예요. {formatNightDayLabel(COURSE_MAX_DAYS)}로
              맞춰 두었어요.
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.preview}>{preview}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !draftStart }}
            disabled={!draftStart}
            onPress={apply}
            style={({ pressed }) => [
              styles.submitButton,
              !draftStart && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.submitText}>날짜 선택</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function parseYearMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number);
  return { year, month: month - 1 };
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#1E2939',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E2939',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#99A1AF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFill: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFillRange: {
    backgroundColor: '#F2F2F2',
  },
  dayFillStart: {
    backgroundColor: '#F2F2F2',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  dayFillEnd: {
    backgroundColor: '#F2F2F2',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  dayInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    backgroundColor: '#101828',
  },
  dayInnerToday: {
    borderWidth: 1,
    borderColor: '#101828',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E2939',
  },
  dayTextDisabled: {
    color: '#D1D5DC',
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
  hint: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 18,
    color: '#6A7282',
  },
  clampHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#1E2939',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1E2939',
    textAlign: 'center',
  },
  submitButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#101828',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
