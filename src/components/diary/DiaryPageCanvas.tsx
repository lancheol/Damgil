import { useRef } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { DraggablePhoto } from './DraggablePhoto';
import { useCanvasPinchHandlers } from './canvasPinchHandlers';
import { DraggableText } from './DraggableText';
import {
  DecorPhotoLayer,
  DecorTextLayer,
  DiaryPhoto,
} from '../../types/diary';
import { sortDecorLayersForRender } from '../../utils/decorLayerOrder';

type DiaryPageCanvasProps = {
  photos: DecorPhotoLayer[];
  photoById: Record<string, DiaryPhoto | undefined>;
  texts: DecorTextLayer[];
  selectedPhotoId: string | null;
  selectedTextId: string | null;
  style?: ViewStyle;
  onBackgroundPress?: () => void;
  onSelectPhoto?: (id: string) => void;
  onSelectText?: (id: string) => void;
  onEditText?: (id: string) => void;
  onMovePhoto?: (id: string, x: number, y: number) => void;
  onScalePhoto?: (id: string, scale: number) => void;
  onRotatePhoto?: (id: string, rotation: number) => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  onScaleText?: (id: string, scale: number) => void;
  onRotateText?: (id: string, rotation: number) => void;
  onLayerDragChange?: (dragging: boolean) => void;
  onLayerDragPointer?: (pageX: number, pageY: number) => void;
  onPhotoDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
  onTextDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
};

export function DiaryPageCanvas({
  photos,
  photoById,
  texts,
  selectedPhotoId,
  selectedTextId,
  style,
  onBackgroundPress,
  onSelectPhoto,
  onSelectText,
  onEditText,
  onMovePhoto,
  onScalePhoto,
  onRotatePhoto,
  onMoveText,
  onScaleText,
  onRotateText,
  onLayerDragChange,
  onLayerDragPointer,
  onPhotoDragEnd,
  onTextDragEnd,
}: DiaryPageCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const photosRef = useRef(photos);
  const textsRef = useRef(texts);
  photosRef.current = photos;
  textsRef.current = texts;

  const selectedLayerId = selectedTextId ?? selectedPhotoId;
  const sortedLayers = sortDecorLayersForRender({ photos, texts, stickers: [] });

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
    selectedLayerId,
    getSelectedTransform: () => {
      if (selectedTextId) {
        const text = textsRef.current.find((item) => item.id === selectedTextId);
        return { scale: text?.scale ?? 1, rotation: text?.rotation ?? 0 };
      }
      const photo = photosRef.current.find((item) => item.id === selectedPhotoId);
      return { scale: photo?.scale ?? 1, rotation: photo?.rotation ?? 0 };
    },
    onScale: (id, scale) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onScaleText?.(id, scale);
        return;
      }
      onScalePhoto?.(id, scale);
    },
    onRotate: (id, rotation) => {
      if (textsRef.current.some((item) => item.id === id)) {
        onRotateText?.(id, rotation);
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

      {sortedLayers.map((item) => {
        if (item.kind === 'photo') {
          const layer = item.layer;
          const source = photoById[layer.photoId];
          if (!source?.uri) {
            return null;
          }
          return (
            <DraggablePhoto
              key={`photo:${layer.id}`}
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
        }

        if (item.kind === 'text') {
          const layer = item.layer;
          return (
            <DraggableText
              key={`text:${layer.id}`}
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
          );
        }

        return null;
      })}
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
