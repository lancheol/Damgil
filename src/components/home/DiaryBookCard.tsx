import { Pressable, StyleSheet } from 'react-native';

import { CoverThumb } from '../diary/CoverThumb';
import { HomeBookShell } from './HomeBookShell';
import { Diary } from '../../types/diary';
import { getCoverBackgroundColor, getEffectiveCover } from '../../utils/diaryCover';

type DiaryBookCardProps = {
  diary: Diary;
  onPress?: () => void;
};

export function DiaryBookCard({ diary, onPress }: DiaryBookCardProps) {
  const cover = getEffectiveCover(diary);
  const title = cover.title?.trim() || diary.name;
  const coverBg = getCoverBackgroundColor(cover);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 다이어리`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressWrap, pressed && styles.bookPressed]}
    >
      <HomeBookShell coverColor={coverBg} contentStyle={styles.coverFlush}>
        <CoverThumb diary={diary} />
      </HomeBookShell>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressWrap: {
    flex: 1,
  },
  bookPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  coverFlush: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 0,
    paddingRight: 14,
  },
});
