import { MutableRefObject, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CoverFontId } from '../../types/diary';
import { clampStickerScale, normalizeRotation } from '../../utils/stickerTransform';
import { getCoverFontStyle } from '../../utils/diaryCover';
import { colors } from '../../theme';

type Props = {
  title: string;
  fontId: CoverFontId;
  color: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  layoutUnit?: number;
  selected: boolean;
  editable: boolean;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRotate: (rotation: number) => void;
  onEditRequest?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onDragPointer?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX?: number, pageY?: number) => void;
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

export function DraggableCoverTitle({
  title,
  fontId,
  color,
  x,
  y,
  scale = 1,
  rotation = 0,
  layoutUnit = 1,
  selected,
  editable,
  layoutRef,
  onSelect,
  onMove,
  onScale,
  onRotate,
  onEditRequest,
  onDragChange,
  onDragPointer,
  onDragEnd,
}: Props) {
  const transformRef = useRef({ x, y, scale, rotation });
  transformRef.current = { x, y, scale, rotation };
  const [box, setBox] = useState({ width: 160, height: 48 });

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
  const onEditRequestRef = useRef(onEditRequest);
  const onDragChangeRef = useRef(onDragChange);
  const onDragPointerRef = useRef(onDragPointer);
  const onDragEndRef = useRef(onDragEnd);
  const selectedRef = useRef(selected);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onScaleRef.current = onScale;
  onRotateRef.current = onRotate;
  onEditRequestRef.current = onEditRequest;
  onDragChangeRef.current = onDragChange;
  onDragPointerRef.current = onDragPointer;
  onDragEndRef.current = onDragEnd;
  selectedRef.current = selected;

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = 'pinch';
    movedRef.current = true;
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = transformRef.current.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = transformRef.current.rotation;
  };

  const applyPinch = (touches: NativeTouchEvent[]) => {
    const dist = touchDistance(touches);
    onScaleRef.current(
      clampStickerScale(
        pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
      ),
    );
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
        movedRef.current = false;
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
        onMoveRef.current(
          Math.min(0.92, Math.max(0.08, transformRef.current.x + dx)),
          Math.min(0.92, Math.max(0.08, transformRef.current.y + dy)),
        );
      },
      onPanResponderRelease: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        const wasSelected = selectedRef.current;
        const didMove = movedRef.current;
        modeRef.current = 'move';
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
          left: `${x * 100}%` as unknown as number,
          top: `${y * 100}%` as unknown as number,
          marginLeft: -box.width / 2,
          marginTop: -box.height / 2,
        },
      ]}
    >
      <View
        style={[
          styles.visual,
          {
            paddingHorizontal: 12 * unit,
            paddingVertical: 8 * unit,
            borderRadius: 8 * unit,
            maxWidth: 260 * unit,
          },
          selected && editable ? styles.selected : null,
          { transform: [{ scale }, { rotate: `${rotation}deg` }] },
        ]}
      >
        <Text
          style={[
            styles.title,
            getCoverFontStyle(fontId),
            { color, fontSize: 28 * unit },
          ]}
          numberOfLines={4}
        >
          {title || '제목 없음'}
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
    zIndex: 4,
  },
  visual: {
    borderRadius: 8,
  },
  selected: {
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});
