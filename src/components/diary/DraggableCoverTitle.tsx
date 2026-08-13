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
  selected: boolean;
  editable: boolean;
  layoutRef: MutableRefObject<{ width: number; height: number }>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
};

export function DraggableCoverTitle({
  title,
  fontId,
  color,
  x,
  y,
  selected,
  editable,
  layoutRef,
  onSelect,
  onMove,
}: Props) {
  const posRef = useRef({ x, y });
  posRef.current = { x, y };
  const [box, setBox] = useState({ width: 160, height: 48 });
  const lastPageRef = useRef({ x: 0, y: 0 });
  const onSelectRef = useRef(onSelect);
  const onMoveRef = useRef(onMove);
  onSelectRef.current = onSelect;
  onMoveRef.current = onMove;

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
        onSelectRef.current();
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        const { width, height } = layoutRef.current;
        const dx = (pageX - lastPageRef.current.x) / Math.max(width, 1);
        const dy = (pageY - lastPageRef.current.y) / Math.max(height, 1);
        lastPageRef.current = { x: pageX, y: pageY };
        onMoveRef.current(
          Math.min(0.92, Math.max(0.08, posRef.current.x + dx)),
          Math.min(0.92, Math.max(0.08, posRef.current.y + dy)),
        );
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
      <View style={[styles.visual, selected && editable ? styles.selected : null]}>
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
