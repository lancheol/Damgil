import { useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoCropRect } from '../../types/diary';
import { FULL_CROP_RECT, normalizeCropRect } from '../../utils/diaryTextLayers';
import { colors, radii, spacing, typography } from '../../theme';

type PhotoCropModalProps = {
  visible: boolean;
  uri: string;
  initialCrop?: PhotoCropRect | null;
  onCancel: () => void;
  onConfirm: (crop: PhotoCropRect) => void;
};

type Box = { x: number; y: number; width: number; height: number };

function clampBox(box: Box, maxW: number, maxH: number): Box {
  const minSize = Math.min(maxW, maxH) * 0.2;
  const width = Math.min(maxW, Math.max(minSize, box.width));
  const height = Math.min(maxH, Math.max(minSize, box.height));
  const x = Math.min(maxW - width, Math.max(0, box.x));
  const y = Math.min(maxH - height, Math.max(0, box.y));
  return { x, y, width, height };
}

export function PhotoCropModal({
  visible,
  uri,
  initialCrop,
  onCancel,
  onConfirm,
}: PhotoCropModalProps) {
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, width: 1, height: 1 });
  const boxRef = useRef(box);
  boxRef.current = box;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const dragStart = useRef<Box | null>(null);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setFrame({ width, height });
    frameRef.current = { width, height };
    const crop = normalizeCropRect(initialCrop);
    const next = clampBox(
      {
        x: crop.x * width,
        y: crop.y * height,
        width: crop.width * width,
        height: crop.height * height,
      },
      width,
      height,
    );
    setBox(next);
    boxRef.current = next;
  };

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = { ...boxRef.current };
        },
        onPanResponderMove: (_evt, gesture) => {
          const start = dragStart.current;
          const fr = frameRef.current;
          if (!start) {
            return;
          }
          const next = clampBox(
            {
              ...start,
              x: start.x + gesture.dx,
              y: start.y + gesture.dy,
            },
            fr.width,
            fr.height,
          );
          setBox(next);
          boxRef.current = next;
        },
      }),
    [],
  );

  const makeCornerResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = { ...boxRef.current };
      },
      onPanResponderMove: (_evt, gesture) => {
        const start = dragStart.current;
        const fr = frameRef.current;
        if (!start) {
          return;
        }
        let next = { ...start };
        if (corner === 'tl') {
          next = {
            x: start.x + gesture.dx,
            y: start.y + gesture.dy,
            width: start.width - gesture.dx,
            height: start.height - gesture.dy,
          };
        } else if (corner === 'tr') {
          next = {
            x: start.x,
            y: start.y + gesture.dy,
            width: start.width + gesture.dx,
            height: start.height - gesture.dy,
          };
        } else if (corner === 'bl') {
          next = {
            x: start.x + gesture.dx,
            y: start.y,
            width: start.width - gesture.dx,
            height: start.height + gesture.dy,
          };
        } else {
          next = {
            x: start.x,
            y: start.y,
            width: start.width + gesture.dx,
            height: start.height + gesture.dy,
          };
        }
        next = clampBox(next, fr.width, fr.height);
        setBox(next);
        boxRef.current = next;
      },
    });

  const tl = useMemo(() => makeCornerResponder('tl'), []);
  const tr = useMemo(() => makeCornerResponder('tr'), []);
  const bl = useMemo(() => makeCornerResponder('bl'), []);
  const br = useMemo(() => makeCornerResponder('br'), []);

  const handleConfirm = () => {
    const fr = frameRef.current;
    const current = boxRef.current;
    if (fr.width <= 1 || fr.height <= 1) {
      onConfirm({ ...FULL_CROP_RECT });
      return;
    }
    onConfirm(
      normalizeCropRect({
        x: current.x / fr.width,
        y: current.y / fr.height,
        width: current.width / fr.width,
        height: current.height / fr.height,
      }),
    );
  };

  const handleReset = () => {
    const fr = frameRef.current;
    const next = { x: 0, y: 0, width: fr.width, height: fr.height };
    setBox(next);
    boxRef.current = next;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>취소</Text>
          </Pressable>
          <Text style={styles.headerTitle}>사진 자르기</Text>
          <Pressable onPress={handleConfirm} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, styles.headerConfirm]}>적용</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>영역을 드래그해 옮기고, 모서리로 크기를 조절하세요.</Text>

        <View style={styles.frame} onLayout={onFrameLayout}>
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          <View pointerEvents="none" style={[styles.maskTop, { height: Math.max(0, box.y) }]} />
          <View
            pointerEvents="none"
            style={[
              styles.maskBottom,
              {
                top: box.y + box.height,
                height: Math.max(0, frame.height - box.y - box.height),
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.maskSide,
              {
                top: box.y,
                width: Math.max(0, box.x),
                height: box.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.maskSide,
              {
                top: box.y,
                left: box.x + box.width,
                width: Math.max(0, frame.width - box.x - box.width),
                height: box.height,
              },
            ]}
          />

          <View
            {...moveResponder.panHandlers}
            style={[
              styles.cropBox,
              {
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              },
            ]}
          >
            <View {...tl.panHandlers} style={[styles.handle, styles.handleTL]} />
            <View {...tr.panHandlers} style={[styles.handle, styles.handleTR]} />
            <View {...bl.panHandlers} style={[styles.handle, styles.handleBL]} />
            <View {...br.panHandlers} style={[styles.handle, styles.handleBR]} />
          </View>
        </View>

        <Pressable onPress={handleReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>전체로 되돌리기</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerBtn: {
    minWidth: 56,
  },
  headerBtnText: {
    color: '#D4D4D4',
    fontSize: 16,
  },
  headerConfirm: {
    color: colors.white,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#A3A3A3',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  frame: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  maskTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskSide: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.white,
  },
  handle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#111111',
  },
  handleTL: { left: -11, top: -11 },
  handleTR: { right: -11, top: -11 },
  handleBL: { left: -11, bottom: -11 },
  handleBR: { right: -11, bottom: -11 },
  resetBtn: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetText: {
    ...typography.label,
    color: '#D4D4D4',
  },
});
