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
  textSelected?: boolean;
  fullBleed?: boolean;
  style?: ViewStyle;
  onSelectSticker?: (id: string | null) => void;
  onSelectText?: () => void;
  onBackgroundPress?: () => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  onScaleSticker?: (id: string, scale: number) => void;
  onRotateSticker?: (id: string, rotation: number) => void;
  onStickerDragChange?: (dragging: boolean) => void;
  onStickerDragEnd?: (id: string) => void;
};

export function RecordDecorCanvas({
  uri,
  mediaType = 'photo',
  note,
  fontId,
  stickers,
  selectedStickerId,
  textSelected = false,
  fullBleed = false,
  style,
  onSelectSticker,
  onSelectText,
  onBackgroundPress,
  onMoveSticker,
  onScaleSticker,
  onRotateSticker,
  onStickerDragChange,
  onStickerDragEnd,
}: RecordDecorCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const isVideo = mediaType === 'video';
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const pinchHandlers = useCanvasPinchHandlers({
    enabled: true,
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

      {note.trim() || textSelected ? (
        <Pressable
          onPress={onSelectText}
          style={[styles.noteHit, textSelected && styles.noteSelected]}
        >
          <Text
            style={[styles.note, getDecorFontStyle(fontId)]}
            numberOfLines={4}
          >
            {note.trim() || '문구를 입력하세요'}
          </Text>
        </Pressable>
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
          onRotate={(rotation) => onRotateSticker?.(sticker.id, rotation)}
          onDragChange={onStickerDragChange}
          onDragEnd={() => onStickerDragEnd?.(sticker.id)}
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
  noteHit: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: '18%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noteSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  note: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
