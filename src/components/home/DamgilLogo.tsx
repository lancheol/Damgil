import { Image, StyleSheet } from 'react-native';

const DAMGIL_MASCOT = require('../../../assets/brand/damgil-mascot.png');

type DamgilLogoProps = {
  size?: number;
};

export function DamgilLogo({ size = 52 }: DamgilLogoProps) {
  return (
    <Image
      source={DAMGIL_MASCOT}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
      accessibilityLabel="담길"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
});
