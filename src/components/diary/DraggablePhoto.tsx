import { MutableRefObject, useRef } from 'react';
import {
  GestureResponderEvent,
  Image,
  NativeTouchEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import {
  clampStickerScale,
  normalizeRotation,
} from './DraggableSticker';
import { useLiveDecorTransform } from './useLiveDecorTransform';
import { DecorPhotoLayer, PhotoCropRect } from '../../types/diary';
import { normalizeCropRect } from '../../utils/diaryTextLayers';
import { colors } from '../../theme';

type DraggablePhotoProps = {
  layer: DecorPhotoLayer;
  uri: string;
  selected: boolean;
  layoutUnit?: number;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onScale: (scale: number) => void;
  onRotate: (rotation: number) => void;
  onDragChange?: (dragging: boolean) => void;
  onDragEnd?: (pageX?: number, pageY?: number) => void;
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

export const PHOTO_LAYER_BASE_W = 150;
export const PHOTO_LAYER_BASE_H = 190;
const BASE_W = PHOTO_LAYER_BASE_W;
const BASE_H = PHOTO_LAYER_BASE_H;

function mediaOffsetForCrop(
  cropRect: PhotoCropRect | null | undefined,
  baseW: number,
  baseH: number,
) {
  const crop = normalizeCropRect(cropRect);
  return {
    width: baseW,
    height: baseH,
    left: -crop.x * baseW,
    top: -crop.y * baseH,
  };
}

function frameSizeForCrop(
  cropRect: PhotoCropRect | null | undefined,
  baseW: number,
  baseH: number,
) {
  const crop = normalizeCropRect(cropRect);
  return {
    width: Math.max(24 * (baseW / BASE_W), baseW * crop.width),
    height: Math.max(24 * (baseH / BASE_H), baseH * crop.height),
  };
}

export function DraggablePhoto({
  layer,
  uri,
  selected,
  layoutUnit = 1,
  layoutRef,
  onSelect,
  onMove,
  onScale,
  onRotate,
  onDragChange,
  onDragEnd,
  onDragPointer,
}: DraggablePhotoProps) {
  const { live, liveRef, beginDrag, patchLive, endDrag } = useLiveDecorTransform({
    x: layer.x,
    y: layer.y,
    scale: layer.scale,
    rotation: layer.rotation,
  });

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
  const onDragEndRef = useRef(onDragEnd);
  const onDragPointerRef = useRef(onDragPointer);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onScaleRef.current = onScale;
  onRotateRef.current = onRotate;
  onDragChangeRef.current = onDragChange;
  onDragEndRef.current = onDragEnd;
  onDragPointerRef.current = onDragPointer;

  const beginPinch = (touches: NativeTouchEvent[]) => {
    modeRef.current = 'pinch';
    pinchStartDistRef.current = touchDistance(touches);
    pinchStartScaleRef.current = liveRef.current.scale;
    pinchStartAngleRef.current = touchAngle(touches);
    pinchStartRotationRef.current = liveRef.current.rotation;
  };

  const applyPinch = (touches: NativeTouchEvent[]) => {
    const dist = touchDistance(touches);
    const nextScale = clampStickerScale(
      pinchStartScaleRef.current * (dist / Math.max(pinchStartDistRef.current, 1)),
    );
    const angleDelta = shortestAngleDelta(pinchStartAngleRef.current, touchAngle(touches));
    patchLive({
      scale: nextScale,
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
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { touches, pageX, pageY } = event.nativeEvent;
        lastPageRef.current = { x: pageX, y: pageY };
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
        lastPageRef.current = { x: pageX, y: pageY };
        patchLive({
          x: Math.min(0.92, Math.max(0.08, liveRef.current.x + dx)),
          y: Math.min(0.92, Math.max(0.08, liveRef.current.y + dy)),
        });
      },
      onPanResponderRelease: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        modeRef.current = 'move';
        commitLive();
        onDragPointerRef.current?.(pageX, pageY);
        onDragEndRef.current?.(pageX, pageY);
        onDragChangeRef.current?.(false);
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

  const unit = layoutUnit;
  const baseW = BASE_W * unit;
  const baseH = BASE_H * unit;
  const frameSize = frameSizeForCrop(layer.cropRect, baseW, baseH);
  const mediaOffset = mediaOffsetForCrop(layer.cropRect, baseW, baseH);
  const borderWidth = Math.max(1, 2 * unit);

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.hit,
        {
          width: frameSize.width,
          height: frameSize.height,
          left: `${live.x * 100}%` as unknown as number,
          top: `${live.y * 100}%` as unknown as number,
          marginLeft: -frameSize.width / 2,
          marginTop: -frameSize.height / 2,
          transform: [{ scale: live.scale }, { rotate: `${live.rotation}deg` }],
          zIndex: selected ? 20 : 5,
        },
      ]}
    >
      <View style={[styles.frame, { borderWidth }, selected && styles.frameSelected]}>
        <View style={styles.mediaClip}>
          <Image
            source={{ uri }}
            style={[styles.mediaBase, mediaOffset]}
            resizeMode="cover"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
  },
  frame: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    borderColor: 'transparent',
  },
  frameSelected: {
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mediaClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  mediaBase: {
    position: 'absolute',
  },
});
