import { useMemo } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { CoverCanvas } from './CoverCanvas';
import { Diary } from '../../types/diary';
import {
  getCoverBackgroundColor,
  getEffectiveCover,
  hasCoverDecorationLayout,
  resolveCoverTitleColor,
} from '../../utils/diaryCover';
import { indexPhotosById } from '../../utils/diaryPhotos';

type CoverThumbProps = {
  diary?: Diary | null;
  style?: ViewStyle;
  fill?: boolean;
};

/** 검색·마이페이지 등 작은 영역 — 편집 화면과 같은 CoverCanvas, 캔버스 너비 비례 레이어 */
export function CoverThumb({ diary, style }: CoverThumbProps) {
  const cover = getEffectiveCover(diary);
  const photos = useMemo(() => diary?.photos ?? [], [diary?.photos]);

  const hasDecoration = hasCoverDecorationLayout(cover);
  const hasLocalCoverVisual =
    hasDecoration ||
    photos.some((photo) => Boolean(photo.uri)) ||
    Boolean(cover.titleColor?.trim()) ||
    (typeof cover.titleScale === 'number' && cover.titleScale !== 1) ||
    (typeof cover.titleRotation === 'number' && cover.titleRotation !== 0) ||
    (typeof cover.titleX === 'number' && Math.abs(cover.titleX - 0.5) > 0.001) ||
    (typeof cover.titleY === 'number' && Math.abs(cover.titleY - 0.5) > 0.001) ||
    (Boolean(cover.backgroundColor?.trim()) &&
      cover.backgroundColor?.trim().toUpperCase() !== '#1A1A1A');
  const remoteThumb = diary?.coverThumbUrl?.trim() || null;

  const photoById = useMemo(() => indexPhotosById(photos), [photos]);

  if (!hasLocalCoverVisual && remoteThumb) {
    return (
      <View style={[styles.root, style]} pointerEvents="none">
        <Image source={{ uri: remoteThumb }} style={styles.remoteThumb} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={[styles.root, style]} pointerEvents="none">
      <CoverCanvas
        fill
        editable={false}
        style={styles.canvas}
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
  canvas: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  remoteThumb: {
    width: '100%',
    height: '100%',
  },
});
