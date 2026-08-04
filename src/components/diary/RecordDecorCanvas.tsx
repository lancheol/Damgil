import { useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { DecorFontId, DecorSticker, DiaryMediaType } from '../../types/diary';
import { getDecorFontStyle } from '../../utils/decorAssets';
import { colors, typography } from '../../theme';

type RecordDecorCanvasProps = {
  uri: string;
  mediaType?: DiaryMediaType;
  note: string;
  fontId: DecorFontId;
  stickers: DecorSticker[];
  selectedStickerId: string | null;
  style?: ViewStyle;
  onSelectSticker?: (id: string | null) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onScaleSticker?: (id: string, scale: number) => void;
  onStickerDragChange?: (dragging: boolean) => void;
};

export function RecordDecorCanvas({
  uri,
  mediaType = 'photo',
  note,
  fontId,
  stickers,
  selectedStickerId,
  style,
  onSelectSticker,
  onMoveSticker,
  onScaleSticker,
  onStickerDragChange,
}: RecordDecorCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const isVideo = mediaType === 'video';
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
    selectedStickerId,
    getSelectedScale: () =>
      stickersRef.current.find((item) => item.id === selectedStickerId)?.scale ?? 1,
    onScale: (id, scale) => onScaleSticker?.(id, scale),
    onDragChange: onStickerDragChange,
  });

  return (
    <View
      style={[styles.canvas, style]}
      {...pinchHandlers}
      onLayout={(event) => {
        layoutRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      <Image source={{ uri }} style={styles.media} resizeMode="cover" />
      {isVideo ? (
        <View style={styles.videoBadge} pointerEvents="none">
          <Text style={styles.videoBadgeText}>VIDEO · 원본 고정</Text>
        </View>
      ) : (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockBadgeText}>원본 고정</Text>
        </View>
      )}

      {note.trim() ? (
        <Text style={[styles.note, getDecorFontStyle(fontId)]} numberOfLines={4} pointerEvents="none">
          {note.trim()}
        </Text>
      ) : null}

      {stickers.map((sticker) => (
        <DraggableSticker
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          layoutRef={layoutRef}
          onSelect={() => onSelectSticker?.(sticker.id)}
          onMove={(x, y) => onMoveSticker?.(sticker.id, x, y)}
          onScale={(scale) => onScaleSticker?.(sticker.id, scale)}
          onDragChange={onStickerDragChange}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  lockBadgeText: {
    ...typography.monoBody,
    fontSize: 10,
    color: colors.white,
  },
  videoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  videoBadgeText: {
    ...typography.monoBody,
    fontSize: 10,
    color: colors.white,
  },
  note: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    fontSize: 18,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
