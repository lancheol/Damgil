import { useRef } from 'react';
import { NativeTouchEvent, PanResponder } from 'react-native';

import { clampStickerScale, normalizeRotation } from '../../utils/stickerTransform';

function touchDistance(touches: NativeTouchEvent[]): number {
  if (touches.length < 2) {
    return 0;
  }
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy) || 1;
}

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

/** 선택된 레이어를 캔버스 어디서든 핀치·회전 */
export function useCanvasPinchHandlers({
  enabled,
  selectedLayerId,
  getSelectedTransform,
  onScale,
  onRotate,
  onDragChange,
}: {
  enabled: boolean;
  selectedLayerId: string | null;
  getSelectedTransform: () => { scale: number; rotation: number };
  onScale: (id: string, scale: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  const selectedIdRef = useRef(selectedLayerId);
  const enabledRef = useRef(enabled);
  const getTransformRef = useRef(getSelectedTransform);
  const onScaleRef = useRef(onScale);
  const onRotateRef = useRef(onRotate);
  const onDragChangeRef = useRef(onDragChange);
  selectedIdRef.current = selectedLayerId;
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
  const pendingScaleRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = true;
    const transform = getTransformRef.current();
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = transform.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = transform.rotation;
    onDragChangeRef.current?.(true);
  };

  const flushPending = (id: string) => {
    if (pendingScaleRef.current != null) {
      onScaleRef.current(id, pendingScaleRef.current);
      pendingScaleRef.current = null;
    }
    if (pendingRotationRef.current != null) {
      onRotateRef.current(id, pendingRotationRef.current);
      pendingRotationRef.current = null;
    }
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
        pendingScaleRef.current = clampStickerScale(
          pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
        );
        const angleDelta = shortestAngleDelta(pinchStartAngleRef.current, touchAngle(touches));
        pendingRotationRef.current = normalizeRotation(
          pinchStartRotationRef.current + angleDelta,
        );
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const activeId = selectedIdRef.current;
            if (activeId) {
              flushPending(activeId);
            }
          });
        }
      },
      onPanResponderRelease: () => {
        modeRef.current = false;
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const id = selectedIdRef.current;
        if (id) {
          flushPending(id);
        }
        onDragChangeRef.current?.(false);
      },
      onPanResponderTerminate: () => {
        modeRef.current = false;
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const id = selectedIdRef.current;
        if (id) {
          flushPending(id);
        }
        onDragChangeRef.current?.(false);
      },
    }),
  ).current;

  return panResponder.panHandlers;
}
