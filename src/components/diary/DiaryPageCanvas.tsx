import { useRef } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { DraggablePhoto } from './DraggablePhoto';
import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { DraggableText } from './DraggableText';
import {
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
  DiaryPhoto,
} from '../../types/diary';

type DiaryPageCanvasProps = {
  photos: DecorPhotoLayer[];
  photoById: Record<string, DiaryPhoto | undefined>;
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
  selectedPhotoId: string | null;
  selectedStickerId: string | null;
  selectedTextId: string | null;
  style?: ViewStyle;
  onBackgroundPress?: () => void;
  onSelectPhoto?: (id: string) => void;
  onSelectSticker?: (id: string) => void;
  onSelectText?: (id: string) => void;
  onEditText?: (id: string) => void;
  onMovePhoto?: (id: string, x: number, y: number) => void;
  onScalePhoto?: (id: string, scale: number) => void;
  onRotatePhoto?: (id: string, rotation: number) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onScaleSticker?: (id: string, scale: number) => void;
  onRotateSticker?: (id: string, rotation: number) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  onScaleText?: (id: string, scale: number) => void;
  onRotateText?: (id: string, rotation: number) => void;
  onLayerDragChange?: (dragging: boolean) => void;
  onLayerDragPointer?: (pageX: number, pageY: number) => void;
  onPhotoDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
  onStickerDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
  onTextDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
};

export function DiaryPageCanvas({
  photos,
  photoById,
  stickers,
  texts,
  selectedPhotoId,
  selectedStickerId,
  selectedTextId,
  style,
  onBackgroundPress,
  onSelectPhoto,
  onSelectSticker,
  onSelectText,
  onEditText,
  onMovePhoto,
  onScalePhoto,
  onRotatePhoto,
  onMoveSticker,
  onScaleSticker,
  onRotateSticker,
  onMoveText,
  onScaleText,
  onRotateText,
  onLayerDragChange,
  onLayerDragPointer,
  onPhotoDragEnd,
  onStickerDragEnd,
  onTextDragEnd,
}: DiaryPageCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const photosRef = useRef(photos);
  const stickersRef = useRef(stickers);
  const textsRef = useRef(texts);
  photosRef.current = photos;
  stickersRef.current = stickers;
  textsRef.current = texts;

  const selectedLayerId = selectedTextId ?? selectedStickerId ?? selectedPhotoId;

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
    selectedStickerId: selectedLayerId,
    getSelectedTransform: () => {
      if (selectedTextId) {
        const text = textsRef.current.find((item) => item.id === selectedTextId);
        return { scale: text?.scale ?? 1, rotation: text?.rotation ?? 0 };
      }
      if (selectedStickerId) {
        const sticker = stickersRef.current.find((item) => item.id === selectedStickerId);
        return { scale: sticker?.scale ?? 1, rotation: sticker?.rotation ?? 0 };
      }
      const photo = photosRef.current.find((item) => item.id === selectedPhotoId);
      return { scale: photo?.scale ?? 1, rotation: photo?.rotation ?? 0 };
    },
    onScale: (id, scale) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onScaleText?.(id, scale);
        return;
      }
      if (stickersRef.current.some((item) => item.id === id)) {
        onScaleSticker?.(id, scale);
        return;
      }
      onScalePhoto?.(id, scale);
    },
    onRotate: (id, rotation) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onRotateText?.(id, rotation);
        return;
      }
      if (stickersRef.current.some((item) => item.id === id)) {
        onRotateSticker?.(id, rotation);
        return;
      }
      onRotatePhoto?.(id, rotation);
    },
    onDragChange: onLayerDragChange,
  });

  return (
    <View
      style={[styles.page, style]}
      {...pinchHandlers}
      onLayout={(event) => {
        layoutRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />

      {photos.map((layer) => {
        const source = photoById[layer.photoId];
        if (!source?.uri) {
          return null;
        }
        return (
          <DraggablePhoto
            key={layer.id}
            layer={layer}
            uri={source.uri}
            selected={selectedPhotoId === layer.id}
            layoutRef={layoutRef}
            onSelect={() => onSelectPhoto?.(layer.id)}
            onMove={(x, y) => onMovePhoto?.(layer.id, x, y)}
            onScale={(scale) => onScalePhoto?.(layer.id, scale)}
            onRotate={(rotation) => onRotatePhoto?.(layer.id, rotation)}
            onDragChange={onLayerDragChange}
            onDragPointer={onLayerDragPointer}
            onDragEnd={(pageX, pageY) => onPhotoDragEnd?.(layer.id, pageX, pageY)}
          />
        );
      })}

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
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    overflow: 'hidden',
  },
});
