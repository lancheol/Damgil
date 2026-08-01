import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing } from '../../theme';

type BackButtonProps = {
  /** 지정하면 goBack 대신 해당 라우트로 이동 (스택에 있으면 그 화면까지 pop) */
  target?: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function BackButton({
  target,
  onPress,
  color = colors.backArrow,
  size = 24,
  style,
  accessibilityLabel = '뒤로가기',
}: BackButtonProps) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (target) {
      navigation.navigate(target);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const strokeWidth = Math.max(2.2, size * 0.1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M19 12H6.5M11.5 6.5L6 12l5.5 5.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
