import { StyleSheet, Text, View } from 'react-native';

import { DiaryPhoto } from '../../types/diary';
import { TimelineDayGroup } from '../../utils/diaryTimeline';
import { colors, spacing, typography } from '../../theme';
import { DiaryRecordCard } from './DiaryRecordCard';

type DiaryTimelineSectionProps = {
  group: TimelineDayGroup;
  onPressRecord: (photo: DiaryPhoto) => void;
};

export function DiaryTimelineSection({ group, onPressRecord }: DiaryTimelineSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{group.label}</Text>

      <View style={styles.list}>
        {group.records.map((photo, index) => {
          const isLast = index === group.records.length - 1;

          return (
            <View key={photo.id} style={styles.row}>
              <View style={styles.rail}>
                <View style={styles.dot} />
                {!isLast ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.cardWrap}>
                <DiaryRecordCard photo={photo} onPress={() => onPressRecord(photo)} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.ink,
    paddingLeft: spacing.xs,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 88,
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.black,
    marginTop: 30,
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#D4D4D4',
    marginTop: 2,
    marginBottom: -2,
  },
  cardWrap: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
});
