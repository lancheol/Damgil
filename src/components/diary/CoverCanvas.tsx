import { useRef } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { DraggableCoverTitle } from './DraggableCoverTitle';
import { DraggablePhoto } from './DraggablePhoto';
import { DraggableSticker, useCanvasPinchHandlers } from './DraggableSticker';
import { DraggableText } from './DraggableText';
import {
  CoverFontId,
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
  DiaryPhoto,
} from '../../types/diary';
import {
  COVER_TITLE_LAYER_ID,
  DEFAULT_COVER_COLOR,
  DEFAULT_COVER_TITLE_X,
  DEFAULT_COVER_TITLE_Y,
  DEFAULT_COVER_TITLE_SCALE,
  DEFAULT_COVER_TITLE_ROTATION,
  getCoverTitleColor,
} from '../../utils/diaryCover';

type CoverCanvasProps = {
  backgroundColor?: string;
  title: string;
  fontId: CoverFontId;
  titleX?: number;
  titleY?: number;
  titleScale?: number;
  titleRotation?: number;
  photos: DecorPhotoLayer[];
  photoById: Record<string, DiaryPhoto | undefined>;
  stickers: DecorSticker[];
  texts: DecorTextLayer[];
  selectedPhotoId: string | null;
  selectedStickerId: string | null;
  selectedTextId: string | null;
  selectedTitle?: boolean;
  /** 책 껍데기 안에서 꽉 채울 때 */
  fill?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  onBackgroundPress?: () => void;
  onSelectPhoto?: (id: string) => void;
  onSelectSticker?: (id: string) => void;
  onSelectText?: (id: string) => void;
  onSelectTitle?: () => void;
  onMoveTitle?: (x: number, y: number) => void;
  onScaleTitle?: (scale: number) => void;
  onRotateTitle?: (rotation: number) => void;
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

export function CoverCanvas({
  backgroundColor = DEFAULT_COVER_COLOR,
  title,
  fontId,
  titleX = DEFAULT_COVER_TITLE_X,
  titleY = DEFAULT_COVER_TITLE_Y,
  titleScale = DEFAULT_COVER_TITLE_SCALE,
  titleRotation = DEFAULT_COVER_TITLE_ROTATION,
  photos = [],
  photoById,
  stickers = [],
  texts = [],
  selectedPhotoId,
  selectedStickerId,
  selectedTextId,
  selectedTitle = false,
  fill = false,
  editable = true,
  style,
  onBackgroundPress,
  onSelectPhoto,
  onSelectSticker,
  onSelectText,
  onSelectTitle,
  onMoveTitle,
  onScaleTitle,
  onRotateTitle,
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
}: CoverCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const photosRef = useRef(photos);
  const stickersRef = useRef(stickers);
  const textsRef = useRef(texts);
  photosRef.current = photos;
  stickersRef.current = stickers;
  textsRef.current = texts;

  const titleColor = getCoverTitleColor(backgroundColor);
  const titleScaleRef = useRef(titleScale);
  const titleRotationRef = useRef(titleRotation);
  titleScaleRef.current = titleScale;
  titleRotationRef.current = titleRotation;

  const selectedLayerId = selectedTitle
    ? COVER_TITLE_LAYER_ID
    : selectedTextId ?? selectedStickerId ?? selectedPhotoId;

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: editable,
    selectedStickerId: selectedLayerId,
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
      if (selectedStickerId) {
        const sticker = stickersRef.current.find((item) => item.id === selectedStickerId);
        return { scale: sticker?.scale ?? 1, rotation: sticker?.rotation ?? 0 };
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
      if (stickersRef.current.some((item) => item.id === id)) {
        onScaleSticker?.(id, scale);
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
      style={[
        styles.canvas,
        fill ? styles.canvasFill : styles.canvasCard,
        { backgroundColor },
        style,
      ]}
      {...(editable ? pinchHandlers : {})}
      onLayout={(event) => {
        layoutRef.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
    >
      {editable ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackgroundPress} />
      ) : null}

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
      })}

      {texts.map((layer) => (
        <DraggableText
          key={layer.id}
          layer={layer}
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
      ))}

      {stickers.map((sticker) => (
        <DraggableSticker
          key={sticker.id}
          sticker={sticker}
          selected={editable && selectedStickerId === sticker.id}
          editable={editable}
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

      <DraggableCoverTitle
        title={title}
        fontId={fontId}
        color={titleColor}
        x={titleX}
        y={titleY}
        scale={titleScale}
        rotation={titleRotation}
        selected={editable && selectedTitle}
        editable={editable}
        layoutRef={layoutRef}
        onSelect={() => onSelectTitle?.()}
        onMove={(nextX, nextY) => onMoveTitle?.(nextX, nextY)}
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
