import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../../theme';

type DamgilLogoProps = {
  size?: number;
};

export function DamgilLogo({ size = 52 }: DamgilLogoProps) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size * 0.18 }]}>
      <Text style={[styles.mark, { fontSize: size * 0.34 }]}>담길</Text>
      <View style={styles.arrow} />
      <View style={styles.trail} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mark: {
    ...typography.label,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -1,
  },
  arrow: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  trail: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    opacity: 0.35,
  },
});
