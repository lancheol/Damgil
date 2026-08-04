import { useRef } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { CoverFontId, CoverSticker } from '../../types/diary';
import { getCoverFontStyle } from '../../utils/diaryCover';
import { colors, typography } from '../../theme';

type CoverCanvasProps = {
  imageUri: string | null;
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
  imageUri,
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
      style={[styles.canvas, style]}
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
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>담길</Text>
        </View>
      )}
      <View style={styles.dim} pointerEvents="none" />

      <Text style={[styles.title, getCoverFontStyle(fontId)]} numberOfLines={3} pointerEvents="none">
        {title || '제목 없음'}
      </Text>

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
    backgroundColor: colors.black,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  fallbackText: {
    ...typography.monoBody,
    color: '#7A7A7A',
    letterSpacing: 2,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  title: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    fontSize: 28,
    color: colors.white,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
