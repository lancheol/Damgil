import { MutableRefObject, useRef } from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

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
}: CoverCanvasProps) {
  const layoutRef = useRef({ width: 1, height: 1 });

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
        <StickerNode
          key={sticker.id}
          sticker={sticker}
          selected={selectedStickerId === sticker.id}
          editable={editable}
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
  editable,
  layoutRef,
  onSelect,
  onMove,
}: {
  sticker: CoverSticker;
  selected: boolean;
  editable: boolean;
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
      onStartShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponder: () => editable,
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
      {...(editable ? panResponder.panHandlers : {})}
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
        selected && editable ? styles.stickerSelected : null,
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
