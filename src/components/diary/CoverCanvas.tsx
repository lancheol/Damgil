import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { DraggableCoverTitle } from './DraggableCoverTitle';
import { DraggablePhoto } from './DraggablePhoto';
import { useCanvasPinchHandlers } from './canvasPinchHandlers';
import { DraggableText } from './DraggableText';
import {
  CoverFontId,
  DecorPhotoLayer,
  DecorTextLayer,
  DiaryPhoto,
} from '../../types/diary';
import { sortDecorLayersForRender } from '../../utils/decorLayerOrder';
import {
  COVER_TITLE_LAYER_ID,
  DEFAULT_COVER_COLOR,
  DEFAULT_COVER_TITLE_X,
  DEFAULT_COVER_TITLE_Y,
  DEFAULT_COVER_TITLE_SCALE,
  DEFAULT_COVER_TITLE_ROTATION,
  estimateCoverEditCanvasWidth,
  getCoverLayoutUnit,
  resolveCoverTitleColor,
} from '../../utils/diaryCover';

type CoverCanvasProps = {
  backgroundColor?: string;
  title: string;
  fontId: CoverFontId;
  titleX?: number;
  titleY?: number;
  titleScale?: number;
  titleRotation?: number;
  titleColor?: string;
  photos: DecorPhotoLayer[];
  photoById: Record<string, DiaryPhoto | undefined>;
  texts: DecorTextLayer[];
  selectedPhotoId: string | null;
  selectedTextId: string | null;
  selectedTitle?: boolean;
  /** 책 껍데기 안에서 꽉 채울 때 */
  fill?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  onBackgroundPress?: () => void;
  onSelectPhoto?: (id: string) => void;
  onSelectText?: (id: string) => void;
  onSelectTitle?: () => void;
  onEditTitle?: () => void;
  onMoveTitle?: (x: number, y: number) => void;
  onScaleTitle?: (scale: number) => void;
  onRotateTitle?: (rotation: number) => void;
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
  onTitleDragChange?: (dragging: boolean) => void;
  onTitleDragPointer?: (pageX: number, pageY: number) => void;
  onTitleDragEnd?: (pageX?: number, pageY?: number) => void;
};

export function CoverCanvas({
  backgroundColor = DEFAULT_COVER_COLOR,
  title,
  fontId,
  titleX = DEFAULT_COVER_TITLE_X,
  titleY = DEFAULT_COVER_TITLE_Y,
  titleScale = DEFAULT_COVER_TITLE_SCALE,
  titleRotation = DEFAULT_COVER_TITLE_ROTATION,
  titleColor,
  photos = [],
  photoById,
  texts = [],
  selectedPhotoId,
  selectedTextId,
  selectedTitle = false,
  fill = false,
  editable = true,
  style,
  onBackgroundPress,
  onSelectPhoto,
  onSelectText,
  onSelectTitle,
  onEditTitle,
  onMoveTitle,
  onScaleTitle,
  onRotateTitle,
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
  onTitleDragChange,
  onTitleDragPointer,
  onTitleDragEnd,
}: CoverCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const layoutUnit = getCoverLayoutUnit(
    canvasSize.width > 0 ? canvasSize.width : estimateCoverEditCanvasWidth(),
  );
  const photosRef = useRef(photos);
  const textsRef = useRef(texts);
  photosRef.current = photos;
  textsRef.current = texts;

  const resolvedTitleColor =
    titleColor?.trim() || resolveCoverTitleColor({ backgroundColor }, backgroundColor);
  const titleScaleRef = useRef(titleScale);
  const titleRotationRef = useRef(titleRotation);
  titleScaleRef.current = titleScale;
  titleRotationRef.current = titleRotation;

  const selectedLayerId = selectedTitle
    ? COVER_TITLE_LAYER_ID
    : selectedTextId ?? selectedPhotoId;
  const sortedLayers = sortDecorLayersForRender({ photos, texts, stickers: [] });

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: editable,
    selectedLayerId: selectedLayerId,
    getSelectedTransform: () => {
      if (selectedLayerId === COVER_TITLE_LAYER_ID) {
        return {
          scale: titleScaleRef.current,
          rotation: titleRotationRef.current,
        };
      }
      if (selectedTextId) {
        const text = textsRef.current.find((item) => item.id === selectedTextId);
        return { scale: text?.scale ?? 1, rotation: text?.rotation ?? 0 };
      }
      const photo = photosRef.current.find((item) => item.id === selectedPhotoId);
      return { scale: photo?.scale ?? 1, rotation: photo?.rotation ?? 0 };
    },
    onScale: (id, scale) => {
      if (id === COVER_TITLE_LAYER_ID) {
        onScaleTitle?.(scale);
        return;
      }
      if (textsRef.current.some((item) => item.id === id)) {
        onScaleText?.(id, scale);
        return;
      }
      onScalePhoto?.(id, scale);
    },
    onRotate: (id, rotation) => {
      if (id === COVER_TITLE_LAYER_ID) {
        onRotateTitle?.(rotation);
        return;
      }
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
      style={[
        styles.canvas,
        fill ? styles.canvasFill : styles.canvasCard,
        { backgroundColor },
        style,
      ]}
      {...(editable ? pinchHandlers : {})}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        layoutRef.current = { width, height };
        if (width > 0 && height > 0) {
          setCanvasSize((prev) =>
            prev.width === width && prev.height === height ? prev : { width, height },
          );
        }
      }}
    >
      {editable ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />
      ) : null}

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
              layoutUnit={layoutUnit}
              selected={editable && selectedPhotoId === layer.id}
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
              layoutUnit={layoutUnit}
              selected={editable && selectedTextId === layer.id}
              editable={editable}
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

      <DraggableCoverTitle
        title={title}
        fontId={fontId}
        color={resolvedTitleColor}
        x={titleX}
        y={titleY}
        scale={titleScale}
        rotation={titleRotation}
        layoutUnit={layoutUnit}
        selected={editable && selectedTitle}
        editable={editable}
        layoutRef={layoutRef}
        onSelect={() => onSelectTitle?.()}
        onEditRequest={() => onEditTitle?.()}
        onMove={(nextX, nextY) => onMoveTitle?.(nextX, nextY)}
        onScale={(nextScale) => onScaleTitle?.(nextScale)}
        onRotate={(nextRotation) => onRotateTitle?.(nextRotation)}
        onDragChange={onTitleDragChange}
        onDragPointer={onTitleDragPointer}
        onDragEnd={(pageX, pageY) => onTitleDragEnd?.(pageX, pageY)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    overflow: 'hidden',
  },
  canvasCard: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
  canvasFill: {
    flex: 1,
    borderRadius: 0,
  },
});
