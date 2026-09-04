import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme';

type EmptyDiaryCardProps = {
  onPressCreate: () => void;
};

export function EmptyDiaryCard({ onPressCreate }: EmptyDiaryCardProps) {
  return (
    <View style={styles.stage}>
      <View style={styles.shadowWrap}>
        <View style={styles.polaroid}>
          <View style={styles.photoInset}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 다이어리 만들기"
              onPress={onPressCreate}
              style={({ pressed }) => [styles.photoWell, pressed && styles.pressed]}
            >
              <View style={styles.plusHit}>
                <Ionicons name="add" size={36} color="#8B9099" />
              </View>
            </Pressable>
          </View>

          <View style={styles.captionArea} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 8,
  },
  shadowWrap: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.72,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  polaroid: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  photoInset: {
    flex: 1,
  },
  photoWell: {
    flex: 1,
    backgroundColor: '#D8DADF',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHit: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  pressed: {
    opacity: 0.88,
  },
  captionArea: {
    height: 88,
  },
});
