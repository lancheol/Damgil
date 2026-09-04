import { useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useCanvasPinchHandlers } from './canvasPinchHandlers';
import { DraggableText } from './DraggableText';
import { DecorTextLayer, DiaryMediaType, PhotoCropRect } from '../../types/diary';
import { sortDecorLayersForRender } from '../../utils/decorLayerOrder';
import { isFullCrop, normalizeCropRect } from '../../utils/diaryTextLayers';
import { colors, typography } from '../../theme';

type RecordDecorCanvasProps = {
  uri: string;
  mediaType?: DiaryMediaType;
  cropRect?: PhotoCropRect | null;
  texts: DecorTextLayer[];
  selectedTextId: string | null;
  fullBleed?: boolean;
  style?: ViewStyle;
  onSelectText?: (id: string) => void;
  onEditText?: (id: string) => void;
  onBackgroundPress?: () => void;
  onMoveText?: (id: string, x: number, y: number) => void;
  onScaleText?: (id: string, scale: number) => void;
  onRotateText?: (id: string, rotation: number) => void;
  onLayerDragChange?: (dragging: boolean) => void;
  onLayerDragPointer?: (pageX: number, pageY: number) => void;
  onTextDragEnd?: (id: string, pageX?: number, pageY?: number) => void;
};

export function RecordDecorCanvas({
  uri,
  mediaType = 'photo',
  cropRect,
  texts,
  selectedTextId,
  fullBleed = false,
  style,
  onSelectText,
  onEditText,
  onBackgroundPress,
  onMoveText,
  onScaleText,
  onRotateText,
  onLayerDragChange,
  onLayerDragPointer,
  onTextDragEnd,
}: RecordDecorCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const isVideo = mediaType === 'video';
  const textsRef = useRef(texts);
  textsRef.current = texts;

  const crop = normalizeCropRect(cropRect);
  const cropped = !isFullCrop(crop);

  const sortedLayers = sortDecorLayersForRender({
    photos: [],
    texts,
    stickers: [],
  });

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
    selectedLayerId: selectedTextId,
    getSelectedTransform: () => {
      const text = textsRef.current.find((item) => item.id === selectedTextId);
      return {
        scale: text?.scale ?? 1,
        rotation: text?.rotation ?? 0,
      };
    },
    onScale: (id, scale) => {
      onScaleText?.(id, scale);
    },
    onRotate: (id, rotation) => {
      onRotateText?.(id, rotation);
    },
    onDragChange: onLayerDragChange,
  });

  const mediaStyle = cropped
    ? {
        position: 'absolute' as const,
        width: `${(1 / crop.width) * 100}%` as unknown as number,
        height: `${(1 / crop.height) * 100}%` as unknown as number,
        left: `${(-crop.x / crop.width) * 100}%` as unknown as number,
        top: `${(-crop.y / crop.height) * 100}%` as unknown as number,
      }
    : styles.media;

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
        <View style={styles.mediaClip}>
          <Image source={{ uri }} style={mediaStyle} resizeMode={cropped ? 'stretch' : 'cover'} />
        </View>
      </Pressable>

      {isVideo ? (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockBadgeText}>VIDEO</Text>
        </View>
      ) : null}

      {sortedLayers.map((item) => {
        if (item.kind !== 'text') {
          return null;
        }
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
      })}
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
  mediaClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  media: {
    ...StyleSheet.absoluteFill,
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
