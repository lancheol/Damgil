import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme';
import { HomePolaroidFrame, homePolaroidStyles } from './HomePolaroidFrame';

type EmptyDiaryCardProps = {
  onPressCreate: () => void;
};

export function EmptyDiaryCard({ onPressCreate }: EmptyDiaryCardProps) {
  return (
    <HomePolaroidFrame
      photo={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 다이어리 만들기"
          accessibilityHint="여행 다이어리를 새로 만듭니다"
          onPress={onPressCreate}
          style={({ pressed }) => [
            homePolaroidStyles.photoWell,
            pressed && homePolaroidStyles.pressed,
          ]}
        >
          <View style={styles.plusHit}>
            <Ionicons name="add" size={36} color={colors.inkMuted} />
          </View>
        </Pressable>
      }
      caption={null}
    />
  );
}

const styles = StyleSheet.create({
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
});
