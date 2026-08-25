import { MutableRefObject, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { clampStickerScale, normalizeRotation } from './DraggableSticker';
import { useLiveDecorTransform } from './useLiveDecorTransform';
import { DecorTextLayer } from '../../types/diary';
import { getDecorFontStyle } from '../../utils/decorAssets';
import { colors } from '../../theme';

type DraggableTextProps = {
  layer: DecorTextLayer;
  selected: boolean;
  editable?: boolean;
  layoutUnit?: number;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRotate: (rotation: number) => void;
  onDragChange?: (dragging: boolean) => void;
  onDragEnd?: (pageX?: number, pageY?: number) => void;
  onEditRequest?: () => void;
  onDragPointer?: (pageX: number, pageY: number) => void;
};

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

export function DraggableText({
  layer,
  selected,
  editable = true,
  layoutUnit = 1,
  layoutRef,
  onSelect,
  onMove,
  onScale,
  onRotate,
  onDragChange,
  onDragEnd,
  onEditRequest,
  onDragPointer,
}: DraggableTextProps) {
  const { live, liveRef, beginDrag, patchLive, endDrag } = useLiveDecorTransform({
    x: layer.x,
    y: layer.y,
    scale: layer.scale,
    rotation: layer.rotation,
  });
  const [box, setBox] = useState({ width: 120, height: 40 });

  const modeRef = useRef<'move' | 'pinch'>('move');
  const lastPageRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const pinchStartDistRef = useRef(1);
  const pinchStartScaleRef = useRef(1);
  const pinchStartAngleRef = useRef(0);
  const pinchStartRotationRef = useRef(0);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const onScaleRef = useRef(onScale);
  const onRotateRef = useRef(onRotate);
  const onDragChangeRef = useRef(onDragChange);
  const onDragEndRef = useRef(onDragEnd);
  const onEditRequestRef = useRef(onEditRequest);
  const onDragPointerRef = useRef(onDragPointer);
  const selectedRef = useRef(selected);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onScaleRef.current = onScale;
  onRotateRef.current = onRotate;
  onDragChangeRef.current = onDragChange;
  onDragEndRef.current = onDragEnd;
  onEditRequestRef.current = onEditRequest;
  onDragPointerRef.current = onDragPointer;
  selectedRef.current = selected;

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = 'pinch';
    movedRef.current = true;
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = liveRef.current.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = liveRef.current.rotation;
  };

  const applyPinch = (touches: NativeTouchEvent[]) => {
    const dist = touchDistance(touches);
    const angleDelta = shortestAngleDelta(pinchStartAngleRef.current, touchAngle(touches));
    patchLive({
      scale: clampStickerScale(
        pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
      ),
      rotation: normalizeRotation(pinchStartRotationRef.current + angleDelta),
    });
  };

  const commitLive = () => {
    const final = endDrag();
    onMoveRef.current(final.x, final.y);
    onScaleRef.current(final.scale);
    onRotateRef.current(final.rotation);
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
        movedRef.current = false;
        beginDrag();
        onDragChangeRef.current?.(true);
        onDragPointerRef.current?.(pageX, pageY);
        onSelectRef.current();

        if (touches.length >= 2) {
          beginPinch(touches);
        } else {
          modeRef.current = 'move';
        }
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { touches, pageX, pageY } = event.nativeEvent;
        onDragPointerRef.current?.(pageX, pageY);

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
        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
          movedRef.current = true;
        }
        lastPageRef.current = { x: pageX, y: pageY };

        patchLive({
          x: Math.min(0.92, Math.max(0.08, liveRef.current.x + dx)),
          y: Math.min(0.92, Math.max(0.08, liveRef.current.y + dy)),
        });
      },
      onPanResponderRelease: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        const wasSelected = selectedRef.current;
        const didMove = movedRef.current;
        modeRef.current = 'move';
        commitLive();
        onDragPointerRef.current?.(pageX, pageY);
        onDragEndRef.current?.(pageX, pageY);
        onDragChangeRef.current?.(false);
        if (wasSelected && !didMove) {
          onEditRequestRef.current?.();
        }
      },
      onPanResponderTerminate: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        modeRef.current = 'move';
        commitLive();
        if (typeof pageX === 'number' && typeof pageY === 'number') {
          onDragPointerRef.current?.(pageX, pageY);
          onDragEndRef.current?.(pageX, pageY);
        } else {
          onDragEndRef.current?.();
        }
        onDragChangeRef.current?.(false);
      },
    }),
  ).current;

  const label = layer.content.trim() || '텍스트';
  const unit = layoutUnit;

  return (
    <View
      {...(editable ? panResponder.panHandlers : {})}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== box.width || height !== box.height)) {
          setBox({ width, height });
        }
      }}
      style={[
        styles.hit,
        {
          left: `${live.x * 100}%` as unknown as number,
          top: `${live.y * 100}%` as unknown as number,
          marginLeft: -box.width / 2,
          marginTop: -box.height / 2,
          transform: [{ scale: live.scale }, { rotate: `${live.rotation}deg` }],
        },
      ]}
    >
      <View
        style={[
          styles.visual,
          {
            paddingHorizontal: 10 * unit,
            paddingVertical: 6 * unit,
            borderRadius: 8 * unit,
            maxWidth: 280 * unit,
          },
          selected && editable ? styles.selected : null,
        ]}
      >
        <Text
          style={[
            styles.text,
            getDecorFontStyle(layer.fontId),
            {
              color: layer.color,
              fontSize: 22 * unit,
              lineHeight: 30 * unit,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visual: {
    borderRadius: 8,
  },
  selected: {
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  text: {
    textAlign: 'center',
  },
});
