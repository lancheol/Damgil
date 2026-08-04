import { MutableRefObject, useRef } from 'react';
import {
  GestureResponderEvent,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DecorSticker } from '../../types/diary';
import { colors } from '../../theme';

export const STICKER_SCALE_MIN = 0.5;
export const STICKER_SCALE_MAX = 2.8;

type DraggableStickerProps = {
  sticker: DecorSticker;
  selected: boolean;
  editable?: boolean;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onDragChange?: (dragging: boolean) => void;
};

function touchDistance(touches: NativeTouchEvent[]): number {
  if (touches.length < 2) {
    return 0;
  }
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy) || 1;
}

export function clampStickerScale(scale: number): number {
  return Math.min(STICKER_SCALE_MAX, Math.max(STICKER_SCALE_MIN, scale));
}

export function DraggableSticker({
  sticker,
  selected,
  editable = true,
  layoutRef,
  onSelect,
  onMove,
  onScale,
  onDragChange,
}: DraggableStickerProps) {
  const stickerRef = useRef(sticker);
  stickerRef.current = sticker;

  const modeRef = useRef<'move' | 'pinch'>('move');
  const lastPageRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(1);
  const pinchStartScaleRef = useRef(1);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const onScaleRef = useRef(onScale);
  const onDragChangeRef = useRef(onDragChange);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onScaleRef.current = onScale;
  onDragChangeRef.current = onDragChange;

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = 'pinch';
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = stickerRef.current.scale;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable,
      onStartShouldSetPanResponderCapture: () => editable,
      onMoveShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponderCapture: () => editable,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { touches, pageX, pageY } = event.nativeEvent;
        lastPageRef.current = { x: pageX, y: pageY };
        onDragChangeRef.current?.(true);
        onSelectRef.current();

        if (touches.length >= 2) {
          beginPinch(touches);
        } else {
          modeRef.current = 'move';
        }
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { touches, pageX, pageY } = event.nativeEvent;

        if (touches.length >= 2) {
          if (modeRef.current !== 'pinch') {
            beginPinch(touches);
          }
          const dist = touchDistance(touches);
          const nextScale = clampStickerScale(
            pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
          );
          onScaleRef.current(nextScale);
          return;
        }

        if (modeRef.current === 'pinch') {
          modeRef.current = 'move';
          lastPageRef.current = { x: pageX, y: pageY };
          return;
        }

        const { width, height } = layoutRef.current;
        const dx = (pageX - lastPageRef.current.x) / Math.max(width, 1);
        const dy = (pageY - lastPageRef.current.y) / Math.max(height, 1);
        lastPageRef.current = { x: pageX, y: pageY };

        const nextX = Math.min(0.92, Math.max(0.08, stickerRef.current.x + dx));
        const nextY = Math.min(0.92, Math.max(0.08, stickerRef.current.y + dy));
        onMoveRef.current(nextX, nextY);
      },
      onPanResponderRelease: () => {
        modeRef.current = 'move';
        onDragChangeRef.current?.(false);
      },
      onPanResponderTerminate: () => {
        modeRef.current = 'move';
        onDragChangeRef.current?.(false);
      },
    }),
  ).current;

  const hitSize = 96;

  return (
    <View
      {...(editable ? panResponder.panHandlers : {})}
      style={[
        styles.sticker,
        {
          width: hitSize,
          height: hitSize,
          left: `${sticker.x * 100}%` as unknown as number,
          top: `${sticker.y * 100}%` as unknown as number,
          marginLeft: -hitSize / 2,
          marginTop: -hitSize / 2,
          transform: [{ scale: sticker.scale }, { rotate: `${sticker.rotation}deg` }],
        },
        selected && editable ? styles.stickerSelected : null,
      ]}
    >
      <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
    </View>
  );
}

/** 선택된 스티커를 캔버스 어디서든 핀치로 크기 조절 */
export function useCanvasPinchHandlers({
  enabled,
  selectedStickerId,
  getSelectedScale,
  onScale,
  onDragChange,
}: {
  enabled: boolean;
  selectedStickerId: string | null;
  getSelectedScale: () => number;
  onScale: (id: string, scale: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  const selectedIdRef = useRef(selectedStickerId);
  const enabledRef = useRef(enabled);
  const getScaleRef = useRef(getSelectedScale);
  const onScaleRef = useRef(onScale);
  const onDragChangeRef = useRef(onDragChange);
  selectedIdRef.current = selectedStickerId;
  enabledRef.current = enabled;
  getScaleRef.current = getSelectedScale;
  onScaleRef.current = onScale;
  onDragChangeRef.current = onDragChange;

  const modeRef = useRef(false);
  const pinchStartDistRef = useRef(1);
  const pinchStartScaleRef = useRef(1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) =>
        Boolean(enabledRef.current && selectedIdRef.current && event.nativeEvent.touches.length >= 2),
      onMoveShouldSetPanResponder: (event) =>
        Boolean(enabledRef.current && selectedIdRef.current && event.nativeEvent.touches.length >= 2),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        const id = selectedIdRef.current;
        const touches = event.nativeEvent.touches;
        if (!id || touches.length < 2) {
          return;
        }
        modeRef.current = true;
        pinchStartDistRef.current = touchDistance(touches);
        pinchStartScaleRef.current = getScaleRef.current();
        onDragChangeRef.current?.(true);
      },
      onPanResponderMove: (event) => {
        const id = selectedIdRef.current;
        const touches = event.nativeEvent.touches;
        if (!id || touches.length < 2) {
          return;
        }
        if (!modeRef.current) {
          modeRef.current = true;
          pinchStartDistRef.current = touchDistance(touches);
          pinchStartScaleRef.current = getScaleRef.current();
          onDragChangeRef.current?.(true);
        }
        const dist = touchDistance(touches);
        onScaleRef.current(
          id,
          clampStickerScale(pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1))),
        );
      },
      onPanResponderRelease: () => {
        modeRef.current = false;
        onDragChangeRef.current?.(false);
      },
      onPanResponderTerminate: () => {
        modeRef.current = false;
        onDragChangeRef.current?.(false);
      },
    }),
  ).current;

  return panResponder.panHandlers;
}

const styles = StyleSheet.create({
  sticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerSelected: {
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stickerEmoji: {
    fontSize: 28,
  },
});
