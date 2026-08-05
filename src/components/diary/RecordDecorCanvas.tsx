import { useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { DraggableText } from './DraggableText';
import { DecorSticker, DecorTextLayer, DiaryMediaType } from '../../types/diary';
import { colors, typography } from '../../theme';

type RecordDecorCanvasProps = {
  uri: string;
  mediaType?: DiaryMediaType;
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
  selectedStickerId: string | null;
  selectedTextId: string | null;
  fullBleed?: boolean;
  style?: ViewStyle;
  onSelectSticker?: (id: string | null) => void;
  onSelectText?: (id: string) => void;
  onEditText?: (id: string) => void;
  onBackgroundPress?: () => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onScaleSticker?: (id: string, scale: number) => void;
  onRotateSticker?: (id: string, rotation: number) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  onScaleText?: (id: string, scale: number) => void;
  onRotateText?: (id: string, rotation: number) => void;
  onLayerDragChange?: (dragging: boolean) => void;
  onLayerDragPointer?: (pageX: number, pageY: number) => void;
  onStickerDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
  onTextDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
};

export function RecordDecorCanvas({
  uri,
  mediaType = 'photo',
  stickers,
  texts,
  selectedStickerId,
  selectedTextId,
  fullBleed = false,
  style,
  onSelectSticker,
  onSelectText,
  onEditText,
  onBackgroundPress,
  onMoveSticker,
  onScaleSticker,
  onRotateSticker,
  onMoveText,
  onScaleText,
  onRotateText,
  onLayerDragChange,
  onLayerDragPointer,
  onStickerDragEnd,
  onTextDragEnd,
}: RecordDecorCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const isVideo = mediaType === 'video';
  const stickersRef = useRef(stickers);
  const textsRef = useRef(texts);
  stickersRef.current = stickers;
  textsRef.current = texts;

  const selectedLayerId = selectedTextId ?? selectedStickerId;

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
    selectedStickerId: selectedLayerId,
    getSelectedTransform: () => {
      if (selectedTextId) {
        const text = textsRef.current.find((item) => item.id === selectedTextId);
        return {
          scale: text?.scale ?? 1,
          rotation: text?.rotation ?? 0,
        };
      }
      const sticker = stickersRef.current.find((item) => item.id === selectedStickerId);
      return {
        scale: sticker?.scale ?? 1,
        rotation: sticker?.rotation ?? 0,
      };
    },
    onScale: (id, scale) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onScaleText?.(id, scale);
        return;
      }
      onScaleSticker?.(id, scale);
    },
    onRotate: (id, rotation) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onRotateText?.(id, rotation);
        return;
      }
      onRotateSticker?.(id, rotation);
    },
    onDragChange: onLayerDragChange,
  });

  return (
    <View
      style={[styles.canvas, fullBleed && styles.canvasFullBleed, style]}
      {...pinchHandlers}
      onLayout={(event) => {
        layoutRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress}>
        <Image source={{ uri }} style={styles.media} resizeMode="cover" />
      </Pressable>

      {isVideo ? (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockBadgeText}>VIDEO</Text>
        </View>
      ) : null}

      {texts.map((layer) => (
        <DraggableText
          key={layer.id}
          layer={layer}
          selected={selectedTextId === layer.id}
          layoutRef={layoutRef}
          onSelect={() => onSelectText?.(layer.id)}
          onEditRequest={() => onEditText?.(layer.id)}
          onMove={(x, y) => onMoveText?.(layer.id, x, y)}
          onScale={(scale) => onScaleText?.(layer.id, scale)}
          onRotate={(rotation) => onRotateText?.(layer.id, rotation)}
          onDragChange={onLayerDragChange}
          onDragPointer={onLayerDragPointer}
          onDragEnd={(pageX, pageY) => onTextDragEnd?.(layer.id, pageX, pageY)}
        />
      ))}

      {stickers.map((sticker) => (
        <DraggableSticker
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          layoutRef={layoutRef}
          onSelect={() => onSelectSticker?.(sticker.id)}
          onMove={(x, y) => onMoveSticker?.(sticker.id, x, y)}
          onScale={(scale) => onScaleSticker?.(sticker.id, scale)}
          onRotate={(rotation) => onRotateSticker?.(sticker.id, rotation)}
          onDragChange={onLayerDragChange}
          onDragPointer={onLayerDragPointer}
          onDragEnd={(pageX, pageY) => onStickerDragEnd?.(sticker.id, pageX, pageY)}
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
  canvasFullBleed: {
    flex: 1,
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
    borderRadius: 0,
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  lockBadgeText: {
    ...typography.monoBody,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.6,
  },
});
