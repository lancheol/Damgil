import { memo, useMemo } from 'react';
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

/** 검색·마이페이지 등 작은 영역 — 서버 thumb 우선, 없을 때만 CoverCanvas */
function CoverThumbComponent({ diary, style }: CoverThumbProps) {
  const cover = getEffectiveCover(diary);
  const photos = useMemo(() => diary?.photos ?? [], [diary?.photos]);
  const remoteThumb = diary?.coverThumbUrl?.trim() || null;

  // 목록 성능: 원격 썸네일이 있으면 풀 캔버스 대신 Image
  if (remoteThumb) {
    return (
      <View style={[styles.root, style]} pointerEvents="none">
        <Image source={{ uri: remoteThumb }} style={styles.remoteThumb} resizeMode="cover" />
      </View>
    );
  }

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

  const photoById = useMemo(() => indexPhotosById(photos), [photos]);

  if (!hasLocalCoverVisual) {
    return <View style={[styles.root, style]} pointerEvents="none" />;
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

export const CoverThumb = memo(CoverThumbComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteThumb: {
    ...StyleSheet.absoluteFillObject,
  },
});
