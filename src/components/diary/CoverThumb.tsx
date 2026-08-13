import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { CoverCanvas } from './CoverCanvas';
import { Diary, DiaryPhoto } from '../../types/diary';
import { getCoverBackgroundColor, getEffectiveCover } from '../../utils/diaryCover';

type CoverThumbProps = {
  diary?: Diary | null;
  style?: ViewStyle;
  fill?: boolean;
};

export function CoverThumb({ diary, style, fill = true }: CoverThumbProps) {
  const cover = getEffectiveCover(diary);
  const photos = diary?.photos ?? [];

  const photoById = useMemo(() => {
    const map: Record<string, DiaryPhoto | undefined> = {};
    for (const photo of photos) {
      map[photo.id] = photo;
    }
    return map;
  }, [photos]);

  return (
    <View style={[styles.root, style]}>
      <CoverCanvas
        fill={fill}
        editable={false}
        backgroundColor={getCoverBackgroundColor(cover)}
        title={cover.title?.trim() || diary?.name || ''}
        fontId={cover.fontId}
        titleX={cover.titleX}
        titleY={cover.titleY}
        titleScale={cover.titleScale}
        titleRotation={cover.titleRotation}
        photos={cover.photos ?? []}
        photoById={photoById}
        stickers={cover.stickers ?? []}
        texts={cover.texts ?? []}
        selectedPhotoId={null}
        selectedStickerId={null}
        selectedTextId={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
