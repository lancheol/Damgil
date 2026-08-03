import { MutableRefObject, useRef } from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

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
}: RecordDecorCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });
  const isVideo = mediaType === 'video';

  return (
    <View
      style={[styles.canvas, style]}
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
        <StickerNode
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          layoutRef={layoutRef}
          onSelect={() => onSelectSticker?.(sticker.id)}
          onMove={(x, y) => onMoveSticker?.(sticker.id, x, y)}
        />
      ))}
    </View>
  );
}

function StickerNode({
  sticker,
  selected,
  layoutRef,
  onSelect,
  onMove,
}: {
  sticker: DecorSticker;
  selected: boolean;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const stickerRef = useRef(sticker);
  stickerRef.current = sticker;
  const startRef = useRef({ x: sticker.x, y: sticker.y });
  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = {
          x: stickerRef.current.x,
          y: stickerRef.current.y,
        };
        onSelectRef.current();
      },
      onPanResponderMove: (_event, gesture) => {
        const { width, height } = layoutRef.current;
        const nextX = Math.min(0.92, Math.max(0.08, startRef.current.x + gesture.dx / Math.max(width, 1)));
        const nextY = Math.min(0.92, Math.max(0.08, startRef.current.y + gesture.dy / Math.max(height, 1)));
        onMoveRef.current(nextX, nextY);
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.sticker,
        {
          left: `${sticker.x * 100}%` as unknown as number,
          top: `${sticker.y * 100}%` as unknown as number,
          transform: [
            { translateX: -18 },
            { translateY: -18 },
            { scale: sticker.scale },
            { rotate: `${sticker.rotation}deg` },
          ],
        },
        selected ? styles.stickerSelected : null,
      ]}
    >
      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
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
  sticker: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerSelected: {
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stickerEmoji: {
    fontSize: 28,
  },
});
