import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Hsv, hexToHsv, hsvToHex } from '../../utils/color';
import { colors, radii, spacing, typography } from '../../theme';

const WHEEL_SIZE = 240;
const SLIDER_HEIGHT = 28;
const KNOB_SIZE = 24;

type Wedge = { d: string; color: string };

/** 원뿔형 그라데이션이 없어 색상환을 부채꼴로 쪼개 그린다 */
function buildWedges(size: number, steps: number): Wedge[] {
  const radius = size / 2;
  const step = 360 / steps;

  return Array.from({ length: steps }, (_, index) => {
    const start = index * step;
    const end = start + step + 0.7;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;

    const x0 = radius + radius * Math.cos(startRad);
    const y0 = radius + radius * Math.sin(startRad);
    const x1 = radius + radius * Math.cos(endRad);
    const y1 = radius + radius * Math.sin(endRad);

    return {
      d: `M ${radius} ${radius} L ${x0} ${y0} A ${radius} ${radius} 0 0 1 ${x1} ${y1} Z`,
      color: hsvToHex({ h: start, s: 1, v: 1 }),
    };
  });
}

type ColorWheelSwatchProps = {
  size?: number;
};

/** 팔레트 끝에 놓는 "직접 고르기" 표시용 미니 색상환 */
export function ColorWheelSwatch({ size = 36 }: ColorWheelSwatchProps) {
  const wedges = useMemo(() => buildWedges(size, 24), [size]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="damgil-swatch-sat" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {wedges.map((wedge) => (
        <Path key={wedge.d} d={wedge.d} fill={wedge.color} />
      ))}
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#damgil-swatch-sat)" />
    </Svg>
  );
}

type ColorWheelPickerProps = {
  initialColor: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
};

export function ColorWheelPicker({ initialColor, onCancel, onConfirm }: ColorWheelPickerProps) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(initialColor));

  const wheelRef = useRef<View>(null);
  const sliderRef = useRef<View>(null);
  const wheelOrigin = useRef({ x: 0, y: 0, size: WHEEL_SIZE });
  const sliderOrigin = useRef({ x: 0, width: WHEEL_SIZE });

  const wedges = useMemo(() => buildWedges(WHEEL_SIZE, 180), []);

  const measureWheel = () => {
    wheelRef.current?.measureInWindow((x, y, width) => {
      wheelOrigin.current = { x, y, size: width || WHEEL_SIZE };
    });
  };

  const measureSlider = () => {
    sliderRef.current?.measureInWindow((x, _y, width) => {
      sliderOrigin.current = { x, width: width || WHEEL_SIZE };
    });
  };

  const applyWheelTouch = (pageX: number, pageY: number) => {
    const { x, y, size } = wheelOrigin.current;
    const radius = size / 2;
    const dx = pageX - (x + radius);
    const dy = pageY - (y + radius);
    const distance = Math.hypot(dx, dy);

    setHsv((prev) => ({
      ...prev,
      h: ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
      s: Math.min(1, distance / radius),
      v: prev.v < 0.15 ? 0.15 : prev.v,
    }));
  };

  const applySliderTouch = (pageX: number) => {
    const { x, width } = sliderOrigin.current;
    const ratio = (pageX - x) / width;
    setHsv((prev) => ({ ...prev, v: Math.min(1, Math.max(0, ratio)) }));
  };

  const wheelPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          measureWheel();
          applyWheelTouch(event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
        onPanResponderMove: (event) => {
          applyWheelTouch(event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
      }),
    [],
  );

  const sliderPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          measureSlider();
          applySliderTouch(event.nativeEvent.pageX);
        },
        onPanResponderMove: (event) => {
          applySliderTouch(event.nativeEvent.pageX);
        },
      }),
    [],
  );

  const hex = hsvToHex(hsv);
  const fullBright = hsvToHex({ ...hsv, v: 1 });

  const radius = WHEEL_SIZE / 2;
  const angleRad = (hsv.h * Math.PI) / 180;
  const markerX = radius + Math.cos(angleRad) * hsv.s * radius;
  const markerY = radius + Math.sin(angleRad) * hsv.s * radius;
  const knobLeft = Math.min(WHEEL_SIZE - KNOB_SIZE, Math.max(0, hsv.v * WHEEL_SIZE - KNOB_SIZE / 2));

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

      <View style={styles.card}>
        <Text style={styles.title}>색상 직접 고르기</Text>

        <View
          ref={wheelRef}
          onLayout={measureWheel}
          style={styles.wheelWrap}
          {...wheelPan.panHandlers}
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <Defs>
              <RadialGradient id="damgil-wheel-sat" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {wedges.map((wedge) => (
              <Path key={wedge.d} d={wedge.d} fill={wedge.color} />
            ))}
            <Circle cx={radius} cy={radius} r={radius} fill="url(#damgil-wheel-sat)" />
            <Circle cx={radius} cy={radius} r={radius} fill="#000000" fillOpacity={1 - hsv.v} />
          </Svg>

          <View
            pointerEvents="none"
            style={[styles.marker, { left: markerX - 11, top: markerY - 11, backgroundColor: hex }]}
          />
        </View>

        <View
          ref={sliderRef}
          onLayout={measureSlider}
          style={styles.slider}
          {...sliderPan.panHandlers}
        >
          <Svg width={WHEEL_SIZE} height={SLIDER_HEIGHT}>
            <Defs>
              <LinearGradient id="damgil-value" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#000000" />
                <Stop offset="1" stopColor={fullBright} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={WHEEL_SIZE}
              height={SLIDER_HEIGHT}
              rx={SLIDER_HEIGHT / 2}
              fill="url(#damgil-value)"
            />
          </Svg>
          <View pointerEvents="none" style={[styles.knob, { left: knobLeft }]} />
        </View>

        <View style={styles.previewRow}>
          <View style={[styles.preview, { backgroundColor: hex }]} />
          <Text style={styles.hexText}>{hex}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onConfirm(hex)}
            style={({ pressed }) => [styles.applyBtn, pressed && styles.pressed]}
          >
            <Text style={styles.applyText}>적용</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    ...typography.label,
    color: colors.ink,
  },
  wheelWrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
  },
  marker: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.white,
  },
  slider: {
    width: WHEEL_SIZE,
    height: SLIDER_HEIGHT,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: 'transparent',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  hexText: {
    ...typography.monoBody,
    color: colors.inkSoft,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.label,
    color: colors.ink,
  },
  applyBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    ...typography.label,
    color: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
