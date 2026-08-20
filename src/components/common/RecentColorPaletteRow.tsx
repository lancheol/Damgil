import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { isSameColor } from '../../utils/color';
import { isLightCoverColor } from '../../utils/coverColorHistory';
import { colors, radii } from '../../theme';
import { ColorWheelSwatch } from './ColorWheelPicker';

const SWATCH_SIZE = 36;
const SWATCH_GAP = 8;

type RecentColorPaletteRowProps = {
  history: string[];
  selectedColor: string;
  onSelectColor: (hex: string) => void;
  onOpenCustom: () => void;
  /** 밝은 시트 vs 어두운 오버레이 */
  tone?: 'onLight' | 'onDark';
  style?: ViewStyle;
  customAccessibilityLabel?: string;
  swatchAccessibilityLabel?: (hex: string) => string;
};

export function RecentColorPaletteRow({
  history,
  selectedColor,
  onSelectColor,
  onOpenCustom,
  tone = 'onLight',
  style,
  customAccessibilityLabel = '색상 직접 고르기',
  swatchAccessibilityLabel = (hex) => `사용한 색상 ${hex}`,
}: RecentColorPaletteRowProps) {
  const [rowWidth, setRowWidth] = useState(0);

  const visibleHistory = useMemo(() => {
    if (rowWidth <= 0) {
      return history.slice(0, 5);
    }
    const reserved = SWATCH_SIZE + SWATCH_GAP;
    const slots = Math.max(
      0,
      Math.floor((rowWidth - reserved + SWATCH_GAP) / (SWATCH_SIZE + SWATCH_GAP)),
    );
    return history.slice(0, slots);
  }, [history, rowWidth]);

  const activeBorderColor = tone === 'onDark' ? colors.white : colors.black;

  return (
    <View
      style={[styles.row, style]}
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
    >
      {visibleHistory.map((swatch) => {
        const active = isSameColor(selectedColor, swatch);
        return (
          <Pressable
            key={swatch}
            onPress={() => onSelectColor(swatch)}
            style={[
              styles.swatch,
              { backgroundColor: swatch },
              active && { borderColor: activeBorderColor },
              isLightCoverColor(swatch) && styles.swatchLightBorder,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={swatchAccessibilityLabel(swatch)}
          />
        );
      })}

      <Pressable
        onPress={onOpenCustom}
        style={[styles.swatch, styles.customSwatch]}
        accessibilityRole="button"
        accessibilityLabel={customAccessibilityLabel}
      >
        <ColorWheelSwatch size={32} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SWATCH_GAP,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchLightBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },
  customSwatch: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
