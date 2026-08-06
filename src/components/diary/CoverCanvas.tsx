import { useRef } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { CoverFontId, CoverSticker } from '../../types/diary';
import {
  DEFAULT_COVER_COLOR,
  getCoverFontStyle,
  getCoverTitleColor,
} from '../../utils/diaryCover';

type CoverCanvasProps = {
  imageUri?: string | null;
  backgroundColor?: string;
  title: string;
  fontId: CoverFontId;
  stickers: CoverSticker[];
  selectedStickerId: string | null;
  editable?: boolean;
  style?: ViewStyle;
  onSelectSticker?: (id: string | null) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onScaleSticker?: (id: string, scale: number) => void;
  onRotateSticker?: (id: string, rotation: number) => void;
  onStickerDragChange?: (dragging: boolean) => void;
};

export function CoverCanvas({
  imageUri = null,
  backgroundColor = DEFAULT_COVER_COLOR,
  title,
  fontId,
  stickers,
  selectedStickerId,
  editable = false,
  style,
  onSelectSticker,
  onMoveSticker,
  onScaleSticker,
  onRotateSticker,
  onStickerDragChange,
}: CoverCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const titleColor = getCoverTitleColor(backgroundColor);

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: editable,
    selectedStickerId,
    getSelectedTransform: () => {
      const selected = stickersRef.current.find((item) => item.id === selectedStickerId);
      return {
        scale: selected?.scale ?? 1,
        rotation: selected?.rotation ?? 0,
      };
    },
    onScale: (id, scale) => onScaleSticker?.(id, scale),
    onRotate: (id, rotation) => onRotateSticker?.(id, rotation),
    onDragChange: onStickerDragChange,
  });

  return (
    <View
      style={[styles.canvas, { backgroundColor }, style]}
      {...(editable ? pinchHandlers : {})}
      onLayout={(event) => {
        layoutRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.titleWrap} pointerEvents="none">
        <Text
          style={[styles.title, getCoverFontStyle(fontId), { color: titleColor }]}
          numberOfLines={4}
        >
          {title || '제목 없음'}
        </Text>
      </View>

      {stickers.map((sticker) => (
        <DraggableSticker
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          editable={editable}
          layoutRef={layoutRef}
          onSelect={() => onSelectSticker?.(sticker.id)}
          onMove={(x, y) => onMoveSticker?.(sticker.id, x, y)}
          onScale={(scale) => onScaleSticker?.(sticker.id, scale)}
          onRotate={(rotation) => onRotateSticker?.(sticker.id, rotation)}
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
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});
