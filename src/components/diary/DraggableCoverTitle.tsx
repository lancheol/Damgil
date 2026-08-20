import { MutableRefObject, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, StyleSheet, Text, View } from 'react-native';

import { CoverFontId } from '../../types/diary';
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
  selected: boolean;
  editable: boolean;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onEditRequest?: () => void;
  onDragChange?: (dragging: boolean) => void;
  onDragPointer?: (pageX: number, pageY: number) => void;
  onDragEnd?: (pageX?: number, pageY?: number) => void;
};

export function DraggableCoverTitle({
  title,
  fontId,
  color,
  x,
  y,
  scale = 1,
  rotation = 0,
  selected,
  editable,
  layoutRef,
  onSelect,
  onMove,
  onEditRequest,
  onDragChange,
  onDragPointer,
  onDragEnd,
}: Props) {
  const posRef = useRef({ x, y });
  posRef.current = { x, y };
  const [box, setBox] = useState({ width: 160, height: 48 });
  const lastPageRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  const onEditRequestRef = useRef(onEditRequest);
  const onDragChangeRef = useRef(onDragChange);
  const onDragPointerRef = useRef(onDragPointer);
  const onDragEndRef = useRef(onDragEnd);
  const selectedRef = useRef(selected);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;
  onEditRequestRef.current = onEditRequest;
  onDragChangeRef.current = onDragChange;
  onDragPointerRef.current = onDragPointer;
  onDragEndRef.current = onDragEnd;
  selectedRef.current = selected;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable,
      onStartShouldSetPanResponderCapture: () => editable,
      onMoveShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponderCapture: () => editable,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        lastPageRef.current = { x: pageX, y: pageY };
        movedRef.current = false;
        onDragChangeRef.current?.(true);
        onDragPointerRef.current?.(pageX, pageY);
        onSelectRef.current();
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        onDragPointerRef.current?.(pageX, pageY);
        const { width, height } = layoutRef.current;
        const dx = (pageX - lastPageRef.current.x) / Math.max(width, 1);
        const dy = (pageY - lastPageRef.current.y) / Math.max(height, 1);
        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
          movedRef.current = true;
        }
        lastPageRef.current = { x: pageX, y: pageY };
        onMoveRef.current(
          Math.min(0.92, Math.max(0.08, posRef.current.x + dx)),
          Math.min(0.92, Math.max(0.08, posRef.current.y + dy)),
        );
      },
      onPanResponderRelease: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        const wasSelected = selectedRef.current;
        const didMove = movedRef.current;
        onDragPointerRef.current?.(pageX, pageY);
        onDragEndRef.current?.(pageX, pageY);
        onDragChangeRef.current?.(false);
        if (wasSelected && !didMove) {
          onEditRequestRef.current?.();
        }
      },
      onPanResponderTerminate: (event) => {
        const { pageX, pageY } = event.nativeEvent;
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
          selected && editable ? styles.selected : null,
          { transform: [{ scale }, { rotate: `${rotation}deg` }] },
        ]}
      >
        <Text style={[styles.title, getCoverFontStyle(fontId), { color }]} numberOfLines={4}>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 260,
  },
  selected: {
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});
