import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

type Props = {
  uri?: string | null;
  size?: number;
};

export function ProfileAvatar({ uri, size = 64 }: Props) {
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.44)} color="#9CA3AF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
