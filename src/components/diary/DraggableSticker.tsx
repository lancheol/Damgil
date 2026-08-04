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
  onRotate: (rotation: number) => void;
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

/** 두 손가락 사이 각도 (deg) */
function touchAngle(touches: NativeTouchEvent[]): number {
  if (touches.length < 2) {
    return 0;
  }
  const dx = touches[1].pageX - touches[0].pageX;
  const dy = touches[1].pageY - touches[0].pageY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) {
    delta -= 360;
  }
  while (delta < -180) {
    delta += 360;
  }
  return delta;
}

export function clampStickerScale(scale: number): number {
  return Math.min(STICKER_SCALE_MAX, Math.max(STICKER_SCALE_MIN, scale));
}

export function normalizeRotation(rotation: number): number {
  let next = rotation % 360;
  if (next > 180) {
    next -= 360;
  }
  if (next < -180) {
    next += 360;
  }
  return next;
}

export function DraggableSticker({
  sticker,
  selected,
  editable = true,
  layoutRef,
  onSelect,
  onMove,
  onScale,
  onRotate,
  onDragChange,
}: DraggableStickerProps) {
  const stickerRef = useRef(sticker);
  stickerRef.current = sticker;

  const modeRef = useRef<'move' | 'pinch'>('move');
  const lastPageRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(1);
  const pinchStartScaleRef = useRef(1);
  const pinchStartAngleRef = useRef(0);
  const pinchStartRotationRef = useRef(0);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const onScaleRef = useRef(onScale);
  const onRotateRef = useRef(onRotate);
  const onDragChangeRef = useRef(onDragChange);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onScaleRef.current = onScale;
  onRotateRef.current = onRotate;
  onDragChangeRef.current = onDragChange;

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = 'pinch';
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = stickerRef.current.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = stickerRef.current.rotation;
  };

  const applyPinch = (touches: NativeTouchEvent[]) => {
    const dist = touchDistance(touches);
    const nextScale = clampStickerScale(
      pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
    );
    onScaleRef.current(nextScale);

    const angleDelta = shortestAngleDelta(pinchStartAngleRef.current, touchAngle(touches));
    onRotateRef.current(normalizeRotation(pinchStartRotationRef.current + angleDelta));
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
          applyPinch(touches);
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

  const emojiSize = 28;
  const selectPad = 5;
  const visualSize = emojiSize + selectPad * 2;
  const hitSize = 72;

  return (
    <View
      {...(editable ? panResponder.panHandlers : {})}
      style={[
        styles.stickerHit,
        {
          width: hitSize,
          height: hitSize,
          left: `${sticker.x * 100}%` as unknown as number,
          top: `${sticker.y * 100}%` as unknown as number,
          marginLeft: -hitSize / 2,
          marginTop: -hitSize / 2,
          transform: [{ scale: sticker.scale }, { rotate: `${sticker.rotation}deg` }],
        },
      ]}
    >
      <View
        style={[
          styles.stickerVisual,
          {
            width: visualSize,
            height: visualSize,
          },
          selected && editable ? styles.stickerSelected : null,
        ]}
      >
        <Text style={[styles.stickerEmoji, { fontSize: emojiSize }]}>{sticker.emoji}</Text>
      </View>
    </View>
  );
}

/** 선택된 스티커를 캔버스 어디서든 핀치·회전 */
export function useCanvasPinchHandlers({
  enabled,
  selectedStickerId,
  getSelectedTransform,
  onScale,
  onRotate,
  onDragChange,
}: {
  enabled: boolean;
  selectedStickerId: string | null;
  getSelectedTransform: () => { scale: number; rotation: number };
  onScale: (id: string, scale: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  const selectedIdRef = useRef(selectedStickerId);
  const enabledRef = useRef(enabled);
  const getTransformRef = useRef(getSelectedTransform);
  const onScaleRef = useRef(onScale);
  const onRotateRef = useRef(onRotate);
  const onDragChangeRef = useRef(onDragChange);
  selectedIdRef.current = selectedStickerId;
  enabledRef.current = enabled;
  getTransformRef.current = getSelectedTransform;
  onScaleRef.current = onScale;
  onRotateRef.current = onRotate;
  onDragChangeRef.current = onDragChange;

  const modeRef = useRef(false);
  const pinchStartDistRef = useRef(1);
  const pinchStartScaleRef = useRef(1);
  const pinchStartAngleRef = useRef(0);
  const pinchStartRotationRef = useRef(0);

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = true;
    const transform = getTransformRef.current();
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = transform.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = transform.rotation;
    onDragChangeRef.current?.(true);
  };

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
        beginPinch(touches);
      },
      onPanResponderMove: (event) => {
        const id = selectedIdRef.current;
        const touches = event.nativeEvent.touches;
        if (!id || touches.length < 2) {
          return;
        }
        if (!modeRef.current) {
          beginPinch(touches);
        }
        const dist = touchDistance(touches);
        onScaleRef.current(
          id,
          clampStickerScale(pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1))),
        );
        const angleDelta = shortestAngleDelta(pinchStartAngleRef.current, touchAngle(touches));
        onRotateRef.current(id, normalizeRotation(pinchStartRotationRef.current + angleDelta));
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
  stickerHit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerVisual: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  stickerSelected: {
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  stickerEmoji: {
    lineHeight: 32,
    textAlign: 'center',
  },
});
