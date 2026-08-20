import { useMemo } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { CoverCanvas } from './CoverCanvas';
import { Diary, DiaryPhoto } from '../../types/diary';
import { getCoverBackgroundColor, getEffectiveCover, resolveCoverTitleColor } from '../../utils/diaryCover';

type CoverThumbProps = {
  diary?: Diary | null;
  style?: ViewStyle;
  fill?: boolean;
};

export function CoverThumb({ diary, style, fill = true }: CoverThumbProps) {
  const cover = getEffectiveCover(diary);
  const photos = useMemo(() => diary?.photos ?? [], [diary?.photos]);
  const hasLocalCoverVisual =
    Boolean(cover.photos?.length) ||
    Boolean(cover.stickers?.length) ||
    Boolean(cover.texts?.length) ||
    photos.some((photo) => Boolean(photo.uri)) ||
    Boolean(cover.titleColor?.trim()) ||
    (typeof cover.titleScale === 'number' && cover.titleScale !== 1) ||
    (typeof cover.titleRotation === 'number' && cover.titleRotation !== 0) ||
    (typeof cover.titleX === 'number' && Math.abs(cover.titleX - 0.5) > 0.001) ||
    (typeof cover.titleY === 'number' && Math.abs(cover.titleY - 0.5) > 0.001) ||
    (Boolean(cover.backgroundColor?.trim()) &&
      cover.backgroundColor?.trim().toUpperCase() !== '#1A1A1A');
  const remoteThumb = diary?.coverThumbUrl?.trim() || null;

  const photoById = useMemo(() => {
    const map: Record<string, DiaryPhoto | undefined> = {};
    for (const photo of photos) {
      map[photo.id] = photo;
    }
    return map;
  }, [photos]);

  if (!hasLocalCoverVisual && remoteThumb) {
    return (
      <View style={[styles.root, style]}>
        <Image source={{ uri: remoteThumb }} style={styles.remoteThumb} resizeMode="cover" />
      </View>
    );
  }

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
        titleColor={resolveCoverTitleColor(cover, getCoverBackgroundColor(cover))}
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
  remoteThumb: {
    width: '100%',
    height: '100%',
  },
});
